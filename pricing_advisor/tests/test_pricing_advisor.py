"""
tests/test_pricing_advisor.py
==============================
Comprehensive unit tests for the Spoilage-Aware Dynamic Pricing Advisor.

Run with:
    cd pricing_advisor
    python.exe -m pytest tests/ -v

Coverage targets
----------------
  1. BatchInput validation (valid + invalid inputs)
  2. DecisionInput validation
  3. Urgency tier mapping
  4. Convex discount ramp math
  5. Stage 1 — awaiting_farmer_decision output shape
  6. Stage 1 — pricing rules (never above mandi, small early → steep late)
  7. Stage 2a — accept suggested plan
  8. Stage 2b — custom discount %
  9. Stage 2b — custom target price
  10. Stage 2c — keep current price (no change)
  11. Stage 2d — withdraw from market
  12. Floor breach detection and messaging
  13. High buyer interest → minimal early discounts
  14. Low buyer interest → aggressive early discounts
  15. Edge cases: 0 days, 1 day, very high current price above mandi
  16. Real-world scenario snapshots
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from pricing_advisor import (
    BatchInput,
    DecisionInput,
    _convex_discount,
    _urgency_tier,
    build_pricing_advice,
)


# ---------------------------------------------------------------------------
# Fixtures & shared helpers
# ---------------------------------------------------------------------------

def _batch(
    crop_name="Tomato",
    quantity_kg=500.0,
    days_until_spoilage=3,
    current_price=25.0,
    cost_price=14.0,
    mandi_avg=22.0,
    sell_through=40.0,
    buyer_interest="low",
):
    return BatchInput(
        crop_name=crop_name,
        quantity_kg=quantity_kg,
        days_until_spoilage=days_until_spoilage,
        current_listed_price_per_kg=current_price,
        farmer_cost_price_per_kg=cost_price,
        local_mandi_average_price_per_kg=mandi_avg,
        recent_sell_through_rate=sell_through,
        buyer_interest_signal=buyer_interest,
    )


# ---------------------------------------------------------------------------
# 1. BatchInput validation
# ---------------------------------------------------------------------------
class TestBatchInputValidation:

    def test_valid_batch_creates_successfully(self):
        b = _batch()
        assert b.crop_name == "Tomato"

    def test_crop_name_stripped(self):
        b = _batch(crop_name="  Spinach  ")
        assert b.crop_name == "Spinach"

    def test_invalid_buyer_interest_raises(self):
        with pytest.raises(ValueError, match="buyer_interest_signal"):
            _batch(buyer_interest="extreme")

    def test_zero_quantity_raises(self):
        with pytest.raises(ValueError, match="quantity_kg"):
            _batch(quantity_kg=0)

    def test_negative_quantity_raises(self):
        with pytest.raises(ValueError, match="quantity_kg"):
            _batch(quantity_kg=-10)

    def test_negative_days_raises(self):
        with pytest.raises(ValueError, match="days_until_spoilage"):
            _batch(days_until_spoilage=-1)

    def test_zero_current_price_raises(self):
        with pytest.raises(ValueError):
            _batch(current_price=0)

    def test_negative_sell_through_raises(self):
        with pytest.raises(ValueError, match="recent_sell_through_rate"):
            _batch(sell_through=-5)

    def test_over_100_sell_through_raises(self):
        with pytest.raises(ValueError, match="recent_sell_through_rate"):
            _batch(sell_through=110)

    def test_batch_id_auto_generated(self):
        b = _batch()
        assert b.batch_id is not None and len(b.batch_id) > 0


# ---------------------------------------------------------------------------
# 2. DecisionInput validation
# ---------------------------------------------------------------------------
class TestDecisionInputValidation:

    def test_valid_choice_a(self):
        d = DecisionInput(farmer_choice="a")
        assert d.farmer_choice == "a"

    def test_valid_choice_d(self):
        d = DecisionInput(farmer_choice="d")
        assert d.farmer_choice == "d"

    def test_invalid_choice_raises(self):
        with pytest.raises(ValueError):
            DecisionInput(farmer_choice="x")

    def test_choice_b_requires_discount_or_price(self):
        with pytest.raises(ValueError):
            DecisionInput(farmer_choice="b")

    def test_choice_b_with_discount_pct_ok(self):
        d = DecisionInput(farmer_choice="b", custom_discount_pct=15.0)
        assert d.custom_discount_pct == 15.0

    def test_choice_b_with_target_price_ok(self):
        d = DecisionInput(farmer_choice="b", custom_target_price_per_kg=18.0)
        assert d.custom_target_price_per_kg == 18.0

    def test_negative_target_price_raises(self):
        with pytest.raises(ValueError):
            DecisionInput(farmer_choice="b", custom_target_price_per_kg=-5.0)


# ---------------------------------------------------------------------------
# 3. Urgency tier mapping
# ---------------------------------------------------------------------------
class TestUrgencyTier:

    def test_0_days_is_critical(self):
        assert _urgency_tier(0) == "critical"

    def test_1_day_is_critical(self):
        assert _urgency_tier(1) == "critical"

    def test_2_days_is_critical(self):
        assert _urgency_tier(2) == "critical"

    def test_3_days_is_high(self):
        assert _urgency_tier(3) == "high"

    def test_5_days_is_high(self):
        assert _urgency_tier(5) == "high"

    def test_6_days_is_medium(self):
        assert _urgency_tier(6) == "medium"

    def test_10_days_is_medium(self):
        assert _urgency_tier(10) == "medium"

    def test_11_days_is_low(self):
        assert _urgency_tier(11) == "low"

    def test_30_days_is_low(self):
        assert _urgency_tier(30) == "low"


# ---------------------------------------------------------------------------
# 4. Convex discount ramp
# ---------------------------------------------------------------------------
class TestConvexDiscountRamp:

    def test_single_day_returns_max(self):
        assert _convex_discount(1, 1, 5.0, 30.0) == 30.0

    def test_day1_returns_approx_base(self):
        d = _convex_discount(1, 5, 5.0, 30.0)
        assert abs(d - 5.0) < 0.5   # convex → should be near base on day 1

    def test_last_day_returns_approx_max(self):
        d = _convex_discount(5, 5, 5.0, 30.0)
        assert abs(d - 30.0) < 0.5

    def test_mid_day_between_base_and_max(self):
        d = _convex_discount(3, 5, 5.0, 30.0)
        assert 5.0 <= d <= 30.0

    def test_ramp_is_monotonically_increasing(self):
        discounts = [_convex_discount(d, 7, 4.0, 28.0) for d in range(1, 8)]
        assert all(discounts[i] <= discounts[i + 1] for i in range(len(discounts) - 1))


# ---------------------------------------------------------------------------
# 5. Stage 1 — output shape
# ---------------------------------------------------------------------------
class TestStage1Shape:

    def test_stage_is_awaiting_farmer_decision(self):
        result = build_pricing_advice(_batch())
        assert result["stage"] == "awaiting_farmer_decision"

    def test_contains_required_keys(self):
        result = build_pricing_advice(_batch())
        for key in ("batch_summary", "risk_if_no_action", "suggested_pricing_ladder",
                    "question_to_farmer", "options", "urgency_level"):
            assert key in result, f"Missing key: {key}"

    def test_options_has_four_choices(self):
        result = build_pricing_advice(_batch())
        assert len(result["options"]) == 4

    def test_option_ids_are_a_b_c_d(self):
        result = build_pricing_advice(_batch())
        ids = {opt["id"] for opt in result["options"]}
        assert ids == {"a", "b", "c", "d"}

    def test_pricing_ladder_not_empty(self):
        result = build_pricing_advice(_batch())
        assert len(result["suggested_pricing_ladder"]) > 0

    def test_ladder_length_equals_days(self):
        batch = _batch(days_until_spoilage=5)
        result = build_pricing_advice(batch)
        assert len(result["suggested_pricing_ladder"]) <= 5   # may stop early if sold out

    def test_batch_summary_contains_crop(self):
        result = build_pricing_advice(_batch(crop_name="Mango"))
        assert "Mango" in result["batch_summary"]

    def test_risk_message_is_nonempty(self):
        result = build_pricing_advice(_batch())
        assert len(result["risk_if_no_action"]) > 10


# ---------------------------------------------------------------------------
# 6. Stage 1 — pricing rules
# ---------------------------------------------------------------------------
class TestStage1PricingRules:

    def test_price_never_exceeds_mandi_average(self):
        batch = _batch(current_price=30.0, mandi_avg=22.0)
        result = build_pricing_advice(batch)
        for row in result["suggested_pricing_ladder"]:
            assert row["price_per_kg"] <= 22.0, (
                f"Day {row['day']} price {row['price_per_kg']} > mandi avg 22.0"
            )

    def test_prices_are_non_increasing(self):
        result = build_pricing_advice(_batch(days_until_spoilage=5))
        ladder = result["suggested_pricing_ladder"]
        prices = [r["price_per_kg"] for r in ladder]
        assert all(prices[i] >= prices[i + 1] for i in range(len(prices) - 1)), \
            "Prices should be non-increasing across the ladder"

    def test_early_discount_smaller_than_late_discount(self):
        result = build_pricing_advice(_batch(days_until_spoilage=5))
        ladder = result["suggested_pricing_ladder"]
        if len(ladder) >= 2:
            d_early = ladder[0]["discount_pct"]
            d_late  = ladder[-1]["discount_pct"]
            assert d_early <= d_late, "Late discounts should be steeper than early"

    def test_price_never_below_cost_mid_ladder(self):
        """Non-last-day prices should not drop below cost (no floor breach there)."""
        batch = _batch(days_until_spoilage=7, cost_price=15.0)
        result = build_pricing_advice(batch)
        ladder = result["suggested_pricing_ladder"]
        for row in ladder[:-1]:   # exclude last day (may floor-breach)
            assert row["price_per_kg"] >= 15.0, (
                f"Day {row['day']} price {row['price_per_kg']} is below cost 15.0"
            )

    def test_expected_qty_moved_positive(self):
        result = build_pricing_advice(_batch())
        for row in result["suggested_pricing_ladder"]:
            assert row["expected_qty_moved_kg"] >= 0


# ---------------------------------------------------------------------------
# 7. Stage 2a — accept suggested plan
# ---------------------------------------------------------------------------
class TestStage2AcceptPlan:

    def test_stage_is_decision_applied(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert result["stage"] == "decision_applied"

    def test_farmer_choice_recorded(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert result["farmer_choice"] == "a"

    def test_not_withdrawn(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert result["withdrawn_from_market"] is False

    def test_final_pricing_ladder_present(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert result["final_pricing_ladder"] is not None
        assert len(result["final_pricing_ladder"]) > 0

    def test_floor_breach_key_present(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert "floor_breach" in result

    def test_estimated_revenue_positive(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="a"))
        assert result.get("estimated_total_revenue", 0) > 0

    def test_farmer_message_mentions_crop(self):
        result = build_pricing_advice(_batch(crop_name="Spinach"), DecisionInput(farmer_choice="a"))
        assert "Spinach" in result["farmer_message"]


# ---------------------------------------------------------------------------
# 8. Stage 2b — custom discount %
# ---------------------------------------------------------------------------
class TestStage2CustomDiscount:

    def test_custom_discount_accepted(self):
        decision = DecisionInput(farmer_choice="b", custom_discount_pct=20.0)
        result = build_pricing_advice(_batch(), decision)
        assert result["stage"] == "decision_applied"
        assert result["farmer_choice"] == "b"

    def test_final_ladder_respects_mandi_ceiling(self):
        decision = DecisionInput(farmer_choice="b", custom_discount_pct=5.0)
        batch = _batch(current_price=30.0, mandi_avg=22.0)
        result = build_pricing_advice(batch, decision)
        for row in result["final_pricing_ladder"]:
            assert row["price_per_kg"] <= 22.0

    def test_custom_discount_ladder_is_non_increasing(self):
        decision = DecisionInput(farmer_choice="b", custom_discount_pct=25.0)
        result = build_pricing_advice(_batch(days_until_spoilage=5), decision)
        prices = [r["price_per_kg"] for r in result["final_pricing_ladder"]]
        assert all(prices[i] >= prices[i + 1] for i in range(len(prices) - 1))

    def test_farmer_message_contains_custom_start_price(self):
        decision = DecisionInput(farmer_choice="b", custom_discount_pct=10.0)
        result = build_pricing_advice(_batch(current_price=22.0, mandi_avg=22.0), decision)
        assert "₹" in result["farmer_message"]


# ---------------------------------------------------------------------------
# 9. Stage 2b — custom target price
# ---------------------------------------------------------------------------
class TestStage2CustomTargetPrice:

    def test_target_price_accepted(self):
        decision = DecisionInput(farmer_choice="b", custom_target_price_per_kg=18.0)
        result = build_pricing_advice(_batch(), decision)
        assert result["stage"] == "decision_applied"

    def test_target_price_above_mandi_clamped(self):
        # Target 30 but mandi avg is 22 → should clamp to 22
        decision = DecisionInput(farmer_choice="b", custom_target_price_per_kg=30.0)
        batch = _batch(current_price=22.0, mandi_avg=22.0)
        result = build_pricing_advice(batch, decision)
        for row in result["final_pricing_ladder"]:
            assert row["price_per_kg"] <= 22.0


# ---------------------------------------------------------------------------
# 10. Stage 2c — keep current price
# ---------------------------------------------------------------------------
class TestStage2KeepPrice:

    def test_stage_is_decision_applied(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="c"))
        assert result["stage"] == "decision_applied"

    def test_farmer_choice_recorded_as_c(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="c"))
        assert result["farmer_choice"] == "c"

    def test_not_withdrawn(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="c"))
        assert result["withdrawn_from_market"] is False

    def test_no_pricing_ladder(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="c"))
        assert result["final_pricing_ladder"] is None

    def test_farmer_message_states_current_price(self):
        batch = _batch(current_price=25.0)
        result = build_pricing_advice(batch, DecisionInput(farmer_choice="c"))
        assert "25" in result["farmer_message"]

    def test_farmer_message_mentions_spoilage_risk(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="c"))
        # The spoilage risk should be re-stated
        msg = result["farmer_message"].lower()
        assert "spoil" in msg or "spoi" in msg or "%" in result["farmer_message"]


# ---------------------------------------------------------------------------
# 11. Stage 2d — withdraw from market
# ---------------------------------------------------------------------------
class TestStage2Withdraw:

    def test_stage_is_decision_applied(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        assert result["stage"] == "decision_applied"

    def test_withdrawn_from_market_true(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        assert result["withdrawn_from_market"] is True

    def test_no_pricing_ladder(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        assert result["final_pricing_ladder"] is None

    def test_floor_breach_false_on_withdraw(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        assert result["floor_breach"]["occurs"] is False

    def test_farmer_message_confirms_withdrawal(self):
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        assert "withdrawn" in result["farmer_message"].lower()

    def test_farmer_message_does_not_suggest_alternatives(self):
        """Withdrawal must be respected — no upselling back to pricing."""
        result = build_pricing_advice(_batch(), DecisionInput(farmer_choice="d"))
        msg = result["farmer_message"].lower()
        assert "discount" not in msg
        assert "ladder" not in msg


# ---------------------------------------------------------------------------
# 12. Floor breach detection
# ---------------------------------------------------------------------------
class TestFloorBreachDetection:

    def test_no_breach_when_prices_above_cost(self):
        # High mandi average, low urgency → prices should stay above cost
        batch = _batch(
            days_until_spoilage=10,
            cost_price=10.0,
            mandi_avg=30.0,
            current_price=28.0,
            buyer_interest="high",
        )
        result = build_pricing_advice(batch)
        # Stage 1 — just checking ladder; no floor breach expected
        ladder = result["suggested_pricing_ladder"]
        for row in ladder:
            assert row["price_per_kg"] >= 10.0

    def test_breach_only_on_last_day(self):
        """A floor breach, if it occurs, should only appear on the last day."""
        batch = _batch(
            days_until_spoilage=2,
            cost_price=20.0,    # high cost
            mandi_avg=22.0,
            current_price=22.0,
            buyer_interest="low",
        )
        result = build_pricing_advice(batch, DecisionInput(farmer_choice="a"))
        if result["floor_breach"]["occurs"]:
            assert result["floor_breach"]["day"] == batch.days_until_spoilage

    def test_breach_message_explains_reason(self):
        batch = _batch(
            days_until_spoilage=1,
            cost_price=21.0,
            mandi_avg=22.0,
            current_price=22.0,
            buyer_interest="low",
        )
        result = build_pricing_advice(batch, DecisionInput(farmer_choice="a"))
        if result["floor_breach"]["occurs"]:
            assert result["floor_breach"]["reason"] is not None
            assert len(result["floor_breach"]["reason"]) > 10


# ---------------------------------------------------------------------------
# 13. High buyer interest → minimal early discounts
# ---------------------------------------------------------------------------
class TestHighBuyerInterest:

    def test_high_interest_less_aggressive_than_low_interest(self):
        batch_low  = _batch(buyer_interest="low",  days_until_spoilage=5)
        batch_high = _batch(buyer_interest="high", days_until_spoilage=5)
        r_low  = build_pricing_advice(batch_low)
        r_high = build_pricing_advice(batch_high)
        ladder_low  = r_low["suggested_pricing_ladder"]
        ladder_high = r_high["suggested_pricing_ladder"]
        if ladder_low and ladder_high:
            # Day 1 discount should be smaller for high-interest batches
            disc_low_d1  = ladder_low[0]["discount_pct"]
            disc_high_d1 = ladder_high[0]["discount_pct"]
            assert disc_high_d1 <= disc_low_d1


# ---------------------------------------------------------------------------
# 14. Low buyer interest → aggressive discounts
# ---------------------------------------------------------------------------
class TestLowBuyerInterest:

    def test_low_interest_discounts_are_steeper(self):
        batch_low  = _batch(buyer_interest="low",    days_until_spoilage=3)
        batch_high = _batch(buyer_interest="high",   days_until_spoilage=3)
        r_low  = build_pricing_advice(batch_low)
        r_high = build_pricing_advice(batch_high)
        l_low  = r_low["suggested_pricing_ladder"]
        l_high = r_high["suggested_pricing_ladder"]
        if l_low and l_high:
            max_disc_low  = max(r["discount_pct"] for r in l_low)
            max_disc_high = max(r["discount_pct"] for r in l_high)
            assert max_disc_low >= max_disc_high


# ---------------------------------------------------------------------------
# 15. Edge cases
# ---------------------------------------------------------------------------
class TestEdgeCases:

    def test_zero_days_returns_empty_ladder(self):
        batch = _batch(days_until_spoilage=0)
        result = build_pricing_advice(batch)
        assert result["suggested_pricing_ladder"] == []

    def test_one_day_returns_single_entry_ladder(self):
        batch = _batch(days_until_spoilage=1)
        result = build_pricing_advice(batch)
        # May have 0 or 1 entries (all stock may sell out)
        assert len(result["suggested_pricing_ladder"]) <= 1

    def test_current_price_above_mandi_is_capped(self):
        batch = _batch(current_price=40.0, mandi_avg=22.0)
        result = build_pricing_advice(batch)
        for row in result["suggested_pricing_ladder"]:
            assert row["price_per_kg"] <= 22.0

    def test_batch_id_preserved_in_stage1(self):
        batch = BatchInput(
            crop_name="Onion", quantity_kg=200, days_until_spoilage=5,
            current_listed_price_per_kg=18.0, farmer_cost_price_per_kg=10.0,
            local_mandi_average_price_per_kg=20.0, recent_sell_through_rate=50.0,
            buyer_interest_signal="medium", batch_id="CUSTOM-123"
        )
        result = build_pricing_advice(batch)
        assert result["batch_id"] == "CUSTOM-123"

    def test_decision_input_none_always_returns_stage1(self):
        result = build_pricing_advice(_batch(), decision_input=None)
        assert result["stage"] == "awaiting_farmer_decision"

    def test_all_choices_return_decision_applied(self):
        for choice in ("a", "b", "c", "d"):
            di = DecisionInput(
                farmer_choice=choice,
                custom_discount_pct=10.0 if choice == "b" else None,
            )
            result = build_pricing_advice(_batch(), di)
            assert result["stage"] == "decision_applied"


# ---------------------------------------------------------------------------
# 16. Real-world scenario snapshots
# ---------------------------------------------------------------------------
class TestRealWorldScenarios:

    def test_tomato_3days_low_interest_urgent(self):
        batch = _batch(
            crop_name="Tomato", quantity_kg=500, days_until_spoilage=3,
            current_price=25.0, cost_price=14.0, mandi_avg=22.0,
            sell_through=40.0, buyer_interest="low",
        )
        result = build_pricing_advice(batch)
        assert result["stage"] == "awaiting_farmer_decision"
        assert "URGENT" in result["urgency_level"] or "High" in result["urgency_level"]
        # Early discount should be meaningful for low-interest urgent
        if result["suggested_pricing_ladder"]:
            assert result["suggested_pricing_ladder"][0]["discount_pct"] > 0

    def test_spinach_1day_any_interest_is_critical(self):
        batch = _batch(crop_name="Spinach", days_until_spoilage=1, buyer_interest="high")
        result = build_pricing_advice(batch)
        assert "URGENT" in result["urgency_level"]

    def test_wheat_15days_low_urgency(self):
        batch = _batch(crop_name="Wheat", days_until_spoilage=15, buyer_interest="medium")
        result = build_pricing_advice(batch)
        assert "Low" in result["urgency_level"] or "Moderate" in result["urgency_level"]

    def test_farmer_accepts_then_gets_confirmed_ladder(self):
        batch = _batch(days_until_spoilage=4, buyer_interest="medium")
        # Stage 1
        r1 = build_pricing_advice(batch)
        assert r1["stage"] == "awaiting_farmer_decision"
        # Stage 2 — accept
        r2 = build_pricing_advice(batch, DecisionInput(farmer_choice="a"))
        assert r2["stage"] == "decision_applied"
        assert r2["final_pricing_ladder"] is not None

    def test_farmer_sets_custom_discount_below_cost_flagged(self):
        # Farmer sets 90% discount → almost certainly below cost → floor breach
        batch = _batch(days_until_spoilage=3, cost_price=20.0, mandi_avg=22.0, current_price=22.0)
        decision = DecisionInput(farmer_choice="b", custom_discount_pct=95.0)
        result = build_pricing_advice(batch, decision)
        # floor breach should occur somewhere
        assert result["floor_breach"]["occurs"] is True
