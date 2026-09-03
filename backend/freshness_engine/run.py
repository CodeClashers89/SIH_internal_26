"""
run.py
======
Entry point to start the Freshness Score Engine API server.

Usage:
    python run.py

The server starts on http://localhost:8001
Swagger UI available at http://localhost:8001/docs
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8001,          # Does NOT conflict with Django (8000) or Vite (5173)
        reload=True,        # Auto-reload on code changes during development
        log_level="info",
    )
