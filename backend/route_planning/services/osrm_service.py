"""
OSRM Route Generation Service.

Uses the public OSRM demo server (router.project-osrm.org) to generate
real road-following route alternatives between two coordinate pairs.

Decodes OSRM Polyline6 geometry into a list of [lat, lng] pairs.
"""
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"
# Max candidates to request
MAX_ALTERNATIVES = 3


def _decode_polyline(encoded: str, precision: int = 5) -> list[list[float]]:
    """Decode Google/OSRM encoded polyline to list of [lat, lng] pairs."""
    coordinates = []
    index = 0
    lat = 0
    lng = 0
    factor = 10 ** precision

    while index < len(encoded):
        # Latitude
        shift, result = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        # Longitude
        shift, result = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        coordinates.append([round(lat / factor, 6), round(lng / factor, 6)])

    return coordinates


def generate_routes(
    pickup_lat: float,
    pickup_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> list[dict]:
    """
    Call OSRM to generate up to MAX_ALTERNATIVES road routes.

    Returns a list of route dicts:
      {
        "route_id": "R1",
        "distance_km": 536.2,
        "duration_minutes": 648.5,
        "geometry": [[lat, lng], ...],
        "legs": [...],
        "source": "osrm"
      }

    Returns empty list on failure (caller must handle).
    """
    coord_str = f"{pickup_lng},{pickup_lat};{dest_lng},{dest_lat}"
    url = f"{OSRM_BASE_URL}/{coord_str}"
    params = {
        "alternatives": "true",
        "steps": "false",
        "geometries": "polyline",
        "overview": "full",
    }

    try:
        logger.info(f"[OSRM] Requesting routes: ({pickup_lat},{pickup_lng}) → ({dest_lat},{dest_lng})")
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != "Ok":
            logger.error(f"[OSRM] Non-OK response: {data.get('code')} — {data.get('message')}")
            return []

        routes = []
        for i, route in enumerate(data.get("routes", [])):
            geometry_encoded = route.get("geometry", "")
            coords = _decode_polyline(geometry_encoded, precision=5)
            distance_m = route.get("distance", 0)
            duration_s = route.get("duration", 0)

            name = "Main Highway Route" if i == 0 else f"Alternative Route {i}"
            routes.append({
                "route_id": f"R{i + 1}",
                "name": name,
                "distance_km": round(distance_m / 1000, 2),
                "duration_minutes": round(duration_s / 60, 1),
                "geometry": coords,
                "legs": route.get("legs", []),
                "source": "osrm",
            })

        # If OSRM returns only 1 route, generate additional candidate routes via intermediate waypoints
        if len(routes) == 1:
            mid_lat = (pickup_lat + dest_lat) / 2.0
            mid_lng = (pickup_lng + dest_lng) / 2.0

            # Alternative 2: Inland Express Route (+0.30 lat, +0.30 lng)
            wp1_str = f"{pickup_lng},{pickup_lat};{mid_lng + 0.30},{mid_lat + 0.20};{dest_lng},{dest_lat}"
            try:
                resp2 = requests.get(f"{OSRM_BASE_URL}/{wp1_str}", params={"steps": "false", "geometries": "polyline", "overview": "full"}, timeout=8)
                if resp2.status_code == 200:
                    d2 = resp2.json()
                    if d2.get("code") == "Ok" and d2.get("routes"):
                        r2 = d2["routes"][0]
                        coords2 = _decode_polyline(r2.get("geometry", ""), precision=5)
                        routes.append({
                            "route_id": "R2",
                            "name": "Inland Express Route",
                            "distance_km": round(r2.get("distance", 0) / 1000, 2),
                            "duration_minutes": round(r2.get("duration", 0) / 60, 1),
                            "geometry": coords2,
                            "legs": r2.get("legs", []),
                            "source": "osrm_waypoint",
                        })
            except Exception as e:
                logger.warning(f"[OSRM] Waypoint alternative 1 failed: {e}")

            # Alternative 3: Coastal / Bypass Route (-0.25 lat, -0.30 lng)
            wp2_str = f"{pickup_lng},{pickup_lat};{mid_lng - 0.30},{mid_lat - 0.20};{dest_lng},{dest_lat}"
            try:
                resp3 = requests.get(f"{OSRM_BASE_URL}/{wp2_str}", params={"steps": "false", "geometries": "polyline", "overview": "full"}, timeout=8)
                if resp3.status_code == 200:
                    d3 = resp3.json()
                    if d3.get("code") == "Ok" and d3.get("routes"):
                        r3 = d3["routes"][0]
                        coords3 = _decode_polyline(r3.get("geometry", ""), precision=5)
                        routes.append({
                            "route_id": f"R{len(routes) + 1}",
                            "name": "Coastal Bypass Route",
                            "distance_km": round(r3.get("distance", 0) / 1000, 2),
                            "duration_minutes": round(r3.get("duration", 0) / 60, 1),
                            "geometry": coords3,
                            "legs": r3.get("legs", []),
                            "source": "osrm_waypoint",
                        })
            except Exception as e:
                logger.warning(f"[OSRM] Waypoint alternative 2 failed: {e}")

        logger.info(f"[OSRM] Generated {len(routes)} candidate route(s)")
        return routes

    except requests.exceptions.Timeout:
        logger.error("[OSRM] Request timed out")
        return []
    except requests.exceptions.ConnectionError as e:
        logger.error(f"[OSRM] Connection error: {e}")
        return []
    except Exception as e:
        logger.error(f"[OSRM] Unexpected error: {e}")
        return []


def sample_route_points(geometry: list[list[float]], interval_km: float = 30.0) -> list[dict]:
    """
    Sample points from a route geometry at approximately `interval_km` intervals.

    Returns list of:
      {
        "point_id": "P1",
        "latitude": 21.17,
        "longitude": 72.83,
        "distance_from_origin_km": 30.0,
      }
    """
    import math

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lng2 - lng1)
        a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    if not geometry:
        return []

    sampled = []
    cumulative_km = 0.0
    last_sampled_km = 0.0
    point_idx = 1

    # Always include origin
    sampled.append({
        "point_id": f"P{point_idx}",
        "latitude": geometry[0][0],
        "longitude": geometry[0][1],
        "distance_from_origin_km": 0.0,
    })
    point_idx += 1

    for i in range(1, len(geometry)):
        prev = geometry[i - 1]
        curr = geometry[i]
        seg_dist = haversine(prev[0], prev[1], curr[0], curr[1])
        cumulative_km += seg_dist

        if cumulative_km - last_sampled_km >= interval_km:
            sampled.append({
                "point_id": f"P{point_idx}",
                "latitude": curr[0],
                "longitude": curr[1],
                "distance_from_origin_km": round(cumulative_km, 2),
            })
            last_sampled_km = cumulative_km
            point_idx += 1

    # Always include destination
    last = geometry[-1]
    if not sampled or (sampled[-1]["latitude"] != last[0] or sampled[-1]["longitude"] != last[1]):
        sampled.append({
            "point_id": f"P{point_idx}",
            "latitude": last[0],
            "longitude": last[1],
            "distance_from_origin_km": round(cumulative_km, 2),
        })

    return sampled
