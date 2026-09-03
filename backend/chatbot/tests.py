"""
Tests for the Chatbot app
Tests cover conversation management, message storage, tool execution, and security
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime, timedelta
from decimal import Decimal
import json
import os

from .models import Conversation, ChatMessage, FarmerMemory, ToolCallLog
from .services.groq_service import GroqService

User = get_user_model()


class ChatbotModelTests(TestCase):
    """Test chatbot models"""
    databases = {'default', 'chatbot'}

    def setUp(self):
        self.farmer = User.objects.create_user(
            username='testfarmer',
            email='farmer@test.com',
            password='testpass123',
            role='farmer'
        )

    def test_conversation_creation(self):
        """Test creating a conversation"""
        conv = Conversation.objects.create(
            farmer_id=self.farmer.id,
            title='Test Conversation'
        )
        self.assertEqual(conv.farmer_id, self.farmer.id)
        self.assertEqual(conv.title, 'Test Conversation')
        self.assertFalse(conv.is_archived)

    def test_chat_message_creation(self):
        """Test creating chat messages"""
        conv = Conversation.objects.create(farmer_id=self.farmer.id)
        
        msg = ChatMessage.objects.create(
            conversation=conv,
            role='user',
            content='Hello assistant'
        )
        self.assertEqual(msg.role, 'user')
        self.assertEqual(msg.content, 'Hello assistant')

    def test_farmer_memory_creation(self):
        """Test creating farmer memories"""
        memory = FarmerMemory.objects.create(
            farmer_id=self.farmer.id,
            key='preferred_crop',
            value={'crop': 'tomato', 'area': 5},
            source='conversation'
        )
        self.assertEqual(memory.key, 'preferred_crop')
        self.assertEqual(memory.value['crop'], 'tomato')

    def test_farmer_memory_unique_constraint(self):
        """Test that farmer memories have unique (farmer_id, key) constraint"""
        FarmerMemory.objects.create(
            farmer_id=self.farmer.id,
            key='test_key',
            value={'test': 'value'}
        )
        
        # Create another with same key - should update instead of create
        memory2, created = FarmerMemory.objects.update_or_create(
            farmer_id=self.farmer.id,
            key='test_key',
            defaults={'value': {'updated': 'value'}}
        )
        
        # Should only have one memory with this key
        count = FarmerMemory.objects.filter(
            farmer_id=self.farmer.id,
            key='test_key'
        ).count()
        self.assertEqual(count, 1)
        self.assertEqual(memory2.value['updated'], 'value')

    def test_tool_call_log_creation(self):
        """Test creating tool call logs"""
        conv = Conversation.objects.create(farmer_id=self.farmer.id)
        
        log = ToolCallLog.objects.create(
            conversation=conv,
            tool_name='get_market_prices',
            arguments={'crop': 'tomato'},
            result={'price': 25},
            status='success'
        )
        self.assertEqual(log.tool_name, 'get_market_prices')
        self.assertEqual(log.status, 'success')

    def test_context_builder_handles_short_conversation(self):
        """Short conversations should not trigger negative queryset slicing."""
        from .services.context_builder import ContextBuilder

        conv = Conversation.objects.create(farmer_id=self.farmer.id, title='Short chat')
        ChatMessage.objects.create(conversation=conv, role='user', content='Hello')

        builder = ContextBuilder(conv, GroqService())
        messages = builder.build_messages('How are prices today?')

        self.assertTrue(any(msg['role'] == 'user' and msg['content'] == 'How are prices today?' for msg in messages))
        self.assertTrue(len(messages) >= 2)

    def test_groq_service_requires_api_key_without_fallback(self):
        """Chatbot must not silently fall back to a fake offline response when Groq is not configured."""
        original_key = os.environ.get('GROQ_API_KEY')
        os.environ.pop('GROQ_API_KEY', None)
        try:
            service = GroqService()
            response = service.send_message([
                {'role': 'user', 'content': 'What is the best crop price today?'}
            ])
            self.assertFalse(getattr(service, 'offline_mode', False))
            self.assertEqual(response['status'], 'error')
            self.assertIn('GROQ_API_KEY', response['error'])
            self.assertNotIn('offline', response['error'].lower())
        finally:
            if original_key is not None:
                os.environ['GROQ_API_KEY'] = original_key


class ChatAPITests(APITestCase):
    """Test chatbot API endpoints"""
    databases = {'default', 'chatbot'}

    def setUp(self):
        self.client = Client()
        
        # Create a farmer user
        self.farmer = User.objects.create_user(
            username='testfarmer',
            email='farmer@test.com',
            password='testpass123',
            role='farmer'
        )
        
        # Create a non-farmer user
        self.consumer = User.objects.create_user(
            username='testconsumer',
            email='consumer@test.com',
            password='testpass123',
            role='consumer'
        )

    def get_token(self, user):
        """Get JWT token for a user"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_unauthorized_access(self):
        """Test that unauthenticated users cannot access chat"""
        response = self.client.get('/api/chat/conversations/')
        self.assertEqual(response.status_code, 401)

    def test_non_farmer_access_denied(self):
        """Test that non-farmers cannot access chat"""
        token = self.get_token(self.consumer)
        response = self.client.get(
            '/api/chat/conversations/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 403)

    def test_farmer_can_access_chat(self):
        """Test that farmers can access chat endpoints"""
        token = self.get_token(self.farmer)
        response = self.client.get(
            '/api/chat/conversations/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)

    def test_create_conversation(self):
        """Test creating a conversation"""
        token = self.get_token(self.farmer)
        response = self.client.post(
            '/api/chat/conversations/',
            {},
            HTTP_AUTHORIZATION=f'Bearer {token}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', response.json())

    def test_get_conversations(self):
        """Test getting farmer's conversations"""
        # Create a conversation
        Conversation.objects.create(
            farmer_id=self.farmer.id,
            title='Test Conversation'
        )
        
        token = self.get_token(self.farmer)
        response = self.client.get(
            '/api/chat/conversations/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_farmer_isolation(self):
        """Test that farmers only see their own conversations"""
        # Create conversation for farmer1
        conv1 = Conversation.objects.create(
            farmer_id=self.farmer.id,
            title='Farmer1 Conv'
        )
        
        # Create conversation for farmer2
        other_farmer = User.objects.create_user(
            username='farmer2',
            email='farmer2@test.com',
            password='testpass123',
            role='farmer'
        )
        conv2 = Conversation.objects.create(
            farmer_id=other_farmer.id,
            title='Farmer2 Conv'
        )
        
        # Farmer1 should only see their conversation
        token = self.get_token(self.farmer)
        response = self.client.get(
            '/api/chat/conversations/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        conversations = response.json()
        self.assertEqual(len(conversations), 1)
        self.assertEqual(str(conversations[0]['id']), str(conv1.id))

    def test_delete_conversation(self):
        """Test deleting a conversation"""
        conv = Conversation.objects.create(farmer_id=self.farmer.id)
        
        token = self.get_token(self.farmer)
        response = self.client.delete(
            f'/api/chat/conversations/{conv.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        
        # Verify it's deleted
        self.assertFalse(
            Conversation.objects.filter(id=conv.id).exists()
        )

    def test_cannot_delete_other_farmers_conversation(self):
        """Test that farmers cannot delete other farmers' conversations"""
        other_farmer = User.objects.create_user(
            username='farmer2',
            email='farmer2@test.com',
            password='testpass123',
            role='farmer'
        )
        conv = Conversation.objects.create(farmer_id=other_farmer.id)
        
        token = self.get_token(self.farmer)
        response = self.client.delete(
            f'/api/chat/conversations/{conv.id}/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 404)


class ConversationContextTests(TestCase):
    """Test conversation context and memory management"""
    databases = {'default', 'chatbot'}

    def setUp(self):
        self.farmer = User.objects.create_user(
            username='testfarmer',
            password='testpass123',
            role='farmer'
        )
        self.conversation = Conversation.objects.create(farmer_id=self.farmer.id)

    def test_conversation_summary_storage(self):
        """Test storing conversation summary"""
        summary_text = "Farmer discussed tomato pricing and created listing"
        self.conversation.summary = summary_text
        self.conversation.save()
        
        retrieved = Conversation.objects.get(id=self.conversation.id)
        self.assertEqual(retrieved.summary, summary_text)

    def test_conversation_state_storage(self):
        """Test storing task state in conversation"""
        state = {
            'intent': 'CREATE_LISTING',
            'crop': 'tomato',
            'quantity': 500,
            'unit': 'kg',
            'awaiting_confirmation': True
        }
        self.conversation.state = state
        self.conversation.save()
        
        retrieved = Conversation.objects.get(id=self.conversation.id)
        self.assertEqual(retrieved.state['intent'], 'CREATE_LISTING')
        self.assertEqual(retrieved.state['quantity'], 500)

    def test_recent_messages_retrieval(self):
        """Test retrieving recent messages from conversation"""
        # Create 20 messages
        for i in range(20):
            role = 'user' if i % 2 == 0 else 'assistant'
            ChatMessage.objects.create(
                conversation=self.conversation,
                role=role,
                content=f'Message {i}'
            )
        
        # Get recent 15
        messages = self.conversation.messages.all().order_by('created_at')
        self.assertGreaterEqual(messages.count(), 15)


class ToolExecutionTests(TestCase):
    """Test tool execution and security"""

    def setUp(self):
        from farmer_profile.models import FarmerProfile
        
        self.farmer = User.objects.create_user(
            username='testfarmer',
            password='testpass123',
            role='farmer',
            district='Maharashtra'
        )
        
        # Create farmer profile
        FarmerProfile.objects.create(
            user=self.farmer,
            full_name='Test Farmer',
            state='Maharashtra'
        )

    def test_tool_executor_initialization(self):
        """Test ToolExecutor initializes correctly"""
        from chatbot.services.tools import ToolExecutor
        
        executor = ToolExecutor(self.farmer)
        self.assertEqual(executor.farmer_user, self.farmer)
        self.assertEqual(executor.farmer_id, self.farmer.id)

    def test_tool_get_farmer_profile(self):
        """Test getting farmer profile through tool"""
        from chatbot.services.tools import ToolExecutor
        
        executor = ToolExecutor(self.farmer)
        result = executor.tool_get_farmer_profile({})
        
        self.assertEqual(result['farmer_id'], self.farmer.id)
        self.assertEqual(result['full_name'], 'Test Farmer')

    def test_tool_authorization(self):
        """Test that tools respect farmer ownership"""
        from chatbot.services.tools import ToolExecutor
        
        # Create a product for this farmer
        from products.models import Product
        from datetime import date
        
        product = Product.objects.create(
            farmer=self.farmer,
            name='Tomato',
            category='vegetables',
            quantity=Decimal('100'),
            unit='kg',
            price_per_unit=Decimal('25'),
            harvest_date=date.today(),
            expiry_date=date.today() + timedelta(days=7)
        )
        
        # This farmer's tool should work
        executor = ToolExecutor(self.farmer)
        result = executor.tool_update_listing({
            'product_id': product.id,
            'price_per_unit': 30
        })
        self.assertEqual(result['status'], 'success')
        
        # Other farmer's tool should not work
        other_farmer = User.objects.create_user(
            username='other',
            password='testpass123',
            role='farmer'
        )
        other_executor = ToolExecutor(other_farmer)
        result = other_executor.tool_update_listing({
            'product_id': product.id,
            'price_per_unit': 30
        })
        self.assertEqual(result['status'], 'error')

    def test_get_bulk_requirements_handles_null_args(self):
        """Test get_bulk_requirements tool handles None/null argument values without throwing TypeError/AttributeError"""
        from chatbot.services.tools import ToolExecutor

        executor = ToolExecutor(self.farmer)
        # LLMs generate {'crop': None, 'location': None} when no filter parameters are supplied
        result = executor.tool_get_bulk_requirements({'crop': None, 'location': None})
        self.assertIsInstance(result, list)

    def test_tool_definitions_schema_supports_nullable_fields(self):
        """Test that optional properties in TOOL_DEFINITIONS allow ['type', 'null'] so Groq API validation succeeds"""
        from chatbot.services.tools import TOOL_DEFINITIONS

        bulk_req_tool = next(t for t in TOOL_DEFINITIONS if t['function']['name'] == 'get_bulk_requirements')
        crop_prop = bulk_req_tool['function']['parameters']['properties']['crop']
        location_prop = bulk_req_tool['function']['parameters']['properties']['location']

        self.assertEqual(crop_prop['type'], ['string', 'null'])
        self.assertEqual(location_prop['type'], ['string', 'null'])


class DatabaseRoutingTests(TestCase):
    """Test that chatbot models use the correct database"""

    def test_chatbot_models_use_chatbot_db(self):
        """Test that chatbot models are routed to chatbot database"""
        from chatbot.routers import ChatbotRouter
        
        router = ChatbotRouter()
        
        # Create a mock conversation model
        from chatbot.models import Conversation
        
        # Test read routing
        db = router.db_for_read(Conversation)
        self.assertEqual(db, 'chatbot')
        
        # Test write routing
        db = router.db_for_write(Conversation)
        self.assertEqual(db, 'chatbot')

    def test_non_chatbot_models_unaffected(self):
        """Test that non-chatbot models are unaffected by routing"""
        from chatbot.routers import ChatbotRouter
        
        router = ChatbotRouter()
        
        # Non-chatbot models should return None (use default)
        db = router.db_for_read(User)
        self.assertIsNone(db)


# Integration Tests
class ChatbotIntegrationTests(APITestCase):
    """End-to-end integration tests"""
    databases = {'default', 'chatbot'}

    def setUp(self):
        self.farmer = User.objects.create_user(
            username='testfarmer',
            password='testpass123',
            role='farmer'
        )

    def get_token(self):
        refresh = RefreshToken.for_user(self.farmer)
        return str(refresh.access_token)

    def test_full_conversation_flow(self):
        """Test full conversation creation and messaging flow"""
        token = self.get_token()
        
        # 1. Create conversation
        response = self.client.post(
            '/api/chat/conversations/',
            {},
            HTTP_AUTHORIZATION=f'Bearer {token}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        conv_id = response.json()['id']
        
        # 2. Get conversations list
        response = self.client.get(
            '/api/chat/conversations/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        conversations = response.json()
        self.assertEqual(len(conversations), 1)
        
        # 3. Get conversation detail
        response = self.client.get(
            f'/api/chat/conversations/{conv_id}/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, 200)
        detail = response.json()
        self.assertEqual(str(detail['id']), str(conv_id))
        
        # 4. Archive conversation
        response = self.client.post(
            f'/api/chat/conversations/{conv_id}/archive/',
            {},
            HTTP_AUTHORIZATION=f'Bearer {token}',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        
        # 5. Verify archived
        conv = Conversation.objects.get(id=conv_id)
        self.assertTrue(conv.is_archived)
