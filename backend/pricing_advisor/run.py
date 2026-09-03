"""
run.py
======
Entry point to start the Spoilage-Aware Dynamic Pricing Advisor API server.

Usage:
    python run.py

Server starts at:   http://localhost:8003
Swagger UI:         http://localhost:8003/docs
ReDoc:              http://localhost:8003/redoc

Port allocation (no conflicts):
  8000 → Django backend
  5173 → Vite frontend
  8001 → Freshness Score Engine
  8002 → Smart Order Aggregation Engine
  8003 → Spoilage-Aware Pricing Advisor  ← this service
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info",
    )
