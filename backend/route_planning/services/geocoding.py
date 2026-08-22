"""
Indian city/district coordinate lookup table.
Covers major cities and districts across Gujarat, Maharashtra, Rajasthan, MP,
Karnataka, Tamil Nadu, Andhra Pradesh, Telangana, Punjab, Haryana, Delhi, UP.

Falls back to Nominatim for cities not in the lookup table.
"""
import requests
import time
import logging

logger = logging.getLogger(__name__)

# fmt: off
CITY_COORDS = {
    # Gujarat
    "anand": (22.5645, 72.9289),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "vadodara": (22.3072, 73.1812),
    "rajkot": (22.3039, 70.8022),
    "bhavnagar": (21.7645, 72.1519),
    "jamnagar": (22.4707, 70.0577),
    "gandhinagar": (23.2156, 72.6369),
    "bharuch": (21.7051, 72.9959),
    "navsari": (20.9467, 72.9520),
    "mehsana": (23.5880, 72.3693),
    "nadiad": (22.6916, 72.8634),
    "amreli": (21.6033, 71.2214),
    "junagadh": (21.5222, 70.4579),
    "morbi": (22.8173, 70.8372),
    "surendranagar": (22.7270, 71.6472),
    "patan": (23.8493, 72.1266),
    "dahod": (22.8331, 74.2591),
    "valsad": (20.5992, 72.9342),
    "kutch": (23.7337, 69.8597),
    "bhuj": (23.2420, 69.6669),
    # Maharashtra
    "mumbai": (19.0760, 72.8777),
    "pune": (18.5204, 73.8567),
    "nagpur": (21.1458, 79.0882),
    "nashik": (19.9975, 73.7898),
    "aurangabad": (19.8762, 75.3433),
    "solapur": (17.6599, 75.9064),
    "kolhapur": (16.7050, 74.2433),
    "amravati": (20.9374, 77.7796),
    "nanded": (19.1383, 77.3210),
    "satara": (17.6868, 74.0183),
    "jalgaon": (21.0077, 75.5626),
    "sangli": (16.8524, 74.5815),
    "latur": (18.4088, 76.5604),
    "dhule": (20.9042, 74.7749),
    "raigad": (18.5158, 73.1813),
    "thane": (19.2183, 72.9781),
    "navi mumbai": (19.0368, 73.0158),
    # Rajasthan
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
    "udaipur": (24.5854, 73.7125),
    "kota": (25.2138, 75.8648),
    "ajmer": (26.4499, 74.6399),
    "bikaner": (28.0229, 73.3119),
    "alwar": (27.5530, 76.6346),
    # Madhya Pradesh
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "jabalpur": (23.1815, 79.9864),
    "gwalior": (26.2183, 78.1828),
    "ujjain": (23.1765, 75.7885),
    # Karnataka
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "hubli": (15.3647, 75.1240),
    "mangaluru": (12.9141, 74.8560),
    "mangalore": (12.9141, 74.8560),
    "belgaum": (15.8497, 74.4977),
    "belagavi": (15.8497, 74.4977),
    # Tamil Nadu
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "madurai": (9.9252, 78.1198),
    "tiruchirappalli": (10.7905, 78.7047),
    "tirupur": (11.1085, 77.3411),
    "salem": (11.6643, 78.1460),
    # Andhra Pradesh / Telangana
    "hyderabad": (17.3850, 78.4867),
    "vijayawada": (16.5062, 80.6480),
    "visakhapatnam": (17.6868, 83.2185),
    "warangal": (17.9784, 79.5941),
    # Delhi / NCR
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "gurgaon": (28.4595, 77.0266),
    "noida": (28.5355, 77.3910),
    "faridabad": (28.4089, 77.3178),
    # Punjab / Haryana
    "chandigarh": (30.7333, 76.7794),
    "ludhiana": (30.9010, 75.8573),
    "amritsar": (31.6340, 74.8723),
    "jalandhar": (31.3260, 75.5762),
    # Uttar Pradesh
    "lucknow": (26.8467, 80.9462),
    "kanpur": (26.4499, 80.3319),
    "agra": (27.1767, 78.0081),
    "varanasi": (25.3176, 82.9739),
    "prayagraj": (25.4358, 81.8463),
    "allahabad": (25.4358, 81.8463),
    # West Bengal
    "kolkata": (22.5726, 88.3639),
    # Odisha
    "bhubaneswar": (20.2961, 85.8245),
    # Bihar
    "patna": (25.5941, 85.1376),
    # Assam
    "guwahati": (26.1445, 91.7362),
}
# fmt: on


def _normalize(name: str) -> str:
    return name.lower().strip().replace("-", " ")


def geocode_city(city_or_address: str) -> tuple[float, float] | None:
    """
    Resolve a city/district name or address to (lat, lng).

    1. Try lookup table (instant, no API call).
    2. Fall back to Nominatim free geocoder.
    Returns None if unresolvable.
    """
    normalized = _normalize(city_or_address)

    # Step 1: Lookup table (check full string and individual tokens)
    if normalized in CITY_COORDS:
        return CITY_COORDS[normalized]

    # Check partial/token match
    for token in normalized.split(","):
        token = token.strip()
        if token in CITY_COORDS:
            return CITY_COORDS[token]

    # Step 2: Nominatim fallback
    try:
        time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": city_or_address + ", India",
                "format": "json",
                "limit": 1,
                "accept-language": "en",
            },
            headers={"User-Agent": "KhetBazaar-RoutePlanning/1.0"},
            timeout=5,
        )
        data = resp.json()
        if data:
            lat = float(data[0]["lat"])
            lng = float(data[0]["lon"])
            logger.info(f"[GEOCODE] Nominatim resolved '{city_or_address}' → ({lat}, {lng})")
            return lat, lng
    except Exception as e:
        logger.warning(f"[GEOCODE] Nominatim failed for '{city_or_address}': {e}")

    logger.warning(f"[GEOCODE] Could not resolve coordinates for '{city_or_address}'")
    return None
