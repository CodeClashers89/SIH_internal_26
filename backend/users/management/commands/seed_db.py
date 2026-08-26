from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product
from orders.models import Order, OrderItem, QuoteRequest, BulkRequirement, PreHarvestContract, Subscription, SubscriptionItem
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
        SubscriptionItem.objects.all().delete()
        Subscription.objects.all().delete()
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
            email='kamanipoojan@gmail.com',
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
        # Farmer 1 Products
        p1 = Product.objects.create(
            farmer=farmer1,
            name="Organic Red Tomatoes",
            category="vegetables",
            quantity=500.0,
            unit="kg",
            price_per_unit=25.00,
            harvest_date=today - timedelta(days=1),
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
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=30),
            description="Perfect grading potatoes, suitable for table use or chips processing.",
            image_url="https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600"
        )
        p3 = Product.objects.create(
            farmer=farmer1,
            name="Alphonso Mangoes",
            category="fruits",
            quantity=200.0,
            unit="piece",
            price_per_unit=60.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=7),
            description="Carbide-free naturally ripened premium Hapus mangoes.",
            image_url="https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600"
        )
        p4 = Product.objects.create(
            farmer=farmer1,
            name="Fresh Cabbage",
            category="vegetables",
            quantity=600.0,
            unit="kg",
            price_per_unit=15.00,
            harvest_date=today,
            expiry_date=today + timedelta(days=10),
            description="Crisp green cabbage harvested early morning.",
            image_url="https://images.unsplash.com/photo-1581078426770-6d336e5de7bf?auto=format&fit=crop&q=80&w=600"
        )
        p5 = Product.objects.create(
            farmer=farmer1,
            name="Farm Cauliflower",
            category="vegetables",
            quantity=400.0,
            unit="kg",
            price_per_unit=22.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=8),
            description="Pesticide-free white cauliflower heads.",
            image_url="https://images.unsplash.com/photo-1568584711299-fd824941efc6?auto=format&fit=crop&q=80&w=600"
        )
        p6 = Product.objects.create(
            farmer=farmer1,
            name="Sweet Red Carrots",
            category="vegetables",
            quantity=800.0,
            unit="kg",
            price_per_unit=20.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=15),
            description="Juicy native winter carrots direct from farms.",
            image_url="https://images.unsplash.com/photo-1590865507245-562a1628d097?auto=format&fit=crop&q=80&w=600"
        )

        # Farmer 2 Products
        p7 = Product.objects.create(
            farmer=farmer2,
            name="Sharbati Premium Wheat",
            category="grains",
            quantity=80.0,
            unit="quintal",
            price_per_unit=2200.00,
            harvest_date=today - timedelta(days=5),
            expiry_date=today + timedelta(days=360),
            description="Sun-dried rich gold Sharbati wheat from Junnar valley.",
            image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
        )
        p8 = Product.objects.create(
            farmer=farmer2,
            name="Nashik Red Onions",
            category="vegetables",
            quantity=1200.0,
            unit="kg",
            price_per_unit=22.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=20),
            description="Medium size crisp onions direct from Junnar farms.",
            image_url="https://images.unsplash.com/photo-1618512496248-a07fe83766ac?auto=format&fit=crop&q=80&w=600"
        )
        p9 = Product.objects.create(
            farmer=farmer2,
            name="Dry Garlic Bulbs",
            category="vegetables",
            quantity=300.0,
            unit="kg",
            price_per_unit=110.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=90),
            description="Premium pungent dry garlic bulbs.",
            image_url="https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600"
        )
        p10 = Product.objects.create(
            farmer=farmer2,
            name="Organic Ginger Roots",
            category="vegetables",
            quantity=500.0,
            unit="kg",
            price_per_unit=75.00,
            harvest_date=today - timedelta(days=1),
            expiry_date=today + timedelta(days=45),
            description="Fresh spicy native ginger roots.",
            image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600"
        )
        p11 = Product.objects.create(
            farmer=farmer2,
            name="Premium Basmati Paddy",
            category="grains",
            quantity=100.0,
            unit="quintal",
            price_per_unit=3200.00,
            harvest_date=today - timedelta(days=5),
            expiry_date=today + timedelta(days=270),
            description="Aromatic Basmati rice paddy grains.",
            image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600"
        )
        p12 = Product.objects.create(
            farmer=farmer2,
            name="Natural Mustard Seeds",
            category="grains",
            quantity=40.0,
            unit="quintal",
            price_per_unit=4800.00,
            harvest_date=today - timedelta(days=5),
            expiry_date=today + timedelta(days=360),
            description="High oil content natural yellow mustard seeds.",
            image_url="https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600"
        )

        all_products = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12]

        self.stdout.write("Creating historical orders for demand forecasting chart...")
        # Create multiple orders per day over the last 30 days to build "High Data"
        for i in range(30):
            past_date = timezone.now() - timedelta(days=i)
            # Create 1 to 3 orders for each day
            for _ in range(random.randint(1, 3)):
                total_qty = random.randint(10, 100)
                selected_product = random.choice(all_products)
                cost = selected_product.price_per_unit * total_qty
                
                order_status = random.choice(['placed', 'delivered'])
                order = Order.objects.create(
                    buyer=consumer1,
                    total_amount=cost,
                    status=order_status,
                    shipping_address=f"Flat {random.randint(101, 909)}, Central Society, Pune",
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
                    DeliveryShipment.objects.create(
                        order=order,
                        partner=partner1,
                        pickup_address=f"Village Farm Pick-up point, Pune",
                        delivery_address=order.shipping_address,
                        distance_km=Decimal(random.randint(15, 60)),
                        status='delivered',
                        shipped_at=past_date - timedelta(hours=3),
                        delivered_at=past_date
                    )
                else:
                    DeliveryShipment.objects.create(
                        order=order,
                        partner=None,
                        pickup_address=f"Village Farm Pick-up point, Pune",
                        delivery_address=order.shipping_address,
                        distance_km=Decimal(random.randint(15, 60)),
                        status='assigned'
                    )

        # Create active shipments for driver1
        self.stdout.write("Creating active shipments for driver1...")
        active_statuses = [
            ('assigned', 'confirmed', 'Aundh Road, Pune', '28.5'),
            ('assigned', 'confirmed', 'Wakad Bypass, Pune', '32.1'),
            ('assigned', 'confirmed', 'Baner Main St, Pune', '19.4'),
            ('picked_up', 'in_transit', 'Kothrud, Pune', '35.2'),
            ('picked_up', 'in_transit', 'Viman Nagar, Pune', '44.8'),
            ('picked_up', 'in_transit', 'Hadapsar MIDC, Pune', '25.6'),
            ('handover_completed', 'packed', 'Shivajinagar, Pune', '15.0'),
            ('handover_completed', 'packed', 'Pimple Saudagar, Pune', '29.3'),
        ]

        for idx, (ds_status, order_status, address, dist) in enumerate(active_statuses):
            prod = random.choice(all_products)
            qty = random.randint(10, 50)
            cost = prod.price_per_unit * qty
            
            o = Order.objects.create(
                buyer=consumer1,
                total_amount=cost,
                status=order_status,
                shipping_address=address,
                shipping_pincode="411002",
                payment_status='paid',
                payment_id=f"pay_mock_active_{idx}"
            )
            OrderItem.objects.create(
                order=o,
                product=prod,
                quantity=qty,
                price=prod.price_per_unit
            )
            
            ds = DeliveryShipment.objects.create(
                order=o,
                partner=partner1,
                pickup_address="Village Khed operations center",
                delivery_address=address,
                distance_km=Decimal(dist),
                status=ds_status
            )
            if ds_status == 'picked_up':
                ds.shipped_at = timezone.now() - timedelta(minutes=45)
                ds.save()
            elif ds_status == 'handover_completed':
                ds.handover_completed_at = timezone.now() - timedelta(minutes=15)
                ds.handover_confirmed_by = farmer1
                ds.save()
                o.cancellation_locked = True
                o.cancellation_locked_at = timezone.now() - timedelta(minutes=15)
                o.save()

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
        # 8 quotes for farmer1 and farmer2
        quotes_data = [
            (p1, 200, 23.00, None, 'pending'),
            (p2, 1000, 15.00, 16.50, 'offered'),
            (p4, 500, 19.00, None, 'pending'),
            (p5, 300, 18.00, 20.00, 'offered'),
            (p7, 50, 2100.00, 2150.00, 'accepted'),
            (p8, 800, 18.00, None, 'pending'),
            (p9, 200, 100.00, 105.00, 'offered'),
            (p10, 400, 70.00, None, 'pending'),
        ]
        for prod, qty, target, offered, q_status in quotes_data:
            QuoteRequest.objects.create(
                buyer=bulk_buyer1,
                product=prod,
                quantity=Decimal(qty),
                target_price=Decimal(target),
                offered_price=Decimal(offered) if offered else None,
                status=q_status
            )

        self.stdout.write("Creating Bulk Requirements (Reverse Sourcing)...")
        # 8 bulk demands from bulk buyer
        reqs_data = [
            ("Tomato", "Local", 1500, 18.00, 22.00, "Pune MIDC Delivery Hub"),
            ("Potato", "Jyoti", 5000, 14.00, 17.00, "Junnar Processing Unit"),
            ("Onion", "Red", 3000, 20.00, 25.00, "Chakan Cold Storage"),
            ("Garlic", "Local", 1000, 95.00, 115.00, "Hadapsar Spices Market"),
            ("Ginger", "Local", 2000, 65.00, 78.00, "Pune Wholesale Yard"),
            ("Wheat", "Lokwan", 50, 2100.00, 2250.00, "MIDC Bhosari Food Park"),
            ("Rice", "Basmati", 80, 5000.00, 5800.00, "Junnar Rice Mills"),
            ("Apple", "Kashmiri", 1500, 80.00, 95.00, "Pune Cold Chain Hub"),
        ]
        for crop, var, qty, p_min, p_max, loc in reqs_data:
            BulkRequirement.objects.create(
                buyer=bulk_buyer1,
                crop_name=crop,
                variety=var,
                quantity=Decimal(qty),
                unit="quintal" if crop in ["Wheat", "Rice"] else "kg",
                grade="A" if qty > 2000 else "FAQ",
                required_date=today + timedelta(days=random.randint(5, 20)),
                target_price_min=Decimal(p_min),
                target_price_max=Decimal(p_max),
                location=loc,
                status='pending'
            )

        self.stdout.write("Creating Pre-Harvest Contracts...")
        # 6 pre harvest contracts
        contracts_data = [
            (farmer1, "Premium Basmati Paddy", 40.00, "quintal", 3500.00, today + timedelta(days=60), 'accepted'),
            (farmer1, "Organic Green Chilli", 1000.00, "kg", 45.00, today + timedelta(days=45), 'proposed'),
            (farmer2, "Lokwan Wheat Grains", 60.00, "quintal", 2150.00, today + timedelta(days=90), 'accepted'),
            (farmer2, "Pungent Red Chilli", 500.00, "kg", 85.00, today + timedelta(days=30), 'proposed'),
            (farmer1, "Vine Ripe Tomatoes", 2000.00, "kg", 20.00, today + timedelta(days=15), 'harvest_pending'),
            (farmer2, "Robusta Bananas", 5000.00, "piece", 1.80, today + timedelta(days=40), 'ready'),
        ]
        for farm, crop, qty, unit, price, exp_date, c_status in contracts_data:
            PreHarvestContract.objects.create(
                farmer=farm,
                buyer=bulk_buyer1 if c_status != 'proposed' else None,
                crop_name=crop,
                expected_quantity=Decimal(qty),
                unit=unit,
                contract_price=Decimal(price),
                expected_harvest_date=exp_date,
                status=c_status
            )

        self.stdout.write("Creating auto-delivery subscriptions...")
        
        # 1. Active Subscription
        sub1 = Subscription.objects.create(
            buyer=consumer1,
            delivery_day="Tuesday",
            delivery_time_slot="morning",
            duration_months=2,
            total_deliveries=8,
            completed_deliveries=3,
            shipping_address=consumer1.address,
            shipping_pincode=consumer1.pincode,
            per_delivery_subtotal=Decimal("75.00"),
            discount_percentage=Decimal("5.00"),
            shipping_charge=Decimal("42.00"),
            per_delivery_total=Decimal("113.25"),
            total_plan_amount=Decimal("906.00"),
            status="active",
            start_date=timezone.now().date(),
            next_delivery_date=timezone.now().date() + timedelta(days=3)
        )
        SubscriptionItem.objects.create(
            subscription=sub1,
            product=p1,
            quantity=Decimal("3.0"),
            price=Decimal("25.00")
        )

        # 2. Paused Subscription
        sub2 = Subscription.objects.create(
            buyer=consumer1,
            delivery_day="Friday",
            delivery_time_slot="evening",
            duration_months=1,
            total_deliveries=4,
            completed_deliveries=1,
            shipping_address=consumer1.address,
            shipping_pincode=consumer1.pincode,
            per_delivery_subtotal=Decimal("100.00"),
            discount_percentage=Decimal("5.00"),
            shipping_charge=Decimal("42.00"),
            per_delivery_total=Decimal("137.00"),
            total_plan_amount=Decimal("548.00"),
            status="paused",
            start_date=timezone.now().date(),
            next_delivery_date=timezone.now().date() + timedelta(days=6)
        )
        SubscriptionItem.objects.create(
            subscription=sub2,
            product=p6,
            quantity=Decimal("5.0"),
            price=Decimal("20.00")
        )

        # 3. Cancelled Subscription
        sub3 = Subscription.objects.create(
            buyer=consumer1,
            delivery_day="Monday",
            delivery_time_slot="afternoon",
            duration_months=3,
            total_deliveries=12,
            completed_deliveries=0,
            shipping_address=consumer1.address,
            shipping_pincode=consumer1.pincode,
            per_delivery_subtotal=Decimal("220.00"),
            discount_percentage=Decimal("5.00"),
            shipping_charge=Decimal("210.00"),
            per_delivery_total=Decimal("419.00"),
            total_plan_amount=Decimal("5028.00"),
            status="cancelled",
            start_date=timezone.now().date() - timedelta(days=10),
            next_delivery_date=timezone.now().date() - timedelta(days=10)
        )
        SubscriptionItem.objects.create(
            subscription=sub3,
            product=p8,
            quantity=Decimal("10.0"),
            price=Decimal("22.00")
        )

        # 4. Completed Subscription
        sub4 = Subscription.objects.create(
            buyer=consumer1,
            delivery_day="Thursday",
            delivery_time_slot="morning",
            duration_months=1,
            total_deliveries=4,
            completed_deliveries=4,
            shipping_address=consumer1.address,
            shipping_pincode=consumer1.pincode,
            per_delivery_subtotal=Decimal("150.00"),
            discount_percentage=Decimal("5.00"),
            shipping_charge=Decimal("210.00"),
            per_delivery_total=Decimal("352.50"),
            total_plan_amount=Decimal("1410.00"),
            status="completed",
            start_date=timezone.now().date() - timedelta(days=30),
            next_delivery_date=timezone.now().date() - timedelta(days=2)
        )
        SubscriptionItem.objects.create(
            subscription=sub4,
            product=p10,
            quantity=Decimal("2.0"),
            price=Decimal("75.00")
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
