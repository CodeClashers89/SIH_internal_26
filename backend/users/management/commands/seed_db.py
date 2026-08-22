from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product
from orders.models import Order, OrderItem, QuoteRequest, BulkRequirement, PreHarvestContract
from logistics.models import LogisticsPartner, DeliveryShipment
from pricing.models import Market, MarketPrice
from reviews.models import Review
from decimal import Decimal
from datetime import timedelta, date
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing existing data...")
        Review.objects.all().delete()
        DeliveryShipment.objects.all().delete()
        PreHarvestContract.objects.all().delete()
        QuoteRequest.objects.all().delete()
        BulkRequirement.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Product.objects.all().delete()
        LogisticsPartner.objects.all().delete()
        MarketPrice.objects.all().delete()
        Market.objects.all().delete()
        # Delete non-superuser users
        User.objects.filter(is_superuser=False).delete()
        User.objects.filter(username='admin').delete()

        self.stdout.write("Creating users...")
        
        # Admin
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@kisanconnect.org',
            password='adminpassword',
            role='admin',
            phone='9999999999',
            is_verified=True,
            kyc_status='not_required',
            address='Admin Office, Pune',
            pincode='411001',
            district='Pune'
        )

        # Farmers
        farmer1 = User.objects.create_user(
            username='farmer1',
            email='farmer1@gmail.com',
            password='farmerpassword',
            role='farmer',
            phone='9876543210',
            is_verified=True,
            kyc_status='approved',
            kyc_document='Aadhaar Card, Land Registry Certificate Verified.',
            address='Village Khed, Near Chakan',
            pincode='411001',
            district='Pune'
        )
        
        farmer2 = User.objects.create_user(
            username='farmer2',
            email='farmer2@gmail.com',
            password='farmerpassword',
            role='farmer',
            phone='9876543211',
            is_verified=True,
            kyc_status='approved',
            kyc_document='FPO Registration #12345. Land Deeds Verified.',
            address='Village Junnar, Pune District',
            pincode='411005',
            district='Pune'
        )

        farmer_pending = User.objects.create_user(
            username='farmer_pending',
            email='pending@gmail.com',
            password='farmerpassword',
            role='farmer',
            phone='9876543212',
            is_verified=False,
            kyc_status='pending',
            kyc_document='Pending doc upload review...',
            address='Village Indapur, Baramati Road',
            pincode='411012',
            district='Pune'
        )

        # Consumer
        consumer1 = User.objects.create_user(
            username='consumer1',
            email='consumer1@gmail.com',
            password='consumerpassword',
            role='consumer',
            phone='8765432109',
            is_verified=True,
            kyc_status='not_required',
            address='Flat 402, Shivajinagar, Pune',
            pincode='411002',
            district='Pune'
        )

        # Bulk Buyer
        bulk_buyer1 = User.objects.create_user(
            username='bulk_buyer1',
            email='bulkbuyer@gmail.com',
            password='buyerpassword',
            role='bulk_buyer',
            phone='7654321098',
            is_verified=True,
            kyc_status='not_required',
            address='Krishi Food Processing Ltd, MIDC Bhosari',
            pincode='411016',
            district='Pune'
        )

        # Logistics Partner User
        driver1 = User.objects.create_user(
            username='driver1',
            email='driver1@gmail.com',
            password='driverpassword',
            role='logistics_partner',
            phone='9000000004',
            is_verified=True,
            kyc_status='approved',
            address='Logistics Hub, Pune',
            pincode='411001',
            district='Pune',
            vehicle_number='MH12AB1234',
            vehicle_type='tempo',
            capacity=1500,
            service_area='411001, 411002'
        )

        self.stdout.write("Creating logistics partners...")
        partner1 = LogisticsPartner.objects.create(
            user=driver1,
            name="Krishi Express Logistics",
            pincode="411001",
            district="Pune",
            phone="9000000001",
            active=True
        )
        partner2 = LogisticsPartner.objects.create(
            name="Maharashtra Rural Cargo",
            pincode="411005",
            district="Pune",
            phone="9000000002",
            active=True
        )
        partner3 = LogisticsPartner.objects.create(
            name="Speedy Deliveries Mumbai",
            pincode="400001",
            district="Mumbai",
            phone="9000000003",
            active=True
        )

        today = date.today()
        self.stdout.write("Creating Mandi price benchmarks via AGMARKNET Sync...")
        from pricing.services import sync_agmarknet_data
        sync_agmarknet_data()

        self.stdout.write("Creating products...")
        p1 = Product.objects.create(
            farmer=farmer1,
            name="Organic Red Tomatoes",
            category="vegetables",
            quantity=500.0,
            unit="kg",
            price_per_unit=25.00,
            harvest_date=today - timedelta(days=2),
            expiry_date=today + timedelta(days=8),
            description="Freshly harvested organic vine tomatoes from Khed village.",
            image_url="https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=600"
        )

        p2 = Product.objects.create(
            farmer=farmer1,
            name="Fresh Jyoti Potatoes",
            category="vegetables",
            quantity=1500.0,
            unit="kg",
            price_per_unit=18.00,
            harvest_date=today - timedelta(days=5),
            expiry_date=today + timedelta(days=30),
            description="Perfect grading potatoes, suitable for table use or chips processing.",
            image_url="https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600"
        )

        p3 = Product.objects.create(
            farmer=farmer2,
            name="Sharbati Premium Wheat",
            category="grains",
            quantity=50.0,
            unit="quintal",
            price_per_unit=2200.00,
            harvest_date=today - timedelta(days=15),
            expiry_date=today + timedelta(days=360),
            description="Sun-dried rich gold Sharbati wheat from Junnar valley.",
            image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        )

        p4 = Product.objects.create(
            farmer=farmer2,
            name="Nashik Red Onions",
            category="vegetables",
            quantity=800.0,
            unit="kg",
            price_per_unit=22.00,
            harvest_date=today - timedelta(days=3),
            expiry_date=today + timedelta(days=20),
            description="Medium size crisp onions direct from Junnar farms.",
            image_url="https://images.unsplash.com/photo-1618512496248-a07fe83766ac?auto=format&fit=crop&q=80&w=600"
        )

        p5 = Product.objects.create(
            farmer=farmer1,
            name="Alphonso Mangoes (Semi-Ripe)",
            category="fruits",
            quantity=120.0,
            unit="piece",
            price_per_unit=60.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=7),
            description="Carbide-free naturally ripened premium Hapus mangoes.",
            image_url="https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600"
        )

        self.stdout.write("Creating historical orders for demand forecasting chart...")
        # Create orders over the last 30 days
        for i in range(30):
            past_date = timezone.now() - timedelta(days=i)
            # 50% chance of an order on this day
            if random.choice([True, False]):
                total_qty = random.randint(5, 50)
                selected_product = random.choice([p1, p2, p4, p5])
                cost = selected_product.price_per_unit * total_qty
                
                order_status = random.choice(['placed', 'delivered'])
                order = Order.objects.create(
                    buyer=consumer1,
                    total_amount=cost,
                    status=order_status,
                    shipping_address="Pune Central, Maharashtra",
                    shipping_pincode="411002",
                    payment_status='paid',
                    payment_id=f"pay_mock_{random.randint(100000, 999999)}"
                )
                
                OrderItem.objects.create(
                    order=order,
                    product=selected_product,
                    quantity=total_qty,
                    price=selected_product.price_per_unit
                )
                
                # Update the order's created_at to the past date (bypassing auto_now_add)
                Order.objects.filter(id=order.id).update(created_at=past_date)

                # Create DeliveryShipment for the order
                if order_status == 'delivered':
                    ds = DeliveryShipment.objects.create(
                        order=order,
                        partner=partner1,
                        pickup_address=f"Village Khed Farm, Pune",
                        delivery_address=order.shipping_address,
                        distance_km=Decimal(random.randint(10, 45)),
                        status='delivered',
                        shipped_at=past_date - timedelta(hours=2),
                        delivered_at=past_date
                    )
                else:
                    ds = DeliveryShipment.objects.create(
                        order=order,
                        partner=None,
                        pickup_address=f"Village Khed Farm, Pune",
                        delivery_address=order.shipping_address,
                        distance_km=Decimal(random.randint(10, 45)),
                        status='assigned'
                    )

        # Create active shipments for driver1
        self.stdout.write("Creating active shipments for driver1...")
        active_order1 = Order.objects.create(
            buyer=consumer1,
            total_amount=Decimal('450.00'),
            status='confirmed',
            shipping_address="Aundh Road, Pune",
            shipping_pincode="411002",
            payment_status='paid',
            payment_id="pay_mock_active1"
        )
        OrderItem.objects.create(
            order=active_order1,
            product=p1,
            quantity=18.0,
            price=25.00
        )
        DeliveryShipment.objects.create(
            order=active_order1,
            partner=partner1,
            pickup_address="Village Khed, Near Chakan",
            delivery_address="Aundh Road, Pune",
            distance_km=Decimal('28.5'),
            status='assigned'
        )

        active_order2 = Order.objects.create(
            buyer=consumer1,
            total_amount=Decimal('540.00'),
            status='in_transit',
            shipping_address="Kothrud, Pune",
            shipping_pincode="411002",
            payment_status='paid',
            payment_id="pay_mock_active2"
        )
        OrderItem.objects.create(
            order=active_order2,
            product=p2,
            quantity=30.0,
            price=18.00
        )
        DeliveryShipment.objects.create(
            order=active_order2,
            partner=partner1,
            pickup_address="Village Khed, Near Chakan",
            delivery_address="Kothrud, Pune",
            distance_km=Decimal('35.2'),
            status='picked_up',
            shipped_at=timezone.now() - timedelta(hours=1)
        )

        self.stdout.write("Creating farmer reviews...")
        Review.objects.create(
            reviewer=consumer1,
            farmer=farmer1,
            rating=5,
            comment="Excellent quality tomatoes. Very sweet and fresh!"
        )
        Review.objects.create(
            reviewer=consumer1,
            farmer=farmer1,
            rating=4,
            comment="Potatoes were clean and graded well. Fast shipping."
        )
        Review.objects.create(
            reviewer=bulk_buyer1,
            farmer=farmer2,
            rating=5,
            comment="Great wheat crop, bought 10 quintals. Moisture was minimal. FPO managed well."
        )

        self.stdout.write("Creating Quote Requests (Wholesale Bid Negotiations)...")
        # 3 quotes for farmer1 and farmer2
        QuoteRequest.objects.create(
            buyer=bulk_buyer1,
            product=p1, # Organic Red Tomatoes
            quantity=250.00,
            target_price=22.00,
            status='pending'
        )
        QuoteRequest.objects.create(
            buyer=bulk_buyer1,
            product=p2, # Fresh Jyoti Potatoes
            quantity=1000.00,
            target_price=15.00,
            offered_price=16.50,
            status='offered'
        )
        QuoteRequest.objects.create(
            buyer=bulk_buyer1,
            product=p4, # Nashik Red Onions
            quantity=500.00,
            target_price=19.00,
            status='pending'
        )

        self.stdout.write("Creating Bulk Requirements (Reverse Sourcing)...")
        # 3 bulk demands from bulk buyer
        BulkRequirement.objects.create(
            buyer=bulk_buyer1,
            crop_name="Tomato",
            variety="Local",
            quantity=1500.00,
            unit="kg",
            grade="FAQ",
            required_date=today + timedelta(days=7),
            target_price_min=18.00,
            target_price_max=22.00,
            location="Pune MIDC Delivery Hub",
            status='pending'
        )
        BulkRequirement.objects.create(
            buyer=bulk_buyer1,
            crop_name="Potato",
            variety="Jyoti",
            quantity=5000.00,
            unit="kg",
            grade="A",
            required_date=today + timedelta(days=12),
            target_price_min=14.00,
            target_price_max=17.00,
            location="Junnar Processing Unit",
            status='pending'
        )
        BulkRequirement.objects.create(
            buyer=bulk_buyer1,
            crop_name="Onion",
            variety="Red",
            quantity=3000.00,
            unit="kg",
            grade="FAQ",
            required_date=today + timedelta(days=5),
            target_price_min=20.00,
            target_price_max=25.00,
            location="Chakan Cold Storage",
            status='pending'
        )

        self.stdout.write("Creating Pre-Harvest Contracts...")
        # 2 pre harvest contracts
        PreHarvestContract.objects.create(
            farmer=farmer1,
            buyer=bulk_buyer1,
            crop_name="Premium Basmati Paddy",
            expected_quantity=40.00,
            unit="quintal",
            contract_price=3500.00,
            expected_harvest_date=today + timedelta(days=60),
            status='accepted'
        )
        PreHarvestContract.objects.create(
            farmer=farmer1,
            crop_name="Organic Green Chilli",
            expected_quantity=1000.00,
            unit="kg",
            contract_price=45.00,
            expected_harvest_date=today + timedelta(days=45),
            status='proposed'
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
