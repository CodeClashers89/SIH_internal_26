"""
Chatbot Serializers - DRF serializers for chatbot models
"""

from rest_framework import serializers
from .models import Conversation, ChatMessage, FarmerMemory, ToolCallLog


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'summary', 'state', 'is_pinned', 'pinned_at',
            'created_at', 'updated_at', 'messages', 'message_count',
            'last_message_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message_at(self, obj):
        last_message = obj.messages.last()
        return last_message.created_at if last_message else None


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation list view"""
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'summary', 'is_pinned', 'pinned_at',
            'created_at', 'updated_at', 'message_count',
            'last_message_preview'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message_preview(self, obj):
        last_message = obj.messages.last()
        if last_message:
            preview = last_message.content[:100]
            return f"{last_message.role}: {preview}{'...' if len(last_message.content) > 100 else ''}"
        return None


class FarmerMemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerMemory
        fields = ['id', 'key', 'value', 'source', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ToolCallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToolCallLog
        fields = [
            'id', 'tool_name', 'arguments', 'result', 'status',
            'error_message', 'created_at'
        ]
        read_only_fields = [
            'id', 'created_at'
        ]


class ChatRequestSerializer(serializers.Serializer):
    """Serializer for incoming chat messages"""
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    message = serializers.CharField(max_length=5000)


class ChatResponseSerializer(serializers.Serializer):
    """Serializer for outgoing chat responses"""
    conversation_id = serializers.UUIDField()
    message = serializers.CharField()
    actions = serializers.ListField(required=False)
    tool_activity = serializers.ListField(required=False)
