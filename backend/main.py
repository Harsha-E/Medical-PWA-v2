from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="MedCare MIOS Intelligence Layer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScannedEntity(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    manufacturer: Optional[str] = None

class IntelligenceResponse(BaseModel):
    confidence: float
    entity: ScannedEntity
    evidence_status: str
    missing_fields: List[str]

@app.get("/")
def health_check():
    return {"status": "ok", "layer": "MedCare MIOS Intelligence Gateway"}

@app.post("/api/intelligence/analyze", response_model=IntelligenceResponse)
async def analyze_scan(image: UploadFile = File(...)):
    # TODO: Pipe image into ONNX depth map, OCR fusion, and reasoning.
    # For now, returning dummy MIOS structure to establish connection.
    
    return IntelligenceResponse(
        confidence=85.5,
        entity=ScannedEntity(
            name="Awaiting OCR",
            dosage="500mg",
            manufacturer="Generic Pharma"
        ),
        evidence_status="NEEDS_REVIEW",
        missing_fields=["name"]
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
