import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.db import transaction

# Import all relevant models
from products.models import Product
from orders.models import Order, OrderItem, PreHarvestContract, BulkRequirement, FarmerOffer, QuoteRequest
from logistics.models import DeliveryShipment, LogisticsPartner
from pricing.models import Market, MarketPrice

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely clears existing transactional data and seeds a deterministic dataset for chatbot testing.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion of existing test/business data.',
        )
        parser.add_argument(
            '--clear-chatbot',
            action='store_true',
            help='Also clear chatbot database tables (Conversations, Messages, Tool logs).',
        )

    def handle(self, *args, **options):
        # 1. Environment Safety Check
        is_safe = getattr(settings, 'DEBUG', False)
        env = os.environ.get('DJANGO_ENV', 'development')
        if not is_safe or env.lower() == 'production':
            self.stdout.write(self.style.ERROR("ERROR: This command appears to be running in a production environment."))
            self.stdout.write(self.style.ERROR(f"DEBUG={is_safe}, DJANGO_ENV={env}"))
            self.stdout.write(self.style.ERROR("Aborting to prevent data loss."))
            sys.exit(1)

        # 2. Require --confirm
        if not options['confirm']:
            self.stdout.write(self.style.ERROR("ERROR: This command deletes existing development/test business data."))
            self.stdout.write(self.style.ERROR("Run with --confirm to continue."))
            sys.exit(1)

        self.stdout.write(self.style.WARNING("=== STARTING RESET AND SEED ==="))

        with transaction.atomic():
            # 3. Preserve Users & Identify the primary test farmer
            try:
                farmer1 = User.objects.get(username='farmer1', role='farmer')
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR("ERROR: Primary test user 'farmer1' does not exist."))
                sys.exit(1)

            # Ensure we have a buyer
            buyer1, _ = User.objects.get_or_create(
                username='bulk_buyer1',
                defaults={'role': 'bulk_buyer', 'email': 'buyer@test.com'}
            )
            
            # Ensure we have a consumer for retail orders
            consumer1, _ = User.objects.get_or_create(
                username='consumer1',
                defaults={'role': 'consumer', 'email': 'consumer@test.com'}
            )

            # Ensure we have a logistics partner
            logistics_partner, _ = LogisticsPartner.objects.get_or_create(
                name='Test Logistics',
                defaults={'district': 'Pune', 'pincode': '411001', 'phone': '9999999999', 'active': True}
            )

            # 4. Safe Database Wipe
            self.stdout.write(self.style.NOTICE("Clearing old transactional data..."))
            
            DeliveryShipment.objects.all().delete()
            OrderItem.objects.all().delete()
            Order.objects.all().delete()
            
            FarmerOffer.objects.all().delete()
            BulkRequirement.objects.all().delete()
            QuoteRequest.objects.all().delete()
            PreHarvestContract.objects.all().delete()
            
            Product.objects.all().delete()
            
            MarketPrice.objects.all().delete()
            # Note: We won't delete Markets, we will reuse or create.
            
            if options['clear_chatbot']:
                self.stdout.write(self.style.NOTICE("Clearing Chatbot tables..."))
                from chatbot.models import Conversation, FarmerMemory
                # ToolCallLog and ChatMessage will cascade
                Conversation.objects.all().delete()
                # Optional: FarmerMemory.objects.all().delete()

            # 5. Seeding Data
            self.stdout.write(self.style.NOTICE("Seeding deterministic data..."))
            now = timezone.now()
            today = now.date()
            future_date = today + timedelta(days=30)
            recent_date = today - timedelta(days=2)
            
            # --- INVENTORY ---
            prod1 = Product.objects.create(
                farmer=farmer1,
                name="Organic Red Tomatoes",
                category="vegetables",
                quantity=500.00,
                unit="kg",
                price_per_unit=25.00,
                harvest_date=recent_date,
                expiry_date=today + timedelta(days=10),
                description="Fresh organic tomatoes from Pune."
            )
            
            prod2 = Product.objects.create(
                farmer=farmer1,
                name="Fresh Potatoes",
                category="vegetables",
                quantity=1000.00,
                unit="kg",
                price_per_unit=18.00,
                harvest_date=recent_date,
                expiry_date=today + timedelta(days=60),
                description="High quality potatoes."
            )

            # --- WHOLESALE NEGOTIATIONS (BulkRequirements & Offers) ---
            req1 = BulkRequirement.objects.create(
                buyer=buyer1,
                crop_name="Apple",
                variety="Kashmiri",
                quantity=1500.00,
                unit="kg",
                required_date=future_date,
                target_price_min=80.00,
                target_price_max=95.00,
                location="Pune Cold Chain Hub",
                status="pending"
            )
            
            offer1 = FarmerOffer.objects.create(
                requirement=req1,
                farmer=farmer1,
                quantity=500.00,
                price_per_unit=85.00,
                delivery_date=future_date,
                status="pending"
            )
            
            req2 = BulkRequirement.objects.create(
                buyer=buyer1,
                crop_name="Onion",
                variety="Red Onion",
                quantity=2000.00,
                unit="kg",
                required_date=future_date,
                target_price_min=20.00,
                target_price_max=25.00,
                location="Pune",
                status="pending"
            )
            
            offer2 = FarmerOffer.objects.create(
                requirement=req2,
                farmer=farmer1,
                quantity=1000.00,
                price_per_unit=22.00,
                delivery_date=future_date,
                status="countered"
            )

            # --- PRE-HARVEST CONTRACTS ---
            contract1 = PreHarvestContract.objects.create(
                farmer=farmer1,
                buyer=buyer1,
                crop_name="Wheat",
                expected_harvest_date=future_date,
                expected_quantity=1000.00,
                unit="kg",
                contract_price=28.00,
                status="accepted"
            )
            
            contract2 = PreHarvestContract.objects.create(
                farmer=farmer1,
                buyer=buyer1,
                crop_name="Tomato",
                expected_harvest_date=future_date,
                expected_quantity=500.00,
                unit="kg",
                contract_price=25.00,
                status="accepted"
            )

            # --- RETAIL ORDERS & LOGISTICS ---
            order1 = Order.objects.create(
                buyer=consumer1,
                product_subtotal=600.00,
                shipping_charge=50.00,
                total_amount=650.00,
                status="packed",
                shipping_address="123 Consumer St, Pune",
                shipping_pincode="411002"
            )
            OrderItem.objects.create(
                order=order1,
                product=prod1,
                quantity=20.00,
                price=30.00
            )
            shipment1 = DeliveryShipment.objects.create(
                order=order1,
                partner=logistics_partner,
                pickup_address="Farmer1 Farm, Pune",
                delivery_address="123 Consumer St, Pune",
                status="picked_up"
            )
            
            order2 = Order.objects.create(
                buyer=consumer1,
                product_subtotal=1100.00,
                shipping_charge=50.00,
                total_amount=1150.00,
                status="placed",
                shipping_address="456 Other St, Pune",
                shipping_pincode="411003"
            )
            OrderItem.objects.create(
                order=order2,
                product=prod2,
                quantity=50.00,
                price=22.00
            )
            shipment2 = DeliveryShipment.objects.create(
                order=order2,
                partner=logistics_partner,
                pickup_address="Farmer1 Farm, Pune",
                delivery_address="456 Other St, Pune",
                status="assigned"
            )

            # --- MARKET PRICES ---
            pune_market, _ = Market.objects.get_or_create(
                normalized_name="pune",
                defaults={
                    "name": "Pune APMC",
                    "district": "Pune",
                    "state": "Maharashtra",
                    "is_active": True
                }
            )
            
            MarketPrice.objects.create(
                market=pune_market,
                commodity="Tomato",
                min_price=2200.00,
                max_price=2700.00,
                modal_price=2500.00, # Per quintal
                unit="Rs/Quintal",
                reported_date=today
            )
            
            MarketPrice.objects.create(
                market=pune_market,
                commodity="Potato",
                min_price=1500.00,
                max_price=2000.00,
                modal_price=1800.00,
                unit="Rs/Quintal",
                reported_date=today
            )

        # 6. Print Summary
        self.stdout.write(self.style.SUCCESS("\n========================================"))
        self.stdout.write(self.style.SUCCESS("KISANCONNECT TEST DATA"))
        self.stdout.write(self.style.SUCCESS("========================================"))
        self.stdout.write(f"Farmer:            1 ({farmer1.username})")
        self.stdout.write(f"Inventory:         {Product.objects.count()}")
        self.stdout.write(f"Retail Orders:     {Order.objects.count()}")
        self.stdout.write(f"Wholesale Bids:    {FarmerOffer.objects.count()}")
        self.stdout.write(f"Sourcing Pools:    {BulkRequirement.objects.count()}")
        self.stdout.write(f"Pre-Harvest:       {PreHarvestContract.objects.count()}")
        self.stdout.write(f"Market Prices:     {MarketPrice.objects.count()}")
        self.stdout.write(f"Shipments:         {DeliveryShipment.objects.count()}")
        self.stdout.write(self.style.SUCCESS("========================================"))
        
        self.stdout.write(self.style.NOTICE("\nWHOLESALE BIDS:"))
        for idx, offer in enumerate(FarmerOffer.objects.all(), 1):
            self.stdout.write(f"{idx}.\nCrop: {offer.requirement.crop_name}\nQuantity: {offer.requirement.quantity} kg\nBuyer Bid: Rs.{offer.requirement.target_price_min}-Rs.{offer.requirement.target_price_max}\nFarmer Counter: Rs.{offer.price_per_unit}/kg\n")
            
        self.stdout.write(self.style.NOTICE("\nBULK BUYER POOLS:"))
        for idx, req in enumerate(BulkRequirement.objects.all(), 1):
            self.stdout.write(f"{idx}.\nCrop: {req.crop_name}\nQuantity: {req.quantity} kg\nTarget Price: Rs.{req.target_price_min}-Rs.{req.target_price_max}/kg\nLocation: {req.location}\n")
