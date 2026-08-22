"""
api.py
======
Lightweight FastAPI wrapper around smart_aggregation_engine.py.

Exposes endpoints:
    POST /api/v1/aggregate-orders        – run aggregation for one destination
    POST /api/v1/aggregate-multi         – run aggregation for multiple destinations
    GET  /api/v1/health                  – health-check

Runs on port 8002 by default.
Does NOT conflict with:
  - Django backend  →  8000
  - Vite frontend   →  5173
  - Freshness Engine→  8001

Start the server:
    python run.py
  or
    uvicorn api:app --port 8002 --reload
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from smart_aggregation_engine import (
    AggregationConfig,
    AggregationResult,
    Destination,
    ExcludedLot,
    FarmerLot,
    PickupStop,
    aggregate_multi_destination,
    aggregate_orders,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Smart Order Aggregation Engine API",
    description=(
        "Standalone microservice that pools fragmented smallholder farmer supply "
        "lots into optimised bulk pickup clusters for a single buyer or APMC "
        "destination.  Completely isolated from the host application."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas (Pydantic v2)
# ---------------------------------------------------------------------------

# ── Input sub-models ───────────────────────────────────────────────────────

class FarmerLotSchema(BaseModel):
    """A single farmer lot submitted in the request payload."""
    farmer_id:      str   = Field(..., min_length=1, description="Unique farmer / listing ID.")
    farm_name:      str   = Field(..., min_length=1, description="Human-readable farm name.")
    latitude:       float = Field(..., ge=-90,  le=90,  description="Farm latitude (WGS-84).")
    longitude:      float = Field(..., ge=-180, le=180, description="Farm longitude (WGS-84).")
    crop_name:      str   = Field(..., min_length=1, description="Crop name (case-insensitive).")
    quantity_kg:    float = Field(..., gt=0,  description="Available quantity in kilograms.")
    freshness_score: float = Field(default=100.0, ge=0, le=100,
                                   description="Freshness score 0–100 (from Freshness Engine).")
    lot_id:         Optional[str] = Field(default=None, description="Optional lot identifier.")


class DestinationSchema(BaseModel):
    """The buyer / APMC destination submitted in the request payload."""
    destination_id:       str   = Field(..., min_length=1, description="Unique destination ID.")
    name:                 str   = Field(..., min_length=1, description="Market / buyer name.")
    latitude:             float = Field(..., ge=-90,  le=90,  description="Destination latitude.")
    longitude:            float = Field(..., ge=-180, le=180, description="Destination longitude.")
    required_quantity_kg: float = Field(..., gt=0, description="Total quantity needed (kg).")
    crop_name:            str   = Field(..., min_length=1, description="Crop needed (case-insensitive).")


class AggregationConfigSchema(BaseModel):
    """Optional tunable config overrides."""
    radius_km:               float = Field(default=10.0,   gt=0,
                                           description="Farmer eligibility radius from destination (km).")
    max_vehicle_capacity_kg: float = Field(default=1000.0, gt=0,
                                           description="Maximum vehicle payload (kg).")
    freshness_weight:        float = Field(default=0.7, ge=0.0, le=1.0,
                                           description="Weight given to freshness score in priority sort (0–1).")


class AggregateOrdersRequest(BaseModel):
    """
    Request body for POST /api/v1/aggregate-orders.

    Provide a list of farmer lots, a single destination, and optional config.
    """
    farmer_lots: List[FarmerLotSchema] = Field(
        ..., min_length=1,
        description="List of available farmer supply lots."
    )
    destination: DestinationSchema = Field(
        ..., description="Target buyer / APMC destination."
    )
    config: Optional[AggregationConfigSchema] = Field(
        default=None, description="Optional algorithm tuning parameters."
    )


class AggregateMultiRequest(BaseModel):
    """
    Request body for POST /api/v1/aggregate-multi.

    Runs an independent aggregation for each destination in the list.
    """
    farmer_lots:  List[FarmerLotSchema]   = Field(..., min_length=1)
    destinations: List[DestinationSchema] = Field(..., min_length=1)
    config:       Optional[AggregationConfigSchema] = Field(default=None)


# ── Output sub-models ──────────────────────────────────────────────────────

class PickupStopOut(BaseModel):
    stop_order:                 int
    farmer_id:                  str
    farm_name:                  str
    lot_id:                     str
    latitude:                   float
    longitude:                  float
    allocated_quantity_kg:      float
    freshness_score:            float
    distance_to_destination_km: float


class ExcludedLotOut(BaseModel):
    lot_id:    str
    farmer_id: str
    reason:    str


class AggregationResultOut(BaseModel):
    cluster_id:                       str
    target_destination:               dict
    crop_name:                        str
    total_aggregated_weight_kg:       float
    required_quantity_kg:             float
    fulfillment_pct:                  float
    vehicle_capacity_utilization_pct: float
    pickup_stops:                     List[PickupStopOut]
    estimated_logistics_saving_pct:   float
    individual_trip_total_km:         float
    aggregated_route_total_km:        float
    radius_km:                        float
    max_vehicle_capacity_kg:          float
    excluded_lots:                    List[ExcludedLotOut]
    warnings:                         List[str]
    computed_at_utc:                  str


# ---------------------------------------------------------------------------
# Converters: Pydantic schemas ↔ engine dataclasses
# ---------------------------------------------------------------------------

def _schema_to_farmer_lot(s: FarmerLotSchema) -> FarmerLot:
    return FarmerLot(
        farmer_id=s.farmer_id,
        farm_name=s.farm_name,
        latitude=s.latitude,
        longitude=s.longitude,
        crop_name=s.crop_name,
        quantity_kg=s.quantity_kg,
        freshness_score=s.freshness_score,
        lot_id=s.lot_id,
    )


def _schema_to_destination(s: DestinationSchema) -> Destination:
    return Destination(
        destination_id=s.destination_id,
        name=s.name,
        latitude=s.latitude,
        longitude=s.longitude,
        required_quantity_kg=s.required_quantity_kg,
        crop_name=s.crop_name,
    )


def _schema_to_config(s: Optional[AggregationConfigSchema]) -> AggregationConfig:
    if s is None:
        return AggregationConfig()
    return AggregationConfig(
        radius_km=s.radius_km,
        max_vehicle_capacity_kg=s.max_vehicle_capacity_kg,
        freshness_weight=s.freshness_weight,
    )


def _result_to_out(r: AggregationResult) -> AggregationResultOut:
    return AggregationResultOut(
        cluster_id=r.cluster_id,
        target_destination=r.target_destination,
        crop_name=r.crop_name,
        total_aggregated_weight_kg=r.total_aggregated_weight_kg,
        required_quantity_kg=r.required_quantity_kg,
        fulfillment_pct=r.fulfillment_pct,
        vehicle_capacity_utilization_pct=r.vehicle_capacity_utilization_pct,
        pickup_stops=[
            PickupStopOut(
                stop_order=p.stop_order,
                farmer_id=p.farmer_id,
                farm_name=p.farm_name,
                lot_id=p.lot_id,
                latitude=p.latitude,
                longitude=p.longitude,
                allocated_quantity_kg=p.allocated_quantity_kg,
                freshness_score=p.freshness_score,
                distance_to_destination_km=p.distance_to_destination_km,
            )
            for p in r.pickup_stops
        ],
        estimated_logistics_saving_pct=r.estimated_logistics_saving_pct,
        individual_trip_total_km=r.individual_trip_total_km,
        aggregated_route_total_km=r.aggregated_route_total_km,
        radius_km=r.radius_km,
        max_vehicle_capacity_kg=r.max_vehicle_capacity_kg,
        excluded_lots=[
            ExcludedLotOut(lot_id=e.lot_id, farmer_id=e.farmer_id, reason=e.reason)
            for e in r.excluded_lots
        ],
        warnings=r.warnings,
        computed_at_utc=r.computed_at_utc,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health():
    """Health-check endpoint."""
    return {
        "service": "Smart Order Aggregation Engine",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs",
        "port":    8002,
    }


@app.post(
    "/api/v1/aggregate-orders",
    response_model=AggregationResultOut,
    summary="Aggregate Orders (Single Destination)",
    tags=["Aggregation Engine"],
)
def aggregate_orders_endpoint(payload: AggregateOrdersRequest) -> AggregationResultOut:
    """
    Pool fragmented farmer supply lots into one optimised pickup cluster
    for a **single** buyer / APMC destination.

    ### Algorithm Steps
    1. **Commodity filter** – keep lots whose crop matches the destination crop.
    2. **Spatial radius filter** – keep farms within `config.radius_km` of the destination
       (Haversine great-circle distance).
    3. **Priority sort** – rank by composite score =
       `freshness_weight × freshness_score + (1 - freshness_weight) × proximity_score`
    4. **Capacity-constrained greedy fill** – accumulate lots up to `max_vehicle_capacity_kg`.
    5. **Route optimisation** – order stops with a nearest-neighbour heuristic.
    6. **Logistics saving** – compare aggregated route vs. individual fragmented trips.

    ### Grade Bands (Freshness Score reference)
    | Score   | Grade            |
    |---------|------------------|
    | 85–100  | Ultra Fresh      |
    | 60–84   | Fresh            |
    | 40–59   | Needs Fast Sale  |
    | 0–39    | Processing Grade |
    """
    try:
        lots   = [_schema_to_farmer_lot(f) for f in payload.farmer_lots]
        dest   = _schema_to_destination(payload.destination)
        config = _schema_to_config(payload.config)
        result = aggregate_orders(lots, dest, config)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return _result_to_out(result)


@app.post(
    "/api/v1/aggregate-multi",
    response_model=List[AggregationResultOut],
    summary="Aggregate Orders (Multiple Destinations)",
    tags=["Aggregation Engine"],
)
def aggregate_multi_endpoint(payload: AggregateMultiRequest) -> List[AggregationResultOut]:
    """
    Run independent aggregation for **multiple** buyer destinations in a
    single request.  Each destination generates its own isolated cluster.

    Lots are NOT deducted across destinations — each destination independently
    evaluates the full ``farmer_lots`` pool.
    """
    try:
        lots   = [_schema_to_farmer_lot(f) for f in payload.farmer_lots]
        dests  = [_schema_to_destination(d) for d in payload.destinations]
        config = _schema_to_config(payload.config)
        results = aggregate_multi_destination(lots, dests, config)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return [_result_to_out(r) for r in results]
