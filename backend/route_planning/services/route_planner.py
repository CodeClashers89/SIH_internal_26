"""
Main Route Planner Orchestrator.

Executes the complete transportation route-planning pipeline:
 1. Load shipment → extract commodity, pickup/destination coordinates
 2. Call SOP Engine → get commodity handling constraints
 3. Call OSRM → generate 2-5 candidate road routes
 4. Sample route points at ~30km intervals
 5. Calculate ETA for each sampled point based on departure time
 6. Call Open-Meteo → get weather forecasts for each point at expected arrival time
 7. Run Weather Risk Engine → evaluate each candidate route
 8. Apply hard constraints → filter out invalid routes
 9. Call LLM API → compare valid routes, get recommendation with explanation
10. Validate LLM response → accept recommendation or use deterministic fallback
11. Persist RoutePlan record → set status to RECOMMENDED or CONFIRMED
12. Audit event creation & Control Tower integration
"""
import logging
from datetime import datetime, timedelta, timezone
from django.utils import timezone as django_timezone
from django.db import transaction

from logistics.models import DeliveryShipment
from route_planning.models import RoutePlan, RouteAuditEvent
from route_planning.services.geocoding import geocode_city
from route_planning.services.osrm_service import generate_routes, sample_route_points
from route_planning.services.weather_service import fetch_weather_for_points
from route_planning.services.weather_risk_engine import evaluate_route_weather_risk, evaluate_quality_risk
from route_planning.services.sop_service import fetch_commodity_sop
from route_planning.services.llm_service import compare_routes

logger = logging.getLogger(__name__)


def plan_shipment_route(
    shipment_id: int,
    user=None,
    auto_confirm: bool = False,
    departure_time: datetime = None,
) -> RoutePlan:
    """
    Generate, analyze, and select the authoritative route for a shipment.
    """
    try:
        shipment = DeliveryShipment.objects.select_related(
            "order", "order__buyer", "partner"
        ).prefetch_related("order__items__product").get(id=shipment_id)
    except DeliveryShipment.DoesNotExist:
        raise ValueError(f"Shipment #{shipment_id} does not exist.")

    # 1. Extract commodity and coordinates
    order = shipment.order
    first_item = order.items.first()
    product = first_item.product if first_item else None

    commodity_name = product.name if product else "Vegetables"
    commodity_category = product.category if product else "vegetables"
    quantity_kg = float(first_item.quantity) if first_item else 1000.0

    # Ensure coordinates exist
    pickup_lat = shipment.pickup_lat
    pickup_lng = shipment.pickup_lng
    dest_lat = shipment.destination_lat
    dest_lng = shipment.destination_lng

    if not (pickup_lat and pickup_lng):
        coords = geocode_city(shipment.pickup_address)
        if coords:
            pickup_lat, pickup_lng = coords
            shipment.pickup_lat, shipment.pickup_lng = pickup_lat, pickup_lng
            shipment.save(update_fields=["pickup_lat", "pickup_lng"])

    if not (dest_lat and dest_lng):
        coords = geocode_city(shipment.delivery_address)
        if coords:
            dest_lat, dest_lng = coords
            shipment.destination_lat, shipment.destination_lng = dest_lat, dest_lng
            shipment.save(update_fields=["destination_lat", "destination_lng"])

    # Fallbacks if geocoding fails
    if not (pickup_lat and pickup_lng):
        pickup_lat, pickup_lng = 22.5645, 72.9289  # Anand
    if not (dest_lat and dest_lng):
        dest_lat, dest_lng = 19.0760, 72.8777  # Mumbai

    pickup_lat, pickup_lng = float(pickup_lat), float(pickup_lng)
    dest_lat, dest_lng = float(dest_lat), float(dest_lng)

    if departure_time is None:
        departure_time = django_timezone.now()

    # 2. Fetch Commodity SOP
    sop_data = fetch_commodity_sop(commodity_name, commodity_category)
    transport_protocol = sop_data.get("transportation_protocol", {})
    max_transit_hours = transport_protocol.get("maximum_transit_time_hours", {}).get("value", 72)
    requires_cold = transport_protocol.get("temperature_requirements", {}).get("required", False)

    # 3. Generate candidate routes via OSRM
    candidate_raw_routes = generate_routes(pickup_lat, pickup_lng, dest_lat, dest_lng)
    if not candidate_raw_routes:
        # Fallback straight line mock candidate if OSRM unavailable
        logger.warning("[ROUTE_PLANNER] OSRM returned no routes — generating direct line fallback")
        candidate_raw_routes = [{
            "route_id": "R1",
            "distance_km": float(shipment.distance_km or 50.0),
            "duration_minutes": float((shipment.distance_km or 50.0) * 1.5),
            "geometry": [[pickup_lat, pickup_lng], [dest_lat, dest_lng]],
            "source": "fallback",
        }]

    # 4-7. Evaluate candidate routes (Sampling, ETA, Weather, Risk Scoring)
    analyzed_candidates = []
    valid_candidates = []

    for raw_route in candidate_raw_routes:
        duration_hours = raw_route["duration_minutes"] / 60.0

        # Sample points
        sampled_points = sample_route_points(raw_route["geometry"], interval_km=35.0)

        # Calculate ETAs for each point
        for pt in sampled_points:
            pt_dist = pt["distance_from_origin_km"]
            total_dist = max(raw_route["distance_km"], 0.1)
            time_fraction = pt_dist / total_dist
            pt_eta = departure_time + timedelta(hours=duration_hours * time_fraction)
            pt["estimated_arrival"] = pt_eta.isoformat()

        # Fetch weather for sampled points
        weather_checkpoints = fetch_weather_for_points(sampled_points)

        # Weather risk assessment
        enriched_checkpoints, weather_risk = evaluate_route_weather_risk(weather_checkpoints, sop_data)
        quality_risk = evaluate_quality_risk(weather_risk, sop_data)

        # Hard Constraint Check
        deadline_feasible = duration_hours <= max_transit_hours
        is_valid = deadline_feasible and weather_risk != "CRITICAL"

        candidate_obj = {
            "route_id": raw_route["route_id"],
            "name": raw_route.get("name", f"Route {raw_route['route_id']}"),
            "distance_km": raw_route["distance_km"],
            "duration_hours": duration_hours,
            "duration_minutes": raw_route["duration_minutes"],
            "geometry": raw_route["geometry"],
            "weather_checkpoints": enriched_checkpoints,
            "weather_risk": weather_risk,
            "quality_risk": quality_risk,
            "deadline_feasible": deadline_feasible,
            "is_valid": is_valid,
        }
        analyzed_candidates.append(candidate_obj)

        if is_valid:
            valid_candidates.append(candidate_obj)

    if not valid_candidates:
        logger.warning("[ROUTE_PLANNER] All routes failed hard constraints — using all analyzed routes as candidates")
        valid_candidates = analyzed_candidates

    # 8-10. Compare valid candidate routes via LLM / Deterministic Fallback
    try:
        recommendation = compare_routes(
            valid_routes=valid_candidates,
            commodity=commodity_name,
            quantity_kg=quantity_kg,
            departure_time=departure_time.isoformat(),
        )
    except Exception as e:
        logger.error(f"[ROUTE_PLANNER] Route selection failed: {e}")
        best = valid_candidates[0]
        recommendation = {
            "recommended_route_id": best["route_id"],
            "reason": f"Default fallback selection for route {best['route_id']}.",
            "confidence": "fallback",
            "selection_method": "deterministic_fallback",
        }

    selected_route_id = recommendation.get("recommended_route_id")
    selected_candidate = next(
        (c for c in analyzed_candidates if c["route_id"] == selected_route_id),
        valid_candidates[0]
    )

    estimated_arrival = departure_time + timedelta(minutes=selected_candidate["duration_minutes"])

    # 11. Persist RoutePlan in database
    with transaction.atomic():
        # Get next version number
        latest_plan = RoutePlan.objects.filter(shipment=shipment).order_by("-route_version").first()
        next_version = (latest_plan.route_version + 1) if latest_plan else 1

        # Supersede existing active routes if any
        RoutePlan.objects.filter(shipment=shipment, is_active=True).update(is_active=False, status="SUPERSEDED")

        status_val = "CONFIRMED" if auto_confirm else "RECOMMENDED"
        is_active_val = auto_confirm

        route_plan = RoutePlan.objects.create(
            shipment=shipment,
            route_version=next_version,
            route_geometry=selected_candidate["geometry"],
            candidate_routes=[
                {
                    "route_id": c["route_id"],
                    "name": c.get("name", f"Route {c['route_id']}"),
                    "distance_km": c["distance_km"],
                    "duration_minutes": c["duration_minutes"],
                    "duration_hours": c["duration_hours"],
                    "weather_risk": c["weather_risk"],
                    "quality_risk": c["quality_risk"],
                    "is_valid": c["is_valid"],
                    "geometry": c["geometry"],
                    "weather_checkpoints": c["weather_checkpoints"],
                }
                for c in analyzed_candidates
            ],
            distance_km=selected_candidate["distance_km"],
            duration_minutes=selected_candidate["duration_minutes"],
            estimated_departure=departure_time,
            estimated_arrival=estimated_arrival,
            weather_risk=selected_candidate["weather_risk"],
            quality_risk=selected_candidate["quality_risk"],
            weather_snapshot=selected_candidate["weather_checkpoints"],
            commodity_sop_data=sop_data,
            selection_method=recommendation.get("selection_method", "deterministic_fallback"),
            llm_reason=recommendation.get("reason"),
            llm_confidence=recommendation.get("confidence"),
            status=status_val,
            is_active=is_active_val,
            created_by=user,
            confirmed_by=user if auto_confirm else None,
            confirmed_at=django_timezone.now() if auto_confirm else None,
        )

        # Audit Event
        RouteAuditEvent.objects.create(
            route_plan=route_plan,
            event_type="RECOMMENDED" if not auto_confirm else "CONFIRMED",
            actor=user,
            route_version=next_version,
            reason=recommendation.get("reason"),
            metadata={
                "selection_method": recommendation.get("selection_method"),
                "selected_route_id": selected_route_id,
                "candidates_count": len(analyzed_candidates),
            }
        )

    logger.info(f"[ROUTE_PLANNER] Created RoutePlan v{next_version} for Shipment #{shipment_id} ({status_val})")
    return route_plan
