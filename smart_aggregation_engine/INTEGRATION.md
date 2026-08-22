# 🚛 Smart Order Aggregation Engine — Integration Guide

A **standalone, plug-and-play microservice** that pools fragmented smallholder farmer supply lots into a single optimised pickup cluster for a bulk buyer or APMC market destination.

Zero coupling to the host application. No database schema changes required.

---

## Directory Layout

```
smart_aggregation_engine/
├── smart_aggregation_engine.py   # Core engine (stdlib only, zero external deps)
├── api.py                        # FastAPI REST wrapper  (Pydantic v2)
├── run.py                        # Server entry point  → python run.py
├── requirements.txt              # Isolated deps (FastAPI + uvicorn + pytest)
├── tests/
│   ├── __init__.py
│   └── test_smart_aggregation_engine.py   # 50+ unit tests
└── INTEGRATION.md                # This document
```

---

## Quick Start

```bash
# 1. Navigate to the module directory
cd smart_aggregation_engine

# 2. Install dependencies (isolated — does NOT affect the main project)
pip install -r requirements.txt

# 3. Start the microservice (port 8002)
python run.py

# 4. Open Swagger UI
#    http://localhost:8002/docs
```

---

## Port Allocation (No Conflicts)

| Port | Service                        |
|------|--------------------------------|
| 8000 | Django backend                 |
| 5173 | Vite / React frontend          |
| 8001 | Freshness Score Engine         |
| **8002** | **Smart Aggregation Engine** ← this service |

---

## Core Algorithm

```
1. Commodity Filter  → keep lots whose crop_name matches destination
2. Radius Filter     → keep farms within radius_km of the destination
                       (Haversine great-circle distance)
3. Priority Sort     → composite score:
                       freshness_weight × (freshness / 100)
                       + (1 − freshness_weight) × proximity_score
4. Capacity Fill     → greedily accumulate lots up to max_vehicle_capacity_kg
5. Route Optimise    → nearest-neighbour heuristic (Dest → F₁ → F₂ → … → Dest)
6. Logistics Saving  → individual_km = Σ dist(farmer_i, dest) × 2
                       saving_pct = (individual_km − aggregated_km) / individual_km × 100
```

---

## REST API Reference

**Base URL:** `http://localhost:8002`

---

### POST `/api/v1/aggregate-orders` — Single Destination

**Request body:**

```json
{
  "farmer_lots": [
    {
      "farmer_id": "F1",
      "farm_name": "Ravi Farm",
      "latitude": 17.385,
      "longitude": 78.486,
      "crop_name": "Tomato",
      "quantity_kg": 350,
      "freshness_score": 88.0
    },
    {
      "farmer_id": "F2",
      "farm_name": "Laxmi Farm",
      "latitude": 17.390,
      "longitude": 78.490,
      "crop_name": "Tomato",
      "quantity_kg": 400,
      "freshness_score": 75.0
    },
    {
      "farmer_id": "F3",
      "farm_name": "Gopal Farm",
      "latitude": 17.380,
      "longitude": 78.480,
      "crop_name": "Tomato",
      "quantity_kg": 250,
      "freshness_score": 91.0
    }
  ],
  "destination": {
    "destination_id": "D1",
    "name": "Kothapet APMC",
    "latitude": 17.3616,
    "longitude": 78.5480,
    "required_quantity_kg": 1000,
    "crop_name": "Tomato"
  },
  "config": {
    "radius_km": 10,
    "max_vehicle_capacity_kg": 1000,
    "freshness_weight": 0.7
  }
}
```

| Field                   | Type    | Required | Default | Description                              |
|-------------------------|---------|----------|---------|------------------------------------------|
| `farmer_lots`           | array   | ✅       | —       | Available supply lots                    |
| `destination`           | object  | ✅       | —       | Buyer / APMC market node                 |
| `config.radius_km`      | float   | ❌       | 10.0    | Farmer eligibility radius (km)           |
| `config.max_vehicle_capacity_kg` | float | ❌ | 1000.0  | Vehicle payload ceiling (kg)             |
| `config.freshness_weight` | float | ❌       | 0.7     | Freshness vs. proximity priority (0–1)   |

**Response body:**

```json
{
  "cluster_id": "a1b2c3d4-...",
  "target_destination": {
    "destination_id": "D1",
    "name": "Kothapet APMC",
    "latitude": 17.3616,
    "longitude": 78.548,
    "required_quantity_kg": 1000.0
  },
  "crop_name": "tomato",
  "total_aggregated_weight_kg": 1000.0,
  "required_quantity_kg": 1000.0,
  "fulfillment_pct": 100.0,
  "vehicle_capacity_utilization_pct": 100.0,
  "pickup_stops": [
    {
      "stop_order": 1,
      "farmer_id": "F3",
      "farm_name": "Gopal Farm",
      "lot_id": "F3-tomato",
      "latitude": 17.38,
      "longitude": 78.48,
      "allocated_quantity_kg": 250.0,
      "freshness_score": 91.0,
      "distance_to_destination_km": 8.34
    }
  ],
  "estimated_logistics_saving_pct": 42.6,
  "individual_trip_total_km": 52.3,
  "aggregated_route_total_km": 30.0,
  "radius_km": 10.0,
  "max_vehicle_capacity_kg": 1000.0,
  "excluded_lots": [],
  "warnings": [],
  "computed_at_utc": "2026-08-22T00:40:00+00:00"
}
```

---

### POST `/api/v1/aggregate-multi` — Multiple Destinations

Same structure as above but `destinations` is an array. Returns one result per destination.

```json
{
  "farmer_lots": [...],
  "destinations": [
    { "destination_id": "D1", "name": "Kothapet APMC", ... },
    { "destination_id": "D2", "name": "Bowenpally Market", ... }
  ],
  "config": { "radius_km": 15 }
}
```

---

### GET `/api/v1/health`

```json
{
  "service": "Smart Order Aggregation Engine",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "port": 8002
}
```

---

## Integration Patterns

### Pattern 1 — Python Library (direct import, zero network overhead)

Drop `smart_aggregation_engine.py` into any Python project and import it directly:

```python
from smart_aggregation_engine import aggregate_orders, FarmerLot, Destination, AggregationConfig

lots = [
    FarmerLot("F1", "Ravi Farm",  17.385, 78.486, "tomato", 350, freshness_score=88.0),
    FarmerLot("F2", "Laxmi Farm", 17.390, 78.490, "tomato", 400, freshness_score=75.0),
]
destination = Destination("D1", "Kothapet APMC", 17.3616, 78.548, 1000.0, "tomato")
config      = AggregationConfig(radius_km=10, max_vehicle_capacity_kg=1000)

result = aggregate_orders(lots, destination, config)
print(f"Cluster: {result.cluster_id}")
print(f"Stops:   {len(result.pickup_stops)}")
print(f"Saving:  {result.estimated_logistics_saving_pct:.1f}%")
```

---

### Pattern 2 — Django Integration (call via HTTP from any view)

The microservice runs independently on port 8002. Call it from an existing Django view without modifying any model:

```python
# In any existing Django view — zero model changes required
import requests

def get_aggregated_cluster(order):
    """Call the aggregation engine and return structured cluster data."""
    response = requests.post(
        "http://localhost:8002/api/v1/aggregate-orders",
        json={
            "farmer_lots": [
                {
                    "farmer_id": str(listing.farmer_id),
                    "farm_name": listing.farm_name,
                    "latitude":  listing.latitude,
                    "longitude": listing.longitude,
                    "crop_name": listing.crop_name,
                    "quantity_kg": listing.quantity_kg,
                    "freshness_score": listing.freshness_score or 100.0,
                }
                for listing in order.eligible_listings.all()
            ],
            "destination": {
                "destination_id": str(order.buyer_id),
                "name":           order.market_name,
                "latitude":       order.delivery_lat,
                "longitude":      order.delivery_lon,
                "required_quantity_kg": order.required_kg,
                "crop_name":      order.crop,
            },
        },
        timeout=5,
    )
    if response.ok:
        return response.json()
    return None
```

---

### Pattern 3 — React / Frontend JavaScript

```javascript
// In any React component — no backend changes needed
async function getAggregatedCluster(farmerLots, destination) {
  const response = await fetch("http://localhost:8002/api/v1/aggregate-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ farmer_lots: farmerLots, destination }),
  });
  return response.json();
}

// Usage in a logistics dashboard component
const cluster = await getAggregatedCluster(lots, destKothapet);
console.log(`${cluster.pickup_stops.length} stops, ${cluster.estimated_logistics_saving_pct}% saving`);
```

---

### Pattern 4 — Vanilla HTML Widget (no framework required)

```html
<!-- Drop-in logistics cluster widget — zero side effects -->
<div id="cluster-widget">Loading cluster...</div>

<script>
(async () => {
  const res = await fetch("http://localhost:8002/api/v1/aggregate-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      farmer_lots: [
        { farmer_id: "F1", farm_name: "Ravi Farm", latitude: 17.385,
          longitude: 78.486, crop_name: "Tomato", quantity_kg: 350, freshness_score: 88 },
      ],
      destination: {
        destination_id: "D1", name: "Kothapet APMC",
        latitude: 17.3616, longitude: 78.548,
        required_quantity_kg: 1000, crop_name: "Tomato"
      }
    })
  });
  const data = await res.json();
  const el = document.getElementById("cluster-widget");
  el.innerHTML = `
    <strong>Cluster:</strong> ${data.cluster_id.slice(0, 8)}…<br>
    <strong>Stops:</strong>   ${data.pickup_stops.length}<br>
    <strong>Weight:</strong>  ${data.total_aggregated_weight_kg} kg
                              (${data.vehicle_capacity_utilization_pct}% of vehicle)<br>
    <strong>Saving:</strong>  ${data.estimated_logistics_saving_pct}% vs. individual trips
  `;
})();
</script>
```

---

### Pattern 5 — Combined with Freshness Score Engine

Pipe freshness scores from the Freshness Engine (port 8001) into the aggregation engine:

```python
import requests
from datetime import datetime, timezone

def enrich_and_aggregate(raw_lots, destination_payload):
    """Get freshness scores for each lot then run aggregation."""
    enriched = []
    for lot in raw_lots:
        fres = requests.post(
            "http://localhost:8001/api/v1/calculate-freshness",
            json={
                "crop_name":         lot["crop_name"],
                "harvest_time_utc":  lot["harvest_time_utc"],
                "transit_mode":      lot.get("transit_mode", "normal"),
            },
            timeout=2,
        )
        freshness_score = fres.json().get("score", 100.0) if fres.ok else 100.0
        enriched.append({**lot, "freshness_score": freshness_score})

    return requests.post(
        "http://localhost:8002/api/v1/aggregate-orders",
        json={"farmer_lots": enriched, "destination": destination_payload},
        timeout=5,
    ).json()
```

---

## Running Unit Tests

```bash
cd smart_aggregation_engine
python.exe -m pytest tests/ -v
```

Expected output (all passing):
```
tests/test_smart_aggregation_engine.py::TestHaversine::test_same_point_is_zero             PASSED
tests/test_smart_aggregation_engine.py::TestHaversine::test_known_distance_hyderabad        PASSED
...
tests/test_smart_aggregation_engine.py::TestRealWorldScenarios::test_three_farmers_fill...  PASSED

50+ passed in 0.XX seconds
```

---

## Isolation Guarantee

- ✅ No Django models, views, or URLs modified
- ✅ No React components or routes modified
- ✅ No existing database schema altered
- ✅ `smart_aggregation_engine.py` has **zero external dependencies** (stdlib only)
- ✅ Runs on its own port (**8002**) — no conflict with Django (8000), Vite (5173), or Freshness Engine (8001)
- ✅ Can be removed completely without affecting any existing code
- ✅ Fully composable with the Freshness Score Engine via REST or direct import
