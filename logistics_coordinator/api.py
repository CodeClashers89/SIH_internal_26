from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from coordinator_engine import LogisticsCoordinatorEngine

app = FastAPI(title="Shipment Logistics & Compliance Coordinator API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/coordinator")
async def coordinator_action(payload: Dict[str, Any]):
    action = payload.get("action")
    if not action:
        raise HTTPException(status_code=400, detail="Missing 'action' field in payload.")
        
    try:
        if action == "filter_eligible_vehicles":
            return LogisticsCoordinatorEngine.filter_eligible_vehicles(payload)
            
        elif action == "build_optimization_spec":
            return LogisticsCoordinatorEngine.build_optimization_spec(payload)
            
        elif action == "interpret_optimization_result":
            return LogisticsCoordinatorEngine.interpret_optimization_result(payload)
            
        elif action == "handle_failure_recovery":
            return LogisticsCoordinatorEngine.handle_failure_recovery(payload)
            
        elif action == "generate_monitoring_update":
            return LogisticsCoordinatorEngine.generate_monitoring_update(payload)
            
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
