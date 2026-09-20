import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')
django.setup()

from django.contrib.auth import get_user_model
from farmer_profile.models import FarmerProfile
from products.models import (
    Product, Auction, Bid, GroupOrder, GroupOrderParticipant,
    FlashSale, TraceabilityLot
)
from orders.models import (
    Order, OrderItem, Subscription, SubscriptionItem,
    QuoteRequest, BulkRequirement, FarmerOffer, PreHarvestContract
)
from pricing.models import Market, MarketPrice
from logistics.models import LogisticsPartner, DeliveryShipment
from reviews.models import Review
from chatbot.models import Conversation, ChatMessage, FarmerMemory, ToolCallLog

User = get_user_model()

def seed_data():
    print("[START] Starting KisanConnect Demo Data Seeding on Supabase PostgreSQL...")

    # --------------------------------------------------------------------------
    # 1. USERS & PROFILES (3 Farmers, 3 Bulk Buyers, 3 Consumers, 3 Logistics, 1 Admin)
    # --------------------------------------------------------------------------
    print("\n[1/10] Seeding Users and Profiles...")
    
    # Farmers
    farmers_data = [
        {
            "username": "ramesh_patel",
            "first_name": "Ramesh",
            "last_name": "Patel",
            "email": "ramesh.patel@kisan.in",
            "phone": "+919823011111",
            "role": "farmer",
            "district": "Nashik",
            "pincode": "422001",
            "farm_size": "12 Acres",
            "crops_grown": "Tomatoes, Red Onions, Alphonso Mangoes",
            "farm_coordinates": "20.0059, 73.7898",
            "profile": {
                "full_name": "Ramesh Chandra Patel",
                "farm_name": "Patel Organic Farms",
                "village": "Pimplegaon",
                "taluka": "Niphad",
                "state": "Maharashtra",
                "farm_size_value": Decimal("12.0"),
                "farm_size_unit": "acres",
                "soil_farming_type": "organic",
                "trust_score": 94,
                "total_trips": 48,
                "ontime_rate": Decimal("98.50"),
                "avg_rating": Decimal("4.9"),
                "rating_count": 35,
                "dispute_free_rate": Decimal("100.00"),
                "avg_freshness": Decimal("96.40"),
                "soil_health_verified": True,
                "zero_chemicals": True,
                "primary_crops": ["Tomatoes", "Onions", "Mangoes"],
                "production_seasons": ["Kharif", "Rabi"],
                "irrigation_source": "drip",
                "bank_account_name": "Ramesh Patel",
                "bank_account_number": "50100234567891",
                "ifsc_code": "HDFC0001234",
                "upi_id": "rameshpatel@okaxis",
                "govt_id_type": "kcc",
                "govt_id_number": "KCC-MAH-987654",
                "govt_id_verified": True,
            }
        },
        {
            "username": "suresh_kumar",
            "first_name": "Suresh",
            "last_name": "Kumar",
            "email": "suresh.kumar@kisan.in",
            "phone": "+919823022222",
            "role": "farmer",
            "district": "Karnal",
            "pincode": "132001",
            "farm_size": "25 Acres",
            "crops_grown": "Basmati Rice, Sharbati Wheat, Mustard",
            "farm_coordinates": "29.6857, 76.9905",
            "profile": {
                "full_name": "Suresh Kumar Sharma",
                "farm_name": "Green Fields Agritech",
                "village": "Gharaunda",
                "taluka": "Karnal",
                "state": "Haryana",
                "farm_size_value": Decimal("25.0"),
                "farm_size_unit": "acres",
                "soil_farming_type": "natural",
                "trust_score": 88,
                "total_trips": 32,
                "ontime_rate": Decimal("96.00"),
                "avg_rating": Decimal("4.8"),
                "rating_count": 28,
                "dispute_free_rate": Decimal("97.50"),
                "avg_freshness": Decimal("94.00"),
                "soil_health_verified": True,
                "zero_chemicals": False,
                "primary_crops": ["Wheat", "Basmati Rice"],
                "production_seasons": ["Rabi", "Zaid"],
                "irrigation_source": "well",
                "bank_account_name": "Suresh Kumar",
                "bank_account_number": "309876543210",
                "ifsc_code": "SBIN0004321",
                "upi_id": "sureshkumar@sbi",
                "govt_id_type": "pmkisan",
                "govt_id_number": "PMK-HAR-123456",
                "govt_id_verified": True,
            }
        },
        {
            "username": "anita_devi",
            "first_name": "Anita",
            "last_name": "Devi",
            "email": "anita.devi@kisan.in",
            "phone": "+919823033333",
            "role": "farmer",
            "district": "Guntur",
            "pincode": "522002",
            "farm_size": "8 Acres",
            "crops_grown": "Guntur Teja Red Chilli, Organic Turmeric, Pulses",
            "farm_coordinates": "16.3067, 80.4365",
            "profile": {
                "full_name": "Anita Devi Reddy",
                "farm_name": "Sri Lakshmi Spice Farms",
                "village": "Tenali",
                "taluka": "Guntur",
                "state": "Andhra Pradesh",
                "farm_size_value": Decimal("8.0"),
                "farm_size_unit": "acres",
                "soil_farming_type": "organic",
                "trust_score": 91,
                "total_trips": 40,
                "ontime_rate": Decimal("99.00"),
                "avg_rating": Decimal("4.95"),
                "rating_count": 39,
                "dispute_free_rate": Decimal("100.00"),
                "avg_freshness": Decimal("97.80"),
                "soil_health_verified": True,
                "zero_chemicals": True,
                "primary_crops": ["Red Chilli", "Turmeric"],
                "production_seasons": ["Kharif"],
                "irrigation_source": "canal",
                "bank_account_name": "Anita Devi",
                "bank_account_number": "601122334455",
                "ifsc_code": "ANDB0009876",
                "upi_id": "anitadevi@icici",
                "govt_id_type": "aadhaar",
                "govt_id_number": "9999-8888-7777",
                "govt_id_verified": True,
            }
        }
    ]

    farmers = []
    for fdata in farmers_data:
        prof_info = fdata.pop("profile")
        user, _ = User.objects.get_or_create(
            username=fdata["username"],
            defaults={**fdata, "is_verified": True, "kyc_status": "approved"}
        )
        user.set_password("Password123!")
        user.save()
        
        # Create/Update Farmer Profile
        FarmerProfile.objects.update_or_create(user=user, defaults=prof_info)
        farmers.append(user)
        print(f"   Created Farmer: {user.username}")

    # Bulk Buyers
    buyers_data = [
        {
            "username": "buyer_reliance",
            "first_name": "Reliance",
            "last_name": "Fresh",
            "email": "procurement@reliancefresh.com",
            "phone": "+919876011111",
            "role": "bulk_buyer",
            "business_name": "Reliance Retail Agri Sourcing Ltd",
            "business_type": "Retail Chain Supermarket",
            "gst_number": "27AAACR1234H1Z0",
            "district": "Mumbai",
            "pincode": "400001",
        },
        {
            "username": "buyer_itc",
            "first_name": "ITC",
            "last_name": "Agri",
            "email": "e-choupal@itc.in",
            "phone": "+919876022222",
            "role": "bulk_buyer",
            "business_name": "ITC ABD Limited (e-Choupal)",
            "business_type": "Food Processor & Exporter",
            "gst_number": "06AAACI9876F1Z5",
            "district": "Gurugram",
            "pincode": "122002",
        },
        {
            "username": "buyer_zomato",
            "first_name": "Hyperpure",
            "last_name": "Zomato",
            "email": "sourcing@hyperpure.com",
            "phone": "+919876033333",
            "role": "bulk_buyer",
            "business_name": "Hyperpure by Zomato Logistics",
            "business_type": "B2B Restaurant Supply Network",
            "gst_number": "29AAACZ5555K1Z2",
            "district": "Bengaluru",
            "pincode": "560001",
        }
    ]

    bulk_buyers = []
    for bdata in buyers_data:
        user, _ = User.objects.get_or_create(
            username=bdata["username"],
            defaults={**bdata, "is_verified": True}
        )
        user.set_password("Password123!")
        user.save()
        bulk_buyers.append(user)
        print(f"   Created Bulk Buyer: {user.username}")

    # Consumers
    consumers_data = [
        {
            "username": "consumer_priya",
            "first_name": "Priya",
            "last_name": "Sharma",
            "email": "priya.sharma@gmail.com",
            "phone": "+919123011111",
            "role": "consumer",
            "district": "Mumbai",
            "pincode": "400050",
            "address": "Flat 402, Sea View Apartments, Bandra West, Mumbai"
        },
        {
            "username": "consumer_rahul",
            "first_name": "Rahul",
            "last_name": "Verma",
            "email": "rahul.verma@gmail.com",
            "phone": "+919123022222",
            "role": "consumer",
            "district": "Delhi",
            "pincode": "110001",
            "address": "B-12, Connaught Place, New Delhi"
        },
        {
            "username": "consumer_vikram",
            "first_name": "Vikram",
            "last_name": "Joshi",
            "email": "vikram.joshi@gmail.com",
            "phone": "+919123033333",
            "role": "consumer",
            "district": "Bengaluru",
            "pincode": "560034",
            "address": "128, 4th Block, Koramangala, Bengaluru"
        }
    ]

    consumers = []
    for cdata in consumers_data:
        user, _ = User.objects.get_or_create(
            username=cdata["username"],
            defaults={**cdata, "is_verified": True}
        )
        user.set_password("Password123!")
        user.save()
        consumers.append(user)
        print(f"   Created Consumer: {user.username}")

    # Logistics Partners
    logistics_users_data = [
        {
            "username": "logistics_vrl",
            "first_name": "VRL",
            "last_name": "Express",
            "email": "ops@vrllogistics.in",
            "phone": "+919555011111",
            "role": "logistics_partner",
            "vehicle_number": "MH-15-EG-4521",
            "vehicle_type": "Refrigerated Eicher Pro 10 Ton",
            "capacity": "10 Tons Cold Storage",
            "service_area": "Maharashtra & Gujarat Corridor",
            "district": "Nashik",
            "pincode": "422003",
        },
        {
            "username": "logistics_tci",
            "first_name": "TCI",
            "last_name": "ColdChain",
            "email": "agri@tciexpress.in",
            "phone": "+919555022222",
            "role": "logistics_partner",
            "vehicle_number": "HR-65-AK-9988",
            "vehicle_type": "Tata Signa 2823 Insulated Truck",
            "capacity": "15 Tons Insulated",
            "service_area": "North India Agri Corridor",
            "district": "Karnal",
            "pincode": "132001",
        },
        {
            "username": "logistics_gati",
            "first_name": "Gati",
            "last_name": "KWE Sourcing",
            "email": "express@gatikwe.com",
            "phone": "+919555033333",
            "role": "logistics_partner",
            "vehicle_number": "AP-07-TJ-3412",
            "vehicle_type": "Ashok Leyland Dost Super",
            "capacity": "3 Tons Fast Pickup",
            "service_area": "Andhra & Telangana Region",
            "district": "Guntur",
            "pincode": "522002",
        }
    ]

    logistics_partners = []
    for ldata in logistics_users_data:
        user, _ = User.objects.get_or_create(
            username=ldata["username"],
            defaults={**ldata, "is_verified": True, "kyc_status": "approved"}
        )
        user.set_password("Password123!")
        user.save()
        
        # Link/Create LogisticsPartner model
        partner, _ = LogisticsPartner.objects.update_or_create(
            user=user,
            defaults={
                "name": f"{user.first_name} {user.last_name}",
                "pincode": user.pincode,
                "district": user.district,
                "phone": user.phone,
                "active": True
            }
        )
        logistics_partners.append(partner)
        print(f"   Created Logistics Partner: {user.username}")

    # --------------------------------------------------------------------------
    # 2. CROP INVENTORIES (PRODUCTS) (3+ per farmer)
    # --------------------------------------------------------------------------
    print("\n[2/10] Seeding Crop Inventories (Products)...")
    today = date.today()

    products_data = [
        # Ramesh Patel (Nashik, Maharashtra)
        {
            "farmer": farmers[0],
            "name": "Fresh Organic Red Tomato (Grade A)",
            "category": "vegetables",
            "quantity": Decimal("2500.00"),
            "unit": "kg",
            "price_per_unit": Decimal("28.00"),
            "harvest_date": today - timedelta(days=1),
            "expiry_date": today + timedelta(days=10),
            "description": "Farm-fresh organical drip-irrigated firm red tomatoes from Nashik valley. Zero chemical spray.",
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600"
        },
        {
            "farmer": farmers[0],
            "name": "Nasik Red Onion (Export Quality)",
            "category": "vegetables",
            "quantity": Decimal("5000.00"),
            "unit": "kg",
            "price_per_unit": Decimal("32.00"),
            "harvest_date": today - timedelta(days=4),
            "expiry_date": today + timedelta(days=60),
            "description": "Sun-cured medium to large high-pungency red onions. Excellent shelf life.",
            "image_url": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600"
        },
        {
            "farmer": farmers[0],
            "name": "Alphonso Mango (Ratnagiri Grafted)",
            "category": "fruits",
            "quantity": Decimal("1200.00"),
            "unit": "kg",
            "price_per_unit": Decimal("180.00"),
            "harvest_date": today - timedelta(days=2),
            "expiry_date": today + timedelta(days=14),
            "description": "Naturally tree-ripened Alphonso mangoes with rich aroma and golden pulp.",
            "image_url": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600"
        },

        # Suresh Kumar (Karnal, Haryana)
        {
            "farmer": farmers[1],
            "name": "Traditional Sharbati Wheat",
            "category": "grains",
            "quantity": Decimal("8000.00"),
            "unit": "kg",
            "price_per_unit": Decimal("38.00"),
            "harvest_date": today - timedelta(days=15),
            "expiry_date": today + timedelta(days=300),
            "description": "Golden lustrous Sharbati wheat grains, high gluten & protein content. Machine cleaned.",
            "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600"
        },
        {
            "farmer": farmers[1],
            "name": "Aged Basmati Rice 1121 (Raw)",
            "category": "grains",
            "quantity": Decimal("6000.00"),
            "unit": "kg",
            "price_per_unit": Decimal("95.00"),
            "harvest_date": today - timedelta(days=30),
            "expiry_date": today + timedelta(days=365),
            "description": "Super long grain 1121 Basmati rice aged for 12 months. Fragrant aroma when cooked.",
            "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600"
        },
        {
            "farmer": farmers[1],
            "name": "Yellow Mustard Seeds (Sarson)",
            "category": "others",
            "quantity": Decimal("3000.00"),
            "unit": "kg",
            "price_per_unit": Decimal("65.00"),
            "harvest_date": today - timedelta(days=20),
            "expiry_date": today + timedelta(days=180),
            "description": "High oil content bold yellow mustard seeds from Haryana fields.",
            "image_url": "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600"
        },

        # Anita Devi (Guntur, AP)
        {
            "farmer": farmers[2],
            "name": "Guntur Teja Red Chilli (Stemless)",
            "category": "spices",
            "quantity": Decimal("1500.00"),
            "unit": "kg",
            "price_per_unit": Decimal("210.00"),
            "harvest_date": today - timedelta(days=10),
            "expiry_date": today + timedelta(days=180),
            "description": "Pungent Grade-A Guntur Teja red chillies, destemmed and solar dried.",
            "image_url": "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=600"
        },
        {
            "farmer": farmers[2],
            "name": "Organic Turmeric Finger (High Curcumin)",
            "category": "spices",
            "quantity": Decimal("2000.00"),
            "unit": "kg",
            "price_per_unit": Decimal("140.00"),
            "harvest_date": today - timedelta(days=12),
            "expiry_date": today + timedelta(days=365),
            "description": "5.2% curcumin organic polished turmeric fingers. Deep yellow color.",
            "image_url": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600"
        },
        {
            "farmer": farmers[2],
            "name": "Desi Arhar/Toor Dal (Unpolished)",
            "category": "pulses",
            "quantity": Decimal("2500.00"),
            "unit": "kg",
            "price_per_unit": Decimal("130.00"),
            "harvest_date": today - timedelta(days=8),
            "expiry_date": today + timedelta(days=240),
            "description": "100% natural unpolished pigeon pea pulses processed without water or chemical dye.",
            "image_url": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600"
        }
    ]

    products = []
    for pdata in products_data:
        p, _ = Product.objects.get_or_create(
            name=pdata["name"],
            farmer=pdata["farmer"],
            defaults=pdata
        )
        products.append(p)
        print(f"   Created Product: {p.name} ({p.farmer.username})")

    # --------------------------------------------------------------------------
    # 3. TRACEABILITY LOTS (3 items)
    # --------------------------------------------------------------------------
    print("\n[3/10] Seeding Traceability Lots...")
    lots_data = [
        {
            "lot_id": "LOT-2026-TOM-001",
            "product": products[0],
            "farmer_name": "Ramesh Chandra Patel",
            "farm_location": "Pimplegaon, Nashik, Maharashtra",
            "harvest_date": today - timedelta(days=1),
            "package_date": today,
            "grade": "Grade A+",
            "logistics_partner": "VRL Express",
            "buyer_name": "Hyperpure by Zomato"
        },
        {
            "lot_id": "LOT-2026-BAS-002",
            "product": products[4],
            "farmer_name": "Suresh Kumar Sharma",
            "farm_location": "Gharaunda, Karnal, Haryana",
            "harvest_date": today - timedelta(days=30),
            "package_date": today - timedelta(days=28),
            "grade": "Export Top",
            "logistics_partner": "TCI ColdChain",
            "buyer_name": "ITC ABD Limited"
        },
        {
            "lot_id": "LOT-2026-CHL-003",
            "product": products[6],
            "farmer_name": "Anita Devi Reddy",
            "farm_location": "Tenali, Guntur, Andhra Pradesh",
            "harvest_date": today - timedelta(days=10),
            "package_date": today - timedelta(days=7),
            "grade": "Premium A",
            "logistics_partner": "Gati KWE Sourcing",
            "buyer_name": "Reliance Retail"
        }
    ]

    for ldata in lots_data:
        TraceabilityLot.objects.update_or_create(lot_id=ldata["lot_id"], defaults=ldata)
        print(f"   Created Traceability Lot: {ldata['lot_id']}")

    # --------------------------------------------------------------------------
    # 4. AUCTIONS & BIDS (3 auctions, 3 bids each)
    # --------------------------------------------------------------------------
    print("\n[4/10] Seeding Auctions & Bids...")
    auctions_data = [
        {
            "farmer": farmers[1],
            "product_name": "Premium Sharbati Wheat Spot Auction (2000 kg)",
            "quantity": Decimal("2000.00"),
            "unit": "kg",
            "starting_price": Decimal("35.00"),
            "highest_bid": Decimal("41.50"),
            "end_time": timezone.now() + timedelta(days=2),
            "status": "active"
        },
        {
            "farmer": farmers[0],
            "product_name": "Export Quality Alphonso Mangoes Batch (500 kg)",
            "quantity": Decimal("500.00"),
            "unit": "kg",
            "starting_price": Decimal("160.00"),
            "highest_bid": Decimal("195.00"),
            "end_time": timezone.now() + timedelta(days=1),
            "status": "active"
        },
        {
            "farmer": farmers[2],
            "product_name": "Organic Red Chilli Teja Mega Auction (1000 kg)",
            "quantity": Decimal("1000.00"),
            "unit": "kg",
            "starting_price": Decimal("190.00"),
            "highest_bid": Decimal("225.00"),
            "end_time": timezone.now() + timedelta(days=3),
            "status": "active"
        }
    ]

    for i, adata in enumerate(auctions_data):
        auction, _ = Auction.objects.get_or_create(
            product_name=adata["product_name"],
            farmer=adata["farmer"],
            defaults=adata
        )
        
        # 3 Bids for each auction
        bids_amounts = [
            adata["starting_price"] + Decimal("2.00"),
            adata["starting_price"] + Decimal("5.50"),
            adata["highest_bid"]
        ]
        for b_idx, b_buyer in enumerate(bulk_buyers):
            Bid.objects.create(
                auction=auction,
                buyer=b_buyer,
                bid_amount=bids_amounts[b_idx]
            )
        print(f"   Created Auction #{auction.id} with 3 Bids")

    # --------------------------------------------------------------------------
    # 5. GROUP ORDERS & FLASH SALES (3 each)
    # --------------------------------------------------------------------------
    print("\n[5/10] Seeding Group Orders & Flash Sales...")
    groups_data = [
        {
            "creator": consumers[0],
            "product_name": "Direct Farm Alphonso Mangoes Group Buy",
            "target_quantity": Decimal("300.00"),
            "current_quantity": Decimal("180.00"),
            "unit": "kg",
            "group_price": Decimal("150.00"),
            "deadline": timezone.now() + timedelta(days=4),
            "location": "Bandra West, Mumbai",
            "status": "active"
        },
        {
            "creator": consumers[1],
            "product_name": "Bulk Aged 1121 Basmati Rice Group Order",
            "target_quantity": Decimal("1000.00"),
            "current_quantity": Decimal("650.00"),
            "unit": "kg",
            "group_price": Decimal("82.00"),
            "deadline": timezone.now() + timedelta(days=5),
            "location": "Connaught Place, New Delhi",
            "status": "active"
        },
        {
            "creator": consumers[2],
            "product_name": "Organic Turmeric & Spice Collective Procurement",
            "target_quantity": Decimal("200.00"),
            "current_quantity": Decimal("200.00"),
            "unit": "kg",
            "group_price": Decimal("120.00"),
            "deadline": timezone.now() + timedelta(days=1),
            "location": "Koramangala, Bengaluru",
            "status": "succeeded"
        }
    ]

    for gdata in groups_data:
        go, _ = GroupOrder.objects.get_or_create(
            product_name=gdata["product_name"],
            creator=gdata["creator"],
            defaults=gdata
        )
        # Add 3 participants
        for c in consumers:
            GroupOrderParticipant.objects.get_or_create(
                group_order=go,
                user=c,
                defaults={"quantity": Decimal("50.00"), "paid": True}
            )
        print(f"   Created Group Order: {go.product_name}")

    # Flash Sales (3 products)
    for p_idx in [0, 1, 2]:
        p = products[p_idx]
        FlashSale.objects.update_or_create(
            product=p,
            defaults={
                "original_price": p.price_per_unit,
                "discount_price": round(p.price_per_unit * Decimal("0.80"), 2),
                "end_time": timezone.now() + timedelta(hours=48)
            }
        )
        print(f"   Created Flash Sale for Product: {p.name}")

    # --------------------------------------------------------------------------
    # 6. BULK BUYER REQUIREMENTS & FARMER OFFERS (3 requirements, 3 offers)
    # --------------------------------------------------------------------------
    print("\n[6/10] Seeding Bulk Buyer Requirements & Farmer Offers...")
    reqs_data = [
        {
            "buyer": bulk_buyers[0], # Reliance
            "crop_name": "Red Onion",
            "variety": "Nasik Red Medium",
            "quantity": Decimal("15000.00"),
            "unit": "kg",
            "grade": "Grade A",
            "required_date": today + timedelta(days=7),
            "target_price_min": Decimal("26.00"),
            "target_price_max": Decimal("30.00"),
            "location": "Reliance Fresh Hub, Bhiwandi, Maharashtra",
            "status": "pending"
        },
        {
            "buyer": bulk_buyers[1], # ITC
            "crop_name": "Sharbati Wheat",
            "variety": "Premium Grain",
            "quantity": Decimal("25000.00"),
            "unit": "kg",
            "grade": "Grade A+",
            "required_date": today + timedelta(days=12),
            "target_price_min": Decimal("34.00"),
            "target_price_max": Decimal("37.50"),
            "location": "ITC e-Choupal Warehouse, Karnal",
            "status": "pending"
        },
        {
            "buyer": bulk_buyers[2], # Hyperpure
            "crop_name": "Organic Tomatoes",
            "variety": "Firm Salad Tomato",
            "quantity": Decimal("8000.00"),
            "unit": "kg",
            "grade": "Grade A",
            "required_date": today + timedelta(days=3),
            "target_price_min": Decimal("24.00"),
            "target_price_max": Decimal("27.00"),
            "location": "Hyperpure Central Fulfillment Center, Bengaluru",
            "status": "pending"
        }
    ]

    for r_idx, rdata in enumerate(reqs_data):
        req, _ = BulkRequirement.objects.get_or_create(
            crop_name=rdata["crop_name"],
            buyer=rdata["buyer"],
            defaults=rdata
        )
        
        if not FarmerOffer.objects.filter(requirement=req, farmer=farmers[r_idx]).exists():
            FarmerOffer.objects.create(
                requirement=req,
                farmer=farmers[r_idx],
                quantity=req.quantity / 2,
                price_per_unit=(req.target_price_min + req.target_price_max) / 2,
                delivery_date=req.required_date,
                notes=f"High quality crop ready for immediate dispatch from {farmers[r_idx].district}",
                status="pending"
            )
        print(f"   Created Bulk Requirement: {req.crop_name} with Farmer Offer")

    # --------------------------------------------------------------------------
    # 7. PRE-HARVEST CONTRACTS (3 contracts)
    # --------------------------------------------------------------------------
    print("\n[7/10] Seeding Pre-Harvest Contracts...")
    contracts_data = [
        {
            "farmer": farmers[0],
            "buyer": bulk_buyers[0],
            "crop_name": "Organic Red Tomatoes (Winter Harvest)",
            "expected_harvest_date": today + timedelta(days=60),
            "expected_quantity": Decimal("10000.00"),
            "unit": "kg",
            "contract_price": Decimal("25.00"),
            "status": "accepted"
        },
        {
            "farmer": farmers[1],
            "buyer": bulk_buyers[1],
            "crop_name": "Organic Basmati Paddy (Rabi Crop)",
            "expected_harvest_date": today + timedelta(days=90),
            "expected_quantity": Decimal("20000.00"),
            "unit": "kg",
            "contract_price": Decimal("88.00"),
            "status": "proposed"
        },
        {
            "farmer": farmers[2],
            "buyer": bulk_buyers[2],
            "crop_name": "Export Grade Teja Chilli (Dry Processed)",
            "expected_harvest_date": today + timedelta(days=45),
            "expected_quantity": Decimal("5000.00"),
            "unit": "kg",
            "contract_price": Decimal("200.00"),
            "status": "accepted"
        }
    ]

    for cdata in contracts_data:
        PreHarvestContract.objects.get_or_create(
            crop_name=cdata["crop_name"],
            farmer=cdata["farmer"],
            defaults=cdata
        )
        print(f"   Created Pre-Harvest Contract: {cdata['crop_name']}")

    # --------------------------------------------------------------------------
    # 8. BUYER ORDERS, ORDER ITEMS & SHIPMENTS (3 orders)
    # --------------------------------------------------------------------------
    print("\n[8/10] Seeding Orders, OrderItems & Delivery Shipments...")
    
    orders_info = [
        {
            "buyer": consumers[0],
            "status": "delivered",
            "payment_status": "paid",
            "shipping_address": consumers[0].address,
            "shipping_pincode": consumers[0].pincode,
            "payment_id": "pay_KisanConnect1001",
            "razorpay_order_id": "order_rzp_1001",
            "items": [
                {"product": products[0], "quantity": Decimal("10.0"), "price": products[0].price_per_unit},
                {"product": products[2], "quantity": Decimal("5.0"), "price": products[2].price_per_unit}
            ],
            "partner": logistics_partners[0]
        },
        {
            "buyer": bulk_buyers[0],
            "status": "in_transit",
            "payment_status": "paid",
            "shipping_address": "Reliance Warehouse, Bhiwandi, Maharashtra",
            "shipping_pincode": "421302",
            "payment_id": "pay_KisanConnect1002",
            "razorpay_order_id": "order_rzp_1002",
            "items": [
                {"product": products[1], "quantity": Decimal("1000.0"), "price": products[1].price_per_unit}
            ],
            "partner": logistics_partners[0]
        },
        {
            "buyer": bulk_buyers[2],
            "status": "confirmed",
            "payment_status": "pending",
            "shipping_address": "Hyperpure FC, Outer Ring Road, Bengaluru",
            "shipping_pincode": "560037",
            "payment_id": None,
            "razorpay_order_id": "order_rzp_1003",
            "items": [
                {"product": products[6], "quantity": Decimal("100.0"), "price": products[6].price_per_unit},
                {"product": products[7], "quantity": Decimal("50.0"), "price": products[7].price_per_unit}
            ],
            "partner": logistics_partners[2]
        }
    ]

    for odata in orders_info:
        items_data = odata.pop("items")
        partner = odata.pop("partner")
        
        subtotal = sum(i["quantity"] * i["price"] for i in items_data)
        shipping = Decimal("150.00")
        total = subtotal + shipping
        
        order = Order.objects.create(
            buyer=odata["buyer"],
            product_subtotal=subtotal,
            shipping_charge=shipping,
            total_amount=total,
            status=odata["status"],
            shipping_address=odata["shipping_address"],
            shipping_pincode=odata["shipping_pincode"],
            payment_status=odata["payment_status"],
            payment_id=odata["payment_id"],
            razorpay_order_id=odata["razorpay_order_id"]
        )

        for item_info in items_data:
            OrderItem.objects.create(
                order=order,
                product=item_info["product"],
                quantity=item_info["quantity"],
                price=item_info["price"]
            )

        # Delivery Shipment
        DeliveryShipment.objects.create(
            order=order,
            partner=partner,
            pickup_address=f"Farm Location, {item_info['product'].farmer.district}",
            delivery_address=order.shipping_address,
            distance_km=Decimal("185.50"),
            status="delivered" if order.status == "delivered" else "assigned"
        )
        print(f"   Created Order #{order.id} ({order.buyer.username}) + Delivery Shipment")

    # --------------------------------------------------------------------------
    # 9. SUBSCRIPTIONS, QUOTES, MARKETS, REVIEWS (3 each)
    # --------------------------------------------------------------------------
    print("\n[9/10] Seeding Subscriptions, Quote Requests, Markets & Reviews...")

    # Subscriptions (3 items)
    subs_info = [
        {
            "buyer": consumers[0],
            "frequency": "weekly",
            "delivery_day": "Monday",
            "delivery_time_slot": "morning",
            "start_date": today,
            "next_delivery_date": today + timedelta(days=4),
            "shipping_address": consumers[0].address,
            "shipping_pincode": consumers[0].pincode,
            "per_delivery_subtotal": Decimal("450.00"),
            "discount_percentage": Decimal("10.00"),
            "shipping_charge": Decimal("30.00"),
            "per_delivery_total": Decimal("435.00"),
            "total_plan_amount": Decimal("3480.00"),
            "status": "active"
        },
        {
            "buyer": consumers[1],
            "frequency": "biweekly",
            "delivery_day": "Wednesday",
            "delivery_time_slot": "morning",
            "start_date": today,
            "next_delivery_date": today + timedelta(days=6),
            "shipping_address": consumers[1].address,
            "shipping_pincode": consumers[1].pincode,
            "per_delivery_subtotal": Decimal("800.00"),
            "discount_percentage": Decimal("12.00"),
            "shipping_charge": Decimal("50.00"),
            "per_delivery_total": Decimal("754.00"),
            "total_plan_amount": Decimal("6032.00"),
            "status": "active"
        },
        {
            "buyer": consumers[2],
            "frequency": "daily",
            "delivery_day": "Daily",
            "delivery_time_slot": "morning",
            "start_date": today,
            "next_delivery_date": today + timedelta(days=1),
            "shipping_address": consumers[2].address,
            "shipping_pincode": consumers[2].pincode,
            "per_delivery_subtotal": Decimal("120.00"),
            "discount_percentage": Decimal("5.00"),
            "shipping_charge": Decimal("15.00"),
            "per_delivery_total": Decimal("129.00"),
            "total_plan_amount": Decimal("3870.00"),
            "status": "active"
        }
    ]

    for sdata in subs_info:
        sub = Subscription.objects.create(**sdata)
        SubscriptionItem.objects.create(
            subscription=sub,
            product=products[0],
            quantity=Decimal("5.0"),
            price=products[0].price_per_unit
        )
        print(f"   Created Subscription #{sub.id} for {sub.buyer.username}")

    # Quote Requests (3 items)
    quotes_data = [
        {
            "buyer": bulk_buyers[0],
            "product": products[0],
            "quantity": Decimal("2000.0"),
            "target_price": Decimal("24.00"),
            "offered_price": Decimal("26.00"),
            "status": "offered"
        },
        {
            "buyer": bulk_buyers[1],
            "product": products[4],
            "quantity": Decimal("5000.0"),
            "target_price": Decimal("90.00"),
            "offered_price": Decimal("93.00"),
            "status": "offered"
        },
        {
            "buyer": bulk_buyers[2],
            "product": products[6],
            "quantity": Decimal("1000.0"),
            "target_price": Decimal("200.00"),
            "offered_price": Decimal("205.00"),
            "status": "pending"
        }
    ]

    for qdata in quotes_data:
        QuoteRequest.objects.get_or_create(
            buyer=qdata['buyer'],
            product=qdata['product'],
            quantity=qdata['quantity'],
            defaults=qdata
        )
        print(f"   Created Quote Request by {qdata['buyer'].username}")

    # Markets & Market Prices (3 markets, 3 prices each)
    markets_info = [
        {"name": "Nashik APMC Mandi", "district": "Nashik", "state": "Maharashtra", "lat": 20.000, "lng": 73.780},
        {"name": "Karnal Grain Market", "district": "Karnal", "state": "Haryana", "lat": 29.680, "lng": 76.990},
        {"name": "Guntur Mirchi Yard", "district": "Guntur", "state": "Andhra Pradesh", "lat": 16.300, "lng": 80.430}
    ]

    for minfo in markets_info:
        m, _ = Market.objects.get_or_create(
            normalized_name=minfo["name"].lower(),
            district=minfo["district"],
            state=minfo["state"],
            defaults={
                "name": minfo["name"],
                "latitude": minfo["lat"],
                "longitude": minfo["lng"]
            }
        )
        
        # 3 Market Prices
        commodities = [
            ("Tomato", "Hybrid", Decimal("2200.00"), Decimal("2800.00"), Decimal("2500.00")),
            ("Onion", "Red Nasik", Decimal("2800.00"), Decimal("3500.00"), Decimal("3100.00")),
            ("Wheat", "Sharbati", Decimal("3200.00"), Decimal("3900.00"), Decimal("3600.00"))
        ]
        for c_name, c_var, min_p, max_p, mod_p in commodities:
            MarketPrice.objects.update_or_create(
                market=m,
                commodity=c_name,
                variety=c_var,
                reported_date=today,
                defaults={
                    "min_price": min_p,
                    "max_price": max_p,
                    "modal_price": mod_p,
                    "unit": "Rs/Quintal"
                }
            )
        print(f"   Created Market: {m.name} with 3 prices")

    # Reviews (3 items)
    reviews_data = [
        {
            "reviewer": consumers[0],
            "farmer": farmers[0],
            "rating": 5,
            "comment": "Exceptional organic tomatoes! Delivered within 24 hours of harvest, incredibly fresh."
        },
        {
            "reviewer": bulk_buyers[0],
            "farmer": farmers[1],
            "rating": 5,
            "comment": "Top tier Sharbati wheat quality. Moisture content was well under 10%. Highly recommended."
        },
        {
            "reviewer": bulk_buyers[2],
            "farmer": farmers[2],
            "rating": 5,
            "comment": "Authentic Guntur Teja chillies. Great spice level and color consistency."
        }
    ]

    for rdata in reviews_data:
        Review.objects.create(**rdata)
        print(f"   Created Review for {rdata['farmer'].username}")

    # --------------------------------------------------------------------------
    # 10. CHATBOT DEMO DATA (3 Conversations)
    # --------------------------------------------------------------------------
    print("\n[10/10] Seeding Chatbot Conversations & Memories...")
    try:
        farmer_user = farmers[0]
        c1, _ = Conversation.objects.using('chatbot').get_or_create(
            farmer_id=farmer_user.id,
            title="Tomato Mandi Prices Enquiry",
            defaults={"summary": "Farmer inquired about current tomato prices in Nashik mandi."}
        )
        ChatMessage.objects.using('chatbot').create(
            conversation=c1,
            role="user",
            content="Aaj Nashik mandi me tamatar ka kya bhav chal raha hai?"
        )
        ChatMessage.objects.using('chatbot').create(
            conversation=c1,
            role="assistant",
            content="Aaj Nashik APMC Mandi me Tamatar (Hybrid) ka modal bhav Rs 25.00/kg (Rs 2,500/Quintal) hai."
        )

        c2, _ = Conversation.objects.using('chatbot').get_or_create(
            farmer_id=farmers[1].id,
            title="Listing Basmati Rice on Marketplace",
            defaults={"summary": "Assisted Suresh Kumar with listing Basmati 1121 Rice."}
        )
        ChatMessage.objects.using('chatbot').create(
            conversation=c2,
            role="user",
            content="Mujhe apna 6000kg Basmati Rice 1121 market me sell karna hai."
        )

        c3, _ = Conversation.objects.using('chatbot').get_or_create(
            farmer_id=farmers[2].id,
            title="Crop Insurance & Subsidy Scheme",
            defaults={"summary": "Information provided on PMFBY insurance coverage."}
        )

        # Farmer Memories
        FarmerMemory.objects.using('chatbot').update_or_create(
            farmer_id=farmer_user.id,
            key="preferred_crop",
            defaults={"value": "Tomato, Red Onion", "source": "conversation"}
        )
        FarmerMemory.objects.using('chatbot').update_or_create(
            farmer_id=farmer_user.id,
            key="primary_mandi",
            defaults={"value": "Nashik APMC", "source": "conversation"}
        )
        FarmerMemory.objects.using('chatbot').update_or_create(
            farmer_id=farmer_user.id,
            key="preferred_language",
            defaults={"value": "Hindi / Marathi", "source": "conversation"}
        )
        print("   Created Chatbot Conversations & Memories")
    except Exception as e:
        print(f"   [Note] Chatbot seeding skipped/warned: {e}")

    print("\n[SUCCESS] DEMO DATA SEEDING COMPLETED SUCCESSFULLY!")
    print("--------------------------------------------------")
    print("Demo Credentials (Password for all: Password123!):")
    print("  * Farmers: ramesh_patel, suresh_kumar, anita_devi")
    print("  * Bulk Buyers: buyer_reliance, buyer_itc, buyer_zomato")
    print("  * Consumers: consumer_priya, consumer_rahul, consumer_vikram")
    print("  * Logistics: logistics_vrl, logistics_tci, logistics_gati")
    print("--------------------------------------------------")

if __name__ == '__main__':
    seed_data()
