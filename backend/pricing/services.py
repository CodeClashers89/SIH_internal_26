import os
import requests
from datetime import datetime
from django.utils import timezone
from .models import Market, MarketPrice
from .geocoding import geocode_market

def normalize_name(name: str) -> str:
    """Normalizes string for deduplication."""
    if not name:
        return ""
    return name.strip().lower()

def sync_agmarknet_data():
    """
    Fetches the latest data from AGMARKNET via Data.gov.in.
    Updates or creates Market and MarketPrice records.
    """
    api_key = os.environ.get("DATA_GOV_API_KEY")
    if not api_key:
        return {"error": "DATA_GOV_API_KEY environment variable is not set."}
        
    url = f"https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": 1000 # Configurable
    }
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        return {"error": f"Failed to fetch from AGMARKNET: {str(e)}"}
        
    records = data.get("records", [])
    if not records:
        return {"status": "No records found", "count": 0}
        
    created_markets = 0
    updated_prices = 0
    
    for record in records:
        state = record.get('state', '').strip()
        district = record.get('district', '').strip()
        market_name = record.get('market', '').strip()
        commodity = record.get('commodity', '').strip()
        variety = record.get('variety', '').strip()
        grade = record.get('grade', '').strip()
        
        # Parse date (format usually dd/mm/yyyy)
        arrival_date_str = record.get('arrival_date', '')
        try:
            reported_date = datetime.strptime(arrival_date_str, '%d/%m/%Y').date()
        except ValueError:
            reported_date = timezone.now().date()
            
        try:
            min_price = float(record.get('min_price', 0))
            max_price = float(record.get('max_price', 0))
            modal_price = float(record.get('modal_price', 0))
        except (ValueError, TypeError):
            continue
            
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
            # Geocode asynchronously in a real app, doing it synchronously here with rate limiting
            if not market.latitude or not market.longitude:
                lat, lon = geocode_market(market_name, district, state)
                if lat and lon:
                    market.latitude = lat
                    market.longitude = lon
                    market.last_geocoded_at = timezone.now()
                    market.save(update_fields=['latitude', 'longitude', 'last_geocoded_at'])
                    
        # Update or create price record
        MarketPrice.objects.update_or_create(
            market=market,
            commodity=commodity,
            variety=variety,
            reported_date=reported_date,
            defaults={
                'grade': grade,
                'min_price': min_price,
                'max_price': max_price,
                'modal_price': modal_price,
                'fetched_at': timezone.now()
            }
        )
        updated_prices += 1
        
    return {
        "status": "success",
        "markets_created": created_markets,
        "prices_updated": updated_prices
    }
