# B2B Recurring Smart Subscription Engine

A standalone, plug-and-play microservice for B2B recurring orders. Built with FastAPI to operate completely independently from the core platform, ensuring zero side effects on existing schemas or frontend components.

## Features
- **Recurring Standing Orders:** Support for Daily or specific weekdays (e.g., Monday/Thursday).
- **Automated Order Generation:** Daily cron-triggerable endpoint to auto-generate dispatch-ready purchase orders.
- **Schedule Control:** Easy API for pausing/resuming subscriptions (holiday pauses).
- **Prime Priority:** Automatically tags generated orders with `B2B_PRIME_PRIORITY` for early morning dispatch (06:00 AM - 08:00 AM).

## Setup & Running
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the server:
   ```bash
   uvicorn app:app --port 8001 --reload
   ```

## REST API Endpoints

### 1. Create Subscription
`POST /api/v1/subscription/create`
**Payload:**
```json
{
  "buyer_profile": {
    "buyer_id": "b-001",
    "name": "Fresh Foods Catering",
    "delivery_address": "123 Main St"
  },
  "schedule_matrix": {
    "recurring_days": ["Monday", "Thursday"]
  },
  "items_breakdown": [
    {
      "commodity_name": "Tomatoes",
      "quantity": 100,
      "unit": "kg",
      "price_per_unit": 20
    }
  ]
}
```

### 2. Toggle Status (Pause/Resume)
`POST /api/v1/subscription/toggle-status`
**Payload:**
```json
{
  "subscription_id": "sub-12345678",
  "active": false
}
```

### 3. Trigger Daily Cron
`POST /api/v1/subscription/trigger-daily-cron`
Simulates the daily job for a given target day. Evaluates all active subscriptions and generates priority orders if the day matches.
**Payload:**
```json
{
  "target_day": "Monday"
}
```

## Testing
Run unit tests with pytest:
```bash
pytest test_subscription_engine.py
```
