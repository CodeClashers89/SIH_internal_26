from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import ValidationError
from sop_engine import SOPEngine, GenerateSOPRequest, GenerateSOPResponse

app = FastAPI(title="Commodity-Specific SOP Engine", version="1.0.0")

# Enable CORS for integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SOPEngine()

@app.post("/api/v1/generate-sop", response_model=GenerateSOPResponse)
def generate_sop_endpoint(request: GenerateSOPRequest):
    try:
        if request.action != "generate_sop":
            raise HTTPException(status_code=400, detail="Invalid action. Only 'generate_sop' is supported.")
        response = engine.generate_sop(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8004, reload=True)
