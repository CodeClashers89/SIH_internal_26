"""
Chatbot API Views
REST endpoints for chat functionality.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone
from .models import Conversation, ChatMessage
from .serializers import (
    ConversationSerializer,
    ConversationListSerializer,
    ChatMessageSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
)
from .services.groq_service import GroqService
from .services.chat_manager import ChatManager
from users.permissions import IsFarmer

logger = logging.getLogger(__name__)


class IsFarmerUser(permissions.BasePermission):
    """Permission check for farmer users only."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'farmer'


class ChatAPIView(APIView):
    """
    Main chat endpoint for sending messages and receiving responses.
    POST /api/chat/ - Send a message, get a response
    """
    permission_classes = [permissions.IsAuthenticated, IsFarmerUser]

    def post(self, request):
        """
        Process a chat message.
        Expects: { "conversation_id": "uuid" (optional), "message": "user message" }
        Returns: { "conversation_id": "uuid", "message": "response", ... }
        """
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')

        try:
            # Initialize services
            groq_service = GroqService()
            chat_manager = ChatManager(request.user, groq_service)

            # Process the message
            response_text, conv_id, metadata = chat_manager.process_chat_message(
                user_message=user_message,
                conversation_id=conversation_id,
            )

            return Response({
                'conversation_id': conv_id,
                'message': response_text,
                'tool_calls': metadata.get('tool_calls', 0),
                'tool_activity': metadata.get('tool_activity', []),
            })

        except Exception as e:
            logger.error(f"Error in chat API: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConversationListView(APIView):
    """
    GET /api/chat/conversations/ - Get farmer's conversations
    POST /api/chat/conversations/ - Create new conversation
    """
    permission_classes = [permissions.IsAuthenticated, IsFarmerUser]

    def get(self, request):
        """Get list of farmer's conversations."""
        try:
            groq_service = GroqService()
            chat_manager = ChatManager(request.user, groq_service)
            conversations = chat_manager.get_conversations(limit=20)
            return Response(conversations)
        except Exception as e:
            logger.error(f"Error fetching conversations: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """Create a new conversation."""
        try:
            conversation = Conversation.objects.create(
                farmer_id=request.user.id,
                title='New Conversation',
            )
            serializer = ConversationListSerializer(conversation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConversationDetailView(APIView):
    """
    GET /api/chat/conversations/{id}/ - Get conversation with messages
    DELETE /api/chat/conversations/{id}/ - Delete conversation
    """
    permission_classes = [permissions.IsAuthenticated, IsFarmerUser]

    def get(self, request, conversation_id):
        """Get a specific conversation."""
        try:
            groq_service = GroqService()
            chat_manager = ChatManager(request.user, groq_service)
            conversation = chat_manager.get_conversation(str(conversation_id))

            if not conversation:
                return Response(
                    {'error': 'Conversation not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response(conversation)
        except Exception as e:
            logger.error(f"Error fetching conversation: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, conversation_id):
        """Delete a conversation."""
        try:
            groq_service = GroqService()
            chat_manager = ChatManager(request.user, groq_service)
            success = chat_manager.delete_conversation(str(conversation_id))

            if not success:
                return Response(
                    {'error': 'Conversation not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({'message': 'Conversation deleted'})
        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, conversation_id):
        """Update conversation title or pin status."""
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                farmer_id=request.user.id
            )

            data = request.data
            if 'title' in data:
                title = (data['title'] or '').strip()
                if not title:
                    return Response(
                        {'error': 'Title cannot be empty'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                conversation.title = title[:60]

            if 'is_pinned' in data:
                is_pinned = bool(data['is_pinned'])
                conversation.is_pinned = is_pinned
                if is_pinned:
                    conversation.pinned_at = timezone.now()
                else:
                    conversation.pinned_at = None

            conversation.save()

            return Response({
                'id': conversation.id,
                'title': conversation.title,
                'is_pinned': conversation.is_pinned,
                'pinned_at': conversation.pinned_at.isoformat() if conversation.pinned_at else None,
                'message_count': conversation.messages.count(),
                'updated_at': conversation.updated_at.isoformat(),
            })
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error updating conversation: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConversationArchiveView(APIView):
    """
    POST /api/chat/conversations/{id}/archive/ - Archive conversation
    """
    permission_classes = [permissions.IsAuthenticated, IsFarmerUser]

    def post(self, request, conversation_id):
        """Archive a conversation."""
        try:
            groq_service = GroqService()
            chat_manager = ChatManager(request.user, groq_service)
            success = chat_manager.archive_conversation(str(conversation_id))

            if not success:
                return Response(
                    {'error': 'Conversation not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({'message': 'Conversation archived'})
        except Exception as e:
            logger.error(f"Error archiving conversation: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
