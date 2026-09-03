"""
api.py
======
Lightweight FastAPI wrapper around pricing_advisor.py.

Exposes one unified endpoint that handles both conversation stages:
    POST /api/v1/price-advisor

Runs on port 8003 by default.
Does NOT conflict with:
  - Django backend      → 8000
  - Vite frontend       → 5173
  - Freshness Engine    → 8001
  - Aggregation Engine  → 8002

Start the server:
    python run.py
  or
    uvicorn api:app --port 8003 --reload
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from pricing_advisor import (
    BatchInput,
    DecisionInput,
    build_pricing_advice,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Spoilage-Aware Dynamic Pricing Advisor API",
    description=(
        "Standalone microservice that recommends a consent-first tiered "
        "discount ladder for agricultural produce approaching spoilage. "
        "The farmer always makes the final decision — no price is changed "
        "automatically. Completely isolated from the host application."
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

class DecisionInputSchema(BaseModel):
    """
    Farmer's response after reviewing the Stage 1 recommendation.

    Provide this field in a second call to the same endpoint to
    branch into Stage 2 (decision_applied).
    """
    farmer_choice: Literal["a", "b", "c", "d"] = Field(
        ...,
        description=(
            "a = accept suggested plan  |  b = custom discount  |"
            "  c = keep current price  |  d = withdraw batch"
        ),
    )
    custom_discount_pct: Optional[float] = Field(
        default=None,
        gt=0,
        le=100,
        description="Used when farmer_choice='b'. Desired discount % off current price.",
    )
    custom_target_price_per_kg: Optional[float] = Field(
        default=None,
        ge=0,
        description="Used when farmer_choice='b'. Absolute target price (₹/kg).",
    )

    @field_validator("farmer_choice")
    @classmethod
    def validate_choice(cls, v: str) -> str:
        if v not in {"a", "b", "c", "d"}:
            raise ValueError("farmer_choice must be one of: a, b, c, d.")
        return v

    @model_validator(mode="after")
    def validate_custom_fields(self) -> "DecisionInputSchema":
        if self.farmer_choice == "b":
            if self.custom_discount_pct is None and self.custom_target_price_per_kg is None:
                raise ValueError(
                    "For farmer_choice 'b', supply either "
                    "custom_discount_pct or custom_target_price_per_kg."
                )
        return self


class PriceAdvisorRequest(BaseModel):
    """
    Unified request body for POST /api/v1/price-advisor.

    Omit ``decision_input`` on the first call to get Stage 1
    (awaiting_farmer_decision).  Include it on the second call to
    apply the farmer's choice (Stage 2).
    """
    crop_name: str = Field(
        ..., min_length=1, max_length=100,
        examples=["Tomato"],
        description="Name of the crop.",
    )
    quantity_kg: float = Field(
        ..., gt=0,
        description="Total batch size in kilograms.",
    )
    days_until_spoilage: int = Field(
        ..., ge=0,
        description="Estimated days before the batch becomes unsaleable.",
    )
    current_listed_price_per_kg: float = Field(
        ..., gt=0,
        description="Current listing price in ₹/kg.",
    )
    farmer_cost_price_per_kg: float = Field(
        ..., ge=0,
        description="Farmer's input cost in ₹/kg (floor for pricing decisions).",
    )
    local_mandi_average_price_per_kg: float = Field(
        ..., gt=0,
        description="Prevailing local market average price ₹/kg (ceiling).",
    )
    recent_sell_through_rate: float = Field(
        ..., ge=0, le=100,
        description="% of stock typically sold per day at current price.",
    )
    buyer_interest_signal: Literal["low", "medium", "high"] = Field(
        ...,
        description="Demand signal from the platform: 'low', 'medium', or 'high'.",
    )
    batch_id: Optional[str] = Field(
        default=None,
        description="Optional identifier for this batch/listing (auto-generated if omitted).",
    )
    decision_input: Optional[DecisionInputSchema] = Field(
        default=None,
        description=(
            "Farmer's response to Stage 1. Omit for Stage 1 (question). "
            "Include for Stage 2 (apply decision)."
        ),
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health():
    """Health-check endpoint."""
    return {
        "service": "Spoilage-Aware Dynamic Pricing Advisor",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs",
        "port":    8003,
    }


@app.post(
    "/api/v1/price-advisor",
    summary="Spoilage-Aware Pricing Advice (Two-Stage Consent Flow)",
    tags=["Pricing Advisor"],
    response_model=None,           # dynamic shape depends on stage
)
def price_advisor_endpoint(payload: PriceAdvisorRequest) -> Dict[str, Any]:
    """
    Two-stage consent flow for spoilage-aware dynamic pricing.

    ---

    ### Stage 1 — Omit `decision_input`

    Returns `stage = "awaiting_farmer_decision"` with:
    - Plain-language batch summary and spoilage risk
    - Tiered suggested pricing ladder (convex ramp: small early, steep near spoilage)
    - A 4-option question to present to the farmer

    ### Stage 2 — Include `decision_input`

    Returns `stage = "decision_applied"` based on farmer_choice:
    - **`a`** — Accept suggested plan → return confirmed pricing ladder
    - **`b`** — Custom discount → recompute ladder around farmer constraint
    - **`c`** — Keep current price → no change; restate spoilage risk
    - **`d`** — Withdraw batch → mark withdrawn, no ladder generated

    ---

    ### Pricing Rules
    - Prices never exceed `local_mandi_average_price_per_kg`
    - Prices never drop below `farmer_cost_price_per_kg` mid-ladder
    - Below-cost pricing is only suggested on the **last day** to avoid
      total loss — flagged explicitly as a `floor_breach`
    - If `buyer_interest_signal` is `high`, early discounts are kept minimal
    - No price change is applied without explicit farmer consent
    """
    try:
        batch = BatchInput(
            crop_name=payload.crop_name,
            quantity_kg=payload.quantity_kg,
            days_until_spoilage=payload.days_until_spoilage,
            current_listed_price_per_kg=payload.current_listed_price_per_kg,
            farmer_cost_price_per_kg=payload.farmer_cost_price_per_kg,
            local_mandi_average_price_per_kg=payload.local_mandi_average_price_per_kg,
            recent_sell_through_rate=payload.recent_sell_through_rate,
            buyer_interest_signal=payload.buyer_interest_signal,
            batch_id=payload.batch_id,
        )

        decision: Optional[DecisionInput] = None
        if payload.decision_input is not None:
            di = payload.decision_input
            decision = DecisionInput(
                farmer_choice=di.farmer_choice,
                custom_discount_pct=di.custom_discount_pct,
                custom_target_price_per_kg=di.custom_target_price_per_kg,
            )

        result = build_pricing_advice(batch, decision)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return result
