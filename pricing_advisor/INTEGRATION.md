# 💰 Spoilage-Aware Dynamic Pricing Advisor — Integration Guide

A **standalone, plug-and-play microservice** that recommends consent-first, tiered discount ladders for agricultural produce approaching spoilage.

**The farmer always decides.** No price change is applied automatically.

---

## Directory Layout

```
pricing_advisor/
├── pricing_advisor.py       # Core engine (stdlib only, zero external deps)
├── api.py                   # FastAPI REST wrapper  (Pydantic v2, port 8003)
├── run.py                   # Server entry point  → python run.py
├── requirements.txt         # Isolated deps
├── tests/
│   ├── __init__.py
│   └── test_pricing_advisor.py   # 70+ unit tests
└── INTEGRATION.md           # This document
```

---

## Quick Start

```bash
cd pricing_advisor
pip install -r requirements.txt
python run.py
# → http://localhost:8003/docs
```

---

## Port Allocation

| Port | Service |
|------|---------|
| 8000 | Django backend |
| 5173 | Vite / React frontend |
| 8001 | Freshness Score Engine |
| 8002 | Smart Order Aggregation Engine |
| **8003** | **Pricing Advisor ← this service** |

---

## Two-Stage Consent Flow

```
┌─────────────────────────────────────────────────────────┐
│ Stage 1 — POST /api/v1/price-advisor                    │
│ (no decision_input)                                     │
│                                                         │
│ → Returns: stage = "awaiting_farmer_decision"           │
│   • batch_summary & risk_if_no_action                   │
│   • suggested_pricing_ladder  (tiered, convex ramp)     │
│   • question_to_farmer + 4 options (a / b / c / d)      │
└──────────────────────────┬──────────────────────────────┘
                           │ Farmer responds
┌──────────────────────────▼──────────────────────────────┐
│ Stage 2 — POST /api/v1/price-advisor                    │
│ (decision_input included)                               │
│                                                         │
│ Choice (a) Accept plan   → confirmed ladder returned    │
│ Choice (b) Custom discount → recomputed ladder          │
│ Choice (c) Keep price    → no ladder, risk restated     │
│ Choice (d) Withdraw      → withdrawn_from_market = true │
└─────────────────────────────────────────────────────────┘
```

---

## Algorithm

```
1. effective_start_price = min(current_listed_price, local_mandi_average)
2. urgency_tier          = f(days_until_spoilage)
                           CRITICAL ≤2d | HIGH 3-5d | MEDIUM 6-10d | LOW 11+d
3. (base_discount%, max_discount%) = table[urgency][buyer_interest]
4. Per-day discount = convex ramp  (quadratic, steeper near spoilage)
5. Floor-breach check: if price < cost_price → clamp to cost, except on the
   final day where a below-cost price is flagged but allowed to prevent
   total batch loss.
6. expected_qty_moved/day = (base_daily_qty × elasticity_boost × interest_mult)
```

---

## REST API Reference

### Stage 1 Request

```json
{
  "crop_name": "Tomato",
  "quantity_kg": 500,
  "days_until_spoilage": 3,
  "current_listed_price_per_kg": 25.0,
  "farmer_cost_price_per_kg": 14.0,
  "local_mandi_average_price_per_kg": 22.0,
  "recent_sell_through_rate": 40,
  "buyer_interest_signal": "low"
}
```

### Stage 1 Response

```json
{
  "stage": "awaiting_farmer_decision",
  "batch_id": "auto-uuid",
  "batch_summary": "Tomato | 500.0 kg | 3 day(s) until spoilage | Listed: ₹25.0/kg",
  "urgency_level": "🔴 High priority",
  "risk_if_no_action": "At the current price of ₹25.0/kg with low buyer interest...",
  "suggested_pricing_ladder": [
    { "day": 1, "price_per_kg": 19.36, "discount_pct": 12.0, "expected_qty_moved_kg": 145.08, "remaining_qty_kg": 354.92 },
    { "day": 2, "price_per_kg": 17.16, "discount_pct": 21.0, "expected_qty_moved_kg": 182.40, "remaining_qty_kg": 172.52 },
    { "day": 3, "price_per_kg": 14.00, "discount_pct": 30.0, "expected_qty_moved_kg": 172.52, "remaining_qty_kg": 0.0 }
  ],
  "question_to_farmer": "Do you want to reduce the price to help sell this stock before it spoils?",
  "options": [
    { "id": "a", "label": "Yes, use the suggested plan" },
    { "id": "b", "label": "Yes, but let me set my own discount" },
    { "id": "c", "label": "No, keep current price" },
    { "id": "d", "label": "No, don't sell this batch (withdraw)" }
  ]
}
```

### Stage 2 Request (farmer chose option a)

```json
{
  "crop_name": "Tomato",
  "quantity_kg": 500,
  "days_until_spoilage": 3,
  "current_listed_price_per_kg": 25.0,
  "farmer_cost_price_per_kg": 14.0,
  "local_mandi_average_price_per_kg": 22.0,
  "recent_sell_through_rate": 40,
  "buyer_interest_signal": "low",
  "decision_input": { "farmer_choice": "a" }
}
```

### Stage 2 Request (farmer chose custom discount)

```json
{
  ...same batch fields...,
  "decision_input": {
    "farmer_choice": "b",
    "custom_discount_pct": 20.0
  }
}
```

### Stage 2 Response

```json
{
  "stage": "decision_applied",
  "farmer_choice": "a",
  "withdrawn_from_market": false,
  "final_pricing_ladder": [ ... ],
  "floor_breach": { "occurs": false, "day": null, "reason": null },
  "estimated_total_revenue": 8742.50,
  "farmer_message": "Great! The suggested pricing plan for your Tomato batch (500.0 kg) has been accepted..."
}
```

---

## Integration Patterns

### Pattern 1 — Python Library (zero network overhead)

```python
from pricing_advisor import BatchInput, DecisionInput, build_pricing_advice

batch = BatchInput(
    crop_name="Tomato", quantity_kg=500, days_until_spoilage=3,
    current_listed_price_per_kg=25.0, farmer_cost_price_per_kg=14.0,
    local_mandi_average_price_per_kg=22.0,
    recent_sell_through_rate=40.0, buyer_interest_signal="low",
)

# Stage 1 — present to farmer
r1 = build_pricing_advice(batch)
print(r1["question_to_farmer"])   # Show this to farmer in UI

# Stage 2 — after farmer responds
r2 = build_pricing_advice(batch, DecisionInput(farmer_choice="a"))
print(r2["farmer_message"])
```

### Pattern 2 — Django View Integration

```python
import requests

def get_pricing_advice(product):
    # Stage 1 payload
    payload = {
        "crop_name": product.crop_name,
        "quantity_kg": product.stock_kg,
        "days_until_spoilage": product.days_to_expire,
        "current_listed_price_per_kg": float(product.price),
        "farmer_cost_price_per_kg": float(product.cost_price),
        "local_mandi_average_price_per_kg": float(product.mandi_avg),
        "recent_sell_through_rate": product.sell_through_pct,
        "buyer_interest_signal": product.demand_signal,
    }
    resp = requests.post("http://localhost:8003/api/v1/price-advisor", json=payload, timeout=3)
    return resp.json() if resp.ok else None

def apply_farmer_decision(product, choice, custom_discount=None):
    decision = {"farmer_choice": choice}
    if custom_discount:
        decision["custom_discount_pct"] = custom_discount
    payload = {...same batch fields..., "decision_input": decision}
    resp = requests.post("http://localhost:8003/api/v1/price-advisor", json=payload, timeout=3)
    return resp.json() if resp.ok else None
```

### Pattern 3 — React Component

```javascript
async function getPricingAdvice(batchData) {
  const response = await fetch("http://localhost:8003/api/v1/price-advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batchData),
  });
  return response.json();
}

async function submitFarmerDecision(batchData, choice, customDiscount = null) {
  const payload = {
    ...batchData,
    decision_input: {
      farmer_choice: choice,
      ...(customDiscount && { custom_discount_pct: customDiscount }),
    },
  };
  const response = await fetch("http://localhost:8003/api/v1/price-advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}
```

### Pattern 4 — Combined with Freshness Engine (Port 8001)

```python
import requests

def full_spoilage_assessment(crop_name, harvest_time_utc, quantity_kg, ...):
    # Step 1: Get freshness score from Freshness Engine
    freshness = requests.post(
        "http://localhost:8001/api/v1/calculate-freshness",
        json={"crop_name": crop_name, "harvest_time_utc": harvest_time_utc, "transit_mode": "normal"},
        timeout=2,
    ).json()

    # Step 2: Map freshness score to days_until_spoilage estimate
    # (score 100 = just harvested, 0 = fully spoiled)
    days_estimate = max(0, round(freshness["score"] / 100 * 7))  # example mapping

    # Step 3: Get pricing advice
    advice = requests.post(
        "http://localhost:8003/api/v1/price-advisor",
        json={
            "crop_name": crop_name,
            "quantity_kg": quantity_kg,
            "days_until_spoilage": days_estimate,
            ...
        },
        timeout=3,
    ).json()

    return {"freshness": freshness, "pricing_advice": advice}
```

---

## Running Unit Tests

```bash
cd pricing_advisor
python.exe -m pytest tests/ -v
```

Expected:
```
tests/test_pricing_advisor.py::TestBatchInputValidation::...   PASSED
...
70+ passed in 0.XX seconds
```

---

## Isolation Guarantee

- ✅ No Django models, views, or URLs modified
- ✅ No React components or routes modified
- ✅ No existing database schema altered
- ✅ `pricing_advisor.py` has **zero external dependencies** (stdlib only)
- ✅ Runs on port **8003** — no conflict with Django (8000), Vite (5173), Freshness (8001), Aggregation (8002)
- ✅ Can be removed completely without affecting the host application
- ✅ Fully composable with Freshness Engine and Aggregation Engine
