"""
BillWise — Custom ML Invoice Category Inference Microservice
FastAPI service exposing POST /classify and GET /health.
"""

import os
import json
import joblib
import logging
import numpy as np
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("billwise-ml-service")

# Global model state
MODEL_PIPELINE = None
MODEL_CLASSES = []
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "invoice_classifier.joblib")
FEEDBACK_LOG_PATH = os.path.join(BASE_DIR, "data", "feedback_log.jsonl")

CONFIDENCE_THRESHOLD = 0.25  # Below this threshold, fall back to "Other" (random baseline is 1/15 = 6.7%)
DEFAULT_CATEGORY = "Other"

def load_ml_model():
    global MODEL_PIPELINE, MODEL_CLASSES
    logger.info("Initializing BillWise ML Invoice Classifier...")
    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model file not found at: {MODEL_PATH}. Please run train.py first.")
        return
        
    try:
        MODEL_PIPELINE = joblib.load(MODEL_PATH)
        MODEL_CLASSES = [str(c) for c in MODEL_PIPELINE.classes_]
        logger.info(f"[OK] Model successfully loaded with {len(MODEL_CLASSES)} categories: {MODEL_CLASSES}")
    except Exception as e:
        logger.error(f"Failed to load ML model: {e}", exc_info=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_ml_model()
    yield

app = FastAPI(
    title="BillWise ML Category Classifier Service",
    description="Microservice providing real-time supervised ML invoice category classification",
    version="1.0.0",
    lifespan=lifespan
)

# Allow CORS for direct testing if required
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyRequest(BaseModel):
    text: str = Field(..., description="OCR extracted invoice text")
    vendorNameHint: Optional[str] = Field(None, description="Optional vendor name hint extracted by OCR/regex")

class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    reason: str

def log_prediction_feedback(text: str, vendor_hint: Optional[str], predicted_category: str, confidence: float):
    """Logs production classifications for retraining feedback loop."""
    try:
        os.makedirs(os.path.dirname(FEEDBACK_LOG_PATH), exist_ok=True)
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "vendor_hint": vendor_hint,
            "text_snippet": text[:250].replace("\n", " "),
            "predicted_category": predicted_category,
            "confidence": round(confidence, 4)
        }
        with open(FEEDBACK_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as err:
        logger.warning(f"Could not write to feedback log: {err}")

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "billwise-ml-classifier",
        "modelLoaded": MODEL_PIPELINE is not None,
        "categoriesCount": len(MODEL_CLASSES),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/classify", response_model=ClassifyResponse)
def classify_invoice(req: ClassifyRequest):
    if not req.text or not req.text.strip():
        return ClassifyResponse(
            category=DEFAULT_CATEGORY,
            confidence=0.50,
            reason="Empty OCR text provided; defaulted to Other."
        )

    # If model is not loaded, attempt reload
    if MODEL_PIPELINE is None:
        load_ml_model()
        if MODEL_PIPELINE is None:
            raise HTTPException(status_code=503, detail="ML Classifier Model is currently not loaded.")

    # Combine vendor name hint and OCR text for rich feature extraction
    combined_input = f"{req.vendorNameHint or ''} {req.text}".strip()

    try:
        probabilities = MODEL_PIPELINE.predict_proba([combined_input])[0]
        top_idx = int(np.argmax(probabilities))
        raw_category = MODEL_CLASSES[top_idx]
        confidence = float(probabilities[top_idx])

        # Confidence thresholding & fallback
        if confidence < CONFIDENCE_THRESHOLD:
            final_category = DEFAULT_CATEGORY
            reason = f"ML model confidence ({confidence*100:.1f}%) below threshold ({CONFIDENCE_THRESHOLD*100:.0f}%); defaulted to Other."
        else:
            final_category = raw_category
            reason = f"Classified by BillWise ML Model (TF-IDF + LogisticRegression with {confidence*100:.1f}% confidence)."

        # Record to production feedback loop
        log_prediction_feedback(req.text, req.vendorNameHint, final_category, confidence)

        return ClassifyResponse(
            category=final_category,
            confidence=round(confidence, 3),
            reason=reason
        )
    except Exception as e:
        logger.error(f"Inference error during classification: {e}", exc_info=True)
        return ClassifyResponse(
            category=DEFAULT_CATEGORY,
            confidence=0.50,
            reason=f"Classification inference error: {str(e)[:100]}"
        )

if __name__ == "__main__":
    load_ml_model()
    uvicorn.run(app, host="0.0.0.0", port=8000)
