# SOP Engine Integration

The Commodity-Specific SOP Engine runs as a standalone FastAPI microservice on port **8004**. It deterministicly generates an operational playbook (SOP) based on the specific physical and commercial properties of an agricultural commodity.

## Starting the Service

Navigate to the `sop_engine` directory and run:

```bash
uvicorn api:app --port 8004
```

## API Endpoint: Generate SOP

**Endpoint:** `POST /api/v1/generate-sop`

**Payload:**

```json
{
  "action": "generate_sop",
  "commodity": {
    "name": "Tomatoes",
    "category": "Vegetable",
    "perishability": "high"
  },
  "reference_data": {
    "requires_cold_chain": true,
    "temperature_range": {
      "min_celsius": 2,
      "max_celsius": 8
    },
    "maximum_transit_time_hours": 36.0
  },
  "buyer_requirements": {
    "required_grade": "Grade A",
    "required_packaging": ["Plastic Crates (20kg)"]
  }
}
```

**Response Structure (Summary):**

The endpoint returns a robust, highly structured JSON output suitable for driving UI components, mobile checklists, and dispute resolution workflows:

```json
{
  "commodity": {
    "name": "Tomatoes",
    "category": "Vegetable",
    "perishability": "high"
  },
  "sop_version": "1.0.0",
  "sop_summary": "Operational playbook for Tomatoes optimized for high perishability profile.",
  "operational_priority": ["Minimize physical impact", "Speed to market", "Refrigerated transport"],
  "stages": [
    {
      "stage_id": "stage_harvest",
      "stage_name": "Harvest",
      "status": "required",
      "responsible_party": "farmer",
      "objective": "Harvest commodity at optimal maturity and prevent initial damage.",
      "steps": [...],
      "quality_controls": [...]
    },
    ...
  ],
  "commodity_handling_profile": {...},
  "packaging_standard": {...},
  "transportation_protocol": {...},
  "quality_and_grading": {...},
  "receiving_protocol": {...},
  "exception_handling": [...],
  "recovery_workflows": {...},
  "chain_of_custody": {...},
  "operational_checklist": [...],
  "reference_usage": {
    "default_used": false,
    "requires_human_review": false
  },
  "review_flags": []
}
```

## Integration with Django

You can call this microservice from any Django view or task.

```python
import requests

def get_sop_for_crop(crop_name):
    payload = {
        "action": "generate_sop",
        "commodity": {
            "name": crop_name,
            "perishability": "high"  # Fetch from your Crop database
        }
    }
    
    response = requests.post("http://localhost:8004/api/v1/generate-sop", json=payload)
    if response.status_code == 200:
        return response.json()
    return None
```
