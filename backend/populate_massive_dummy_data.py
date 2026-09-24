import os
import sys
from decimal import Decimal
from datetime import date, timedelta
import random
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from products.models import Product, Auction, Bid, TraceabilityLot, GroupOrder, GroupOrderParticipant, FlashSale
from orders.models import (
    Order, OrderItem, Subscription, SubscriptionItem,
    QuoteRequest, BulkRequirement, FarmerOffer, PreHarvestContract
)
from logistics.models import LogisticsPartner, DeliveryShipment
from reviews.models import Review
from farmer_profile.models import FarmerProfile
from payments.models import PaymentRecord

User = get_user_model()

def populate():
    print("=" * 70)
    print("MASSIVE DUMMY DATA SEEDING - KISANCONNECT ECOSYSTEM")
    print("=" * 70)

    # 1. USERS SETUP
    # -------------------------------------------------------------------------
    print("\n[1/7] Ensuring 4 Primary Users with Exact Credentials...")

    # A) Farmer: Neeraj Patel
    farmer, _ = User.objects.get_or_create(email='jett60545@gmail.com', defaults={'username': 'neeraj_patel'})
    farmer.username = 'neeraj_patel'
    farmer.first_name = 'Neeraj'
    farmer.last_name = 'Patel'
    farmer.role = 'farmer'
    farmer.phone = '+919825123456'
    farmer.is_verified = True
    farmer.kyc_status = 'approved'
    farmer.address = 'Patel Organic Agro Farms, Survey No. 104/2, Sanand-Nalsarovar Highway'
    farmer.district = 'Ahmedabad'
    farmer.pincode = '382110'
    farmer.farm_size = '28.5 Acres'
    farmer.crops_grown = 'Organic Sharbati Wheat, Alphonso & Kesar Mangoes, Polyhouse Tomatoes, Nashik Red Onions, 1121 Basmati Rice, Salem Turmeric, Green Moong, Shimla Mirch'
    farmer.farm_coordinates = '22.986745, 72.381290'
    farmer.set_password('Password123!')
    farmer.save()

    # Extended Farmer Profile with Full Trust Metrics & Multi-Land parcels
    f_profile, _ = FarmerProfile.objects.get_or_create(user=farmer)
    f_profile.full_name = 'Neeraj Chhaganbhai Patel'
    f_profile.farm_name = 'Shree Patel Agro & Organic Orchards'
    f_profile.avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'
    f_profile.alternate_whatsapp = '+919825123456'
    f_profile.village = 'Sanand Rural'
    f_profile.taluka = 'Sanand'
    f_profile.state = 'Gujarat'
    f_profile.farm_size_value = Decimal('28.5')
    f_profile.farm_size_unit = 'acres'
    f_profile.soil_farming_type = 'organic'
    f_profile.trust_score = 98
    f_profile.total_trips = 186
    f_profile.ontime_rate = Decimal('99.2')
    f_profile.avg_rating = Decimal('4.95')
    f_profile.rating_count = 124
    f_profile.dispute_free_rate = Decimal('99.8')
    f_profile.avg_freshness = Decimal('96.5')
    f_profile.soil_health_verified = True
    f_profile.zero_chemicals = True
    f_profile.primary_crops = [
        'Organic Sharbati Wheat', 'Ratnagiri Alphonso Mango', 'Gir Kesar Mango',
        'Polyhouse Hybrid Tomato', '1121 Aged Basmati Rice', 'Nashik Red Onion',
        'Salem Curcumin Turmeric', 'Green Moong Dal', 'Hydroponic Capsicum'
    ]
    f_profile.production_seasons = ['Kharif (Monsoon)', 'Rabi (Winter)', 'Zaid (Summer)']
    f_profile.irrigation_source = 'drip'
    f_profile.regular_supplier_to = 26
    f_profile.production_capacity = '125 Metric Tonnes / Year'
    f_profile.bank_account_name = 'Neeraj Chhaganbhai Patel'
    f_profile.bank_account_number = '50100492817291'
    f_profile.ifsc_code = 'HDFC0001234'
    f_profile.upi_id = 'neerajpatel@okhdfcbank'
    f_profile.govt_id_type = 'aadhaar'
    f_profile.govt_id_number = 'XXXX-XXXX-8921'
    f_profile.govt_id_verified = True
    f_profile.farm_lands = [
        {'name': 'Orchard Block North', 'area_acres': 10.5, 'crop': 'Alphonso & Kesar Mangoes', 'soil': 'Rich Loamy Soil (Organic Certified)'},
        {'name': 'Polyhouse Green Sector', 'area_acres': 4.5, 'crop': 'High-Yield Tomatoes & Capsicum', 'soil': 'Controlled Greenhouse Substrate'},
        {'name': 'River Basin Grain Plains', 'area_acres': 9.0, 'crop': 'Sharbati Wheat & 1121 Basmati', 'soil': 'Alluvial Deep Black Soil'},
        {'name': 'Spice & Legume Terrace', 'area_acres': 4.5, 'crop': 'Salem Turmeric & Green Moong', 'soil': 'Well Drained Red Loam'}
    ]
    f_profile.gallery_images = [
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800'
    ]
    f_profile.save()
    print(f"  [OK] Farmer neeraj_patel updated. Trust Score: {f_profile.trust_score} (Platinum Partner)")

    # B) Bulk Buyer: DMart Wholesale
    bulk_buyer, _ = User.objects.get_or_create(email='bmwq22835@gmail.com', defaults={'username': 'dmart_buyer'})
    bulk_buyer.username = 'dmart_buyer'
    bulk_buyer.first_name = 'DMart'
    bulk_buyer.last_name = 'Wholesale Procurement'
    bulk_buyer.role = 'bulk_buyer'
    bulk_buyer.phone = '+919825654321'
    bulk_buyer.is_verified = True
    bulk_buyer.kyc_status = 'approved'
    bulk_buyer.business_name = 'Avenue Supermarts Ltd (DMart Wholesale)'
    bulk_buyer.business_type = 'Supermarket Chain & Institutional Procurement'
    bulk_buyer.gst_number = '24AABCA1234F1Z8'
    bulk_buyer.address = 'DMart Central Fulfillment Distribution Center, Plot 42-45, GIDC Industrial Estate, Sanand'
    bulk_buyer.district = 'Ahmedabad'
    bulk_buyer.pincode = '382170'
    bulk_buyer.set_password('Password123!')
    bulk_buyer.save()
    print(f"  [OK] Bulk Buyer dmart_buyer updated ({bulk_buyer.business_name})")

    # C) Logistics Partner: YS Logistics
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
    print(f"  [OK] Logistics Partner ys_logistics updated (Fleet: {logistics_user.vehicle_number})")

    # D) Consumer: Peter Daruwala
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
    print(f"  [OK] Consumer peter_consumer updated ({consumer.get_full_name()})")

    # 2. MASSIVE PRODUCT CATALOG (20+ Items) FOR NEERAJ PATEL
    # -------------------------------------------------------------------------
    print("\n[2/7] Seeding 20+ High-Quality Farm Listings for Neeraj Patel...")

    catalog = [
        # Grains
        {
            'name': 'Organic Sharbati Wheat (Golden Grain C-306)',
            'category': 'grains',
            'quantity': Decimal('6500.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('48.00'),
            'harvest_date': date.today() - timedelta(days=2),
            'expiry_date': date.today() + timedelta(days=365),
            'description': 'Heavy golden grain Sharbati wheat, hand-harvested from certified organic river plains. Makes extraordinarily soft and aromatic rotis with rich dietary fiber.',
            'image_url': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'River Basin Grain Plains'
        },
        {
            'name': 'Royal 1121 Steam Basmati Rice (2-Year Aged)',
            'category': 'grains',
            'quantity': Decimal('3800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('94.00'),
            'harvest_date': date.today() - timedelta(days=14),
            'expiry_date': date.today() + timedelta(days=730),
            'description': 'Authentic long-grain aged 1121 steam basmati rice. Extends to 24mm length upon cooking, non-sticky and deeply fragrant for premium biryanis and pilafs.',
            'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'River Basin Grain Plains'
        },
        {
            'name': 'Organic Pearl Barley / Desi Jau',
            'category': 'grains',
            'quantity': Decimal('1400.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('62.00'),
            'harvest_date': date.today() - timedelta(days=20),
            'expiry_date': date.today() + timedelta(days=360),
            'description': 'Nutrient-rich hulled barley grain. Excellent for diabetes management, detox water, health soups, and artisanal baking.',
            'image_url': 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        },
        {
            'name': 'Traditional Organic Finger Millet (Ragi / Nachni)',
            'category': 'grains',
            'quantity': Decimal('1800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('68.00'),
            'harvest_date': date.today() - timedelta(days=12),
            'expiry_date': date.today() + timedelta(days=360),
            'description': 'Stone-cleaned red finger millet. High calcium and iron superfood, 100% pesticide-free harvest.',
            'image_url': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        },

        # Fruits
        {
            'name': 'Export-Grade Ratnagiri Alphonso Mangoes (Hapus)',
            'category': 'fruits',
            'quantity': Decimal('1200.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('220.00'),
            'harvest_date': date.today() - timedelta(days=1),
            'expiry_date': date.today() + timedelta(days=14),
            'description': 'Naturally tree-ripened Alphonso mangoes with rich saffron pulp and heavenly aroma. Zero chemical ripening guaranteed.',
            'image_url': 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': True,
            'source_land': 'Orchard Block North'
        },
        {
            'name': 'Gir Forest Sweet Kesar Mangoes',
            'category': 'fruits',
            'quantity': Decimal('1600.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('165.00'),
            'harvest_date': date.today() - timedelta(days=2),
            'expiry_date': date.today() + timedelta(days=16),
            'description': 'Famous Gujarat Kesar mangoes known as the queen of mangoes. Deep orange pulp, high sweetness and intense flavor profile.',
            'image_url': 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': True,
            'source_land': 'Orchard Block North'
        },
        {
            'name': 'Royal Gala Red Apples (Controlled Atmosphere)',
            'category': 'fruits',
            'quantity': Decimal('950.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('145.00'),
            'harvest_date': date.today() - timedelta(days=8),
            'expiry_date': date.today() + timedelta(days=45),
            'description': 'Crisp, juicy red apples with subtle floral aroma. Preserved in cold chain humidity storage directly from orchard.',
            'image_url': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': True,
            'source_land': 'Orchard Block North'
        },
        {
            'name': 'Fresh Nagpur Sweet Oranges (Santra)',
            'category': 'fruits',
            'quantity': Decimal('1800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('58.00'),
            'harvest_date': date.today() - timedelta(days=3),
            'expiry_date': date.today() + timedelta(days=21),
            'description': 'Plump, juicy sweet oranges packed with natural vitamin C. Thin skin, rich juice extraction percentage.',
            'image_url': 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Orchard Block North'
        },
        {
            'name': 'Organic Cavendish Green/Yellow Bananas',
            'category': 'fruits',
            'quantity': Decimal('1500.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('38.00'),
            'harvest_date': date.today() - timedelta(days=1),
            'expiry_date': date.today() + timedelta(days=8),
            'description': 'Farm-fresh chemical-free Cavendish bananas. High potassium, naturally sweet and energy-packed.',
            'image_url': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Orchard Block North'
        },
        {
            'name': 'Kashmiri Bhagwa Deep Red Pomegranates',
            'category': 'fruits',
            'quantity': Decimal('850.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('175.00'),
            'harvest_date': date.today() - timedelta(days=4),
            'expiry_date': date.today() + timedelta(days=30),
            'description': 'Deep ruby red soft seeds with high antioxidant value. Grade-A large size pomegranates for fresh snacking & juices.',
            'image_url': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Orchard Block North'
        },

        # Vegetables
        {
            'name': 'Farm Fresh Polyhouse Hybrid Tomatoes (Grade A+)',
            'category': 'vegetables',
            'quantity': Decimal('2800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('26.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=10),
            'description': 'Crisp, bright red polyhouse tomatoes with thick wall and juicy pulp. Harvested this morning with 98% freshness index.',
            'image_url': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Premium Nashik Red Onions (Dry Cured 55mm+)',
            'category': 'vegetables',
            'quantity': Decimal('4800.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('32.00'),
            'harvest_date': date.today() - timedelta(days=3),
            'expiry_date': date.today() + timedelta(days=60),
            'description': 'Thoroughly dried and graded red onions. Long shelf life, pungent flavor, uniform grading, zero sprouting.',
            'image_url': 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Green Bell Peppers / Capsicum (Shimla Mirch)',
            'category': 'vegetables',
            'quantity': Decimal('1100.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('52.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=9),
            'description': 'Glossy green hydroponic bell peppers. Crunchy texture, thick flesh, vibrant green color.',
            'image_url': 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Organic Baby Spinach / Tender Palak',
            'category': 'vegetables',
            'quantity': Decimal('450.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('35.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=3),
            'description': 'Hydroponically harvested tender spinach leaves. Zero grit or mud, washed and packed fresh in breathable punnets.',
            'image_url': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Fresh Jyoti Table Potatoes (Grade 1)',
            'category': 'vegetables',
            'quantity': Decimal('5500.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('24.00'),
            'harvest_date': date.today() - timedelta(days=5),
            'expiry_date': date.today() + timedelta(days=90),
            'description': 'Smooth skin golden Jyoti potatoes. Ideal starch content for everyday cooking, chips, and curries.',
            'image_url': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Crisp Green Broccoli Crowns',
            'category': 'vegetables',
            'quantity': Decimal('700.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('78.00'),
            'harvest_date': date.today() - timedelta(days=1),
            'expiry_date': date.today() + timedelta(days=7),
            'description': 'Tight, dark green broccoli florets grown under temperature-controlled greenhouse conditions.',
            'image_url': 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },
        {
            'name': 'Spicy G4 Green Chillies (Hari Mirch)',
            'category': 'vegetables',
            'quantity': Decimal('500.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('68.00'),
            'harvest_date': date.today(),
            'expiry_date': date.today() + timedelta(days=14),
            'description': 'High pungency long green chillies. Sharp heat and vibrant natural green aroma.',
            'image_url': 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Polyhouse Green Sector'
        },

        # Spices & Pulses
        {
            'name': 'Organic Salem High-Curcumin Turmeric Powder (5.4%)',
            'category': 'spices',
            'quantity': Decimal('900.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('195.00'),
            'harvest_date': date.today() - timedelta(days=15),
            'expiry_date': date.today() + timedelta(days=365),
            'description': 'Cold stone-ground organic turmeric powder with verified 5.4% curcumin content. Zero lead chromate or synthetic color.',
            'image_url': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        },
        {
            'name': 'Unpolished Organic Green Moong Dal (Whole Gram)',
            'category': 'pulses',
            'quantity': Decimal('2400.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('115.00'),
            'harvest_date': date.today() - timedelta(days=10),
            'expiry_date': date.today() + timedelta(days=360),
            'description': '100% raw unpolished whole green moong dal. High plant protein, fast sprouting rate and pure natural taste.',
            'image_url': 'https://images.unsplash.com/photo-1585994192701-f1a505c8574a?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        },
        {
            'name': 'Desi Organic Chana Dal (Unpolished Split Chickpeas)',
            'category': 'pulses',
            'quantity': Decimal('1900.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('98.00'),
            'harvest_date': date.today() - timedelta(days=18),
            'expiry_date': date.today() + timedelta(days=360),
            'description': 'Naturally sun-dried desi chana dal. Rich in dietary fiber, low glycemic index, zero chemical polish.',
            'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        },
        {
            'name': 'Pure Unadulterated Cumin Seeds (Jeera A-Grade)',
            'category': 'spices',
            'quantity': Decimal('600.00'),
            'unit': 'kg',
            'price_per_unit': Decimal('340.00'),
            'harvest_date': date.today() - timedelta(days=22),
            'expiry_date': date.today() + timedelta(days=540),
            'description': 'Large bold cumin seeds with intense essential oil aroma. Machine cleaned with zero dust or hollow grains.',
            'image_url': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=800',
            'stored_in_cold_storage': False,
            'source_land': 'Spice & Legume Terrace'
        }
    ]

    saved_products = []
    for item in catalog:
        prod, created = Product.objects.get_or_create(
            farmer=farmer,
            name=item['name'],
            defaults=item
        )
        if not created:
            for k, v in item.items():
                setattr(prod, k, v)
            prod.save()
        saved_products.append(prod)
        print(f"  [OK] Product: {prod.name} ({prod.quantity} {prod.unit} @ Rs.{prod.price_per_unit})")

    # 3. AUCTIONS, BIDS & PRE-HARVEST CONTRACTS
    # -------------------------------------------------------------------------
    print("\n[3/7] Setting up Dynamic Auctions, Bids & Pre-Harvest Contracts...")

    # Auction 1: Active Alphonso Mangoes
    auc1, _ = Auction.objects.get_or_create(
        farmer=farmer,
        product_name='Premium Ratnagiri Alphonso Mangoes (First Batch Lot - 500kg)',
        defaults={
            'quantity': Decimal('500.00'),
            'unit': 'kg',
            'starting_price': Decimal('180.00'),
            'highest_bid': Decimal('215.00'),
            'end_time': timezone.now() + timedelta(days=4),
            'status': 'active'
        }
    )
    Bid.objects.get_or_create(auction=auc1, buyer=bulk_buyer, defaults={'bid_amount': Decimal('215.00')})

    # Auction 2: Active 1121 Basmati Rice Lot
    auc2, _ = Auction.objects.get_or_create(
        farmer=farmer,
        product_name='Export Quality 1121 Steam Basmati Rice (1,000kg Lot)',
        defaults={
            'quantity': Decimal('1000.00'),
            'unit': 'kg',
            'starting_price': Decimal('85.00'),
            'highest_bid': Decimal('92.50'),
            'end_time': timezone.now() + timedelta(days=2),
            'status': 'active'
        }
    )
    Bid.objects.get_or_create(auction=auc2, buyer=bulk_buyer, defaults={'bid_amount': Decimal('92.50')})

    # Auction 3: Completed Wheat Auction
    auc3, _ = Auction.objects.get_or_create(
        farmer=farmer,
        product_name='Winter Sharbati Wheat Premium Silo Lot (2,500kg)',
        defaults={
            'quantity': Decimal('2500.00'),
            'unit': 'kg',
            'starting_price': Decimal('42.00'),
            'highest_bid': Decimal('47.50'),
            'end_time': timezone.now() - timedelta(days=3),
            'status': 'completed'
        }
    )
    Bid.objects.get_or_create(auction=auc3, buyer=bulk_buyer, defaults={'bid_amount': Decimal('47.50')})

    # Pre-Harvest Contracts
    phc1, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        buyer=bulk_buyer,
        crop_name='Organic 1121 Basmati Rice (Upcoming Winter Harvest Pool)',
        defaults={
            'expected_harvest_date': date.today() + timedelta(days=45),
            'expected_quantity': Decimal('8000.00'),
            'unit': 'kg',
            'contract_price': Decimal('88.00'),
            'status': 'accepted'
        }
    )

    phc2, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        buyer=bulk_buyer,
        crop_name='Polyhouse Hybrid Red Tomatoes (Next Month Harvest Flush)',
        defaults={
            'expected_harvest_date': date.today() + timedelta(days=25),
            'expected_quantity': Decimal('6000.00'),
            'unit': 'kg',
            'contract_price': Decimal('24.00'),
            'status': 'harvest_pending'
        }
    )

    phc3, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        crop_name='Summer Gir Kesar Mango Pool (4,000kg)',
        defaults={
            'expected_harvest_date': date.today() + timedelta(days=60),
            'expected_quantity': Decimal('4000.00'),
            'unit': 'kg',
            'contract_price': Decimal('145.00'),
            'status': 'proposed'
        }
    )

    phc4, _ = PreHarvestContract.objects.get_or_create(
        farmer=farmer,
        buyer=bulk_buyer,
        crop_name='Rabi Certified Sharbati Wheat (15,000kg Silo Contract)',
        defaults={
            'expected_harvest_date': date.today() - timedelta(days=5),
            'expected_quantity': Decimal('15000.00'),
            'unit': 'kg',
            'contract_price': Decimal('46.00'),
            'status': 'ready'
        }
    )
    print("  [OK] 3 Auctions and 4 Pre-Harvest Contracts created.")

    # 4. BULK REQUIREMENTS (RFQs) & DIRECT QUOTES FOR DMART
    # -------------------------------------------------------------------------
    print("\n[4/7] Generating Comprehensive Bulk Requirements & Quotes for DMart...")

    rfqs = [
        {
            'crop_name': 'Grade-A Hybrid Tomatoes (Fresh Daily Batch)',
            'variety': 'Abhinav / S-312',
            'quantity': Decimal('5000.00'),
            'unit': 'kg',
            'grade': 'A+',
            'required_date': date.today() + timedelta(days=6),
            'target_price_min': Decimal('22.00'),
            'target_price_max': Decimal('27.00'),
            'location': 'DMart Distribution Hub, Sanand GIDC',
            'status': 'pending'
        },
        {
            'crop_name': 'Organic Sharbati Wheat (Milling Quality)',
            'variety': 'Sharbati C-306',
            'quantity': Decimal('15000.00'),
            'unit': 'kg',
            'grade': 'A',
            'required_date': date.today() + timedelta(days=12),
            'target_price_min': Decimal('44.00'),
            'target_price_max': Decimal('48.00'),
            'location': 'DMart Central Grain Silo, Ahmedabad',
            'status': 'pending'
        },
        {
            'crop_name': 'Nashik Red Onions (Export Mesh Sacks 55mm+)',
            'variety': 'Nashik Gavran Red',
            'quantity': Decimal('10000.00'),
            'unit': 'kg',
            'grade': 'A',
            'required_date': date.today() + timedelta(days=15),
            'target_price_min': Decimal('28.00'),
            'target_price_max': Decimal('33.00'),
            'location': 'DMart Cold Storage Hub, Aslali',
            'status': 'pending'
        },
        {
            'crop_name': 'Aged 1121 Steam Basmati Rice',
            'variety': '1121 XXL Grain',
            'quantity': Decimal('8000.00'),
            'unit': 'kg',
            'grade': 'A+',
            'required_date': date.today() + timedelta(days=20),
            'target_price_min': Decimal('86.00'),
            'target_price_max': Decimal('92.00'),
            'location': 'DMart Central Fulfillment Hub',
            'status': 'pending'
        },
        {
            'crop_name': 'Unpolished Green Moong Dal',
            'variety': 'Desi Whole Gram',
            'quantity': Decimal('4000.00'),
            'unit': 'kg',
            'grade': 'A',
            'required_date': date.today() + timedelta(days=10),
            'target_price_min': Decimal('108.00'),
            'target_price_max': Decimal('115.00'),
            'location': 'DMart Grocery Distribution Center',
            'status': 'pending'
        }
    ]

    for r_data in rfqs:
        rfq_obj, _ = BulkRequirement.objects.get_or_create(
            buyer=bulk_buyer,
            crop_name=r_data['crop_name'],
            defaults=r_data
        )
        # Neeraj Patel submits competitive offers
        FarmerOffer.objects.get_or_create(
            requirement=rfq_obj,
            farmer=farmer,
            defaults={
                'quantity': r_data['quantity'] * Decimal('0.7'),
                'price_per_unit': r_data['target_price_max'] - Decimal('1.00'),
                'delivery_date': r_data['required_date'] - timedelta(days=2),
                'notes': 'Certified organic harvest, moisture level < 10%. Free palletized dispatch.',
                'status': 'accepted' if 'Tomatoes' in r_data['crop_name'] or 'Wheat' in r_data['crop_name'] else 'pending'
            }
        )

    # Direct Quote Requests
    for prod_sample in saved_products[:4]:
        QuoteRequest.objects.get_or_create(
            buyer=bulk_buyer,
            product=prod_sample,
            defaults={
                'quantity': Decimal('1500.00'),
                'target_price': prod_sample.price_per_unit * Decimal('0.9'),
                'offered_price': prod_sample.price_per_unit * Decimal('0.94'),
                'status': 'offered'
            }
        )
    print("  [OK] 5 Bulk Requirements (RFQs) and 4 Direct Quote Negotiations created.")

    # 5. WHOLESALE & CONSUMER ORDERS (With Payments & Shipments)
    # -------------------------------------------------------------------------
    print("\n[5/7] Creating Wholesale Orders for DMart and Retail Orders for Peter Daruwala...")

    wheat_prod = saved_products[0]
    basmati_prod = saved_products[1]
    mango_prod = saved_products[4]
    kesar_prod = saved_products[5]
    tomato_prod = saved_products[10]
    onion_prod = saved_products[11]
    capsicum_prod = saved_products[12]
    spinach_prod = saved_products[13]
    turmeric_prod = saved_products[17]
    moong_prod = saved_products[18]

    # --- DMART WHOLESALE ORDERS ---
    wholesale_orders_data = [
        {
            'order_id': 'DMART-WHOLESALE-001',
            'product_items': [(wheat_prod, Decimal('3000.00'), Decimal('48.00'))],
            'shipping_charge': Decimal('2500.00'),
            'status': 'in_transit',
            'shipment_status': 'picked_up',
            'distance': Decimal('34.50'),
            'otp': '782914'
        },
        {
            'order_id': 'DMART-WHOLESALE-002',
            'product_items': [
                (tomato_prod, Decimal('1500.00'), Decimal('26.00')),
                (onion_prod, Decimal('800.00'), Decimal('32.00'))
            ],
            'shipping_charge': Decimal('1800.00'),
            'status': 'delivered',
            'shipment_status': 'delivered',
            'distance': Decimal('32.00'),
            'otp': '519820'
        },
        {
            'order_id': 'DMART-WHOLESALE-003',
            'product_items': [(mango_prod, Decimal('500.00'), Decimal('215.00'))],
            'shipping_charge': Decimal('2000.00'),
            'status': 'delivered',
            'shipment_status': 'delivered',
            'distance': Decimal('36.00'),
            'otp': '902148'
        },
        {
            'order_id': 'DMART-WHOLESALE-004',
            'product_items': [(basmati_prod, Decimal('2000.00'), Decimal('92.00'))],
            'shipping_charge': Decimal('2200.00'),
            'status': 'confirmed',
            'shipment_status': 'assigned',
            'distance': Decimal('42.00'),
            'otp': '819203'
        },
        {
            'order_id': 'DMART-WHOLESALE-005',
            'product_items': [(moong_prod, Decimal('1000.00'), Decimal('115.00'))],
            'shipping_charge': Decimal('1500.00'),
            'status': 'packed',
            'shipment_status': 'assigned',
            'distance': Decimal('38.50'),
            'otp': '340192'
        },
        {
            'order_id': 'DMART-WHOLESALE-006',
            'product_items': [
                (turmeric_prod, Decimal('400.00'), Decimal('195.00')),
                (capsicum_prod, Decimal('500.00'), Decimal('52.00'))
            ],
            'shipping_charge': Decimal('1600.00'),
            'status': 'placed',
            'shipment_status': 'assigned',
            'distance': Decimal('30.00'),
            'otp': '672019'
        }
    ]

    for w_data in wholesale_orders_data:
        subtotal = sum(qty * price for _, qty, price in w_data['product_items'])
        total_amount = subtotal + w_data['shipping_charge']

        w_order, _ = Order.objects.get_or_create(
            buyer=bulk_buyer,
            razorpay_order_id=f"rzp_{w_data['order_id']}",
            defaults={
                'product_subtotal': subtotal,
                'shipping_charge': w_data['shipping_charge'],
                'total_amount': total_amount,
                'status': w_data['status'],
                'shipping_address': bulk_buyer.address,
                'shipping_pincode': bulk_buyer.pincode,
                'payment_status': 'paid' if w_data['status'] in ['in_transit', 'delivered', 'confirmed', 'packed'] else 'pending',
                'payment_id': f"pay_{w_data['order_id']}_success"
            }
        )
        for prod, qty, price in w_data['product_items']:
            OrderItem.objects.get_or_create(order=w_order, product=prod, defaults={'quantity': qty, 'price': price})

        # Link DeliveryShipment for YS Logistics
        DeliveryShipment.objects.get_or_create(
            order=w_order,
            defaults={
                'partner': log_partner,
                'pickup_address': farmer.address,
                'delivery_address': w_order.shipping_address,
                'distance_km': w_data['distance'],
                'status': w_data['shipment_status'],
                'delivery_otp': w_data['otp'],
                'shipped_at': timezone.now() - timedelta(hours=4) if w_data['shipment_status'] in ['picked_up', 'delivered'] else None,
                'delivered_at': timezone.now() - timedelta(days=1) if w_data['shipment_status'] == 'delivered' else None
            }
        )

    # --- PETER DARUWALA CONSUMER ORDERS ---
    consumer_orders_data = [
        {
            'order_id': 'PETER-RETAIL-001',
            'items': [
                (wheat_prod, Decimal('5.00'), Decimal('48.00')),
                (tomato_prod, Decimal('3.00'), Decimal('26.00')),
                (capsicum_prod, Decimal('1.50'), Decimal('52.00'))
            ],
            'shipping': Decimal('40.00'),
            'status': 'delivered',
            'shipment_status': 'delivered',
            'distance': Decimal('18.20'),
            'otp': '439201'
        },
        {
            'order_id': 'PETER-RETAIL-002',
            'items': [
                (mango_prod, Decimal('3.00'), Decimal('220.00')),
                (onion_prod, Decimal('2.00'), Decimal('32.00'))
            ],
            'shipping': Decimal('40.00'),
            'status': 'in_transit',
            'shipment_status': 'picked_up',
            'distance': Decimal('18.20'),
            'otp': '651829'
        },
        {
            'order_id': 'PETER-RETAIL-003',
            'items': [
                (basmati_prod, Decimal('2.00'), Decimal('94.00')),
                (turmeric_prod, Decimal('0.50'), Decimal('195.00'))
            ],
            'shipping': Decimal('35.00'),
            'status': 'packed',
            'shipment_status': 'assigned',
            'distance': Decimal('18.20'),
            'otp': '891024'
        },
        {
            'order_id': 'PETER-RETAIL-004',
            'items': [
                (kesar_prod, Decimal('2.00'), Decimal('165.00')),
                (moong_prod, Decimal('1.00'), Decimal('115.00'))
            ],
            'shipping': Decimal('35.00'),
            'status': 'confirmed',
            'shipment_status': 'assigned',
            'distance': Decimal('18.20'),
            'otp': '310928'
        },
        {
            'order_id': 'PETER-RETAIL-005',
            'items': [
                (spinach_prod, Decimal('2.00'), Decimal('35.00')),
                (tomato_prod, Decimal('2.00'), Decimal('26.00')),
                (onion_prod, Decimal('3.00'), Decimal('32.00'))
            ],
            'shipping': Decimal('40.00'),
            'status': 'delivered',
            'shipment_status': 'delivered',
            'distance': Decimal('18.20'),
            'otp': '771920'
        },
        {
            'order_id': 'PETER-RETAIL-006',
            'items': [(wheat_prod, Decimal('10.00'), Decimal('48.00'))],
            'shipping': Decimal('50.00'),
            'status': 'delivered',
            'shipment_status': 'delivered',
            'distance': Decimal('18.20'),
            'otp': '602194'
        },
        {
            'order_id': 'PETER-RETAIL-007',
            'items': [
                (tomato_prod, Decimal('4.00'), Decimal('26.00')),
                (capsicum_prod, Decimal('2.00'), Decimal('52.00'))
            ],
            'shipping': Decimal('40.00'),
            'status': 'placed',
            'shipment_status': 'assigned',
            'distance': Decimal('18.20'),
            'otp': '482019'
        }
    ]

    for c_data in consumer_orders_data:
        subtotal = sum(qty * price for _, qty, price in c_data['items'])
        total_amount = subtotal + c_data['shipping']

        c_order, _ = Order.objects.get_or_create(
            buyer=consumer,
            razorpay_order_id=f"rzp_{c_data['order_id']}",
            defaults={
                'product_subtotal': subtotal,
                'shipping_charge': c_data['shipping'],
                'total_amount': total_amount,
                'status': c_data['status'],
                'shipping_address': consumer.address,
                'shipping_pincode': consumer.pincode,
                'payment_status': 'paid' if c_data['status'] != 'placed' else 'pending',
                'payment_id': f"pay_{c_data['order_id']}_ok"
            }
        )
        for prod, qty, price in c_data['items']:
            OrderItem.objects.get_or_create(order=c_order, product=prod, defaults={'quantity': qty, 'price': price})

        # Link DeliveryShipment for YS Logistics
        DeliveryShipment.objects.get_or_create(
            order=c_order,
            defaults={
                'partner': log_partner,
                'pickup_address': farmer.address,
                'delivery_address': c_order.shipping_address,
                'distance_km': c_data['distance'],
                'status': c_data['shipment_status'],
                'delivery_otp': c_data['otp'],
                'shipped_at': timezone.now() - timedelta(hours=2) if c_data['shipment_status'] in ['picked_up', 'delivered'] else None,
                'delivered_at': timezone.now() - timedelta(days=2) if c_data['shipment_status'] == 'delivered' else None
            }
        )

    print("  [OK] 6 Wholesale Orders (DMart) and 7 Consumer Orders (Peter Daruwala) with YS Logistics Shipments created.")

    # 6. CONSUMER RECURRING SUBSCRIPTIONS
    # -------------------------------------------------------------------------
    print("\n[6/7] Creating Active & Historical Subscriptions for Peter Daruwala...")

    sub1, _ = Subscription.objects.get_or_create(
        buyer=consumer,
        razorpay_subscription_id='sub_Peter_Weekly_Veggies',
        defaults={
            'frequency': 'weekly',
            'delivery_day': 'Monday',
            'delivery_time_slot': 'morning',
            'duration_months': 3,
            'total_deliveries': 12,
            'completed_deliveries': 5,
            'start_date': date.today() - timedelta(days=35),
            'next_delivery_date': date.today() + timedelta(days=4),
            'per_delivery_subtotal': Decimal('320.00'),
            'discount_percentage': Decimal('10.00'),
            'shipping_charge': Decimal('0.00'),
            'per_delivery_total': Decimal('288.00'),
            'total_plan_amount': Decimal('3456.00'),
            'status': 'active',
            'shipping_address': consumer.address,
            'shipping_pincode': consumer.pincode
        }
    )
    SubscriptionItem.objects.get_or_create(subscription=sub1, product=tomato_prod, defaults={'quantity': Decimal('2.00'), 'price': Decimal('26.00')})
    SubscriptionItem.objects.get_or_create(subscription=sub1, product=onion_prod, defaults={'quantity': Decimal('2.00'), 'price': Decimal('32.00')})
    SubscriptionItem.objects.get_or_create(subscription=sub1, product=capsicum_prod, defaults={'quantity': Decimal('1.00'), 'price': Decimal('52.00')})
    SubscriptionItem.objects.get_or_create(subscription=sub1, product=spinach_prod, defaults={'quantity': Decimal('2.00'), 'price': Decimal('35.00')})

    sub2, _ = Subscription.objects.get_or_create(
        buyer=consumer,
        razorpay_subscription_id='sub_Peter_Biweekly_Grains',
        defaults={
            'frequency': 'biweekly',
            'delivery_day': 'Saturday',
            'delivery_time_slot': 'afternoon',
            'duration_months': 2,
            'total_deliveries': 4,
            'completed_deliveries': 4,
            'start_date': date.today() - timedelta(days=60),
            'next_delivery_date': date.today() - timedelta(days=4),
            'per_delivery_subtotal': Decimal('450.00'),
            'discount_percentage': Decimal('8.00'),
            'shipping_charge': Decimal('0.00'),
            'per_delivery_total': Decimal('414.00'),
            'total_plan_amount': Decimal('1656.00'),
            'status': 'completed',
            'shipping_address': consumer.address,
            'shipping_pincode': consumer.pincode
        }
    )
    SubscriptionItem.objects.get_or_create(subscription=sub2, product=wheat_prod, defaults={'quantity': Decimal('5.00'), 'price': Decimal('48.00')})
    SubscriptionItem.objects.get_or_create(subscription=sub2, product=moong_prod, defaults={'quantity': Decimal('2.00'), 'price': Decimal('115.00')})

    print("  [OK] Active Weekly Produce Subscription (5/12 deliveries completed) and Past Grain Subscription seeded.")

    # 7. REVIEWS & RATINGS (12 Verified Testimonials)
    # -------------------------------------------------------------------------
    print("\n[7/7] Adding 12 Verified Reviews & Ratings for Neeraj Patel...")

    reviews_data = [
        (consumer, 5, "Outstanding sweetness in Alphonso mangoes and the Sharbati wheat rotis stay soft till dinner! Delivered in pristine condition."),
        (bulk_buyer, 5, "Exceptional wholesale vendor. DMart has procured 3,000 kg wheat and 1,500 kg tomatoes. Uniform grading and zero transit spoilage."),
        (consumer, 5, "The weekly subscription basket has transformed our kitchen cooking. The spinach is crisp and unblemished, tomatoes are vine-fresh."),
        (bulk_buyer, 5, "Reliable contract farming partner. Neeraj Patel honored the agreed Basmati pricing regardless of spot market fluctuations."),
        (consumer, 5, "Salem turmeric aroma is potent and pure. You can tell immediately there are zero synthetic fillers. Will order again."),
        (consumer, 4, "Great quality red onions. Well cured with crisp skin. Delivery was within 3 hours by YS Logistics."),
        (bulk_buyer, 5, "Cold storage logistics integration with YS ColdChain works flawlessly. Moisture content was strictly maintained under 10%."),
        (consumer, 5, "Unpolished green moong sprouts in less than 24 hours. Pure organic quality at genuine farm prices."),
        (consumer, 5, "Capsicum and tomatoes arrived fresh as morning dew. The QR traceability batch verified harvest location accurately."),
        (bulk_buyer, 5, "Pre-harvest contract execution was transparent with timely field status updates."),
        (consumer, 5, "Best farm produce platform in Gujarat. Real direct-from-farmer experience."),
        (consumer, 5, "Super aged Basmati rice grains expanded beautifully with zero breakage. 5 stars all the way.")
    ]

    for reviewer, rating, comment in reviews_data:
        Review.objects.get_or_create(
            reviewer=reviewer,
            farmer=farmer,
            comment=comment,
            defaults={'rating': rating}
        )

    print("\n" + "=" * 70)
    print("MASSIVE DUMMY DATA SEEDING COMPLETE FOR ALL 4 USER PROFILES!")
    print("=" * 70)

if __name__ == '__main__':
    populate()
