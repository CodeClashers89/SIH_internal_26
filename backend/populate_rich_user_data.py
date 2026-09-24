import os
import sys
from decimal import Decimal
from datetime import date, timedelta
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product, Auction, Bid, TraceabilityLot
from orders.models import (
    Order, OrderItem, Subscription, SubscriptionItem,
    BulkRequirement, FarmerOffer, PreHarvestContract
)
from logistics.models import LogisticsPartner, DeliveryShipment
from reviews.models import Review
from farmer_profile.models import FarmerProfile

User = get_user_model()

def setup_all():
    print("=" * 60)
    print("REORGANIZING USERS & POPULATING COMPREHENSIVE DUMMY DATA")
    print("=" * 60)

    # 1. Update / Create Users with Exact Requested Names & Emails
    # -------------------------------------------------------------------------
    
    # Farmer: neeraj_patel (jett60545@gmail.com)
    farmer, _ = User.objects.get_or_create(email='jett60545@gmail.com', defaults={'username': 'neeraj_patel'})
    farmer.username = 'neeraj_patel'
    farmer.first_name = 'Neeraj'
    farmer.last_name = 'Patel'
    farmer.role = 'farmer'
    farmer.phone = '+919825123456'
    farmer.is_verified = True
    farmer.kyc_status = 'approved'
    farmer.address = 'Patel Organic Farms, Block 4B, Sanand-Nalsarovar Road'
    farmer.district = 'Ahmedabad'
    farmer.pincode = '382110'
    farmer.farm_size = '22.5 Acres'
    farmer.crops_grown = 'Sharbati Wheat, Alphonso & Kesar Mangoes, Hybrid Tomatoes, Red Onions, 1121 Basmati Rice, Organic Turmeric'
    farmer.farm_coordinates = '22.9867, 72.3812'
    farmer.set_password('Password123!')
    farmer.save()
    print(f"[OK] Farmer updated: {farmer.username} ({farmer.email})")

    # Farmer Extended Profile
    f_profile, _ = FarmerProfile.objects.get_or_create(user=farmer)
    f_profile.full_name = 'Neeraj C. Patel'
    f_profile.farm_name = 'Shree Patel Agro Organic Orchards'
    f_profile.village = 'Sanand Rural'
    f_profile.taluka = 'Sanand'
    f_profile.state = 'Gujarat'
    f_profile.farm_size_value = Decimal('22.5')
    f_profile.farm_size_unit = 'acres'
    f_profile.soil_farming_type = 'organic'
    f_profile.trust_score = 96
    f_profile.total_trips = 142
    f_profile.ontime_rate = Decimal('98.5')
    f_profile.avg_rating = Decimal('4.9')
    f_profile.rating_count = 68
    f_profile.dispute_free_rate = Decimal('99.2')
    f_profile.avg_freshness = Decimal('94.0')
    f_profile.soil_health_verified = True
    f_profile.zero_chemicals = True
    f_profile.primary_crops = ['Organic Wheat', 'Alphonso Mango', 'Hybrid Tomato', 'Basmati Rice', 'Red Onion', 'Turmeric']
    f_profile.production_seasons = ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid (Summer)']
    f_profile.irrigation_source = 'drip'
    f_profile.regular_supplier_to = 18
    f_profile.production_capacity = '75 Metric Tonnes / Year'
    f_profile.bank_account_name = 'Neeraj Chhaganbhai Patel'
    f_profile.bank_account_number = '50100492817291'
    f_profile.ifsc_code = 'HDFC0001234'
    f_profile.upi_id = 'neerajpatel@okhdfcbank'
    f_profile.govt_id_type = 'aadhaar'
    f_profile.govt_id_number = 'XXXX-XXXX-8921'
    f_profile.govt_id_verified = True
    f_profile.gallery_images = [
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800'
    ]
    f_profile.save()
    print("[OK] Farmer Profile trust score configured (96 - Platinum Partner)")

    # Bulk Buyer: dmart_buyer (bmwq22835@gmail.com)
    bulk_buyer, _ = User.objects.get_or_create(email='bmwq22835@gmail.com', defaults={'username': 'dmart_buyer'})
    bulk_buyer.username = 'dmart_buyer'
    bulk_buyer.first_name = 'DMart'
    bulk_buyer.last_name = 'Wholesale Hub'
    bulk_buyer.role = 'bulk_buyer'
    bulk_buyer.phone = '+919825654321'
    bulk_buyer.is_verified = True
    bulk_buyer.kyc_status = 'approved'
    bulk_buyer.business_name = 'Avenue Supermarts Ltd (DMart Wholesale)'
    bulk_buyer.business_type = 'Supermarket Chain & Institutional Procurement'
    bulk_buyer.gst_number = '24AABCA1234F1Z8'
    bulk_buyer.address = 'DMart Central Fulfillment Distribution Hub, Plot 42-45, GIDC Industrial Estate'
    bulk_buyer.district = 'Ahmedabad'
    bulk_buyer.pincode = '382170'
    bulk_buyer.set_password('Password123!')
    bulk_buyer.save()
    print(f"[OK] Bulk Buyer updated: {bulk_buyer.username} ({bulk_buyer.email})")

    # Logistics Partner: ys_logistics (tljack482@gmail.com)
    logistics_user, _ = User.objects.get_or_create(email='tljack482@gmail.com', defaults={'username': 'ys_logistics'})
    logistics_user.username = 'ys_logistics'
    logistics_user.first_name = 'YS'
    logistics_user.last_name = 'Logistics Express'
    logistics_user.role = 'logistics_partner'
    logistics_user.phone = '+919825987654'
    logistics_user.is_verified = True
    logistics_user.kyc_status = 'approved'
    logistics_user.vehicle_number = 'GJ-01-BX-8899'
    logistics_user.vehicle_type = 'Refrigerated Container Truck (Eicher Pro 3015)'
    logistics_user.capacity = '9.5 Metric Tonnes'
    logistics_user.service_area = 'Western Gujarat & Inter-State Corridors (Ahmedabad, Surat, Vadodara, Rajkot, Mumbai)'
    logistics_user.address = 'YS Cold-Chain Logistics Hub, Highway 8A, Aslali Transport Nagar'
    logistics_user.district = 'Ahmedabad'
    logistics_user.pincode = '382427'
    logistics_user.set_password('Password123!')
    logistics_user.save()

    log_partner, _ = LogisticsPartner.objects.get_or_create(user=logistics_user)
    log_partner.name = 'YS ColdChain & Freight Logistics'
    log_partner.district = 'Ahmedabad'
    log_partner.pincode = '382427'
    log_partner.phone = '+919825987654'
    log_partner.active = True
    log_partner.save()
    print(f"[OK] Logistics Partner updated: {logistics_user.username} ({logistics_user.email})")

    # Consumer: peter_consumer (legend04433@gmail.com)
    consumer, _ = User.objects.get_or_create(email='legend04433@gmail.com', defaults={'username': 'peter_consumer'})
    consumer.username = 'peter_consumer'
    consumer.first_name = 'Peter'
    consumer.last_name = 'Daruwala'
    consumer.role = 'consumer'
    consumer.phone = '+919879123456'
    consumer.is_verified = True
    consumer.kyc_status = 'not_required'
    consumer.address = 'Flat 402, Green Acre Heights, Judges Bungalow Road, Bodakdev'
    consumer.district = 'Ahmedabad'
    consumer.pincode = '380054'
    consumer.set_password('Password123!')
    consumer.save()
    print(f"[OK] Consumer verified: {consumer.username} ({consumer.email})")

    # 2. Rich Products for Farmer (neeraj_patel)
    # -------------------------------------------------------------------------
    print("\nPopulating rich agricultural products for Neeraj Patel...")
    
    products_data = [
        {
            'name': 'Organic Sharbati Wheat (Golden Grain)',
            'category': 'grains',
            'quantity': Decimal('4500.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('48.00'),
            'harvest_date': date.today() - timedelta(days=2),
            'expiry_date': date.today() + timedelta(days=360),
            'description': 'A-grade 100% naturally grown Sharbati wheat from fertile Gujarat soil. Heavy grain with rich golden shine, excellent for ultra-soft rotis and high fiber nutrition.',
            'image_url': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Field A (10 Acres Organic Certified)'
        },
        {
            'name': 'Export-Grade Ratnagiri Alphonso Mangoes',
            'category': 'fruits',
            'quantity': Decimal('850.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('220.00'),
            'harvest_date': date.today() - timedelta(days=1),
            'expiry_date': date.today() + timedelta(days=14),
            'description': 'Hand-picked tree-ripened Alphonso mangoes. Naturally sweetened with intense aroma and zero carbide chemical treatment. Packed in protective foam nets.',
            'image_url': 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': True,
            'source_land': 'Orchard Block 2'
        },
        {
            'name': 'Fresh Farm Hybrid Tomatoes (Grade A+)',
            'category': 'vegetables',
            'quantity': Decimal('1400.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('26.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=10),
            'description': 'Crisp, firm, and bright red tomatoes with thick skin and rich pulp. Perfect for both retail daily cooking and bulk sauce/ketchup processing.',
            'image_url': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Greenhouse Polyhouse Sector 1'
        },
        {
            'name': 'Premium Nashik Red Onions (Medium Size)',
            'category': 'vegetables',
            'quantity': Decimal('3200.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('32.00'),
            'harvest_date': date.today() - timedelta(days=3),
            'expiry_date': date.today() + timedelta(days=60),
            'description': 'Thoroughly dried and graded red onions. Long shelf life, pungent flavor, uniform 55mm+ diameter, zero sprouting guarantee.',
            'image_url': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Dry Curing Yard Field 3'
        },
        {
            'name': 'Royal 1121 Steam Basmati Rice (2-Year Aged)',
            'category': 'grains',
            'quantity': Decimal('2800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('92.00'),
            'harvest_date': date.today() - timedelta(days=15),
            'expiry_date': date.today() + timedelta(days=720),
            'description': 'Super-long grain authentic 1121 Basmati rice. Extends up to 24mm after cooking with delightful natural fragrance and non-sticky texture.',
            'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Paddy Sector North'
        },
        {
            'name': 'Green Bell Peppers / Capsicum (Shimla Mirch)',
            'category': 'vegetables',
            'quantity': Decimal('750.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('52.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=8),
            'description': 'Hydroponically nurtured glossy green bell peppers. Thick flesh, crunchy bite, and high vitamin C content.',
            'image_url': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Sector 2'
        },
        {
            'name': 'Organic Salem High-Curcumin Turmeric Powder',
            'category': 'spices',
            'quantity': Decimal('600.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('195.00'),
            'harvest_date': date.today() - timedelta(days=10),
            'expiry_date': date.today() + timedelta(days=365),
            'description': 'Stone-ground pure organic turmeric root with verified 5.4% curcumin concentration. Free from any artificial color, lead chromate, or fillers.',
            'image_url': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice Terrace Block 1'
        },
        {
            'name': 'Unpolished Organic Moong Dal (Green Gram)',
            'category': 'pulses',
            'quantity': Decimal('1800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('115.00'),
            'harvest_date': date.today() - timedelta(days=8),
            'expiry_date': date.today() + timedelta(days=360),
            'description': '100% unpolished nutrient-dense whole green moong dal. High protein content, easy to sprout, and completely natural.',
            'image_url': 'https://images.unsplash.com/photo-1585994192701-f1a505c8574a?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Legume Rotation Field'
        }
    ]

    created_products = []
    for p_data in products_data:
        prod, created = Product.objects.get_or_create(
            farmer=farmer,
            name=p_data['name'],
            defaults=p_data
        )
        if not created:
            for k, v in p_data.items():
                setattr(prod, k, v)
            prod.save()
        created_products.append(prod)
        print(f"  + Product: {prod.name} ({prod.quantity} {prod.unit} @ Rs.{prod.price_per_unit})")

    # 3. Pre-Harvest Contracts & Auctions
    # -------------------------------------------------------------------------
    print("\nCreating pre-harvest contracts & auctions...")
    
    contract1, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        buyer=bulk_buyer,
        crop_name='Organic 1121 Basmati Rice (Upcoming Winter Harvest)',
        defaults={
            'expected_harvest_date': date.today() + timedelta(days=45),
            'expected_quantity': Decimal('6000.00'),
            'unit': 'kg',
            'contract_price': Decimal('88.00'),
            'status': 'accepted'
        }
    )
    print(f"  + Contract: #{contract1.id} for {contract1.crop_name} (Accepted by DMart)")

    contract2, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        crop_name='Winter Sharbati Wheat Pool',
        defaults={
            'expected_harvest_date': date.today() + timedelta(days=75),
            'expected_quantity': Decimal('12000.00'),
            'unit': 'kg',
            'contract_price': Decimal('46.00'),
            'status': 'proposed'
        }
    )

    auction1, _ = Auction.objects.get_or_create(
        farmer=farmer,
        product_name='Premium Ratnagiri Alphonso Mangoes (First Batch Auction - 500kg)',
        defaults={
            'quantity': Decimal('500.00'),
            'unit': 'kg',
            'starting_price': Decimal('180.00'),
            'highest_bid': Decimal('215.00'),
            'end_time': timezone.now() + timedelta(days=3),
            'status': 'active'
        }
    )
    
    # DMart places a bid on the auction
    Bid.objects.get_or_create(
        auction=auction1,
        buyer=bulk_buyer,
        defaults={'bid_amount': Decimal('215.00')}
    )
    print(f"  + Auction #{auction1.id}: {auction1.product_name} (Highest Bid: Rs.{auction1.highest_bid} by DMart)")

    # 4. Bulk Requirements (RFQs) by dmart_buyer & Farmer Offers
    # -------------------------------------------------------------------------
    print("\nCreating Bulk Requirements & Farmer Offers...")
    
    req1, _ = BulkRequirement.objects.get_or_create(
        buyer=bulk_buyer,
        crop_name='Grade-A Hybrid Tomatoes (Fresh Batch)',
        defaults={
            'variety': 'Abhinav / S-312',
            'quantity': Decimal('5000.00'),
            'unit': 'kg',
            'grade': 'A+',
            'required_date': date.today() + timedelta(days=7),
            'target_price_min': Decimal('22.00'),
            'target_price_max': Decimal('27.00'),
            'location': 'DMart Distribution Hub, Sanand GIDC',
            'status': 'pending'
        }
    )
    
    # Farmer Neeraj Patel submits offer
    offer1, _ = FarmerOffer.objects.get_or_create(
        requirement=req1,
        farmer=farmer,
        defaults={
            'quantity': Decimal('3000.00'),
            'price_per_unit': Decimal('25.50'),
            'delivery_date': date.today() + timedelta(days=5),
            'notes': 'Freshly harvested polyhouse grade tomatoes. Free crates included with pallet packaging.',
            'status': 'accepted'
        }
    )

    req2, _ = BulkRequirement.objects.get_or_create(
        buyer=bulk_buyer,
        crop_name='Organic Sharbati Wheat (Milling Quality)',
        defaults={
            'variety': 'Sharbati C-306',
            'quantity': Decimal('15000.00'),
            'unit': 'kg',
            'grade': 'A',
            'required_date': date.today() + timedelta(days=14),
            'target_price_min': Decimal('44.00'),
            'target_price_max': Decimal('48.00'),
            'location': 'DMart Central Grain Silo, Ahmedabad',
            'status': 'pending'
        }
    )
    print(f"  + Bulk Requirements created with Neeraj Patel's competitive quotes.")

    # 5. Orders & Logistics Shipments
    # -------------------------------------------------------------------------
    print("\nCreating Wholesale & Consumer Orders with Shipments...")

    wheat_prod = created_products[0]
    mango_prod = created_products[1]
    tomato_prod = created_products[2]
    onion_prod = created_products[3]
    rice_prod = created_products[4]
    capsicum_prod = created_products[5]

    # Order A: Wholesale Bulk Order from DMart to Neeraj Patel (In-Transit)
    bulk_order1, _ = Order.objects.get_or_create(
        buyer=bulk_buyer,
        shipping_address='DMart Central Fulfillment Distribution Hub, Plot 42-45, GIDC Industrial Estate, Sanand, Ahmedabad',
        shipping_pincode='382170',
        defaults={
            'product_subtotal': Decimal('144000.00'),
            'shipping_charge': Decimal('2500.00'),
            'total_amount': Decimal('146500.00'),
            'status': 'in_transit',
            'payment_status': 'paid',
            'payment_id': 'pay_DMart_Bulk_9921',
            'razorpay_order_id': 'order_DMart_Bulk_001'
        }
    )
    OrderItem.objects.get_or_create(
        order=bulk_order1,
        product=wheat_prod,
        defaults={'quantity': Decimal('3000.00'), 'price': Decimal('48.00')}
    )

    # Linked Shipment for Bulk Order 1 handled by ys_logistics
    shipment1, _ = DeliveryShipment.objects.get_or_create(
        order=bulk_order1,
        defaults={
            'partner': log_partner,
            'pickup_address': farmer.address,
            'delivery_address': bulk_order1.shipping_address,
            'pickup_lat': Decimal('22.986700'),
            'pickup_lng': Decimal('72.381200'),
            'destination_lat': Decimal('22.991200'),
            'destination_lng': Decimal('72.415600'),
            'distance_km': Decimal('34.50'),
            'status': 'picked_up',
            'shipped_at': timezone.now() - timedelta(hours=2),
            'delivery_otp': '782914'
        }
    )
    print(f"  + Bulk Order #{bulk_order1.id} (Rs.1,46,500) -> Shipment #{shipment1.id} (In-Transit via YS Logistics)")

    # Order B: Consumer Order 1 (Delivered)
    c_order1, _ = Order.objects.get_or_create(
        buyer=consumer,
        shipping_address=consumer.address,
        shipping_pincode=consumer.pincode,
        total_amount=Decimal('436.00'),
        defaults={
            'product_subtotal': Decimal('396.00'),
            'shipping_charge': Decimal('40.00'),
            'status': 'delivered',
            'payment_status': 'paid',
            'payment_id': 'pay_Peter_00189',
            'razorpay_order_id': 'order_Peter_00189'
        }
    )
    OrderItem.objects.get_or_create(
        order=c_order1,
        product=wheat_prod,
        defaults={'quantity': Decimal('5.00'), 'price': Decimal('48.00')}
    )
    OrderItem.objects.get_or_create(
        order=c_order1,
        product=tomato_prod,
        defaults={'quantity': Decimal('3.00'), 'price': Decimal('26.00')}
    )
    OrderItem.objects.get_or_create(
        order=c_order1,
        product=capsicum_prod,
        defaults={'quantity': Decimal('1.50'), 'price': Decimal('52.00')}
    )

    shipment2, _ = DeliveryShipment.objects.get_or_create(
        order=c_order1,
        defaults={
            'partner': log_partner,
            'pickup_address': farmer.address,
            'delivery_address': consumer.address,
            'distance_km': Decimal('18.20'),
            'status': 'delivered',
            'shipped_at': timezone.now() - timedelta(days=2),
            'delivered_at': timezone.now() - timedelta(days=1),
            'delivery_otp': '439201'
        }
    )
    print(f"  + Consumer Order #{c_order1.id} (Rs.436) -> Delivered by YS Logistics")

    # Order C: Consumer Order 2 (In-Transit)
    c_order2, _ = Order.objects.get_or_create(
        buyer=consumer,
        shipping_address=consumer.address,
        shipping_pincode=consumer.pincode,
        total_amount=Decimal('724.00'),
        defaults={
            'product_subtotal': Decimal('684.00'),
            'shipping_charge': Decimal('40.00'),
            'status': 'in_transit',
            'payment_status': 'paid',
            'payment_id': 'pay_Peter_00299',
            'razorpay_order_id': 'order_Peter_00299'
        }
    )
    OrderItem.objects.get_or_create(
        order=c_order2,
        product=mango_prod,
        defaults={'quantity': Decimal('3.00'), 'price': Decimal('220.00')}
    )
    OrderItem.objects.get_or_create(
        order=c_order2,
        product=onion_prod,
        defaults={'quantity': Decimal('1.00'), 'price': Decimal('32.00')}
    )

    shipment3, _ = DeliveryShipment.objects.get_or_create(
        order=c_order2,
        defaults={
            'partner': log_partner,
            'pickup_address': farmer.address,
            'delivery_address': consumer.address,
            'distance_km': Decimal('18.20'),
            'status': 'picked_up',
            'shipped_at': timezone.now() - timedelta(minutes=45),
            'delivery_otp': '651829'
        }
    )
    print(f"  + Consumer Order #{c_order2.id} (Rs.724) -> In-Transit via YS Logistics")

    # 6. Consumer Subscription (Weekly Fresh Basket)
    # -------------------------------------------------------------------------
    print("\nCreating Consumer Subscription...")
    sub, _ = Subscription.objects.get_or_create(
        buyer=consumer,
        shipping_address=consumer.address,
        shipping_pincode=consumer.pincode,
        defaults={
            'frequency': 'weekly',
            'delivery_day': 'Monday',
            'delivery_time_slot': 'morning',
            'duration_months': 2,
            'total_deliveries': 8,
            'completed_deliveries': 3,
            'start_date': date.today() - timedelta(days=21),
            'next_delivery_date': date.today() + timedelta(days=4),
            'per_delivery_subtotal': Decimal('320.00'),
            'discount_percentage': Decimal('8.00'),
            'shipping_charge': Decimal('0.00'),
            'per_delivery_total': Decimal('294.40'),
            'total_plan_amount': Decimal('2355.20'),
            'status': 'active',
            'razorpay_subscription_id': 'sub_PeterWeekly_Fresh99'
        }
    )
    SubscriptionItem.objects.get_or_create(
        subscription=sub,
        product=tomato_prod,
        defaults={'quantity': Decimal('2.00'), 'price': Decimal('26.00')}
    )
    SubscriptionItem.objects.get_or_create(
        subscription=sub,
        product=onion_prod,
        defaults={'quantity': Decimal('2.00'), 'price': Decimal('32.00')}
    )
    SubscriptionItem.objects.get_or_create(
        subscription=sub,
        product=capsicum_prod,
        defaults={'quantity': Decimal('1.00'), 'price': Decimal('52.00')}
    )
    print(f"  + Active Weekly Subscription #{sub.id} (3/8 completed) for Peter Daruwala")

    # 7. Reviews & Ratings for Neeraj Patel
    # -------------------------------------------------------------------------
    print("\nCreating reviews & testimonials for Neeraj Patel...")
    
    Review.objects.get_or_create(
        reviewer=consumer,
        farmer=farmer,
        defaults={
            'rating': 5,
            'comment': 'Exceptional freshness and authentic aroma! The Sharbati wheat and fresh tomatoes were delivered within 4 hours of morning harvest. Truly farm-to-table quality.'
        }
    )

    Review.objects.get_or_create(
        reviewer=bulk_buyer,
        farmer=farmer,
        defaults={
            'rating': 5,
            'comment': 'Outstanding wholesale partner. Neeraj Patel provided 3 metric tonnes of Sharbati wheat with zero moisture defect and uniform grading. Clean documentation and prompt dispatch.'
        }
    )
    print("  + Verified Reviews from Consumer and DMart saved.")

    print("\n" + "=" * 60)
    print("SUCCESSFULLY COMPLETED ALL SETUP & DUMMY DATA SEEDING!")
    print("=" * 60)

if __name__ == '__main__':
    setup_all()
