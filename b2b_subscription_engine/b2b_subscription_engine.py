import json
import os
import uuid
from typing import List, Dict, Optional
from pydantic import BaseModel
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), 'subscriptions.json')

class BuyerProfile(BaseModel):
    buyer_id: str
    name: str
    delivery_address: str

class ScheduleMatrix(BaseModel):
    recurring_days: List[str] # e.g. ["Monday", "Thursday"], or ["Daily"]
    next_execution_date: Optional[str] = None

class ItemBreakdown(BaseModel):
    commodity_name: str
    quantity: float
    unit: str
    price_per_unit: float

class SubscriptionPlan(BaseModel):
    subscription_id: str
    farmer_id: str
    buyer_profile: BuyerProfile
    schedule_matrix: ScheduleMatrix
    items_breakdown: List[ItemBreakdown]
    billing_summary: Optional[Dict] = None
    is_active: bool = True
    approval_status: str = "PENDING"

class EngineDB:
    @staticmethod
    def load() -> Dict[str, SubscriptionPlan]:
        if not os.path.exists(DB_FILE):
            return {}
        with open(DB_FILE, 'r') as f:
            try:
                data = json.load(f)
                return {k: SubscriptionPlan(**v) for k, v in data.items()}
            except json.JSONDecodeError:
                return {}

    @staticmethod
    def save(data: Dict[str, SubscriptionPlan]):
        with open(DB_FILE, 'w') as f:
            json.dump({k: v.model_dump() for k, v in data.items()}, f, indent=2)

def calculate_billing(items: List[ItemBreakdown], frequency_multiplier: int) -> Dict:
    # Basic logic: 10% B2B discount if total > 1000
    subtotal = sum(i.quantity * i.price_per_unit for i in items)
    weekly_total = subtotal * frequency_multiplier
    discount = 0.10 if weekly_total > 1000 else 0
    final_weekly = weekly_total * (1 - discount)
    return {
        "weekly_estimate": round(final_weekly, 2),
        "monthly_estimate": round(final_weekly * 4.33, 2),
        "discount_applied_pct": discount * 100
    }

def create_subscription(payload: dict) -> dict:
    db = EngineDB.load()
    sub_id = f"sub-{uuid.uuid4().hex[:8]}"
    
    # Calculate frequency for billing
    days = payload.get('schedule_matrix', {}).get('recurring_days', [])
    freq = 7 if "Daily" in days else len(days)
    
    items = [ItemBreakdown(**i) for i in payload.get('items_breakdown', [])]
    billing = calculate_billing(items, freq)
    
    sub = SubscriptionPlan(
        subscription_id=sub_id,
        farmer_id=payload.get('farmer_id', ''),
        buyer_profile=BuyerProfile(**payload['buyer_profile']),
        schedule_matrix=ScheduleMatrix(**payload['schedule_matrix']),
        items_breakdown=items,
        billing_summary=billing,
        is_active=True,
        approval_status="PENDING"
    )
    db[sub_id] = sub
    EngineDB.save(db)
    return sub.model_dump()

def toggle_status(subscription_id: str, active: bool) -> dict:
    db = EngineDB.load()
    if subscription_id not in db:
        raise ValueError(f"Subscription {subscription_id} not found")
    sub = db[subscription_id]
    sub.is_active = active
    EngineDB.save(db)
    return sub.model_dump()

def respond_to_subscription(subscription_id: str, accept: bool) -> dict:
    db = EngineDB.load()
    if subscription_id not in db:
        raise ValueError(f"Subscription {subscription_id} not found")
    sub = db[subscription_id]
    sub.approval_status = "ACCEPTED" if accept else "REJECTED"
    EngineDB.save(db)
    return sub.model_dump()

def trigger_daily_cron(target_day: str) -> List[dict]:
    """
    Evaluates active subscriptions matching the target_day and generates
    orders tagged with B2B_PRIME_PRIORITY.
    target_day e.g., 'Monday', 'Tuesday', or 'Daily'
    """
    db = EngineDB.load()
    generated_orders = []
    
    for sub_id, sub in db.items():
        if not sub.is_active or sub.approval_status != "ACCEPTED":
            continue
            
        days = sub.schedule_matrix.recurring_days
        if "Daily" in days or target_day in days:
            # Generate Order
            order = {
                "order_id": f"ord-{uuid.uuid4().hex[:8]}",
                "subscription_id": sub.subscription_id,
                "buyer": sub.buyer_profile.model_dump(),
                "items": [i.model_dump() for i in sub.items_breakdown],
                "priority_tag": "B2B_PRIME_PRIORITY",
                "delivery_slot": "06:00 AM - 08:00 AM",
                "generated_for_day": target_day,
                "status": "DISPATCH_READY",
                "timestamp": datetime.now().isoformat()
            }
            generated_orders.append(order)
            
    return generated_orders

def get_subscriptions(buyer_id: str = None, farmer_id: str = None) -> List[dict]:
    db = EngineDB.load()
    subs = []
    for sub in db.values():
        if buyer_id and sub.buyer_profile.buyer_id != buyer_id:
            continue
        if farmer_id and sub.farmer_id != farmer_id:
            continue
        subs.append(sub.model_dump())
    return subs
