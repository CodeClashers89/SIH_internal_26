"""
Open-Meteo Weather Forecast Service.

Retrieves weather forecasts for sampled route points at expected arrival times.
Uses the free Open-Meteo API (no API key required).
"""
import requests
import logging
from datetime import datetime, timezone as dt_timezone
from typing import Optional

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Variables to request from Open-Meteo
HOURLY_VARS = [
    "temperature_2m",
    "precipitation",
    "precipitation_probability",
    "rain",
    "windspeed_10m",
    "windgusts_10m",
    "visibility",
    "weathercode",
]


def _get_hour_index(arrival_dt: datetime, forecast_times: list[str]) -> Optional[int]:
    """Find the closest hourly index in the Open-Meteo time list to arrival_dt."""
    if not arrival_dt or not forecast_times:
        return None
    arrival_iso = arrival_dt.strftime("%Y-%m-%dT%H:00")
    for i, t in enumerate(forecast_times):
        if t.startswith(arrival_iso[:13]):  # match YYYY-MM-DDTHH
            return i
    # Fallback: return the first available hour
    return 0


def _parse_weather_data(data: dict, arrival_dt=None) -> Optional[dict]:
    if not data:
        return None
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])

    # Find index for arrival time
    if arrival_dt:
        if isinstance(arrival_dt, str):
            try:
                arrival_dt = datetime.fromisoformat(arrival_dt)
            except Exception:
                arrival_dt = None

    idx = _get_hour_index(arrival_dt, times) if arrival_dt else 0
    if idx is None:
        idx = 0

    def safe_val(key, default=None):
        vals = hourly.get(key, [])
        if vals and idx < len(vals):
            return vals[idx]
        return default

    return {
        "temperature_c": safe_val("temperature_2m"),
        "precipitation_mm": safe_val("precipitation"),
        "precipitation_probability": safe_val("precipitation_probability"),
        "rain_mm": safe_val("rain"),
        "wind_speed_kmh": safe_val("windspeed_10m"),
        "wind_gusts_kmh": safe_val("windgusts_10m"),
        "visibility_m": safe_val("visibility"),
        "weather_code": safe_val("weathercode"),
        "forecast_time": times[idx] if idx < len(times) else None,
    }


def fetch_weather_for_points(sampled_points: list[dict]) -> list[dict]:
    """
    Fetch weather forecasts for a list of sampled route points.

    Each point must have:
      - latitude, longitude
      - estimated_arrival (datetime or ISO string, optional)

    Returns the same list with a `weather` dict added to each point.
    """
    if not sampled_points:
        return sampled_points

    # Filter points that have coordinates
    valid_points = []
    for point in sampled_points:
        lat = point.get("latitude")
        lng = point.get("longitude")
        if lat is not None and lng is not None:
            valid_points.append(point)

    if not valid_points:
        return [{**pt, "weather": None} for pt in sampled_points]

    latitudes = [str(pt["latitude"]) for pt in valid_points]
    longitudes = [str(pt["longitude"]) for pt in valid_points]

    params = {
        "latitude": ",".join(latitudes),
        "longitude": ",".join(longitudes),
        "hourly": ",".join(HOURLY_VARS),
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }

    try:
        logger.info(f"[WEATHER] Requesting weather forecast for {len(valid_points)} points in batch")
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        resp.raise_for_status()
        response_data = resp.json()
    except requests.exceptions.Timeout:
        logger.warning(f"[WEATHER] Timeout for batch weather request of {len(valid_points)} points")
        return [{**pt, "weather": None} for pt in sampled_points]
    except Exception as e:
        logger.warning(f"[WEATHER] Failed batch request: {e}")
        return [{**pt, "weather": None} for pt in sampled_points]

    # Map response back
    if isinstance(response_data, dict):
        response_list = [response_data]
    elif isinstance(response_data, list):
        response_list = response_data
    else:
        logger.warning(f"[WEATHER] Unexpected Open-Meteo response format: {type(response_data)}")
        return [{**pt, "weather": None} for pt in sampled_points]

    # Create mapping by point index
    valid_weather_map = {}
    for idx, pt in enumerate(valid_points):
        if idx < len(response_list):
            arrival = pt.get("estimated_arrival")
            valid_weather_map[id(pt)] = _parse_weather_data(response_list[idx], arrival)
        else:
            valid_weather_map[id(pt)] = None

    enriched = []
    for pt in sampled_points:
        if id(pt) in valid_weather_map:
            enriched.append({**pt, "weather": valid_weather_map[id(pt)]})
        else:
            enriched.append({**pt, "weather": None})

    return enriched


def _fetch_single_point(lat: float, lng: float, arrival_dt=None) -> Optional[dict]:
    """Fetch hourly weather for a single lat/lng point at the expected arrival time."""
    params = {
        "latitude": lat,
        "longitude": lng,
        "hourly": ",".join(HOURLY_VARS),
        "forecast_days": 7,
        "timezone": "Asia/Kolkata",
    }

    try:
        resp = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.Timeout:
        logger.warning(f"[WEATHER] Timeout for ({lat}, {lng})")
        return None
    except Exception as e:
        logger.warning(f"[WEATHER] Failed for ({lat}, {lng}): {e}")
        return None

    return _parse_weather_data(data, arrival_dt)
