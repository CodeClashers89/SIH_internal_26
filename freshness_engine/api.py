"""
api.py
======
Lightweight FastAPI wrapper around freshness_engine.py.

Exposes endpoints:
    POST /api/v1/calculate-freshness   – compute freshness score
    GET  /api/v1/crops                 – browse crop master data

Runs on port 8001 by default (does NOT conflict with Django on 8000).

Start the server:
    python run.py
  or
    uvicorn api:app --port 8001 --reload
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from freshness_engine import (
    FreshnessResult,
    calculate_freshness,
    get_crop_catalogue,
    list_transit_modes,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Freshness Score Engine API",
    description=(
        "Standalone microservice that calculates a dynamic Freshness Score (0–100) "
        "for agricultural commodities based on harvest time, transit mode, and "
        "crop-specific shelf-life data. Completely isolated from the host application."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Allow all origins so any frontend (React, plain HTML, etc.) can consume this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas (Pydantic v2)
# ---------------------------------------------------------------------------
class FreshnessRequest(BaseModel):
    """
    Input payload for the freshness calculation endpoint.

    Fields
    ------
    crop_name            : Name of the crop. Case-insensitive.
    harvest_time_utc     : ISO-8601 datetime string in UTC.
                           e.g. "2026-08-20T06:00:00Z" or "2026-08-20T06:00:00+00:00"
    transit_mode         : "normal" or "cold_chain". Default: "normal".
    custom_shelf_life_hours: Optional override for shelf life in hours.
    evaluation_time_utc  : Optional override for "now" (useful for testing/simulation).
    """

    crop_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        examples=["Tomato"],
        description="Name of the crop (e.g. 'Tomato', 'Spinach', 'Mango').",
    )
    harvest_time_utc: datetime = Field(
        ...,
        examples=["2026-08-20T06:00:00Z"],
        description="UTC datetime when the crop was harvested (ISO-8601).",
    )
    transit_mode: str = Field(
        default="normal",
        examples=["normal"],
        description="Storage/transit condition: 'normal' or 'cold_chain'.",
    )
    custom_shelf_life_hours: Optional[float] = Field(
        default=None,
        description="Override the master-list shelf life (hours). Positive number only.",
    )
    evaluation_time_utc: Optional[datetime] = Field(
        default=None,
        description="Override the evaluation timestamp (for simulation / testing).",
    )

    @field_validator("transit_mode")
    @classmethod
    def validate_transit_mode(cls, v: str) -> str:
        normalised = v.strip().lower().replace("-", "_").replace(" ", "_")
        allowed = {"normal", "cold_chain"}
        if normalised not in allowed:
            raise ValueError(
                f"transit_mode must be one of {sorted(allowed)}. Got: '{v}'"
            )
        return v

    @field_validator("custom_shelf_life_hours")
    @classmethod
    def validate_custom_shelf_life(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("custom_shelf_life_hours must be a positive number.")
        return v


class FreshnessResponse(BaseModel):
    """Full JSON response returned by POST /api/v1/calculate-freshness."""

    score:              float     = Field(description="Freshness score 0–100.")
    grade:              str       = Field(description="Quality grade label.")
    grade_advice:       str       = Field(description="Recommended action for this grade.")
    crop_name:          str       = Field(description="Normalised crop name used.")
    shelf_life_hours:   float     = Field(description="Baseline shelf life (hrs).")
    elapsed_hours:      float     = Field(description="Hours elapsed since harvest.")
    transit_mode:       str       = Field(description="Resolved transit mode.")
    decay_factor:       float     = Field(description="Decay multiplier applied.")
    harvest_time_utc:   str       = Field(description="Harvest time (ISO-8601 UTC).")
    evaluated_at_utc:   str       = Field(description="Score evaluation time (ISO-8601 UTC).")
    warnings:           List[str] = Field(description="Advisory messages, if any.")


class CropCatalogueResponse(BaseModel):
    """Response for GET /api/v1/crops."""
    crops:         Dict[str, float] = Field(description="Crop → shelf life (hrs) mapping.")
    transit_modes: List[str]        = Field(description="Supported transit mode identifiers.")
    total_crops:   int              = Field(description="Total crops in master list.")


# ---------------------------------------------------------------------------
# Endpoint helpers
# ---------------------------------------------------------------------------
def _result_to_response(result: FreshnessResult) -> FreshnessResponse:
    """Convert the engine's dataclass into a Pydantic response model."""
    return FreshnessResponse(
        score=result.score,
        grade=result.grade,
        grade_advice=result.grade_advice,
        crop_name=result.crop_name,
        shelf_life_hours=result.shelf_life_hours,
        elapsed_hours=result.elapsed_hours,
        transit_mode=result.transit_mode,
        decay_factor=result.decay_factor,
        harvest_time_utc=result.harvest_time_utc.isoformat(),
        evaluated_at_utc=result.evaluated_at_utc.isoformat(),
        warnings=result.warnings,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    """Health-check endpoint."""
    return {
        "service": "Freshness Score Engine",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.post(
    "/api/v1/calculate-freshness",
    response_model=FreshnessResponse,
    summary="Calculate Freshness Score",
    tags=["Freshness Engine"],
)
def calculate_freshness_endpoint(payload: FreshnessRequest) -> FreshnessResponse:
    """
    Calculate the dynamic Freshness Score for a given crop.

    ### Core Formula
    ```
    Elapsed Hours  = (Current_Time - Harvest_Time) in hours
    Decay Factor   = 0.6  (cold_chain) | 1.0  (normal)
    Penalty        = (Elapsed_Hours / Shelf_Life_Hours) * 100 * Decay_Factor
    Score          = clamp(100 - Penalty, 0, 100)
    ```

    ### Grade Bands
    | Score   | Grade                  |
    |---------|------------------------|
    | 85–100  | Ultra Fresh (Premium)  |
    | 60–84   | Fresh (Standard)       |
    | 40–59   | Needs Fast Sale        |
    | 0–39    | Processing Grade       |
    """
    try:
        result = calculate_freshness(
            crop_name=payload.crop_name,
            harvest_time_utc=payload.harvest_time_utc,
            transit_mode=payload.transit_mode,
            current_time_utc=payload.evaluation_time_utc,
            custom_shelf_life_hours=payload.custom_shelf_life_hours,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return _result_to_response(result)


@app.get(
    "/api/v1/crops",
    response_model=CropCatalogueResponse,
    summary="List Crop Catalogue",
    tags=["Freshness Engine"],
)
def get_crop_list() -> CropCatalogueResponse:
    """
    Return the full crop master-data dictionary and supported transit modes.
    Useful for populating dropdowns in a UI without hardcoding values.
    """
    catalogue = get_crop_catalogue()
    return CropCatalogueResponse(
        crops=catalogue,
        transit_modes=list_transit_modes(),
        total_crops=len(catalogue),
    )
