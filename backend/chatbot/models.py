"""
Chatbot Models - Stored in separate chat database

Conversation data, messages, farmer memories, and tool call logs
are stored completely separately from the main KisanConnect business database.
"""

from django.db import models
import uuid


class Conversation(models.Model):
    """
    Represents a conversation between a farmer and the AI assistant.
    Stored in the chatbot database (separate Supabase instance).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer_id = models.IntegerField()  # References users.User.id (from main DB)
    title = models.CharField(max_length=255, blank=True, null=True)
    summary = models.TextField(default='', blank=True)
    state = models.JSONField(default=dict, blank=True)  # Task/workflow state
    is_archived = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversations'
        indexes = [
            models.Index(fields=['farmer_id']),
            models.Index(fields=['updated_at']),
            models.Index(fields=['farmer_id', 'updated_at']),
            models.Index(fields=['farmer_id', 'is_pinned', 'pinned_at']),
        ]

    def __str__(self):
        return f"Conversation {self.id} - Farmer {self.farmer_id}"


class ChatMessage(models.Model):
    """
    Individual messages in a conversation.
    Includes user messages, assistant responses, tool calls, and system messages.
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('tool', 'Tool'),
        ('system', 'System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)  # Additional data like tool_use_id, etc.
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'
        indexes = [
            models.Index(fields=['conversation']),
            models.Index(fields=['created_at']),
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"Message {self.id} ({self.role}) in {self.conversation.id}"


class FarmerMemory(models.Model):
    """
    Durable farmer-specific facts and preferences.
    Examples: preferred_language, preferred_market, common_crops, etc.
    Key-value store with automatic updates (unique constraint on farmer_id + key).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer_id = models.IntegerField()  # References users.User.id
    key = models.CharField(max_length=100)
    value = models.JSONField()
    source = models.CharField(
        max_length=50,
        default='conversation',
        choices=[
            ('conversation', 'Conversation'),
            ('explicit_user_input', 'Explicit User Input'),
            ('system', 'System'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'farmer_memories'
        indexes = [
            models.Index(fields=['farmer_id']),
            models.Index(fields=['farmer_id', 'key']),
        ]
        unique_together = ['farmer_id', 'key']

    def __str__(self):
        return f"Memory {self.farmer_id}:{self.key}"


class ToolCallLog(models.Model):
    """
    Log of all tool calls made by the LLM during conversations.
    Used for debugging, monitoring, and audit trails.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='tool_calls'
    )
    tool_name = models.CharField(max_length=100)
    arguments = models.JSONField(null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tool_call_logs'
        indexes = [
            models.Index(fields=['conversation']),
            models.Index(fields=['created_at']),
            models.Index(fields=['tool_name']),
        ]

    def __str__(self):
        return f"ToolCall {self.tool_name} in {self.conversation.id} - {self.status}"
