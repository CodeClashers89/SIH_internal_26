from django.core.management.base import BaseCommand
from django.utils import timezone
from chatbot.models import Conversation, ChatMessage, FarmerMemory, ToolCallLog
from users.models import User
import uuid


class Command(BaseCommand):
    help = 'Seed dummy chatbot data for local testing using SQLite'

    def handle(self, *args, **options):
        self.stdout.write('Clearing existing chatbot data...')
        ToolCallLog.objects.all().delete()
        ChatMessage.objects.all().delete()
        FarmerMemory.objects.all().delete()
        Conversation.objects.all().delete()

        farmer = User.objects.filter(role='farmer').first()
        if not farmer:
            farmer = User.objects.create_user(
                username='demo_farmer',
                email='demo_farmer@gmail.com',
                password='farmerpassword',
                role='farmer',
                phone='9876543210',
                is_verified=True,
                kyc_status='approved',
                address='Village Khed, Pune',
                pincode='411001',
                district='Pune',
            )

        conversation = Conversation.objects.create(
            farmer_id=farmer.id,
            title='Tomato pricing and shipment planning',
            summary='Farmer asked about tomato prices and logistics timeframe.',
            state={'crop': 'tomato', 'location': 'Pune', 'status': 'active'},
        )

        ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content='What is the current price for tomatoes in Pune market?',
        )

        ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content='Tomato prices in Pune are around ₹18-22 per kg today. Best time to sell is morning, and quality grades above A will fetch the highest price.',
        )

        ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content='I have 500 kg ready. Can you help me plan delivery?',
        )

        ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content='I can help. Based on your volume, I recommend contacting a logistics partner for next-day dispatch and keeping the produce in ventilated crates.',
        )

        FarmerMemory.objects.update_or_create(
            farmer_id=farmer.id,
            key='preferred_crop',
            defaults={'value': {'crop': 'tomato', 'variety': 'hybrid', 'market': 'Pune'}, 'source': 'explicit_user_input'}
        )

        FarmerMemory.objects.update_or_create(
            farmer_id=farmer.id,
            key='preferred_market',
            defaults={'value': {'market': 'Pune APMC', 'language': 'Hindi'}, 'source': 'system'}
        )

        ToolCallLog.objects.create(
            conversation=conversation,
            tool_name='get_market_prices',
            arguments={'crop': 'tomato', 'market': 'Pune'},
            result={'status': 'success', 'data': {'min_price': 18, 'max_price': 22, 'avg_price': 20}},
            status='success',
        )

        self.stdout.write(self.style.SUCCESS(f'Chatbot seed complete for farmer {farmer.id}'))
