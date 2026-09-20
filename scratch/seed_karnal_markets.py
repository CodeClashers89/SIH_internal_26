import os, sys
sys.path.insert(0, r'd:/SIH2026_NEW/SIH_internal_26/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kisan_connect.settings')

import django
django.setup()

from datetime import date
from pricing.models import Market, MarketPrice

# 1. Markets to ensure in DB
markets_data = [
    {"name": "Karnal Grain Market", "normalized_name": "karnal grain market", "district": "Karnal", "state": "Haryana", "lat": 29.6857, "lon": 76.9905},
    {"name": "Gharaunda Mandi", "normalized_name": "gharaunda mandi", "district": "Karnal", "state": "Haryana", "lat": 29.5398, "lon": 76.9723},
    {"name": "Taraori Mandi", "normalized_name": "taraori mandi", "district": "Karnal", "state": "Haryana", "lat": 29.8028, "lon": 76.9328},
    {"name": "Panipat Mandi", "normalized_name": "panipat mandi", "district": "Panipat", "state": "Haryana", "lat": 29.3909, "lon": 76.9635},
    {"name": "Kurukshetra Mandi", "normalized_name": "kurukshetra mandi", "district": "Kurukshetra", "state": "Haryana", "lat": 29.9695, "lon": 76.8783},
]

created_markets = {}
for md in markets_data:
    m, _ = Market.objects.get_or_create(
        normalized_name=md["normalized_name"],
        district=md["district"],
        state=md["state"],
        defaults={
            "name": md["name"],
            "latitude": md["lat"],
            "longitude": md["lon"],
            "source": "AGMARKNET",
            "is_active": True,
        }
    )
    created_markets[md["name"]] = m
    print(f"Market ready: {m.name} ({m.district}, {m.state})")

# 2. Market Prices to ensure in DB
prices_data = [
    # Karnal Grain Market
    {"market": "Karnal Grain Market", "commodity": "Tomato", "variety": "Hybrid", "grade": "FAQ", "min_price": 2200, "max_price": 2800, "modal_price": 2500},
    {"market": "Karnal Grain Market", "commodity": "Onion", "variety": "Red Nasik", "grade": "FAQ", "min_price": 2800, "max_price": 3400, "modal_price": 3100},
    {"market": "Karnal Grain Market", "commodity": "Wheat", "variety": "Sharbati", "grade": "FAQ", "min_price": 2400, "max_price": 2750, "modal_price": 2600},
    {"market": "Karnal Grain Market", "commodity": "Rice", "variety": "Basmati 1121", "grade": "FAQ", "min_price": 5800, "max_price": 7200, "modal_price": 6600},
    {"market": "Karnal Grain Market", "commodity": "Garlic", "variety": "Desi", "grade": "FAQ", "min_price": 6500, "max_price": 8000, "modal_price": 7200},
    {"market": "Karnal Grain Market", "commodity": "Potato", "variety": "Jyoti", "grade": "FAQ", "min_price": 1400, "max_price": 1800, "modal_price": 1600},
    {"market": "Karnal Grain Market", "commodity": "Mustard", "variety": "Yellow Sarson", "grade": "FAQ", "min_price": 5100, "max_price": 5700, "modal_price": 5400},

    # Gharaunda Mandi (closest to Suresh Kumar)
    {"market": "Gharaunda Mandi", "commodity": "Tomato", "variety": "Local Fresh", "grade": "FAQ", "min_price": 2150, "max_price": 2750, "modal_price": 2450},
    {"market": "Gharaunda Mandi", "commodity": "Onion", "variety": "Red", "grade": "FAQ", "min_price": 2750, "max_price": 3300, "modal_price": 3050},
    {"market": "Gharaunda Mandi", "commodity": "Wheat", "variety": "Sharbati / Dara", "grade": "FAQ", "min_price": 2380, "max_price": 2700, "modal_price": 2580},
    {"market": "Gharaunda Mandi", "commodity": "Rice", "variety": "Basmati 1509", "grade": "FAQ", "min_price": 5600, "max_price": 7000, "modal_price": 6450},
    {"market": "Gharaunda Mandi", "commodity": "Garlic", "variety": "Desi", "grade": "FAQ", "min_price": 6400, "max_price": 7800, "modal_price": 7100},
    {"market": "Gharaunda Mandi", "commodity": "Potato", "variety": "Local", "grade": "FAQ", "min_price": 1380, "max_price": 1780, "modal_price": 1580},

    # Taraori Mandi (major grain & basmati hub)
    {"market": "Taraori Mandi", "commodity": "Rice", "variety": "Traditional Basmati", "grade": "Premium", "min_price": 6200, "max_price": 7800, "modal_price": 7100},
    {"market": "Taraori Mandi", "commodity": "Wheat", "variety": "Sharbati", "grade": "FAQ", "min_price": 2450, "max_price": 2800, "modal_price": 2650},
    {"market": "Taraori Mandi", "commodity": "Mustard", "variety": "Pusa Bold", "grade": "FAQ", "min_price": 5200, "max_price": 5800, "modal_price": 5500},
    {"market": "Taraori Mandi", "commodity": "Garlic", "variety": "Local", "grade": "FAQ", "min_price": 6600, "max_price": 8100, "modal_price": 7300},

    # Panipat Mandi (~30km)
    {"market": "Panipat Mandi", "commodity": "Tomato", "variety": "Hybrid", "grade": "FAQ", "min_price": 2250, "max_price": 2850, "modal_price": 2550},
    {"market": "Panipat Mandi", "commodity": "Onion", "variety": "Red", "grade": "FAQ", "min_price": 2850, "max_price": 3450, "modal_price": 3150},
    {"market": "Panipat Mandi", "commodity": "Wheat", "variety": "Sharbati", "grade": "FAQ", "min_price": 2420, "max_price": 2780, "modal_price": 2620},
    {"market": "Panipat Mandi", "commodity": "Garlic", "variety": "Local", "grade": "FAQ", "min_price": 6600, "max_price": 8100, "modal_price": 7300},

    # Kurukshetra Mandi (~35km)
    {"market": "Kurukshetra Mandi", "commodity": "Rice", "variety": "Basmati 1121", "grade": "FAQ", "min_price": 5900, "max_price": 7300, "modal_price": 6700},
    {"market": "Kurukshetra Mandi", "commodity": "Wheat", "variety": "Lokwan", "grade": "FAQ", "min_price": 2390, "max_price": 2720, "modal_price": 2590},
    {"market": "Kurukshetra Mandi", "commodity": "Tomato", "variety": "Local", "grade": "FAQ", "min_price": 2180, "max_price": 2760, "modal_price": 2480},
    {"market": "Kurukshetra Mandi", "commodity": "Potato", "variety": "Local", "grade": "FAQ", "min_price": 1450, "max_price": 1850, "modal_price": 1650},
]

today = date.today()
for pd in prices_data:
    m = created_markets[pd["market"]]
    mp, _ = MarketPrice.objects.update_or_create(
        market=m,
        commodity=pd["commodity"],
        reported_date=today,
        defaults={
            "variety": pd["variety"],
            "grade": pd["grade"],
            "min_price": pd["min_price"],
            "max_price": pd["max_price"],
            "modal_price": pd["modal_price"],
            "unit": "Rs/Quintal"
        }
    )

print(f"Successfully seeded {len(prices_data)} market prices in DB for Karnal & nearby markets!")
