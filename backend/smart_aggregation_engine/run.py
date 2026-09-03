"""
run.py
======
Entry point to start the Smart Order Aggregation Engine API server.

Usage:
    python run.py

Server starts at:   http://localhost:8002
Swagger UI:         http://localhost:8002/docs
ReDoc:              http://localhost:8002/redoc

Port allocation (no conflicts):
  8000 → Django backend
  5173 → Vite frontend
  8001 → Freshness Score Engine
  8002 → Smart Order Aggregation Engine  ← this service
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8002,          # No conflict with Django (8000), Vite (5173), or Freshness Engine (8001)
        reload=True,        # Auto-reload on code changes during development
        log_level="info",
    )
