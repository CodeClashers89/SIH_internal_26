from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product
from orders.models import Order, OrderItem
from logistics.models import LogisticsPartner
from pricing.models import MandiPrice
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
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Product.objects.all().delete()
        LogisticsPartner.objects.all().delete()
        MandiPrice.objects.all().delete()
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

        self.stdout.write("Creating Mandi price benchmarks...")
        commodities = [
            ("Potato", "Jyoti"),
            ("Tomato", "Local"),
            ("Onion", "Red"),
            ("Rice", "Basmati"),
            ("Wheat", "Lokwan")
        ]
        
        today = date.today()
        # Seed last 5 days of mandi prices
        for day_offset in range(5):
            mandi_date = today - timedelta(days=day_offset)
            for commodity, variety in commodities:
                min_p = Decimal(random.randint(15, 30))
                modal_p = min_p + Decimal(random.randint(5, 10))
                max_p = modal_p + Decimal(random.randint(5, 15))
                
                # Scale up grains
                if commodity in ["Rice", "Wheat"]:
                    min_p *= 2
                    modal_p *= 2
                    max_p *= 2
                
                MandiPrice.objects.create(
                    state="Maharashtra",
                    district="Pune",
                    market="Pune Mandi",
                    commodity=commodity,
                    variety=variety,
                    min_price=min_p,
                    max_price=max_p,
                    modal_price=modal_p,
                    date=mandi_date
                )

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
                
                order = Order.objects.create(
                    buyer=consumer1,
                    total_amount=cost,
                    status=random.choice(['placed', 'delivered']),
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

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
