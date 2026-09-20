"""
Context Builder for Farmer AI Assistant

Prepares the complete context for each LLM interaction including:
- Recent conversation messages
- Conversation summary
- Farmer memories
- Task/workflow state
- System prompt
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


class ContextBuilder:
    """
    Builds the complete message context for LLM interactions.
    """

    # Keep RECENT_MESSAGE_LIMIT small to avoid hitting the 8000 Tokens Per Minute (TPM) limit on Groq free tier.
    # A limit of 3 means up to 6 recent messages (user + assistant) are included, keeping token count low.
    RECENT_MESSAGE_LIMIT = 3  # Number of recent user-assistant interactions to include
    SUMMARY_THRESHOLD = 30     # Number of messages before summarization required

    def __init__(self, conversation, groq_service):
        """
        Initialize context builder.

        Args:
            conversation: Conversation model instance
            groq_service: Initialized GroqService instance
        """
        self.conversation = conversation
        self.groq_service = groq_service
        self.farmer_id = conversation.farmer_id

    def build_system_prompt(self) -> str:
        """
        Build the system prompt that defines assistant behavior.

        Returns:
            System prompt string
        """
        state = self.conversation.state if isinstance(self.conversation.state, dict) else {}
        language = state.get('language')

        if language:
            lang_instruction = f"Always respond in {language}."
        else:
            lang_instruction = "Respond in the language requested by the farmer (English, Hindi, or Gujarati)."

        farmer_loc_desc = "Gharaunda, Karnal (Haryana)"
        try:
            from farmer_profile.models import FarmerProfile
            prof = FarmerProfile.objects.get(user_id=self.farmer_id)
            farmer_loc_desc = f"Village {prof.village}, Taluka/District {prof.taluka}, State {prof.state}"
        except Exception:
            pass

        return f"""You are KisanConnect's Farmer AI Assistant - a helpful partner for Indian farmers.

Language Directive:
{lang_instruction}

Farmer Location & Mandi Grounding Directive:
- The authenticated farmer is based in: {farmer_loc_desc}.
- When the farmer asks for prices, rates, or mandis "near me", "nearby", or in their district (e.g. Karnal), ALWAYS ground your response in their local and neighboring mandis:
  1. Karnal Grain Market (Karnal Mandi)
  2. Gharaunda Mandi (Local mandi for Gharaunda)
  3. Taraori Mandi (Karnal - world renowned for Basmati Rice & Grains)
  4. Panipat Mandi (~30 km away)
  5. Kurukshetra Mandi (~35 km away)
- CRITICAL: NEVER substitute distant states or mandis (such as Ahmedabad, Anand, Vadodara, or Pune) when the farmer asks for prices near their location! Only mention distant markets if the farmer explicitly requests other states.

Guidelines:
1. Help farmers make better business decisions about crops, prices, orders, and logistics.
2. Be concise, friendly, and helpful.
3. When presenting structured data (market rates, listings, orders), format them clearly using Markdown tables.
4. MANDATORY: Always call the relevant tool(s) FIRST before answering ANY question about listings, orders, bids, or prices. NEVER fabricate, invent, assume, or estimate numbers, IDs, buyer names, prices, or quantities. Use ONLY data returned by tools.
5. If a tool returns empty results, say so clearly. Do NOT invent data to fill the gap.
6. If details are ambiguous, ask a brief clarifying question.
7. CRITICAL RULE FOR INVENTORY & FRESHNESS:
   If a crop or product is kept in cold storage (`stored_in_cold_storage` is True or `freshness` is 'Cold Storage'), ALWAYS state 'Cold Storage' under Freshness % / Storage in all tables and text. NEVER write '?', 'Unknown', or ask the farmer for freshness score for cold storage items, because cold storage preserves freshness.
8. THE TWO WHOLESALE CHANNELS — keep these STRICTLY SEPARATE, NEVER mix their data:

   CHANNEL A — "Wholesale Bids" (Direct Buyer Negotiations on farmer's listings):
   Tool: `get_quote_requests` — Returns bids placed directly on the farmer's crop listings.
   Fields: buyer username, crop listing, quantity, buyers_bid_price, your_counter_price, status.
   Status: pending=awaiting your action | offered=you countered | accepted=contract locked | rejected=declined.

   CHANNEL B — "Reverse Marketplace / Wholesale Buying Demands" (Bulk Pool Sourcing):
   Tool: `get_farmer_offers` — Returns your "Sourcing Contributions" to buyer pool demands.
   Tool: `get_bulk_requirements` — Returns open pool demands you could bid into.
   Each pool (BulkRequirement) has: total pool quantity, target price RANGE, delivery location, required date.
   Your contribution (FarmerOffer): your_offered_quantity, your_bid_rate, your_contribution_status.

   CRITICAL: NEVER invent Bid IDs, Pool IDs, buyer names, prices, or quantities not returned by these tools."""

    def build_messages(self, current_message: str) -> List[Dict[str, str]]:
        """
        Build the complete message list for LLM including:
        - System prompt
        - Conversation summary (if conversation is long)
        - Recent messages
        - Current user message

        Args:
            current_message: The new user message

        Returns:
            List of message dicts with role and content
        """
        messages = []

        # 1. System prompt
        messages.append({
            'role': 'system',
            'content': self.build_system_prompt()
        })

        # 2. Conversation summary (if needed)
        summary = self._get_or_generate_summary()
        if summary:
            messages.append({
                'role': 'system',
                'content': f"Previous conversation summary:\n{summary}"
            })

        # 3. Recent messages
        recent_messages = self._get_recent_messages()
        messages.extend(recent_messages)

        # 4. Farmer memories as context
        farmer_context = self._build_farmer_context()
        if farmer_context:
            messages.append({
                'role': 'system',
                'content': farmer_context
            })

        # 5. Task state context
        task_context = self._build_task_context()
        if task_context:
            messages.append({
                'role': 'system',
                'content': task_context
            })

        # 6. Current user message (only append if not already present at end of recent_messages)
        if not (recent_messages and recent_messages[-1].get('role') == 'user' and recent_messages[-1].get('content') == current_message):
            messages.append({
                'role': 'user',
                'content': current_message
            })

        logger.info(f"Built context with {len(messages)} messages for conversation {self.conversation.id}")
        return messages

    def _get_recent_messages(self) -> List[Dict[str, str]]:
        """
        Get the recent conversation messages.

        Returns:
            List of recent message dicts
        """
        from chatbot.models import ChatMessage

        messages = list(
            ChatMessage.objects.filter(
                conversation=self.conversation
            ).order_by('created_at')
        )

        # Filter out tool, system, and error messages
        valid_messages = []
        for msg in messages:
            if msg.role in ['tool', 'system']:
                continue
            meta = msg.metadata if isinstance(msg.metadata, dict) else {}
            if meta.get('error'):
                continue
            content = (msg.content or '').strip()
            if content.startswith('I am having trouble connecting') or content.startswith('Error code:'):
                continue
            valid_messages.append(msg)

        recent_window = max(self.RECENT_MESSAGE_LIMIT * 2, 1)
        if len(valid_messages) > recent_window:
            valid_messages = valid_messages[-recent_window:]

        result = []
        for msg in valid_messages:
            # Truncate older history items to max 600 chars to avoid TPM token bloat
            content = msg.content
            if len(content) > 600:
                content = content[:600] + "..."
            result.append({
                'role': msg.role,
                'content': content
            })

        return result

    def _get_or_generate_summary(self) -> Optional[str]:
        """
        Get conversation summary if it exists.
        If conversation is long, generate a summary before proceeding.

        Returns:
            Summary string or None
        """
        from chatbot.models import ChatMessage

        # Get message count
        message_count = ChatMessage.objects.filter(
            conversation=self.conversation
        ).count()

        # If already has a summary, return it
        if self.conversation.summary and self.conversation.summary.strip():
            return f"[Conversation has {message_count} messages]\n{self.conversation.summary}"

        # If below threshold, don't summarize
        if message_count < self.SUMMARY_THRESHOLD:
            return None

        # Generate summary if above threshold
        logger.info(f"Generating summary for conversation {self.conversation.id} with {message_count} messages")
        return self._generate_summary()

    def _generate_summary(self) -> Optional[str]:
        """
        Generate a summary of the conversation.

        Returns:
            Summary string or error message
        """
        from chatbot.models import ChatMessage

        # Load messages in memory and exclude the newest ones. This avoids
        # SQLite's rejection of negative queryset slicing while keeping the
        # correct "older messages only" summary behavior.
        all_messages = list(
            ChatMessage.objects.filter(
                conversation=self.conversation
            ).order_by('created_at')
        )

        summary_offset = max(self.RECENT_MESSAGE_LIMIT, 1)
        old_messages = all_messages[:-summary_offset] if len(all_messages) > summary_offset else []

        if not old_messages:
            return None

        # Build a condensed message history for summarization
        condensed = []
        for msg in old_messages:
            if msg.role in ['user', 'assistant']:
                condensed.append(f"{msg.role.upper()}: {msg.content[:100]}")

        if not condensed:
            return None

        # Use Groq to generate summary
        try:
            summary_prompt = f"""Please provide a brief summary (2-3 sentences) of this conversation:

{chr(10).join(condensed[-20:])}  # Last 20 messages

Focus on:
- What the farmer wanted to do
- What actions were taken
- What decisions were made

Summary:"""

            response = self.groq_service.send_message(
                messages=[{'role': 'user', 'content': summary_prompt}],
                temperature=0.3,
                max_tokens=256,
            )

            if response['status'] == 'success':
                summary = response['message'].content
                # Save summary to conversation
                self.conversation.summary = summary
                self.conversation.save(update_fields=['summary', 'updated_at'])
                logger.info(f"Generated summary for conversation {self.conversation.id}")
                return summary
            else:
                logger.warning(f"Failed to generate summary: {response.get('error')}")
                return None

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return None

    def _build_farmer_context(self) -> Optional[str]:
        """
        Build context from farmer profile and memories.

        Returns:
            Formatted farmer context or None
        """
        context_lines = []
        try:
            from farmer_profile.models import FarmerProfile
            prof = FarmerProfile.objects.get(user_id=self.farmer_id)
            context_lines.append(f"- Farmer Name: {prof.full_name or prof.user.username}")
            context_lines.append(f"- Farm Name: {prof.farm_name}")
            context_lines.append(f"- Location: Village {prof.village}, Taluka/District {prof.taluka}, State {prof.state}")
            context_lines.append(f"- Local Market Yards (Mandis): Karnal Grain Market, Gharaunda Mandi, Taraori Mandi, Panipat Mandi")
        except Exception:
            context_lines.append("- Location: Gharaunda, Karnal, Haryana")
            context_lines.append("- Local Market Yards (Mandis): Karnal Grain Market, Gharaunda Mandi, Taraori Mandi, Panipat Mandi")

        from chatbot.models import FarmerMemory

        memories = FarmerMemory.objects.filter(farmer_id=self.farmer_id)
        for memory in memories[:10]:  # Limit to 10 memories
            context_lines.append(f"- {memory.key}: {memory.value}")

        if not context_lines:
            return None

        return "Farmer Profile & Location Information:\n" + "\n".join(context_lines)


    def _build_task_context(self) -> Optional[str]:
        """
        Build context from current task/workflow state.

        Returns:
            Formatted task context or None
        """
        state = self.conversation.state
        if not state or not isinstance(state, dict) or len(state) == 0:
            return None

        # Check if there's an active task/workflow
        if 'intent' not in state:
            return None

        context_lines = [f"Active workflow: {state.get('intent')}"]
        for key, value in state.items():
            if key != 'intent':
                context_lines.append(f"  {key}: {value}")

        return "\n".join(context_lines)

    def update_farmer_memory(self, key: str, value: Any, source: str = 'conversation') -> None:
        """
        Store or update a farmer memory.

        Args:
            key: Memory key
            value: Memory value
            source: Source of the memory
        """
        from chatbot.models import FarmerMemory

        try:
            memory, created = FarmerMemory.objects.update_or_create(
                farmer_id=self.farmer_id,
                key=key,
                defaults={
                    'value': value,
                    'source': source,
                }
            )
            logger.info(f"Updated farmer memory {key} for farmer {self.farmer_id}")
        except Exception as e:
            logger.error(f"Error updating farmer memory: {str(e)}")

    def update_task_state(self, state_update: Dict[str, Any]) -> None:
        """
        Update the task/workflow state.

        Args:
            state_update: Dictionary with state updates to merge
        """
        if not isinstance(self.conversation.state, dict):
            self.conversation.state = {}

        self.conversation.state.update(state_update)
        self.conversation.save(update_fields=['state', 'updated_at'])
        logger.info(f"Updated task state for conversation {self.conversation.id}")

    def clear_task_state(self) -> None:
        """Clear the current task state."""
        self.conversation.state = {}
        self.conversation.save(update_fields=['state', 'updated_at'])
        logger.info(f"Cleared task state for conversation {self.conversation.id}")
