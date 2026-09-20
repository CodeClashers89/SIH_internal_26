"""
Chat Manager Service
Orchestrates the chat flow: context building, LLM calls, tool execution, and message storage.
"""

import logging
import json
import re
from typing import Dict, Any, Optional, Tuple
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChatManager:
    """
    Manages the complete chat flow for a farmer-assistant interaction.
    """

    MAX_TOOL_CALLS_PER_TURN = 5

    @staticmethod
    def _extract_text_tool_calls(text: str) -> list:
        """Parse pseudo XML tool calls from text content if emitted by the LLM."""
        tool_calls = []
        if not text:
            return tool_calls

        # Format A: <invoke name="func_name"><parameter name="param">val</parameter></invoke>
        for m in re.finditer(r'<invoke\s+name=[\x22\x27]?([a-zA-Z0-9_]+)[\x22\x27]?\s*>([\s\S]*?)</invoke>', text):
            name = m.group(1)
            body = m.group(2)
            params = {}
            for pm in re.finditer(r'<parameter\s+name=[\x22\x27]?([a-zA-Z0-9_]+)[\x22\x27]?\s*>([\s\S]*?)</parameter>', body):
                params[pm.group(1).strip()] = pm.group(2).strip()
            tool_calls.append({'name': name, 'arguments': params})

        if tool_calls:
            return tool_calls

        # Format B: <function=func_name> <parameter=key>val</parameter> </function>
        for m in re.finditer(r'<function=([a-zA-Z0-9_]+)>([\s\S]*?)</function>', text):
            name = m.group(1)
            body = m.group(2)
            params = {}
            for pm in re.finditer(r'<parameter=([a-zA-Z0-9_]+)>([\s\S]*?)</parameter>', body):
                params[pm.group(1).strip()] = pm.group(2).strip()
            for pm in re.finditer(r'<parameter\s+name=[\x22\x27]?([a-zA-Z0-9_]+)[\x22\x27]?\s*>([\s\S]*?)</parameter>', body):
                params[pm.group(1).strip()] = pm.group(2).strip()
            tool_calls.append({'name': name, 'arguments': params})

        return tool_calls

    @staticmethod
    def _sanitize_response_text(text: str) -> str:
        """Remove any residual XML/tool_call tags from assistant text before saving or sending."""
        if not text:
            return ""
        text = re.sub(r'<tool_call>[\s\S]*?</tool_call>', '', text)
        text = re.sub(r'<function_calls>[\s\S]*?</function_calls>', '', text)
        text = re.sub(r'<invoke[\s\S]*?</invoke>', '', text)
        text = re.sub(r'</?(?:tool_call|function_calls|invoke|parameter|function)[^>]*>', '', text)
        return text.strip()


    def __init__(self, farmer_user, groq_service):
        """
        Initialize chat manager.

        Args:
            farmer_user: The authenticated farmer User object
            groq_service: Initialized GroqService instance
        """
        self.farmer_user = farmer_user
        self.groq_service = groq_service

    def process_chat_message(
        self,
        user_message: str,
        conversation_id: Optional[str] = None,
    ) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """
        Process a user message and return the assistant response.

        Args:
            user_message: The user's message
            conversation_id: UUID of conversation, or None to create new

        Returns:
            Tuple of (assistant_response, new_conversation_id, metadata)
        """
        from chatbot.models import Conversation, ChatMessage, ToolCallLog
        from chatbot.services.context_builder import ContextBuilder
        from chatbot.services.tools import ToolExecutor, TOOL_DEFINITIONS

        # 1. Load or create conversation
        if conversation_id:
            try:
                conversation = Conversation.objects.get(
                    id=conversation_id,
                    farmer_id=self.farmer_user.id
                )
            except Conversation.DoesNotExist:
                logger.error(f"Conversation {conversation_id} not found or unauthorized")
                return "Error: Conversation not found", None, {'error': 'unauthorized'}
        else:
            # Create new conversation
            conversation = Conversation.objects.create(
                farmer_id=self.farmer_user.id,
                title=user_message[:50] + "..." if len(user_message) > 50 else user_message,
            )
            conversation_id = conversation.id
            logger.info(f"Created new conversation {conversation_id}")

        # 2. Save user message
        user_msg_record = ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content=user_message,
        )
        logger.info(f"Saved user message {user_msg_record.id}")

        # Detect language selection
        if not isinstance(conversation.state, dict):
            conversation.state = {}
        
        lower_msg = user_message.lower()
        if 'gujarati' in lower_msg or 'ગુજરાતી' in user_message:
            conversation.state['language'] = 'Gujarati'
            conversation.save(update_fields=['state', 'updated_at'])
        elif 'hindi' in lower_msg or 'हिंदी' in user_message or 'हिन्दी' in user_message:
            conversation.state['language'] = 'Hindi'
            conversation.save(update_fields=['state', 'updated_at'])
        elif 'english' in lower_msg:
            conversation.state['language'] = 'English'
            conversation.save(update_fields=['state', 'updated_at'])

        try:
            # 3. Build context
            context_builder = ContextBuilder(conversation, self.groq_service)
            messages = context_builder.build_messages(user_message)

            # 4. Call Groq with tools
            groq_response = self.groq_service.send_message(
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice='auto',
                temperature=0.7,
                max_tokens=700,
            )

            if groq_response['status'] == 'error':
                error_msg = f"I am having trouble connecting to the AI service: {groq_response['error']}. Please try again shortly."
                logger.error(error_msg)
                ChatMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content=error_msg,
                    metadata={'error': groq_response['error']}
                )
                return error_msg, str(conversation_id), {'error': groq_response['error']}

            # 5. Process response and handle tool calls
            assistant_message = groq_response['message']
            final_response = ""
            tool_activity = []
            tool_call_count = 0

            # Tool-call loop: execute tools and feed results back to the LLM
            current_messages = list(messages)
            max_iterations = self.MAX_TOOL_CALLS_PER_TURN
            tool_executor = ToolExecutor(self.farmer_user)

            while tool_call_count < max_iterations:
                has_native_tools = hasattr(assistant_message, 'tool_calls') and bool(assistant_message.tool_calls)
                text_content = getattr(assistant_message, 'content', '') or ''
                has_text_tools = bool('<tool_call>' in text_content or '<invoke' in text_content or '<function=' in text_content)

                if not has_native_tools and not has_text_tools:
                    # Finished all tool calls
                    break

                if has_native_tools:
                    logger.info(f"Processing {len(assistant_message.tool_calls)} native tool calls")
                    assistant_msg_dict = {
                        'role': 'assistant',
                        'content': assistant_message.content or '',
                        'tool_calls': [
                            {
                                'id': tc.id,
                                'type': 'function',
                                'function': {
                                    'name': tc.function.name,
                                    'arguments': tc.function.arguments,
                                },
                            }
                            for tc in assistant_message.tool_calls
                        ],
                    }
                    current_messages.append(assistant_msg_dict)

                    for tool_call in assistant_message.tool_calls:
                        tool_call_count += 1
                        tool_result = self._execute_tool_call(
                            tool_call,
                            tool_executor,
                            conversation,
                            context_builder
                        )
                        tool_activity.append(tool_result)

                        result_content = json.dumps(
                            tool_result.get('result') or {'error': tool_result.get('error', 'unknown')},
                            default=str,
                        )
                        current_messages.append({
                            'role': 'tool',
                            'tool_call_id': tool_call.id,
                            'content': result_content,
                        })

                elif has_text_tools:
                    parsed_calls = self._extract_text_tool_calls(text_content)
                    if not parsed_calls:
                        break
                    logger.info(f"Processing {len(parsed_calls)} parsed text tool calls")
                    cleaned_content = self._sanitize_response_text(text_content)
                    current_messages.append({
                        'role': 'assistant',
                        'content': cleaned_content or 'Checking market and farm data...',
                    })
                    for idx, tc in enumerate(parsed_calls):
                        tool_call_count += 1
                        t_name = tc.get('name')
                        t_args = tc.get('arguments', {})
                        res = tool_executor.execute_tool(t_name, t_args)
                        tool_activity.append({
                            'tool_name': t_name,
                            'status': res.get('status', 'success'),
                            'result': res.get('data') or {'error': res.get('error')},
                        })
                        current_messages.append({
                            'role': 'user',
                            'content': f"[System data for {t_name}]: {json.dumps(res.get('data') or {'error': res.get('error')}, default=str)}"
                        })

                # Follow-up LLM call: provide tools if budget remains, else force text
                tools_next = TOOL_DEFINITIONS if tool_call_count < max_iterations - 1 else None
                choice_next = 'auto' if tool_call_count < max_iterations - 1 else None

                followup_response = self.groq_service.send_message(
                    messages=current_messages,
                    tools=tools_next,
                    tool_choice=choice_next,
                    temperature=0.7,
                    max_tokens=700,
                )

                if followup_response['status'] == 'error':
                    logger.error(f"Error in follow-up LLM call: {followup_response['error']}")
                    # If error was tool_choice related, retry once without tools to get clean text
                    retry = self.groq_service.send_message(
                        messages=current_messages,
                        tools=None,
                        tool_choice=None,
                        temperature=0.7,
                        max_tokens=700,
                    )
                    if retry['status'] == 'success' and retry['message'].content:
                        assistant_message = retry['message']
                        final_response = assistant_message.content
                    break

                assistant_message = followup_response['message']
                if hasattr(assistant_message, 'content') and assistant_message.content:
                    final_response = assistant_message.content

            # 6. Get final response from assistant
            if hasattr(assistant_message, 'content') and assistant_message.content:
                final_response = assistant_message.content
            elif not final_response and tool_activity:
                # The LLM exhausted tool calls without producing text content.
                # Make one final synthesis call WITHOUT tools to force a text response.
                logger.info("No text content after tool calls; forcing synthesis call without tools")

                # Build the assistant message dict for the last tool-calling turn
                if hasattr(assistant_message, 'tool_calls') and assistant_message.tool_calls:
                    last_assistant_dict = {
                        'role': 'assistant',
                        'content': assistant_message.content or '',
                        'tool_calls': [
                            {
                                'id': tc.id,
                                'type': 'function',
                                'function': {
                                    'name': tc.function.name,
                                    'arguments': tc.function.arguments,
                                },
                            }
                            for tc in assistant_message.tool_calls
                        ],
                    }
                    current_messages.append(last_assistant_dict)

                    # Provide stub tool results so the conversation is well-formed
                    for tc in assistant_message.tool_calls:
                        current_messages.append({
                            'role': 'tool',
                            'tool_call_id': tc.id,
                            'content': json.dumps({
                                'message': 'Tool call limit reached. Please synthesize a response from all the data already collected above.',
                            }),
                        })

                # Final call with NO tools – forces text output
                synthesis_response = self.groq_service.send_message(
                    messages=current_messages,
                    tools=None,
                    tool_choice=None,
                    temperature=0.7,
                    max_tokens=700,
                )

                if synthesis_response['status'] == 'success' and synthesis_response['message'].content:
                    final_response = synthesis_response['message'].content
                    logger.info("Synthesis call succeeded")
                else:
                    logger.error(f"Synthesis call failed: {synthesis_response.get('error', 'no content')}")
                    final_response = "I'm sorry, I couldn't generate a response. Please try again."
            elif not final_response:
                final_response = "I'm sorry, I couldn't generate a response. Please try again."

            # Clean any leftover XML / tool call tags
            final_response = self._sanitize_response_text(final_response)
            if not final_response:
                final_response = "I'm sorry, I couldn't complete that request. Please ask again."

            # 7. Save assistant message
            assistant_msg_record = ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=final_response,
                metadata={'tool_call_count': tool_call_count},
            )
            logger.info(f"Saved assistant message {assistant_msg_record.id}")

            # 8. Update conversation title if new
            if not conversation.title or conversation.title == 'New Conversation' or conversation.title.endswith("..."):
                if len(user_message) <= 50:
                    conversation.title = user_message
                else:
                    conversation.title = user_message[:50] + "..."
                conversation.save(update_fields=['title', 'updated_at'])

            logger.info(f"Completed chat for conversation {conversation_id}")

            return final_response, str(conversation_id), {
                'tool_calls': tool_call_count,
                'tool_activity': tool_activity,
            }

        except Exception as exc:
            logger.error(f"Unhandled error in process_chat_message: {str(exc)}", exc_info=True)
            fallback_text = f"I'm sorry, an error occurred while processing your request: {str(exc)}. Please try asking again."
            ChatMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=fallback_text,
                metadata={'error': str(exc)},
            )
            return fallback_text, str(conversation_id), {'error': str(exc)}

    def _execute_tool_call(
        self,
        tool_call: Any,
        tool_executor,
        conversation,
        context_builder,
    ) -> Dict[str, Any]:
        """
        Execute a single tool call.

        Args:
            tool_call: Groq tool_call object
            tool_executor: ToolExecutor instance
            conversation: Conversation model instance
            context_builder: ContextBuilder instance

        Returns:
            Dictionary with tool execution result
        """
        from chatbot.models import ToolCallLog

        tool_name = tool_call.function.name
        tool_args_str = tool_call.function.arguments

        logger.info(f"Executing tool: {tool_name}")

        # Parse arguments
        success, parsed_args_or_error = self.groq_service.process_tool_call(
            tool_name,
            tool_args_str
        )

        if not success:
            error_msg = parsed_args_or_error
            logger.error(f"Failed to parse tool arguments: {error_msg}")
            # Log the failed tool call
            ToolCallLog.objects.create(
                conversation=conversation,
                tool_name=tool_name,
                arguments=None,
                status='error',
                error_message=error_msg,
            )
            return {
                'tool_name': tool_name,
                'status': 'error',
                'error': error_msg,
            }

        # Execute the tool
        try:
            tool_result = tool_executor.execute_tool(tool_name, parsed_args_or_error)

            # Log the tool call
            ToolCallLog.objects.create(
                conversation=conversation,
                tool_name=tool_name,
                arguments=parsed_args_or_error,
                result=tool_result.get('data') if tool_result['status'] == 'success' else None,
                status='success' if tool_result['status'] == 'success' else 'error',
                error_message=tool_result.get('error') if tool_result['status'] == 'error' else None,
            )

            logger.info(f"Tool {tool_name} executed successfully")
            return {
                'tool_name': tool_name,
                'status': tool_result.get('status'),
                'result': tool_result.get('data'),
            }

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error executing tool {tool_name}: {error_msg}")

            # Log the error
            ToolCallLog.objects.create(
                conversation=conversation,
                tool_name=tool_name,
                arguments=parsed_args_or_error,
                status='error',
                error_message=error_msg,
            )

            return {
                'tool_name': tool_name,
                'status': 'error',
                'error': error_msg,
            }

    def get_conversations(self, limit: int = 20) -> list:
        """
        Get farmer's conversations.

        Args:
            limit: Maximum number of conversations to return

        Returns:
            List of conversation dictionaries
        """
        from chatbot.models import Conversation

        conversations = Conversation.objects.filter(
            farmer_id=self.farmer_user.id,
        ).order_by('-is_pinned', '-pinned_at', '-updated_at')[:limit]

        return [
            {
                'id': conv.id,
                'title': conv.title,
                'summary': conv.summary,
                'is_pinned': conv.is_pinned,
                'pinned_at': conv.pinned_at.isoformat() if conv.pinned_at else None,
                'message_count': conv.messages.count(),
                'created_at': conv.created_at.isoformat(),
                'updated_at': conv.updated_at.isoformat(),
            }
            for conv in conversations
        ]

    def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific conversation with all its messages.

        Args:
            conversation_id: UUID of conversation

        Returns:
            Conversation dictionary or None
        """
        from chatbot.models import Conversation

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                farmer_id=self.farmer_user.id
            )

            messages = [
                {
                    'id': msg.id,
                    'role': msg.role,
                    'content': msg.content,
                    'created_at': msg.created_at.isoformat(),
                }
                for msg in conversation.messages.order_by('created_at')
            ]

            return {
                'id': conversation.id,
                'title': conversation.title,
                'summary': conversation.summary,
                'is_pinned': conversation.is_pinned,
                'pinned_at': conversation.pinned_at.isoformat() if conversation.pinned_at else None,
                'message_count': len(messages),
                'created_at': conversation.created_at.isoformat(),
                'updated_at': conversation.updated_at.isoformat(),
                'messages': messages,
            }
        except Conversation.DoesNotExist:
            return None

    def archive_conversation(self, conversation_id: str) -> bool:
        """
        Archive a conversation.

        Args:
            conversation_id: UUID of conversation

        Returns:
            True if successful, False otherwise
        """
        from chatbot.models import Conversation

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                farmer_id=self.farmer_user.id
            )
            conversation.is_archived = True
            conversation.save(update_fields=['is_archived', 'updated_at'])
            logger.info(f"Archived conversation {conversation_id}")
            return True
        except Conversation.DoesNotExist:
            return False

    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages.

        Args:
            conversation_id: UUID of conversation

        Returns:
            True if successful, False otherwise
        """
        from chatbot.models import Conversation

        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                farmer_id=self.farmer_user.id
            )
            conversation.delete()
            logger.info(f"Deleted conversation {conversation_id}")
            return True
        except Conversation.DoesNotExist:
            return False
