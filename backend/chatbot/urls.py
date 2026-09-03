"""
Chatbot URLs
"""

from django.urls import path
from .views import (
    ChatAPIView,
    ConversationListView,
    ConversationDetailView,
    ConversationArchiveView,
)

urlpatterns = [
    # Chat endpoint
    path('', ChatAPIView.as_view(), name='chat'),

    # Conversation management
    path('conversations/', ConversationListView.as_view(), name='conversation-list'),
    path('conversations/<uuid:conversation_id>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<uuid:conversation_id>/archive/', ConversationArchiveView.as_view(), name='conversation-archive'),
]
