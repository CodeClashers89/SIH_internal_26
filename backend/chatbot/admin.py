"""
Chatbot Admin Configuration
"""

from django.contrib import admin
from .models import Conversation, ChatMessage, FarmerMemory, ToolCallLog


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'farmer_id', 'title', 'is_archived', 'created_at', 'updated_at')
    list_filter = ('is_archived', 'created_at', 'updated_at')
    search_fields = ('title', 'farmer_id')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Conversation', {
            'fields': ('id', 'farmer_id', 'title', 'summary', 'state'),
        }),
        ('Status', {
            'fields': ('is_archived',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'role', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('conversation__id', 'content')
    readonly_fields = ('id', 'created_at')
    fieldsets = (
        ('Message', {
            'fields': ('id', 'conversation', 'role', 'content', 'metadata'),
        }),
        ('Timestamp', {
            'fields': ('created_at',),
        }),
    )


@admin.register(FarmerMemory)
class FarmerMemoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'farmer_id', 'key', 'source', 'created_at', 'updated_at')
    list_filter = ('source', 'created_at', 'updated_at')
    search_fields = ('farmer_id', 'key')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Memory', {
            'fields': ('id', 'farmer_id', 'key', 'value', 'source'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )


@admin.register(ToolCallLog)
class ToolCallLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'tool_name', 'status', 'created_at')
    list_filter = ('tool_name', 'status', 'created_at')
    search_fields = ('conversation__id', 'tool_name')
    readonly_fields = ('id', 'created_at')
    fieldsets = (
        ('Tool Call', {
            'fields': ('id', 'conversation', 'tool_name', 'arguments', 'result'),
        }),
        ('Status', {
            'fields': ('status', 'error_message'),
        }),
        ('Timestamp', {
            'fields': ('created_at',),
        }),
    )
