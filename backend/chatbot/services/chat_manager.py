"""
Chat Manager Service
Orchestrates the chat flow: context building, LLM calls, tool execution, and message storage.
"""

import logging
import json
from typing import Dict, Any, Optional, Tuple
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChatManager:
    """
    Manages the complete chat flow for a farmer-assistant interaction.
    """

    MAX_TOOL_CALLS_PER_TURN = 5

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

        # 3. Build context
        context_builder = ContextBuilder(conversation, self.groq_service)
        messages = context_builder.build_messages(user_message)

        # 4. Call Groq with tools
        groq_response = self.groq_service.send_message(
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice='auto',
            temperature=0.7,
            max_tokens=1024,
        )

        if groq_response['status'] == 'error':
            error_msg = f"Error from LLM: {groq_response['error']}"
            logger.error(error_msg)
            return error_msg, str(conversation_id), {'error': groq_response['error']}

        # 5. Process response and handle tool calls
        assistant_message = groq_response['message']
        final_response = ""
        tool_activity = []
        tool_call_count = 0

        # Tool-call loop: execute tools and feed results back to the LLM
        # so it can produce a final natural-language answer.
        current_messages = list(messages)  # copy to extend with tool context
        max_iterations = self.MAX_TOOL_CALLS_PER_TURN

        while (
            hasattr(assistant_message, 'tool_calls')
            and assistant_message.tool_calls
            and tool_call_count < max_iterations
        ):
            logger.info(f"Processing {len(assistant_message.tool_calls)} tool calls")
            tool_executor = ToolExecutor(self.farmer_user)

            # Add assistant message (with tool_calls) to context
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

                # Add tool result message to context for the LLM
                result_content = json.dumps(
                    tool_result.get('result') or {'error': tool_result.get('error', 'unknown')},
                    default=str,
                )
                current_messages.append({
                    'role': 'tool',
                    'tool_call_id': tool_call.id,
                    'content': result_content,
                })

            # Call LLM again with tool results so it can produce a final answer
            followup_response = self.groq_service.send_message(
                messages=current_messages,
                tools=TOOL_DEFINITIONS,
                tool_choice='auto',
                temperature=0.7,
                max_tokens=1024,
            )

            if followup_response['status'] == 'error':
                logger.error(f"Error in follow-up LLM call: {followup_response['error']}")
                final_response = "I found some information but encountered an error summarizing it. Please try again."
                break

            assistant_message = followup_response['message']

        # 6. Get final response from assistant
        if assistant_message.content:
            final_response = assistant_message.content
        elif not final_response:
            final_response = "I'm sorry, I couldn't generate a response. Please try again."

        # 7. Save assistant message
        assistant_msg_record = ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=final_response,
            metadata={'tool_call_count': tool_call_count},
        )
        logger.info(f"Saved assistant message {assistant_msg_record.id}")

        # 8. Update conversation title if new
        if not conversation.title or conversation.title.endswith("..."):
            # Generate a title from the user's intent
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
