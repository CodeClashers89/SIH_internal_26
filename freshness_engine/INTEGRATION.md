# 🌿 Freshness Score Engine — Integration Guide

A **standalone, plug-and-play microservice** that computes a dynamic Freshness Score (0–100) for agricultural commodities. Zero coupling to the host application.

---

## Directory Layout

```
freshness_engine/
├── freshness_engine.py        # Core math engine (zero external deps, stdlib only)
├── api.py                     # FastAPI REST wrapper
├── run.py                     # Server entry point  →  python run.py
├── requirements.txt           # Isolated deps (FastAPI + uvicorn + pytest)
├── tests/
│   ├── __init__.py
│   └── test_freshness_engine.py   # 30+ unit tests
└── INTEGRATION.md             # This document
```

---

## Quick Start

```bash
# 1. Navigate to the module directory
cd freshness_engine

# 2. Install dependencies (isolated — does NOT affect the main project)
pip install -r requirements.txt

# 3. Start the microservice (port 8001, won't conflict with Django on 8000)
python run.py

# 4. Open Swagger UI
#    http://localhost:8001/docs
```

---

## Core Math

```
Elapsed Hours  = (Current_UTC_Time − Harvest_UTC_Time) in hours
Decay Factor   = 0.6  (cold_chain)  |  1.0  (normal transit)
Penalty        = (Elapsed_Hours / Shelf_Life_Hours) × 100 × Decay_Factor
Freshness Score = clamp(100 − Penalty, 0, 100)
```

### Grade Classifications

| Score Range | Grade                       | Recommended Action              |
|-------------|-----------------------------|---------------------------------|
| 85 – 100    | ✅ Ultra Fresh (Premium)    | Full retail / premium pricing   |
| 60 – 84     | 🟢 Fresh (Standard)         | Standard retail sale            |
| 40 – 59     | 🟡 Needs Fast Sale          | Discounted sale within 24 hrs   |
| 0  – 39     | 🔴 Processing Grade         | Direct to industry / feed       |

---

## REST API Reference

**Base URL:** `http://localhost:8001`

### POST `/api/v1/calculate-freshness`

**Request body (JSON):**

```json
{
  "crop_name": "Tomato",
  "harvest_time_utc": "2026-08-20T06:00:00Z",
  "transit_mode": "cold_chain",
  "custom_shelf_life_hours": null,
  "evaluation_time_utc": null
}
```

| Field                   | Type     | Required | Description                                              |
|-------------------------|----------|----------|----------------------------------------------------------|
| `crop_name`             | string   | ✅       | Name of the crop (case-insensitive)                      |
| `harvest_time_utc`      | ISO-8601 | ✅       | UTC datetime of harvest                                  |
| `transit_mode`          | string   | ❌       | `"normal"` (default) or `"cold_chain"`                   |
| `custom_shelf_life_hours` | float  | ❌       | Override master-list shelf life (positive, hours)        |
| `evaluation_time_utc`   | ISO-8601 | ❌       | Override "now" for simulation/testing                    |

**Response body (JSON):**

```json
{
  "score": 70.0,
  "grade": "Fresh",
  "grade_advice": "Standard quality — suitable for retail.",
  "crop_name": "tomato",
  "shelf_life_hours": 120.0,
  "elapsed_hours": 50.0,
  "transit_mode": "cold_chain",
  "decay_factor": 0.6,
  "harvest_time_utc": "2026-08-20T06:00:00+00:00",
  "evaluated_at_utc": "2026-08-22T12:30:00+00:00",
  "warnings": []
}
```

### GET `/api/v1/crops`

Returns the full crop master-data dictionary and supported transit modes.

```json
{
  "crops": { "spinach": 36.0, "tomato": 120.0, "potato": 720.0, ... },
  "transit_modes": ["normal", "cold_chain"],
  "total_crops": 45
}
```

---

## Integration Patterns

### Pattern 1 — Python Library (direct import, zero network overhead)

Drop `freshness_engine.py` into any Python project and import it:

```python
from freshness_engine import calculate_freshness
from datetime import datetime, timezone

result = calculate_freshness(
    crop_name="Mango",
    harvest_time_utc=datetime(2026, 8, 20, 6, 0, 0, tzinfo=timezone.utc),
    transit_mode="cold_chain",
)
print(f"Score: {result.score} | Grade: {result.grade}")
# Score: 85.14 | Grade: Ultra Fresh
```

### Pattern 2 — Django Integration (call the API from an existing view)

The microservice runs independently. Call it from any Django view without schema changes:

```python
# In any existing Django view — no model changes required
import requests

def get_product_freshness(product):
    response = requests.post(
        "http://localhost:8001/api/v1/calculate-freshness",
        json={
            "crop_name": product.name,
            "harvest_time_utc": product.harvest_date.isoformat() + "T00:00:00Z",
            "transit_mode": "normal",
        },
        timeout=2,
    )
    if response.ok:
        return response.json()
    return None
```

### Pattern 3 — React / Frontend JavaScript (fetch from browser)

```javascript
// Anywhere in your React app — no backend changes needed
async function getFreshnessScore(cropName, harvestDate) {
  const response = await fetch("http://localhost:8001/api/v1/calculate-freshness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      crop_name: cropName,
      harvest_time_utc: new Date(harvestDate).toISOString(),
      transit_mode: "normal",
    }),
  });
  return response.json();
}

// Example usage in a product card component
const data = await getFreshnessScore("Tomato", "2026-08-20");
console.log(data.score, data.grade);
// 83.33  "Fresh"
```

### Pattern 4 — Vanilla HTML / CDN Widget (no framework required)

Embed this snippet into any static HTML page without touching existing site architecture:

```html
<!-- Freshness Score Widget — drop anywhere, zero side effects -->
<div id="freshness-widget">
  <span id="freshness-score">Loading...</span>
</div>

<script>
(async () => {
  const res = await fetch("http://localhost:8001/api/v1/calculate-freshness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      crop_name: "Spinach",
      harvest_time_utc: "2026-08-21T06:00:00Z",
      transit_mode: "cold_chain"
    })
  });
  const data = await res.json();
  const el = document.getElementById("freshness-score");
  el.textContent = `${data.score}/100 — ${data.grade}`;
  el.style.color = data.score >= 85 ? "green" : data.score >= 60 ? "orange" : "red";
})();
</script>
```

---

## Running Unit Tests

```bash
cd freshness_engine
pytest tests/ -v
```

Expected output (all passing):
```
tests/test_freshness_engine.py::TestCoreEngine::test_returns_freshness_result         PASSED
tests/test_freshness_engine.py::TestCoreEngine::test_score_range_always_0_to_100      PASSED
tests/test_freshness_engine.py::TestGradeBandsNormal::test_ultra_fresh                PASSED
tests/test_freshness_engine.py::TestGradeBandsNormal::test_fresh_standard             PASSED
...
tests/test_freshness_engine.py::TestRealWorldScenarios::test_mango_5days_cold_chain   PASSED

30 passed in 0.XX seconds
```

---

## Crop Master Data (sample)

| Crop        | Shelf Life (hrs) | Notes                          |
|-------------|-----------------|--------------------------------|
| Mint        | 24              | Extremely perishable           |
| Spinach     | 36              | Leafy, high moisture           |
| Okra        | 48              | Tropical vegetable             |
| Strawberry  | 48              | Delicate fruit                 |
| Tomato      | 120             | Standard fruiting vegetable    |
| Banana      | 120             | Pre-ripened                    |
| Mango       | 168             | Tropical stone fruit           |
| Carrot      | 480             | Root vegetable                 |
| Potato      | 720             | Stable root vegetable          |
| Ginger      | 720             | Rhizome                        |
| Onion       | 1440            | Bulb vegetable, long shelf     |
| Apple       | 1440            | Temperate fruit, cold-storage  |
| Garlic      | 4320            | Cured bulb                     |
| Wheat       | 8760            | Dry grain (1 year)             |
| Rice        | 8760            | Dry grain (1 year)             |

*Unknown crops fall back to the default of 120 hours with a warning in the response.*

---

## Isolation Guarantee

- ✅ No Django models, views, or URLs are modified
- ✅ No React components or routes are modified  
- ✅ No existing database schema is altered
- ✅ Runs on its own port (8001) — no conflict with Django (8000) or Vite (5173)
- ✅ `freshness_engine.py` has **zero external dependencies** (stdlib only)
- ✅ Can be removed completely without affecting the host application
