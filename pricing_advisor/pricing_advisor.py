"""
pricing_advisor.py
==================
Standalone, plug-and-play Spoilage-Aware Dynamic Pricing Advisor for
agricultural farmer-to-buyer marketplaces.

This module is COMPLETELY ISOLATED from any existing system.  It has zero
imports from the host application and can be dropped into any Python project
or called via the companion REST API (api.py).

Core Behaviour
--------------
Operates in a strict two-stage consent flow:

  Stage 1 (decision_input is None)
    → Analyses the batch, builds a tiered discount ladder, presents a plain-
      language summary and a 4-option question for the farmer.
    → Returns stage="awaiting_farmer_decision".

  Stage 2 (decision_input provided)
    → Branches on farmer_choice  a / b / c / d:
        a) Accept the suggested ladder  → return it as final
        b) Custom discount/price        → recompute ladder around constraint
        c) Keep current price           → no change, restate spoilage risk
        d) Withdraw from market         → mark withdrawn, no ladder
    → Returns stage="decision_applied".

A price change is NEVER applied automatically.  The farmer always decides.

Pricing Ladder Algorithm
------------------------
1.  Effective start price = min(current_listed_price, local_mandi_average)
2.  Urgency tier  = f(days_until_spoilage)
3.  Discount range (base → max) = f(urgency × buyer_interest_signal)
4.  Per-day prices use a convex ramp (small early, steeper later)
5.  Floor breach check: never go below farmer_cost_price_per_kg unless the
    last day and stock would otherwise be 100 % lost.
6.  Expected quantity moved per day is estimated from sell_through_rate,
    buyer_interest_signal, and the price relative to mandi average.

Usage (as a library)
---------------------
    from pricing_advisor import build_pricing_advice, DecisionInput, BatchInput

    batch = BatchInput(
        crop_name="Tomato",
        quantity_kg=500,
        days_until_spoilage=3,
        current_listed_price_per_kg=25.0,
        farmer_cost_price_per_kg=14.0,
        local_mandi_average_price_per_kg=22.0,
        recent_sell_through_rate=40.0,
        buyer_interest_signal="low",
    )

    # Stage 1 — show the farmer the situation
    result = build_pricing_advice(batch, decision_input=None)
    print(result["stage"])        # "awaiting_farmer_decision"

    # Stage 2 — farmer chose option (a)
    decision = DecisionInput(farmer_choice="a")
    result2 = build_pricing_advice(batch, decision_input=decision)
    print(result2["stage"])       # "decision_applied"
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional


# ---------------------------------------------------------------------------
# CONSTANTS — urgency × interest → (base_discount_pct, max_discount_pct)
# ---------------------------------------------------------------------------
# Rows: urgency tier (CRITICAL / HIGH / MEDIUM / LOW)
# Cols: buyer_interest_signal (low / medium / high)
_DISCOUNT_TABLE: Dict[str, Dict[str, tuple[float, float]]] = {
    "critical": {   # 1-2 days left
        "low":    (22.0, 48.0),
        "medium": (16.0, 40.0),
        "high":   (10.0, 32.0),
    },
    "high": {       # 3-5 days left
        "low":    (12.0, 30.0),
        "medium": ( 8.0, 24.0),
        "high":   ( 4.0, 18.0),
    },
    "medium": {     # 6-10 days left
        "low":    ( 6.0, 20.0),
        "medium": ( 4.0, 14.0),
        "high":   ( 2.0,  9.0),
    },
    "low": {        # 11+ days left
        "low":    ( 2.0, 10.0),
        "medium": ( 1.0,  6.0),
        "high":   ( 0.0,  3.0),
    },
}

# Quantity-moved multiplier per (buyer_interest, discount_applied_pct)
# Higher discount → more volume moves; higher interest → more volume at same price
_INTEREST_MULTIPLIER: Dict[str, float] = {
    "low":    0.60,
    "medium": 1.00,
    "high":   1.45,
}


# ---------------------------------------------------------------------------
# INPUT DATA CLASSES
# ---------------------------------------------------------------------------
@dataclass
class BatchInput:
    """
    Describes a single batch of produce being assessed for spoilage pricing.

    Attributes
    ----------
    crop_name                       : Name of the crop (e.g. "Tomato").
    quantity_kg                     : Total batch size in kilograms.
    days_until_spoilage             : Estimated days before the batch is unsaleable.
    current_listed_price_per_kg     : Price the farmer currently lists (₹/kg).
    farmer_cost_price_per_kg        : Farmer's input cost (₹/kg) — floor reference.
    local_mandi_average_price_per_kg: Prevailing local mandi price (₹/kg) — ceiling.
    recent_sell_through_rate        : % of stock typically sold per day at current price.
    buyer_interest_signal           : Demand signal — "low", "medium", or "high".
    batch_id                        : Optional identifier for the batch/listing.
    """
    crop_name:                        str
    quantity_kg:                      float
    days_until_spoilage:              int
    current_listed_price_per_kg:      float
    farmer_cost_price_per_kg:         float
    local_mandi_average_price_per_kg: float
    recent_sell_through_rate:         float    # 0–100 %
    buyer_interest_signal:            str      # "low" | "medium" | "high"
    batch_id:                         Optional[str] = None

    def __post_init__(self) -> None:
        self.crop_name = self.crop_name.strip()
        self.buyer_interest_signal = self.buyer_interest_signal.strip().lower()
        if self.buyer_interest_signal not in {"low", "medium", "high"}:
            raise ValueError(
                "buyer_interest_signal must be 'low', 'medium', or 'high'. "
                f"Got: '{self.buyer_interest_signal}'"
            )
        if self.quantity_kg <= 0:
            raise ValueError("quantity_kg must be positive.")
        if self.days_until_spoilage < 0:
            raise ValueError("days_until_spoilage cannot be negative.")
        if self.farmer_cost_price_per_kg < 0:
            raise ValueError("farmer_cost_price_per_kg cannot be negative.")
        if self.current_listed_price_per_kg <= 0:
            raise ValueError("current_listed_price_per_kg must be positive.")
        if not (0.0 <= self.recent_sell_through_rate <= 100.0):
            raise ValueError("recent_sell_through_rate must be between 0 and 100.")
        if self.batch_id is None:
            self.batch_id = str(uuid.uuid4())


@dataclass
class DecisionInput:
    """
    Captures the farmer's response to the pricing question (Stage 2 input).

    Attributes
    ----------
    farmer_choice               : One of "a" / "b" / "c" / "d".
    custom_discount_pct         : Used when farmer_choice == "b"; farmer's
                                  desired % discount off current listed price.
    custom_target_price_per_kg  : Alternative to custom_discount_pct; farmer
                                  sets an absolute target price.
    """
    farmer_choice:              Literal["a", "b", "c", "d"]
    custom_discount_pct:        Optional[float] = None
    custom_target_price_per_kg: Optional[float] = None

    def __post_init__(self) -> None:
        if self.farmer_choice not in {"a", "b", "c", "d"}:
            raise ValueError("farmer_choice must be one of: a, b, c, d.")
        if self.farmer_choice == "b":
            if self.custom_discount_pct is None and self.custom_target_price_per_kg is None:
                raise ValueError(
                    "For farmer_choice 'b', provide either custom_discount_pct "
                    "or custom_target_price_per_kg."
                )
        if self.custom_discount_pct is not None and not (0.0 < self.custom_discount_pct <= 100.0):
            raise ValueError("custom_discount_pct must be between 0 (exclusive) and 100.")
        if self.custom_target_price_per_kg is not None and self.custom_target_price_per_kg < 0:
            raise ValueError("custom_target_price_per_kg cannot be negative.")


# ---------------------------------------------------------------------------
# INTERNAL HELPERS
# ---------------------------------------------------------------------------
def _urgency_tier(days: int) -> str:
    """Map days_until_spoilage to an urgency label."""
    if days <= 2:
        return "critical"
    if days <= 5:
        return "high"
    if days <= 10:
        return "medium"
    return "low"


def _urgency_label_human(days: int) -> str:
    """Human-readable urgency description for farmer messages."""
    tier = _urgency_tier(days)
    return {
        "critical": "⚠️  URGENT",
        "high":     "🔴 High priority",
        "medium":   "🟡 Moderate priority",
        "low":      "🟢 Low urgency",
    }[tier]


def _convex_discount(day: int, total_days: int, base_pct: float, max_pct: float) -> float:
    """
    Return the discount % for a given day using a convex (accelerating) ramp.

    On day 1 the discount equals base_pct.
    On the last day it approaches max_pct.
    The ramp is quadratic (convex) so discounts stay small early and
    steepen as spoilage nears — matching STEP 2 of the reasoning spec.

    Parameters
    ----------
    day        : Current day (1-indexed).
    total_days : Total days in the ladder.
    base_pct   : Discount % on day 1.
    max_pct    : Discount % on the last day.

    Returns
    -------
    float
        Discount percentage (capped between base_pct and max_pct).
    """
    if total_days == 1:
        return max_pct
    # t in [0, 1]: 0 = day 1, 1 = last day
    t = (day - 1) / (total_days - 1)
    # Convex (quadratic) interpolation
    discount = base_pct + (max_pct - base_pct) * (t ** 2)
    return round(min(max(discount, base_pct), max_pct), 2)


def _estimate_qty_moved(
    base_daily_qty: float,
    discount_pct: float,
    buyer_interest: str,
    current_sell_through: float,
    remaining_qty: float,
) -> float:
    """
    Estimate kilograms likely to sell on a given day at a given price.

    Uses recent_sell_through_rate as the anchor, then applies a demand
    elasticity heuristic based on the discount offered.

    Parameters
    ----------
    base_daily_qty      : Quantity expected to move per day at zero discount.
    discount_pct        : Discount applied on this day (0–100).
    buyer_interest      : "low" / "medium" / "high".
    current_sell_through: Baseline sell-through rate (%) at current price.
    remaining_qty       : Remaining unsold stock — cap output to this.

    Returns
    -------
    float
        Estimated quantity (kg) that will move on this day.
    """
    # Elasticity: each 5 % discount boosts sales ~10 % of current rate
    elasticity_boost = 1.0 + (discount_pct / 5.0) * 0.10
    interest_mult = _INTEREST_MULTIPLIER[buyer_interest]
    qty = base_daily_qty * elasticity_boost * interest_mult
    return round(min(qty, remaining_qty), 2)


def _build_ladder(
    batch: BatchInput,
    effective_start_price: float,
    base_discount_pct: float,
    max_discount_pct: float,
) -> tuple[list[dict], list[dict]]:
    """
    Construct the tiered pricing ladder and detect floor breaches.

    Parameters
    ----------
    batch                : Full batch input.
    effective_start_price: Starting price (already capped at mandi average).
    base_discount_pct    : Discount % on day 1.
    max_discount_pct     : Discount % on the last day.

    Returns
    -------
    (ladder, floor_breaches)
        ladder         : List of day-by-day price + expected_qty dicts.
        floor_breaches : List of breach dicts (may be empty).
    """
    N = batch.days_until_spoilage
    if N == 0:
        # Nothing to sell — immediate floor
        return [], []

    # Base daily quantity at normal sell-through
    base_daily_qty = (batch.quantity_kg * (batch.recent_sell_through_rate / 100.0))
    base_daily_qty = max(base_daily_qty, 1.0)  # at least 1 kg/day minimum

    ladder: list[dict] = []
    floor_breaches: list[dict] = []
    remaining_qty = batch.quantity_kg

    for day in range(1, N + 1):
        if remaining_qty <= 0:
            break

        discount_pct = _convex_discount(day, N, base_discount_pct, max_discount_pct)
        raw_price = effective_start_price * (1.0 - discount_pct / 100.0)

        # Floor breach detection
        is_last_day = day == N
        below_cost = raw_price < batch.farmer_cost_price_per_kg

        if below_cost:
            if is_last_day:
                # Floor breach allowed: total loss is the alternative
                floor_breaches.append({
                    "day": day,
                    "computed_price": round(raw_price, 2),
                    "cost_price": batch.farmer_cost_price_per_kg,
                    "reason": (
                        f"Day {day} is the final day before spoilage. "
                        f"Selling at ₹{raw_price:.2f}/kg recovers more than "
                        f"total loss of ₹{batch.farmer_cost_price_per_kg * remaining_qty:.2f} "
                        f"({remaining_qty:.1f} kg unsold)."
                    ),
                })
            else:
                # Clamp to cost price — never go below cost mid-ladder
                raw_price = batch.farmer_cost_price_per_kg

        price = round(raw_price, 2)
        qty_moved = _estimate_qty_moved(
            base_daily_qty, discount_pct,
            batch.buyer_interest_signal,
            batch.recent_sell_through_rate,
            remaining_qty,
        )
        remaining_qty = max(0.0, round(remaining_qty - qty_moved, 2))

        ladder.append({
            "day": day,
            "price_per_kg": price,
            "discount_pct": round(discount_pct, 2),
            "expected_qty_moved_kg": qty_moved,
            "remaining_qty_kg": remaining_qty,
        })

    return ladder, floor_breaches


def _ladder_floor_breach_summary(floor_breaches: list[dict]) -> dict:
    """Convert raw breach list to the final output floor_breach object."""
    if not floor_breaches:
        return {"occurs": False, "day": None, "reason": None}
    first = floor_breaches[0]
    return {
        "occurs": True,
        "day": first["day"],
        "reason": first["reason"],
    }


def _estimate_spoilage_waste(batch: BatchInput) -> str:
    """Estimate expected waste if nothing is done, in plain language."""
    daily_sold = batch.quantity_kg * (batch.recent_sell_through_rate / 100.0)
    demand_mult = _INTEREST_MULTIPLIER[batch.buyer_interest_signal]
    total_sellable = min(daily_sold * demand_mult * batch.days_until_spoilage,
                         batch.quantity_kg)
    expected_waste = max(0.0, batch.quantity_kg - total_sellable)
    waste_pct = round(expected_waste / batch.quantity_kg * 100.0, 1)
    loss_value = round(expected_waste * batch.farmer_cost_price_per_kg, 2)
    return (
        f"At the current price of ₹{batch.current_listed_price_per_kg}/kg with "
        f"{batch.buyer_interest_signal} buyer interest and a {batch.recent_sell_through_rate}% "
        f"daily sell-through rate, an estimated {expected_waste:.1f} kg ({waste_pct}%) "
        f"of the {batch.quantity_kg} kg batch may spoil — a potential input-cost loss of "
        f"₹{loss_value:.2f}."
    )


def _build_batch_summary(batch: BatchInput) -> str:
    """One-line batch summary for the farmer-facing output."""
    return (
        f"{batch.crop_name} | {batch.quantity_kg} kg | "
        f"{batch.days_until_spoilage} day(s) until spoilage | "
        f"Listed: ₹{batch.current_listed_price_per_kg}/kg"
    )


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------
def build_pricing_advice(
    batch: BatchInput,
    decision_input: Optional[DecisionInput] = None,
) -> Dict[str, Any]:
    """
    Main entry point for the Spoilage-Aware Dynamic Pricing Advisor.

    Parameters
    ----------
    batch          : Full description of the produce batch.
    decision_input : Farmer's response (Stage 2).  If None, returns Stage 1
                     (awaiting_farmer_decision) — the question to present.

    Returns
    -------
    dict
        Valid JSON-serialisable dict in one of two shapes:
        - ``stage == "awaiting_farmer_decision"``  (decision_input is None)
        - ``stage == "decision_applied"``          (decision_input provided)

    Raises
    ------
    ValueError
        If batch or decision_input contain invalid values.
    """
    # ── Shared computations ───────────────────────────────────────────────
    urgency  = _urgency_tier(batch.days_until_spoilage)
    interest = batch.buyer_interest_signal
    effective_start = min(
        batch.current_listed_price_per_kg,
        batch.local_mandi_average_price_per_kg,
    )
    base_disc, max_disc = _DISCOUNT_TABLE[urgency][interest]
    suggested_ladder, suggested_breaches = _build_ladder(
        batch, effective_start, base_disc, max_disc
    )
    spoilage_risk = _estimate_spoilage_waste(batch)

    # ── Stage 1: question ─────────────────────────────────────────────────
    if decision_input is None:
        return {
            "stage": "awaiting_farmer_decision",
            "batch_id": batch.batch_id,
            "batch_summary": _build_batch_summary(batch),
            "urgency_level": _urgency_label_human(batch.days_until_spoilage),
            "risk_if_no_action": spoilage_risk,
            "suggested_pricing_ladder": suggested_ladder,
            "question_to_farmer": (
                "Do you want to reduce the price to help sell this "
                "stock before it spoils?"
            ),
            "options": [
                {"id": "a", "label": "Yes, use the suggested plan"},
                {"id": "b", "label": "Yes, but let me set my own discount"},
                {"id": "c", "label": "No, keep current price"},
                {"id": "d", "label": "No, don't sell this batch (withdraw)"},
            ],
        }

    # ── Stage 2: decision applied ─────────────────────────────────────────
    choice = decision_input.farmer_choice

    # ── Choice (d): Withdraw ──────────────────────────────────────────────
    if choice == "d":
        return {
            "stage": "decision_applied",
            "farmer_choice": "d",
            "withdrawn_from_market": True,
            "final_pricing_ladder": None,
            "floor_breach": {"occurs": False, "day": None, "reason": None},
            "farmer_message": (
                f"Understood. Your {batch.crop_name} batch ({batch.quantity_kg} kg) "
                f"has been withdrawn from the market. No price changes will be made. "
                f"You can re-list the batch at any time from your dashboard."
            ),
        }

    # ── Choice (c): Keep current price ───────────────────────────────────
    if choice == "c":
        return {
            "stage": "decision_applied",
            "farmer_choice": "c",
            "withdrawn_from_market": False,
            "final_pricing_ladder": None,
            "floor_breach": {"occurs": False, "day": None, "reason": None},
            "farmer_message": (
                f"Noted. Your {batch.crop_name} batch will remain listed at "
                f"₹{batch.current_listed_price_per_kg}/kg. "
                f"Please be aware: {spoilage_risk} "
                f"You can revisit this decision at any time from your dashboard."
            ),
        }

    # ── Choice (a): Accept suggested ladder ──────────────────────────────
    if choice == "a":
        breach = _ladder_floor_breach_summary(suggested_breaches)
        total_revenue = sum(
            row["price_per_kg"] * row["expected_qty_moved_kg"]
            for row in suggested_ladder
        )
        return {
            "stage": "decision_applied",
            "farmer_choice": "a",
            "withdrawn_from_market": False,
            "final_pricing_ladder": suggested_ladder,
            "floor_breach": breach,
            "estimated_total_revenue": round(total_revenue, 2),
            "farmer_message": (
                f"Great! The suggested pricing plan for your {batch.crop_name} batch "
                f"({batch.quantity_kg} kg) has been accepted and will be applied "
                f"progressively over the next {batch.days_until_spoilage} day(s). "
                f"Estimated recovery: ₹{total_revenue:.2f}."
                + (
                    f" ⚠️  Note: On day {breach['day']}, the price falls below your "
                    f"input cost — this is recommended only to prevent total loss."
                    if breach["occurs"] else ""
                )
            ),
        }

    # ── Choice (b): Custom discount / target price ────────────────────────
    # Determine the custom start price
    if decision_input.custom_target_price_per_kg is not None:
        custom_start = min(
            decision_input.custom_target_price_per_kg,
            batch.local_mandi_average_price_per_kg,
        )
        custom_max_disc = round(
            (1.0 - custom_start / effective_start) * 100.0, 2
        ) if effective_start > 0 else 0.0
    else:
        # custom_discount_pct provided
        pct = decision_input.custom_discount_pct or 0.0
        custom_start = effective_start * (1.0 - pct / 100.0)
        custom_max_disc = pct

    # Recompute base discount (half of the max, min floor = 0)
    custom_base_disc = max(0.0, custom_max_disc / 2.0)

    custom_ladder, custom_breaches = _build_ladder(
        batch, effective_start, custom_base_disc, custom_max_disc
    )
    breach = _ladder_floor_breach_summary(custom_breaches)
    total_revenue = sum(
        row["price_per_kg"] * row["expected_qty_moved_kg"]
        for row in custom_ladder
    )

    return {
        "stage": "decision_applied",
        "farmer_choice": "b",
        "withdrawn_from_market": False,
        "final_pricing_ladder": custom_ladder,
        "floor_breach": breach,
        "estimated_total_revenue": round(total_revenue, 2),
        "farmer_message": (
            f"Your custom pricing plan for {batch.crop_name} ({batch.quantity_kg} kg) "
            f"has been set and will be applied over the next "
            f"{batch.days_until_spoilage} day(s). "
            f"Starting price: ₹{round(custom_start, 2)}/kg. "
            f"Estimated recovery: ₹{total_revenue:.2f}."
            + (
                f" ⚠️  Note: On day {breach['day']}, the price falls below your "
                f"input cost — this is recommended only to prevent total loss."
                if breach["occurs"] else ""
            )
        ),
    }
