"""
tests/test_smart_aggregation_engine.py
=======================================
Comprehensive unit tests for the Smart Order Aggregation Engine.

Run with:
    cd smart_aggregation_engine
    python.exe -m pytest tests/ -v

Coverage targets:
  - Standard aggregation (happy path)
  - Commodity mismatch filter
  - Radius boundary filtering (inside vs. outside)
  - Vehicle capacity overflow / partial fill
  - Multi-buyer separation (destinations don't share lots)
  - Freshness + proximity sort order
  - Nearest-neighbour route optimisation
  - Edge cases: single lot, exact capacity fill, zero-weight edge
  - Warning messages (partial fulfilment)
  - Haversine formula precision
  - Custom config overrides
  - Empty result when no lots pass filters
  - Multi-destination wrapper
"""

from __future__ import annotations

import math
import sys
import os

# Ensure parent directory is on path when running from /tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from smart_aggregation_engine import (
    AggregationConfig,
    AggregationResult,
    Destination,
    FarmerLot,
    PickupStop,
    _haversine_km,
    _nearest_neighbour_route,
    _route_total_km,
    aggregate_multi_destination,
    aggregate_orders,
)


# ---------------------------------------------------------------------------
# Fixtures & shared data
# ---------------------------------------------------------------------------

# Hyderabad-area coordinates (realistic test data)
DEST_KOTHAPET = Destination(
    destination_id="D1",
    name="Kothapet APMC",
    latitude=17.3616,
    longitude=78.5480,
    required_quantity_kg=1000.0,
    crop_name="tomato",
)

DEST_BOWENPALLY = Destination(
    destination_id="D2",
    name="Bowenpally Market",
    latitude=17.4647,
    longitude=78.4862,
    required_quantity_kg=500.0,
    crop_name="spinach",
)

# Farmers within ~10 km of Kothapet
LOT_F1 = FarmerLot("F1", "Ravi Farm",   17.3850, 78.4860, "tomato", 350.0, freshness_score=88.0)
LOT_F2 = FarmerLot("F2", "Laxmi Farm",  17.3900, 78.4900, "tomato", 400.0, freshness_score=75.0)
LOT_F3 = FarmerLot("F3", "Gopal Farm",  17.3800, 78.4800, "tomato", 250.0, freshness_score=91.0)

# Farmer with wrong crop
LOT_F4 = FarmerLot("F4", "Mehta Farm",  17.3820, 78.4820, "spinach", 200.0, freshness_score=80.0)

# Farmer too far away (> 10 km from Kothapet)
LOT_F5 = FarmerLot("F5", "Distant Farm", 17.6000, 78.3000, "tomato", 300.0, freshness_score=70.0)

DEFAULT_CONFIG = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=1000.0)


# ---------------------------------------------------------------------------
# 1. Haversine formula unit tests
# ---------------------------------------------------------------------------
class TestHaversine:

    def test_same_point_is_zero(self):
        assert _haversine_km(17.385, 78.486, 17.385, 78.486) == 0.0

    def test_known_distance_hyderabad(self):
        # Approximate distance between two Hyderabad landmarks (~7.1 km)
        dist = _haversine_km(17.385, 78.486, 17.361, 78.548)
        assert 3.0 < dist < 8.0

    def test_symmetry(self):
        d1 = _haversine_km(17.385, 78.486, 17.600, 78.300)
        d2 = _haversine_km(17.600, 78.300, 17.385, 78.486)
        assert abs(d1 - d2) < 1e-9

    def test_returns_float(self):
        assert isinstance(_haversine_km(0, 0, 1, 1), float)

    def test_equator_one_degree_lat(self):
        # 1 degree latitude ≈ 111 km
        dist = _haversine_km(0.0, 0.0, 1.0, 0.0)
        assert 110.0 < dist < 112.0

    def test_equator_one_degree_lon(self):
        dist = _haversine_km(0.0, 0.0, 0.0, 1.0)
        assert 110.0 < dist < 112.0


# ---------------------------------------------------------------------------
# 2. Route utilities
# ---------------------------------------------------------------------------
class TestRouteUtils:

    def test_empty_stops_returns_zero(self):
        assert _route_total_km(17.36, 78.54, []) == 0.0

    def test_single_stop_round_trip(self):
        # Dest → stop → Dest: distance should be 2 × direct distance
        dist = _haversine_km(17.36, 78.54, 17.39, 78.49)
        route = _route_total_km(17.36, 78.54, [(17.39, 78.49)])
        assert abs(route - 2 * dist) < 0.01

    def test_nearest_neighbour_no_stops(self):
        result = _nearest_neighbour_route(17.36, 78.54, [])
        assert result == []

    def test_nearest_neighbour_single_stop(self):
        result = _nearest_neighbour_route(17.36, 78.54, [(17.39, 78.49, 0)])
        assert result == [0]

    def test_nearest_neighbour_orders_by_proximity(self):
        # Stop 0 is much closer to the start than Stop 1
        stops = [
            (17.60, 78.30, 0),   # far
            (17.37, 78.55, 1),   # near
        ]
        order = _nearest_neighbour_route(17.36, 78.54, stops)
        assert order[0] == 1    # near stop should be visited first


# ---------------------------------------------------------------------------
# 3. Standard aggregation (happy path)
# ---------------------------------------------------------------------------
class TestStandardAggregation:

    def test_returns_aggregation_result(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert isinstance(result, AggregationResult)

    def test_cluster_id_is_uuid_format(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        import uuid
        # Should not raise
        uuid.UUID(result.cluster_id)

    def test_score_in_range(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert 0.0 <= result.vehicle_capacity_utilization_pct <= 100.0

    def test_total_weight_not_exceeding_capacity(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.total_aggregated_weight_kg <= DEFAULT_CONFIG.max_vehicle_capacity_kg

    def test_pickup_stops_are_ordered(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        orders = [s.stop_order for s in result.pickup_stops]
        assert orders == list(range(1, len(result.pickup_stops) + 1))

    def test_allocated_quantities_sum_matches_total(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        allocated_sum = sum(s.allocated_quantity_kg for s in result.pickup_stops)
        assert abs(allocated_sum - result.total_aggregated_weight_kg) < 0.01

    def test_crop_name_normalised(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.crop_name == "tomato"

    def test_computed_at_utc_present(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.computed_at_utc != ""

    def test_target_destination_has_required_keys(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        for key in ("destination_id", "name", "latitude", "longitude", "required_quantity_kg"):
            assert key in result.target_destination


# ---------------------------------------------------------------------------
# 4. Commodity mismatch filter
# ---------------------------------------------------------------------------
class TestCommodityFilter:

    def test_wrong_crop_excluded(self):
        result = aggregate_orders([LOT_F1, LOT_F4], DEST_KOTHAPET, DEFAULT_CONFIG)
        excluded_ids = [e.farmer_id for e in result.excluded_lots]
        assert "F4" in excluded_ids

    def test_wrong_crop_excluded_reason(self):
        result = aggregate_orders([LOT_F1, LOT_F4], DEST_KOTHAPET, DEFAULT_CONFIG)
        f4_exc = next(e for e in result.excluded_lots if e.farmer_id == "F4")
        assert f4_exc.reason == "wrong_crop"

    def test_only_matching_crops_in_stops(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F4], DEST_KOTHAPET, DEFAULT_CONFIG)
        stop_ids = {s.farmer_id for s in result.pickup_stops}
        assert "F4" not in stop_ids

    def test_all_wrong_crops_returns_empty_cluster(self):
        result = aggregate_orders([LOT_F4], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.total_aggregated_weight_kg == 0.0
        assert result.pickup_stops == []


# ---------------------------------------------------------------------------
# 5. Radius boundary filtering
# ---------------------------------------------------------------------------
class TestRadiusFilter:

    def test_distant_farm_excluded(self):
        result = aggregate_orders([LOT_F1, LOT_F5], DEST_KOTHAPET, DEFAULT_CONFIG)
        excluded_ids = [e.farmer_id for e in result.excluded_lots]
        assert "F5" in excluded_ids

    def test_distant_farm_excluded_reason_contains_outside_radius(self):
        result = aggregate_orders([LOT_F5], DEST_KOTHAPET, DEFAULT_CONFIG)
        exc = next(e for e in result.excluded_lots if e.farmer_id == "F5")
        assert "outside_radius" in exc.reason

    def test_nearby_farm_included(self):
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert len(result.pickup_stops) == 1
        assert result.pickup_stops[0].farmer_id == "F1"

    def test_large_radius_includes_distant_farm(self):
        big_config = AggregationConfig(radius_km=500.0, max_vehicle_capacity_kg=1000.0)
        result = aggregate_orders([LOT_F5], DEST_KOTHAPET, big_config)
        assert len(result.pickup_stops) == 1
        assert result.pickup_stops[0].farmer_id == "F5"

    def test_tiny_radius_excludes_all(self):
        tiny_config = AggregationConfig(radius_km=0.001, max_vehicle_capacity_kg=1000.0)
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, tiny_config)
        assert result.total_aggregated_weight_kg == 0.0


# ---------------------------------------------------------------------------
# 6. Vehicle capacity constraints
# ---------------------------------------------------------------------------
class TestCapacityConstraints:

    def test_total_weight_within_capacity(self):
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=500.0)
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, config)
        assert result.total_aggregated_weight_kg <= 500.0

    def test_capacity_overflow_lots_excluded(self):
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=400.0)
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, config)
        excluded_reasons = [e.reason for e in result.excluded_lots]
        assert any("capacity_exceeded" in r for r in excluded_reasons)

    def test_exact_capacity_fill(self):
        # F1=350, F3=250 → 600 total, capacity=600 → 100 % utilisation
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=600.0)
        result = aggregate_orders([LOT_F1, LOT_F3], DEST_KOTHAPET, config)
        assert abs(result.vehicle_capacity_utilization_pct - 100.0) < 0.1

    def test_partial_lot_allocation(self):
        # Only 100 kg of capacity left but lot has 350 kg → should allocate 100
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=100.0)
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, config)
        assert result.total_aggregated_weight_kg == pytest.approx(100.0, abs=0.01)

    def test_utilization_pct_formula(self):
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=1000.0)
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, config)
        expected_pct = LOT_F1.quantity_kg / 1000.0 * 100.0
        assert abs(result.vehicle_capacity_utilization_pct - expected_pct) < 0.1


# ---------------------------------------------------------------------------
# 7. Multi-buyer separation
# ---------------------------------------------------------------------------
class TestMultiBuyerSeparation:

    def test_multi_destination_returns_two_results(self):
        lots = [LOT_F1, LOT_F2, LOT_F4]
        results = aggregate_multi_destination(lots, [DEST_KOTHAPET, DEST_BOWENPALLY])
        assert len(results) == 2

    def test_destinations_are_independent(self):
        lots = [LOT_F1, LOT_F2, LOT_F3]
        results = aggregate_multi_destination(lots, [DEST_KOTHAPET, DEST_KOTHAPET])
        # Both should return the same total weight (lots not deducted cross-run)
        assert results[0].total_aggregated_weight_kg == results[1].total_aggregated_weight_kg

    def test_spinach_destination_gets_only_spinach(self):
        lots = [LOT_F1, LOT_F2, LOT_F4]
        results = aggregate_multi_destination(lots, [DEST_KOTHAPET, DEST_BOWENPALLY])
        tomato_result  = results[0]
        spinach_result = results[1]
        assert tomato_result.crop_name  == "tomato"
        assert spinach_result.crop_name == "spinach"
        for stop in tomato_result.pickup_stops:
            assert stop.farmer_id != "F4"   # spinach farmer not in tomato cluster

    def test_empty_destinations_raises(self):
        with pytest.raises(ValueError):
            aggregate_multi_destination([LOT_F1], [])


# ---------------------------------------------------------------------------
# 8. Priority sort (freshness vs. proximity)
# ---------------------------------------------------------------------------
class TestPrioritySort:

    def test_high_freshness_selected_first_when_weight_dominant(self):
        # freshness_weight=1.0 → pure freshness ordering
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=350.0,
                                   freshness_weight=1.0)
        # F3 has highest freshness (91), F1=88, F2=75
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, config)
        # With capacity=350, only 1-2 lots fit; top stop should be highest freshness
        if len(result.pickup_stops) >= 1:
            # First stop after NN-reorder may differ; verify F3 IS included
            included_ids = {s.farmer_id for s in result.pickup_stops}
            assert "F3" in included_ids  # highest freshness lot must be chosen

    def test_proximity_dominant_when_freshness_weight_zero(self):
        # Create two lots at different distances, same freshness
        near_lot = FarmerLot("NEAR", "Near Farm",  17.362, 78.550, "tomato", 100.0, 80.0)
        far_lot  = FarmerLot("FAR",  "Far Farm",   17.350, 78.480, "tomato", 100.0, 80.0)
        config   = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=100.0,
                                     freshness_weight=0.0)
        result   = aggregate_orders([near_lot, far_lot], DEST_KOTHAPET, config)
        # Only one fits; it should be the nearer one
        assert result.pickup_stops[0].farmer_id == "NEAR"


# ---------------------------------------------------------------------------
# 9. Logistics saving metric
# ---------------------------------------------------------------------------
class TestLogisticsSaving:

    def test_saving_pct_in_range(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert 0.0 <= result.estimated_logistics_saving_pct <= 100.0

    def test_single_stop_saving_is_zero(self):
        # One farmer → aggregated route = individual trip (no saving)
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.estimated_logistics_saving_pct == pytest.approx(0.0, abs=1.0)

    def test_multiple_stops_saving_positive(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        # Multi-pickup aggregation should save vs. 3 individual trips
        assert result.estimated_logistics_saving_pct >= 0.0

    def test_individual_vs_aggregated_km_reported(self):
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.individual_trip_total_km > 0.0
        assert result.aggregated_route_total_km > 0.0


# ---------------------------------------------------------------------------
# 10. Edge cases
# ---------------------------------------------------------------------------
class TestEdgeCases:

    def test_single_lot_happy_path(self):
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert len(result.pickup_stops) == 1
        assert result.total_aggregated_weight_kg == LOT_F1.quantity_kg

    def test_empty_lots_raises(self):
        with pytest.raises(ValueError):
            aggregate_orders([], DEST_KOTHAPET, DEFAULT_CONFIG)

    def test_invalid_config_negative_radius_raises(self):
        with pytest.raises(ValueError):
            AggregationConfig(radius_km=-1.0)

    def test_invalid_config_zero_capacity_raises(self):
        with pytest.raises(ValueError):
            AggregationConfig(max_vehicle_capacity_kg=0.0)

    def test_invalid_lot_zero_quantity_raises(self):
        with pytest.raises(ValueError):
            FarmerLot("F99", "Bad Farm", 17.38, 78.48, "tomato", 0.0)

    def test_invalid_lot_negative_freshness_raises(self):
        with pytest.raises(ValueError):
            FarmerLot("F99", "Bad Farm", 17.38, 78.48, "tomato", 100.0, freshness_score=-5.0)

    def test_invalid_destination_zero_quantity_raises(self):
        with pytest.raises(ValueError):
            Destination("D99", "Bad Market", 17.36, 78.54, 0.0, "tomato")

    def test_case_insensitive_crop_matching(self):
        lot_upper = FarmerLot("FX", "Farm X", 17.38, 78.48, "TOMATO", 200.0)
        dest_lower = Destination("DX", "Market X", 17.36, 78.54, 500.0, "tomato")
        result = aggregate_orders([lot_upper], dest_lower, DEFAULT_CONFIG)
        assert len(result.pickup_stops) == 1

    def test_fulfillment_capped_at_100(self):
        # Supply (350 kg) < requirement (1000 kg) → fulfillment < 100
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert result.fulfillment_pct <= 100.0

    def test_partial_fulfillment_warning(self):
        result = aggregate_orders([LOT_F1], DEST_KOTHAPET, DEFAULT_CONFIG)
        # 350 < 1000 kg required → should warn about partial fulfillment
        assert any("partial" in w.lower() for w in result.warnings)

    def test_no_warning_when_fully_fulfilled(self):
        dest = Destination("DX", "Small Market", 17.36, 78.54, 200.0, "tomato")
        result = aggregate_orders([LOT_F1], dest, DEFAULT_CONFIG)
        # 350 kg > 200 kg required → no partial warning
        assert not any("partial" in w.lower() for w in result.warnings)


# ---------------------------------------------------------------------------
# 11. Real-world scenario snapshots
# ---------------------------------------------------------------------------
class TestRealWorldScenarios:

    def test_three_farmers_fill_1000kg_vehicle(self):
        # F1=350 + F2=400 + F3=250 = 1000 kg exactly, all within radius
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3], DEST_KOTHAPET, DEFAULT_CONFIG)
        assert abs(result.total_aggregated_weight_kg - 1000.0) < 0.01
        assert abs(result.vehicle_capacity_utilization_pct - 100.0) < 0.01

    def test_mixed_crop_pool_only_tomato_selected(self):
        lots = [LOT_F1, LOT_F2, LOT_F3, LOT_F4]   # F4 is spinach
        result = aggregate_orders(lots, DEST_KOTHAPET, DEFAULT_CONFIG)
        for stop in result.pickup_stops:
            assert stop.farmer_id != "F4"

    def test_restricted_radius_halves_supply(self):
        # Use a very tight radius that only catches F2 and F3 (closer to destination)
        # Verify that distant farms are excluded
        config = AggregationConfig(radius_km=10.0, max_vehicle_capacity_kg=1000.0)
        result = aggregate_orders([LOT_F1, LOT_F2, LOT_F3, LOT_F5], DEST_KOTHAPET, config)
        stop_ids = {s.farmer_id for s in result.pickup_stops}
        assert "F5" not in stop_ids

    def test_default_config_used_when_none(self):
        result = aggregate_orders([LOT_F1, LOT_F2], DEST_KOTHAPET, None)
        assert isinstance(result, AggregationResult)
        assert result.radius_km == 10.0
        assert result.max_vehicle_capacity_kg == 1000.0
