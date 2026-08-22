"""
smart_aggregation_engine.py
============================
Standalone, plug-and-play Smart Order Aggregation Engine for agricultural
supply chain marketplaces.

This module is COMPLETELY ISOLATED from any existing system.  It has zero
imports from the host application and can be dropped into any Python project
or called via the companion REST API (api.py).

Business Problem (Many-to-One Fulfillment)
------------------------------------------
A bulk buyer / APMC destination needs a large quantity of a crop.
Multiple smallholder farmers nearby have fragmented, smaller quantities.
This engine pools those fragmented lots into a single optimised pickup cluster
so one vehicle can complete all pickups in a single trip.

Algorithm Overview
------------------
1. Commodity filter  – keep only lots whose crop matches the destination.
2. Radius filter     – keep only farmers within ``radius_km`` of the destination
                       (Haversine great-circle distance).
3. Freshness + proximity sort – prefer high freshness score; break ties by
                                 distance to destination (ascending).
4. Capacity-constrained greedy fill – accumulate lots until the vehicle is full
                                      or all eligible lots are consumed.
5. Route optimisation – order the chosen pickup stops with a nearest-neighbour
                        heuristic starting from the destination (reduce total
                        detour distance).
6. Logistics saving estimate – compare the aggregated route distance against
                               the sum of hypothetical individual trips.

Usage (as a library)
---------------------
    from smart_aggregation_engine import aggregate_orders, FarmerLot, Destination, AggregationConfig
    from datetime import datetime, timezone

    lots = [
        FarmerLot("F1", "Ravi Farm",  17.385, 78.486, "tomato", 350, freshness_score=88.0),
        FarmerLot("F2", "Laxmi Farm", 17.390, 78.490, "tomato", 400, freshness_score=75.0),
        FarmerLot("F3", "Gopal Farm", 17.380, 78.480, "tomato", 250, freshness_score=91.0),
    ]
    destination = Destination("D1", "Kothapet APMC", 17.360, 78.510, required_quantity_kg=1000, crop_name="tomato")
    config = AggregationConfig(radius_km=10, max_vehicle_capacity_kg=1000)

    result = aggregate_orders(lots, destination, config)
    print(result.cluster_id, result.total_aggregated_weight_kg, result.vehicle_capacity_utilization_pct)
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


# ---------------------------------------------------------------------------
# CONSTANTS
# ---------------------------------------------------------------------------
EARTH_RADIUS_KM: float = 6371.0   # mean Earth radius used by Haversine


# ---------------------------------------------------------------------------
# DATA CLASSES — INPUTS
# ---------------------------------------------------------------------------
@dataclass
class FarmerLot:
    """
    Represents a single farmer's available supply for a commodity.

    Attributes
    ----------
    farmer_id           : Unique identifier for the farmer / listing.
    farm_name           : Human-readable name of the farm or farmer.
    latitude            : Farm location latitude (decimal degrees, WGS-84).
    longitude           : Farm location longitude (decimal degrees, WGS-84).
    crop_name           : Name of the crop on offer. Case-insensitive.
    quantity_kg         : Available supply quantity in kilograms.
    freshness_score     : Freshness score 0–100 (from the Freshness Score Engine
                          or any equivalent source). Higher is better.
                          Defaults to 100.0 if not provided.
    lot_id              : Optional unique ID for the specific lot / listing.
                          Auto-generated from farmer_id if omitted.
    """
    farmer_id:      str
    farm_name:      str
    latitude:       float
    longitude:      float
    crop_name:      str
    quantity_kg:    float
    freshness_score: float = 100.0
    lot_id:         Optional[str] = None

    def __post_init__(self) -> None:
        if self.lot_id is None:
            self.lot_id = f"{self.farmer_id}-{self.crop_name.lower().strip()}"
        self.crop_name = self.crop_name.strip().lower()
        if self.quantity_kg <= 0:
            raise ValueError(f"FarmerLot '{self.lot_id}': quantity_kg must be positive.")
        if not (0.0 <= self.freshness_score <= 100.0):
            raise ValueError(
                f"FarmerLot '{self.lot_id}': freshness_score must be between 0 and 100."
            )


@dataclass
class Destination:
    """
    Represents the bulk buyer or APMC market that needs the commodity.

    Attributes
    ----------
    destination_id          : Unique identifier for the buyer / market node.
    name                    : Human-readable name of the destination.
    latitude                : Destination latitude (decimal degrees, WGS-84).
    longitude               : Destination longitude (decimal degrees, WGS-84).
    required_quantity_kg    : Total quantity the buyer needs (kg).
    crop_name               : Crop the buyer is purchasing. Case-insensitive.
    """
    destination_id:       str
    name:                 str
    latitude:             float
    longitude:            float
    required_quantity_kg: float
    crop_name:            str

    def __post_init__(self) -> None:
        self.crop_name = self.crop_name.strip().lower()
        if self.required_quantity_kg <= 0:
            raise ValueError("Destination required_quantity_kg must be positive.")


@dataclass
class AggregationConfig:
    """
    Tunable parameters for the aggregation algorithm.

    Attributes
    ----------
    radius_km               : Maximum Haversine distance (km) from the destination
                              within which farmers are eligible. Default: 10 km.
    max_vehicle_capacity_kg : Hard upper bound on the total payload per trip (kg).
                              Default: 1 000 kg.
    freshness_weight        : Weight (0–1) given to freshness score in the composite
                              sort key. The remainder is given to proximity.
                              Default: 0.7 (freshness prioritised over distance).
    """
    radius_km:               float = 10.0
    max_vehicle_capacity_kg: float = 1000.0
    freshness_weight:        float = 0.7

    def __post_init__(self) -> None:
        if self.radius_km <= 0:
            raise ValueError("radius_km must be positive.")
        if self.max_vehicle_capacity_kg <= 0:
            raise ValueError("max_vehicle_capacity_kg must be positive.")
        if not (0.0 <= self.freshness_weight <= 1.0):
            raise ValueError("freshness_weight must be between 0.0 and 1.0.")


# ---------------------------------------------------------------------------
# DATA CLASSES — OUTPUT
# ---------------------------------------------------------------------------
@dataclass
class PickupStop:
    """
    A single pickup stop in the aggregated route, ordered by the
    nearest-neighbour heuristic.

    Attributes
    ----------
    stop_order                  : 1-based index in the optimised pickup sequence.
    farmer_id                   : Farmer / lot identifier.
    farm_name                   : Human-readable farm name.
    lot_id                      : Lot identifier.
    latitude                    : Farm latitude.
    longitude                   : Farm longitude.
    allocated_quantity_kg       : Quantity from this lot included in the cluster.
    freshness_score             : Freshness score of this lot.
    distance_to_destination_km  : Direct Haversine distance to the destination.
    """
    stop_order:                 int
    farmer_id:                  str
    farm_name:                  str
    lot_id:                     str
    latitude:                   float
    longitude:                  float
    allocated_quantity_kg:      float
    freshness_score:            float
    distance_to_destination_km: float


@dataclass
class ExcludedLot:
    """Metadata about a lot that was excluded and the reason why."""
    lot_id:    str
    farmer_id: str
    reason:    str   # "outside_radius" | "wrong_crop" | "capacity_exceeded" | "invalid"


@dataclass
class AggregationResult:
    """
    Complete output of a single aggregation run.

    Attributes
    ----------
    cluster_id                      : UUID v4 string uniquely identifying this cluster.
    target_destination              : Dict snapshot of the Destination used.
    crop_name                       : Normalised crop name for this cluster.
    total_aggregated_weight_kg      : Sum of allocated quantities across all pickup stops.
    required_quantity_kg            : Buyer's original requirement.
    fulfillment_pct                 : Percentage of buyer's requirement fulfilled (capped at 100).
    vehicle_capacity_utilization_pct: Percentage of max_vehicle_capacity_kg used.
    pickup_stops                    : Ordered list of PickupStop in optimised route sequence.
    estimated_logistics_saving_pct  : Estimated cost saving vs. individual fragmented trips.
    individual_trip_total_km        : Total km if every farmer drove separately.
    aggregated_route_total_km       : Total km of the aggregated vehicle route.
    radius_km                       : Radius filter applied (km).
    max_vehicle_capacity_kg         : Capacity ceiling applied (kg).
    excluded_lots                   : Lots not included and their exclusion reasons.
    warnings                        : Advisory strings (e.g. partial fulfillment).
    computed_at_utc                 : ISO-8601 timestamp when this result was generated.
    """
    cluster_id:                       str
    target_destination:               dict
    crop_name:                        str
    total_aggregated_weight_kg:       float
    required_quantity_kg:             float
    fulfillment_pct:                  float
    vehicle_capacity_utilization_pct: float
    pickup_stops:                     list[PickupStop]
    estimated_logistics_saving_pct:   float
    individual_trip_total_km:         float
    aggregated_route_total_km:        float
    radius_km:                        float
    max_vehicle_capacity_kg:          float
    excluded_lots:                    list[ExcludedLot] = field(default_factory=list)
    warnings:                         list[str]         = field(default_factory=list)
    computed_at_utc:                  str               = ""

    def __post_init__(self) -> None:
        if not self.computed_at_utc:
            self.computed_at_utc = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# INTERNAL — HAVERSINE DISTANCE
# ---------------------------------------------------------------------------
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the great-circle distance between two points on Earth (km).

    Uses the Haversine formula.  Inputs are decimal-degree latitude/longitude
    coordinates (WGS-84).

    Parameters
    ----------
    lat1, lon1 : Coordinates of point A.
    lat2, lon2 : Coordinates of point B.

    Returns
    -------
    float
        Distance in kilometres.

    Examples
    --------
    >>> round(_haversine_km(17.385, 78.486, 17.360, 78.510), 2)
    3.56
    """
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return EARTH_RADIUS_KM * 2 * math.asin(math.sqrt(a))


# ---------------------------------------------------------------------------
# INTERNAL — ROUTE OPTIMISATION (Nearest-Neighbour Heuristic)
# ---------------------------------------------------------------------------
def _nearest_neighbour_route(
    start_lat: float,
    start_lon: float,
    stops: list[tuple[float, float, int]],   # (lat, lon, original_index)
) -> list[int]:
    """
    Order pickup stops using the nearest-neighbour heuristic starting from
    ``(start_lat, start_lon)`` (the destination / depot).

    Parameters
    ----------
    start_lat, start_lon : Starting point (destination coordinates).
    stops                : List of (lat, lon, original_index) tuples for each stop.

    Returns
    -------
    list[int]
        Original indices in the recommended visit order.
    """
    remaining = list(stops)
    ordered_indices: list[int] = []
    cur_lat, cur_lon = start_lat, start_lon

    while remaining:
        # Find the nearest unvisited stop from the current position
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: _haversine_km(cur_lat, cur_lon, remaining[i][0], remaining[i][1]),
        )
        cur_lat, cur_lon = remaining[nearest_idx][0], remaining[nearest_idx][1]
        ordered_indices.append(remaining[nearest_idx][2])
        remaining.pop(nearest_idx)

    return ordered_indices


def _route_total_km(
    dest_lat: float,
    dest_lon: float,
    stops_in_order: list[tuple[float, float]],
) -> float:
    """
    Compute the total route distance for one vehicle starting and ending at
    the destination and visiting all stops in the given order.

    Route: Destination → Stop₁ → Stop₂ → … → Stopₙ → Destination

    Parameters
    ----------
    dest_lat, dest_lon  : Destination coordinates.
    stops_in_order      : Ordered list of (lat, lon) for each pickup stop.

    Returns
    -------
    float
        Total route distance in kilometres.
    """
    if not stops_in_order:
        return 0.0

    waypoints = [(dest_lat, dest_lon)] + list(stops_in_order) + [(dest_lat, dest_lon)]
    total = 0.0
    for i in range(len(waypoints) - 1):
        total += _haversine_km(
            waypoints[i][0], waypoints[i][1],
            waypoints[i + 1][0], waypoints[i + 1][1],
        )
    return round(total, 4)


# ---------------------------------------------------------------------------
# INTERNAL — COMPOSITE SORT KEY
# ---------------------------------------------------------------------------
def _sort_key(
    lot: FarmerLot,
    dist_km: float,
    freshness_weight: float,
    max_dist: float,
) -> float:
    """
    Returns a composite score (higher = pick first) combining freshness
    and proximity.

    score = freshness_weight * (freshness_score / 100)
          + (1 - freshness_weight) * (1 - dist_km / max_dist)

    Parameters
    ----------
    lot              : The farmer lot being evaluated.
    dist_km          : Haversine distance from this lot to the destination.
    freshness_weight : 0–1 weight given to freshness (vs. proximity).
    max_dist         : Maximum distance in the eligible set (for normalisation).

    Returns
    -------
    float
        Composite priority score (higher is better).
    """
    proximity_score = 1.0 - (dist_km / max_dist) if max_dist > 0 else 1.0
    freshness_norm = lot.freshness_score / 100.0
    return freshness_weight * freshness_norm + (1.0 - freshness_weight) * proximity_score


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------
def aggregate_orders(
    farmer_lots: list[FarmerLot],
    destination: Destination,
    config: Optional[AggregationConfig] = None,
) -> AggregationResult:
    """
    Run the Smart Order Aggregation algorithm for a single buyer destination.

    Steps
    -----
    1. Validate inputs.
    2. Filter lots by commodity match and spatial radius (Haversine).
    3. Sort eligible lots by composite freshness + proximity score.
    4. Greedily fill vehicle up to ``config.max_vehicle_capacity_kg``.
    5. Optimise pickup order with nearest-neighbour heuristic.
    6. Compute logistics saving vs. individual fragmented trips.
    7. Return a structured ``AggregationResult``.

    Parameters
    ----------
    farmer_lots  : All available supply lots to consider.
    destination  : The buyer / APMC destination node.
    config       : Tunable parameters.  Uses ``AggregationConfig()`` defaults
                   if not provided.

    Returns
    -------
    AggregationResult
        Fully populated result dataclass.

    Raises
    ------
    ValueError
        If ``farmer_lots`` is empty, or ``destination`` is invalid.
    """
    if config is None:
        config = AggregationConfig()

    if not farmer_lots:
        raise ValueError("farmer_lots must contain at least one lot.")

    excluded_lots: list[ExcludedLot] = []
    warnings:      list[str]         = []

    # ── Step 1: Commodity filter ──────────────────────────────────────────
    commodity_eligible: list[tuple[FarmerLot, float]] = []   # (lot, dist_km)
    for lot in farmer_lots:
        if lot.crop_name != destination.crop_name:
            excluded_lots.append(ExcludedLot(
                lot_id=lot.lot_id or "",
                farmer_id=lot.farmer_id,
                reason="wrong_crop",
            ))
            continue

        dist = _haversine_km(lot.latitude, lot.longitude,
                             destination.latitude, destination.longitude)
        commodity_eligible.append((lot, dist))

    # ── Step 2: Spatial radius filter ────────────────────────────────────
    radius_eligible: list[tuple[FarmerLot, float]] = []
    for lot, dist in commodity_eligible:
        if dist > config.radius_km:
            excluded_lots.append(ExcludedLot(
                lot_id=lot.lot_id or "",
                farmer_id=lot.farmer_id,
                reason=f"outside_radius ({dist:.2f} km > {config.radius_km} km)",
            ))
        else:
            radius_eligible.append((lot, dist))

    if not radius_eligible:
        warnings.append(
            "No eligible lots found after commodity and radius filtering. "
            "Returning empty cluster."
        )
        return _empty_result(destination, config, excluded_lots, warnings)

    # ── Step 3: Composite sort ────────────────────────────────────────────
    max_dist = max(d for _, d in radius_eligible) or 1.0
    radius_eligible.sort(
        key=lambda item: _sort_key(item[0], item[1], config.freshness_weight, max_dist),
        reverse=True,   # highest composite score first
    )

    # ── Step 4: Capacity-constrained greedy fill ──────────────────────────
    selected: list[tuple[FarmerLot, float, float]] = []   # (lot, dist_km, allocated_kg)
    remaining_capacity = config.max_vehicle_capacity_kg

    for lot, dist in radius_eligible:
        if remaining_capacity <= 0:
            excluded_lots.append(ExcludedLot(
                lot_id=lot.lot_id or "",
                farmer_id=lot.farmer_id,
                reason="capacity_exceeded",
            ))
            continue
        allocated = min(lot.quantity_kg, remaining_capacity)
        selected.append((lot, dist, allocated))
        remaining_capacity -= allocated

    if not selected:
        warnings.append("Vehicle capacity is zero or all lots exceed capacity.")
        return _empty_result(destination, config, excluded_lots, warnings)

    # ── Step 5: Route optimisation (nearest-neighbour) ────────────────────
    stop_tuples = [
        (lot.latitude, lot.longitude, idx)
        for idx, (lot, _, _) in enumerate(selected)
    ]
    ordered_indices = _nearest_neighbour_route(
        destination.latitude, destination.longitude, stop_tuples
    )
    optimised_selected = [selected[i] for i in ordered_indices]

    # ── Step 6: Logistics metrics ─────────────────────────────────────────
    # Individual trips: each farmer drives directly to destination (round trip)
    individual_total_km = sum(dist * 2 for _, dist, _ in optimised_selected)

    # Aggregated route: Dest → F₁ → F₂ → … → Fₙ → Dest
    stop_coords = [(lot.latitude, lot.longitude) for lot, _, _ in optimised_selected]
    aggregated_total_km = _route_total_km(
        destination.latitude, destination.longitude, stop_coords
    )

    # Saving: clamp to [0, 100] to guard edge cases (single stop, etc.)
    if individual_total_km > 0:
        saving_pct = max(0.0, (individual_total_km - aggregated_total_km) / individual_total_km * 100.0)
    else:
        saving_pct = 0.0
    saving_pct = round(min(saving_pct, 100.0), 2)

    # ── Step 7: Assemble result ───────────────────────────────────────────
    total_weight = sum(alloc for _, _, alloc in optimised_selected)
    utilization  = round(total_weight / config.max_vehicle_capacity_kg * 100.0, 2)
    fulfillment  = round(min(total_weight / destination.required_quantity_kg * 100.0, 100.0), 2)

    if fulfillment < 100.0:
        warnings.append(
            f"Partial fulfillment: {total_weight:.1f} kg aggregated out of "
            f"{destination.required_quantity_kg:.1f} kg required ({fulfillment:.1f}%)."
        )

    pickup_stops: list[PickupStop] = [
        PickupStop(
            stop_order=order + 1,
            farmer_id=lot.farmer_id,
            farm_name=lot.farm_name,
            lot_id=lot.lot_id or "",
            latitude=lot.latitude,
            longitude=lot.longitude,
            allocated_quantity_kg=round(alloc, 4),
            freshness_score=lot.freshness_score,
            distance_to_destination_km=round(dist, 4),
        )
        for order, (lot, dist, alloc) in enumerate(optimised_selected)
    ]

    return AggregationResult(
        cluster_id=str(uuid.uuid4()),
        target_destination={
            "destination_id": destination.destination_id,
            "name":           destination.name,
            "latitude":       destination.latitude,
            "longitude":      destination.longitude,
            "required_quantity_kg": destination.required_quantity_kg,
        },
        crop_name=destination.crop_name,
        total_aggregated_weight_kg=round(total_weight, 4),
        required_quantity_kg=destination.required_quantity_kg,
        fulfillment_pct=fulfillment,
        vehicle_capacity_utilization_pct=utilization,
        pickup_stops=pickup_stops,
        estimated_logistics_saving_pct=saving_pct,
        individual_trip_total_km=round(individual_total_km, 4),
        aggregated_route_total_km=round(aggregated_total_km, 4),
        radius_km=config.radius_km,
        max_vehicle_capacity_kg=config.max_vehicle_capacity_kg,
        excluded_lots=excluded_lots,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# MULTI-DESTINATION AGGREGATION (convenience wrapper)
# ---------------------------------------------------------------------------
def aggregate_multi_destination(
    farmer_lots: list[FarmerLot],
    destinations: list[Destination],
    config: Optional[AggregationConfig] = None,
) -> list[AggregationResult]:
    """
    Run ``aggregate_orders`` independently for each destination.

    Each destination generates its own isolated cluster.  Lots are NOT shared
    across destinations — each destination consumes from the full ``farmer_lots``
    list independently (no deduction across runs).

    Parameters
    ----------
    farmer_lots  : Full pool of available supply lots.
    destinations : One or more buyer / APMC destination nodes.
    config       : Shared config applied to every destination.

    Returns
    -------
    list[AggregationResult]
        One result per destination, in the same order as ``destinations``.

    Raises
    ------
    ValueError
        If ``destinations`` is empty.
    """
    if not destinations:
        raise ValueError("destinations must contain at least one entry.")
    return [aggregate_orders(farmer_lots, dest, config) for dest in destinations]


# ---------------------------------------------------------------------------
# INTERNAL HELPERS
# ---------------------------------------------------------------------------
def _empty_result(
    destination: Destination,
    config: AggregationConfig,
    excluded_lots: list[ExcludedLot],
    warnings: list[str],
) -> AggregationResult:
    """Return a zero-weight AggregationResult when no lots are eligible."""
    return AggregationResult(
        cluster_id=str(uuid.uuid4()),
        target_destination={
            "destination_id": destination.destination_id,
            "name":           destination.name,
            "latitude":       destination.latitude,
            "longitude":      destination.longitude,
            "required_quantity_kg": destination.required_quantity_kg,
        },
        crop_name=destination.crop_name,
        total_aggregated_weight_kg=0.0,
        required_quantity_kg=destination.required_quantity_kg,
        fulfillment_pct=0.0,
        vehicle_capacity_utilization_pct=0.0,
        pickup_stops=[],
        estimated_logistics_saving_pct=0.0,
        individual_trip_total_km=0.0,
        aggregated_route_total_km=0.0,
        radius_km=config.radius_km,
        max_vehicle_capacity_kg=config.max_vehicle_capacity_kg,
        excluded_lots=excluded_lots,
        warnings=warnings,
    )
