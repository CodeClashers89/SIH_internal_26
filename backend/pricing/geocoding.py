import requests
import time
from urllib.parse import quote_plus
from django.utils import timezone

def geocode_market(market_name, district, state):
    """
    Geocodes a market using OpenStreetMap's Nominatim API.
    Returns (latitude, longitude) or (None, None) if not found.
    """
    # Nominatim requires a User-Agent
    headers = {
        'User-Agent': 'KhetBazaar/1.0 (admin@khetbazaar.org)'
    }
    
    # Try fully qualified name first
    queries = [
        f"{market_name}, {district}, {state}, India",
        f"{market_name}, {state}, India",
        f"{district}, {state}, India" # Fallback to district center
    ]
    
    for query in queries:
        url = f"https://nominatim.openstreetmap.org/search?q={quote_plus(query)}&format=json&limit=1"
        try:
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    lat = float(data[0].get('lat'))
                    lon = float(data[0].get('lon'))
                    return lat, lon
            # Respect rate limits for public Nominatim API (1 req/sec)
            time.sleep(1.1)
        except Exception:
            pass
            
    return None, None
