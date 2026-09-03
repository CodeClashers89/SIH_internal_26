from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

from b2b_subscription_engine import create_subscription, toggle_status, trigger_daily_cron, get_subscriptions, respond_to_subscription

app = FastAPI(title="B2B Recurring Smart Subscription Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ToggleRequest(BaseModel):
    subscription_id: str
    active: bool

class CronRequest(BaseModel):
    target_day: str

class RespondRequest(BaseModel):
    subscription_id: str
    accept: bool

@app.post("/api/v1/subscription/create")
def create_sub(payload: Dict[str, Any]):
    try:
        result = create_subscription(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/subscription/toggle-status")
def toggle_sub(req: ToggleRequest):
    try:
        result = toggle_status(req.subscription_id, req.active)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/subscription/trigger-daily-cron")
def trigger_cron(req: CronRequest):
    try:
        orders = trigger_daily_cron(req.target_day)
        return {"generated_orders": orders, "count": len(orders)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/subscription/list")
def list_subs(buyer_id: Optional[str] = None, farmer_id: Optional[str] = None):
    try:
        return get_subscriptions(buyer_id=buyer_id, farmer_id=farmer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/subscription/respond")
def respond_sub(req: RespondRequest):
    try:
        result = respond_to_subscription(req.subscription_id, req.accept)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
