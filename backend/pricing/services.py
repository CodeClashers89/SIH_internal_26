import os
import requests
from datetime import datetime
from django.utils import timezone
from .models import Market, MarketPrice
from .geocoding import geocode_market

MOCK_AGMARKNET_DATA = {
    "records": [
        {
            "state": "Gujarat",
            "district": "Anand",
            "market": "Anand APMC",
            "commodity": "Tomato",
            "variety": "Local",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1200",
            "max_price": "1800",
            "modal_price": "1500"
        },
        {
            "state": "Gujarat",
            "district": "Anand",
            "market": "Anand APMC",
            "commodity": "Potato",
            "variety": "Other",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1500",
            "max_price": "1900",
            "modal_price": "1700"
        },
        {
            "state": "Gujarat",
            "district": "Anand",
            "market": "Anand APMC",
            "commodity": "Wheat",
            "variety": "Lokwan",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "2100",
            "max_price": "2350",
            "modal_price": "2250"
        },
        {
            "state": "Gujarat",
            "district": "Kheda",
            "market": "Nadiad Market",
            "commodity": "Tomato",
            "variety": "Hybrid",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1300",
            "max_price": "1900",
            "modal_price": "1650"
        },
        {
            "state": "Gujarat",
            "district": "Kheda",
            "market": "Nadiad Market",
            "commodity": "Potato",
            "variety": "Local",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1400",
            "max_price": "1800",
            "modal_price": "1600"
        },
        {
            "state": "Gujarat",
            "district": "Ahmedabad",
            "market": "Ahmedabad Mandi",
            "commodity": "Tomato",
            "variety": "Local",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1150",
            "max_price": "1700",
            "modal_price": "1450"
        },
        {
            "state": "Gujarat",
            "district": "Vadodara",
            "market": "Vadodara APMC",
            "commodity": "Tomato",
            "variety": "Local",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1250",
            "max_price": "1850",
            "modal_price": "1580"
        },
        {
            "state": "Maharashtra",
            "district": "Pune",
            "market": "Pune Mandi",
            "commodity": "Tomato",
            "variety": "Local",
            "grade": "FAQ",
            "arrival_date": "22/08/2026",
            "min_price": "1200",
            "max_price": "1800",
            "modal_price": "1500"
        }
    ]
}

def normalize_name(name: str) -> str:
    """Normalizes string for deduplication."""
    if not name:
        return ""
    return name.strip().lower()

def fetch_live_market_prices(market_name, district, state):
    """
    Fetches market prices directly from the AGMARKNET/Data.gov.in API,
    or falls back to mock data if the API key is not set.
    """
    api_key = os.environ.get("DATA_GOV_API_KEY")
    records = []

    if api_key:
        url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": 100,
            "filters[market]": market_name,
            "filters[district]": district,
            "filters[state]": state
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            records = data.get("records", [])
        except Exception as e:
            print(f"AGMARKNET API call failed: {e}. Falling back to local mock data.")
            records = [r for r in MOCK_AGMARKNET_DATA["records"] if r["market"] == market_name]
    else:
        # Fallback to mock data matching market
        records = [r for r in MOCK_AGMARKNET_DATA["records"] if r["market"] == market_name]

    # Normalize response to match internal serializable structures
    prices = []
    for idx, r in enumerate(records):
        try:
            min_p = float(r.get("min_price", 0))
            max_p = float(r.get("max_price", 0))
            modal_p = float(r.get("modal_price", 0))
        except (ValueError, TypeError):
            min_p = max_p = modal_p = 0.0

        arrival_date_str = r.get('arrival_date', '')
        try:
            reported_date = datetime.strptime(arrival_date_str, '%d/%m/%Y').date()
        except ValueError:
            reported_date = timezone.now().date()

        prices.append({
            "id": idx,
            "commodity": r.get("commodity", ""),
            "variety": r.get("variety", ""),
            "grade": r.get("grade", "FAQ"),
            "min_price": min_p,
            "max_price": max_p,
            "modal_price": modal_p,
            "unit": r.get("unit", "Rs/Quintal"),
            "reported_date": reported_date.strftime("%Y-%m-%d"),
            "fetched_at": timezone.now().isoformat()
        })
    return prices

def sync_agmarknet_data():
    """
    Fetches the latest records from AGMARKNET via Data.gov.in
    (or falls back to mock data) to populate/geocode the Market model.
    """
    api_key = os.environ.get("DATA_GOV_API_KEY")
    records = []

    if api_key:
        url = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
        params = {
            "api-key": api_key,
            "format": "json",
            "limit": 1000
        }
        try:
            response = requests.get(url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            records = data.get("records", [])
        except Exception as e:
            print(f"Sync failed: {e}. Seeding with mock fallback.")
            records = MOCK_AGMARKNET_DATA["records"]
    else:
        records = MOCK_AGMARKNET_DATA["records"]

    created_markets = 0

    for record in records:
        state = record.get('state', '').strip()
        district = record.get('district', '').strip()
        market_name = record.get('market', '').strip()

        if not market_name or not state or not district:
            continue

        normalized_m_name = normalize_name(market_name)

        market, created = Market.objects.get_or_create(
            normalized_name=normalized_m_name,
            district=district,
            state=state,
            defaults={
                'name': market_name
            }
        )

        if created:
            created_markets += 1
            # Geocode market
            if not market.latitude or not market.longitude:
                lat, lon = geocode_market(market_name, district, state)
                if lat and lon:
                    market.latitude = lat
                    market.longitude = lon
                    market.last_geocoded_at = timezone.now()
                    market.save(update_fields=['latitude', 'longitude', 'last_geocoded_at'])

    return {
        "status": "success",
        "markets_created": created_markets
    }
