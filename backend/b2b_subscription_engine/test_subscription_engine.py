import os
import pytest
from b2b_subscription_engine import create_subscription, toggle_status, trigger_daily_cron, DB_FILE

@pytest.fixture(autouse=True)
def clean_db():
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
    yield
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)

def test_create_and_billing():
    payload = {
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
    
    sub = create_subscription(payload)
    assert sub['subscription_id'] is not None
    assert sub['is_active'] is True
    assert sub['buyer_profile']['name'] == "Fresh Foods Catering"
    # subtotal = 100 * 20 = 2000
    # weekly = 2000 * 2 = 4000
    # >1000 so 10% discount -> 3600
    assert sub['billing_summary']['weekly_estimate'] == 3600.0

def test_trigger_daily_cron():
    payload = {
        "buyer_profile": {
            "buyer_id": "b-001",
            "name": "Test",
            "delivery_address": "Test"
        },
        "schedule_matrix": {
            "recurring_days": ["Monday"]
        },
        "items_breakdown": [
            {"commodity_name": "Tomatoes", "quantity": 100, "unit": "kg", "price_per_unit": 20}
        ]
    }
    
    sub = create_subscription(payload)
    sub_id = sub['subscription_id']
    
    # Trigger on Tuesday
    orders = trigger_daily_cron("Tuesday")
    assert len(orders) == 0
    
    # Trigger on Monday
    orders = trigger_daily_cron("Monday")
    assert len(orders) == 1
    assert orders[0]['subscription_id'] == sub_id
    assert orders[0]['priority_tag'] == "B2B_PRIME_PRIORITY"

def test_holiday_pause():
    payload = {
        "buyer_profile": {
            "buyer_id": "b-001",
            "name": "Test",
            "delivery_address": "Test"
        },
        "schedule_matrix": {
            "recurring_days": ["Daily"]
        },
        "items_breakdown": []
    }
    sub = create_subscription(payload)
    sub_id = sub['subscription_id']
    
    # Pause
    toggle_status(sub_id, False)
    
    # Cron shouldn't generate
    orders = trigger_daily_cron("Monday")
    assert len(orders) == 0
    
    # Resume
    toggle_status(sub_id, True)
    orders = trigger_daily_cron("Monday")
    assert len(orders) == 1
