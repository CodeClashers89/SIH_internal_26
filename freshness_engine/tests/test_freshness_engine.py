"""
tests/test_freshness_engine.py
==============================
Comprehensive unit tests for the Freshness Score Engine.

Run with:
    cd freshness_engine
    pytest tests/ -v

Coverage targets:
  - Normal conditions (all grade bands)
  - Cold-chain decay factor
  - Edge cases: over-aged produce, future harvest timestamps, zero elapsed time
  - Custom shelf life override
  - Unknown crop fallback
  - Unknown transit mode fallback
  - Crop catalogue API
  - Grade boundary conditions (exactly 85, 60, 40, 0)
  - Math precision checks
"""

from __future__ import annotations

import sys
import os

# Make the parent directory importable when running tests from /tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from datetime import datetime, timedelta, timezone

from freshness_engine import (
    CROP_SHELF_LIFE_HOURS,
    DEFAULT_SHELF_LIFE_HOURS,
    FreshnessResult,
    calculate_freshness,
    get_crop_catalogue,
    list_transit_modes,
)

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------
NOW = datetime(2026, 8, 22, 0, 0, 0, tzinfo=timezone.utc)

def _harvest(hours_ago: float) -> datetime:
    """Return a UTC datetime that is `hours_ago` hours before NOW."""
    return NOW - timedelta(hours=hours_ago)


# ---------------------------------------------------------------------------
# 1. Sanity checks on the core engine
# ---------------------------------------------------------------------------
class TestCoreEngine:

    def test_returns_freshness_result(self):
        result = calculate_freshness("Tomato", _harvest(10), current_time_utc=NOW)
        assert isinstance(result, FreshnessResult)

    def test_score_range_always_0_to_100(self):
        for hours_ago in [0, 1, 60, 120, 500, 10_000]:
            result = calculate_freshness("Tomato", _harvest(hours_ago), current_time_utc=NOW)
            assert 0.0 <= result.score <= 100.0, f"Score out of range for {hours_ago} hrs"

    def test_elapsed_hours_matches_expectation(self):
        result = calculate_freshness("Tomato", _harvest(50), current_time_utc=NOW)
        assert abs(result.elapsed_hours - 50.0) < 0.01

    def test_crop_name_normalised_to_lowercase(self):
        result = calculate_freshness("TOMATO", _harvest(10), current_time_utc=NOW)
        assert result.crop_name == "tomato"

    def test_evaluation_timestamp_is_utc(self):
        result = calculate_freshness("Tomato", _harvest(10), current_time_utc=NOW)
        assert result.evaluated_at_utc.tzinfo is not None


# ---------------------------------------------------------------------------
# 2. Normal transit — grade band coverage
# ---------------------------------------------------------------------------
class TestGradeBandsNormal:
    """
    Tomato shelf life = 120 hrs, decay_factor = 1.0 (normal)
    Penalty = (hours / 120) * 100

    Grade boundaries:
      Ultra Fresh (≥85): hours < 18
      Fresh (≥60):       hours < 48
      Needs Fast Sale (≥40): hours < 72
      Processing (< 40): hours ≥ 72
    """

    def test_ultra_fresh(self):
        result = calculate_freshness("Tomato", _harvest(10), "normal", current_time_utc=NOW)
        assert result.grade == "Ultra Fresh"
        assert result.score >= 85.0

    def test_fresh_standard(self):
        # 40 hrs → penalty = 33.3 → score = 66.7
        result = calculate_freshness("Tomato", _harvest(40), "normal", current_time_utc=NOW)
        assert result.grade == "Fresh"
        assert 60.0 <= result.score < 85.0

    def test_needs_fast_sale(self):
        # 60 hrs → penalty = 50 → score = 50
        result = calculate_freshness("Tomato", _harvest(60), "normal", current_time_utc=NOW)
        assert result.grade == "Needs Fast Sale"
        assert 40.0 <= result.score < 60.0

    def test_processing_grade(self):
        # 100 hrs → penalty = 83.3 → score = 16.7
        result = calculate_freshness("Tomato", _harvest(100), "normal", current_time_utc=NOW)
        assert result.grade == "Processing Grade"
        assert result.score < 40.0


# ---------------------------------------------------------------------------
# 3. Cold-chain transit — reduced decay
# ---------------------------------------------------------------------------
class TestColdChain:

    def test_cold_chain_decay_factor(self):
        result = calculate_freshness("Tomato", _harvest(60), "cold_chain", current_time_utc=NOW)
        assert result.decay_factor == 0.6

    def test_cold_chain_higher_score_than_normal(self):
        hours_ago = 60
        normal = calculate_freshness("Tomato", _harvest(hours_ago), "normal",      current_time_utc=NOW)
        cold   = calculate_freshness("Tomato", _harvest(hours_ago), "cold_chain",  current_time_utc=NOW)
        assert cold.score > normal.score

    def test_cold_chain_math_precision(self):
        # Tomato: shelf=120, elapsed=60, decay=0.6
        # Penalty = (60/120)*100*0.6 = 30, score = 70
        result = calculate_freshness("Tomato", _harvest(60), "cold_chain", current_time_utc=NOW)
        assert abs(result.score - 70.0) < 0.01

    def test_cold_chain_grade_upgrade_vs_normal(self):
        # 60 hrs normal → score=50 (Needs Fast Sale)
        # 60 hrs cold   → score=70 (Fresh)
        normal = calculate_freshness("Tomato", _harvest(60), "normal",     current_time_utc=NOW)
        cold   = calculate_freshness("Tomato", _harvest(60), "cold_chain", current_time_utc=NOW)
        assert normal.grade == "Needs Fast Sale"
        assert cold.grade == "Fresh"


# ---------------------------------------------------------------------------
# 4. Edge cases
# ---------------------------------------------------------------------------
class TestEdgeCases:

    def test_future_harvest_clamped_to_100(self):
        future_harvest = NOW + timedelta(hours=5)
        result = calculate_freshness("Tomato", future_harvest, current_time_utc=NOW)
        assert result.score == 100.0
        assert result.elapsed_hours == 0.0
        assert any("future" in w.lower() for w in result.warnings)

    def test_over_aged_clamped_to_0(self):
        # 10 000 hrs >> 120 hr shelf life → score should clamp to 0
        result = calculate_freshness("Tomato", _harvest(10_000), current_time_utc=NOW)
        assert result.score == 0.0

    def test_just_harvested_score_100(self):
        result = calculate_freshness("Tomato", NOW, current_time_utc=NOW)
        assert result.score == 100.0

    def test_exactly_at_shelf_life_expiry_normal(self):
        # Elapsed = shelf_life → penalty = 100 → score = 0
        result = calculate_freshness("Tomato", _harvest(120), "normal", current_time_utc=NOW)
        assert result.score == 0.0

    def test_exactly_at_shelf_life_expiry_cold_chain(self):
        # Elapsed = shelf_life → penalty = 60 → score = 40
        result = calculate_freshness("Tomato", _harvest(120), "cold_chain", current_time_utc=NOW)
        assert abs(result.score - 40.0) < 0.01


# ---------------------------------------------------------------------------
# 5. Grade boundary exactness
# ---------------------------------------------------------------------------
class TestGradeBoundaries:
    """
    Using custom_shelf_life_hours=100 and normal mode for easy math:
    score = 100 - elapsed_hours * 1.0
    """

    def test_boundary_ultra_fresh_at_85(self):
        result = calculate_freshness(
            "Tomato", _harvest(15), "normal",
            current_time_utc=NOW,
            custom_shelf_life_hours=100,
        )
        # score = 100 - (15/100)*100 = 85 → Ultra Fresh
        assert abs(result.score - 85.0) < 0.01
        assert result.grade == "Ultra Fresh"

    def test_boundary_fresh_at_60(self):
        result = calculate_freshness(
            "Tomato", _harvest(40), "normal",
            current_time_utc=NOW,
            custom_shelf_life_hours=100,
        )
        # score = 60 → Fresh
        assert abs(result.score - 60.0) < 0.01
        assert result.grade == "Fresh"

    def test_boundary_needs_fast_sale_at_40(self):
        result = calculate_freshness(
            "Tomato", _harvest(60), "normal",
            current_time_utc=NOW,
            custom_shelf_life_hours=100,
        )
        # score = 40 → Needs Fast Sale
        assert abs(result.score - 40.0) < 0.01
        assert result.grade == "Needs Fast Sale"


# ---------------------------------------------------------------------------
# 6. Crop master data
# ---------------------------------------------------------------------------
class TestCropMasterData:

    def test_known_crops_have_positive_shelf_life(self):
        for crop, hrs in CROP_SHELF_LIFE_HOURS.items():
            assert hrs > 0, f"Shelf life for '{crop}' must be positive"

    def test_tomato_shelf_life(self):
        assert CROP_SHELF_LIFE_HOURS["tomato"] == 120.0

    def test_spinach_shelf_life(self):
        assert CROP_SHELF_LIFE_HOURS["spinach"] == 36.0

    def test_potato_shelf_life(self):
        assert CROP_SHELF_LIFE_HOURS["potato"] == 720.0

    def test_unknown_crop_uses_default_with_warning(self):
        result = calculate_freshness("dragonfruit_xyz", _harvest(10), current_time_utc=NOW)
        assert result.shelf_life_hours == DEFAULT_SHELF_LIFE_HOURS
        assert any("not found" in w.lower() for w in result.warnings)

    def test_catalogue_returns_dict(self):
        catalogue = get_crop_catalogue()
        assert isinstance(catalogue, dict)
        assert len(catalogue) > 0

    def test_catalogue_is_copy_not_mutating_original(self):
        cat1 = get_crop_catalogue()
        cat1["fake_crop"] = 999
        cat2 = get_crop_catalogue()
        assert "fake_crop" not in cat2


# ---------------------------------------------------------------------------
# 7. Custom shelf life override
# ---------------------------------------------------------------------------
class TestCustomShelfLife:

    def test_custom_shelf_life_applied(self):
        result = calculate_freshness(
            "Tomato", _harvest(50), "normal",
            current_time_utc=NOW,
            custom_shelf_life_hours=50,  # forces score = 0
        )
        assert result.score == 0.0

    def test_custom_shelf_life_warning_present(self):
        result = calculate_freshness(
            "Tomato", _harvest(10), "normal",
            current_time_utc=NOW,
            custom_shelf_life_hours=200,
        )
        assert any("custom" in w.lower() for w in result.warnings)

    def test_invalid_zero_shelf_life_raises(self):
        with pytest.raises(ValueError):
            calculate_freshness(
                "Tomato", _harvest(10), "normal",
                current_time_utc=NOW,
                custom_shelf_life_hours=0,
            )

    def test_invalid_negative_shelf_life_raises(self):
        with pytest.raises(ValueError):
            calculate_freshness(
                "Tomato", _harvest(10), "normal",
                current_time_utc=NOW,
                custom_shelf_life_hours=-5,
            )


# ---------------------------------------------------------------------------
# 8. Transit mode fallbacks
# ---------------------------------------------------------------------------
class TestTransitModeFallback:

    def test_unknown_transit_mode_fallback_warning(self):
        result = calculate_freshness(
            "Tomato", _harvest(10), "refrigerated_truck",
            current_time_utc=NOW,
        )
        assert result.transit_mode == "normal"
        assert result.decay_factor == 1.0
        assert any("unrecognised" in w.lower() for w in result.warnings)

    def test_list_transit_modes_returns_list(self):
        modes = list_transit_modes()
        assert isinstance(modes, list)
        assert "normal" in modes
        assert "cold_chain" in modes


# ---------------------------------------------------------------------------
# 9. Naive datetime handling
# ---------------------------------------------------------------------------
class TestNaiveDatetimeHandling:

    def test_naive_harvest_time_treated_as_utc(self):
        naive_harvest = datetime(2026, 8, 21, 0, 0, 0)  # no tzinfo
        result = calculate_freshness("Tomato", naive_harvest, current_time_utc=NOW)
        # Should run without exception and produce a valid score
        assert 0.0 <= result.score <= 100.0
        assert result.harvest_time_utc.tzinfo is not None


# ---------------------------------------------------------------------------
# 10. Real-world scenario snapshots
# ---------------------------------------------------------------------------
class TestRealWorldScenarios:

    def test_spinach_24hrs_normal_fresh(self):
        # shelf=36, elapsed=24, penalty=(24/36)*100=66.7, score=33.3 → Processing
        result = calculate_freshness("Spinach", _harvest(24), "normal", current_time_utc=NOW)
        assert result.grade == "Processing Grade"

    def test_spinach_10hrs_cold_chain_ultra_fresh(self):
        # shelf=36, elapsed=10, decay=0.6, penalty=(10/36)*100*0.6=16.7, score=83.3 → Fresh
        result = calculate_freshness("Spinach", _harvest(10), "cold_chain", current_time_utc=NOW)
        assert result.grade == "Fresh"

    def test_wheat_6months_still_usable(self):
        # shelf=8760, elapsed=4380 (6 months), penalty=50, score=50 → Needs Fast Sale
        result = calculate_freshness("Wheat", _harvest(4380), "normal", current_time_utc=NOW)
        assert result.grade == "Needs Fast Sale"

    def test_mango_5days_cold_chain(self):
        # shelf=168, elapsed=120, decay=0.6, penalty=(120/168)*100*0.6=42.9, score=57.1
        result = calculate_freshness("Mango", _harvest(120), "cold_chain", current_time_utc=NOW)
        assert result.grade == "Needs Fast Sale"
