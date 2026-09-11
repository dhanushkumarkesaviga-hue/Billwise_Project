"""
BillWise — Custom ML Invoice Category Inference Microservice
FastAPI service exposing POST /classify and GET /health.
"""

import os
import re
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

CONFIDENCE_THRESHOLD = 0.05  # In a 15-class space, random baseline is ~0.067
DEFAULT_CATEGORY = "Other"

# Domain-specific keyword booster dictionaries for robust real-world Indian OCR invoices
CATEGORY_KEYWORDS = {
    "Cloud Infrastructure": [
        "aws", "amazon web services", "azure", "google cloud", "gcp", "ec2", "s3", "rds",
        "kubernetes", "cloud hosting", "server hosting", "digitalocean", "linode", "cloudflare", "cdn", "vpc", "vps"
    ],
    "Software & Subscriptions": [
        "software", "subscription", "license", "saas", "atlassian", "jira", "confluence",
        "github", "slack", "zoho", "jetbrains", "adobe", "notion", "figma", "docker", "postman",
        "datadog", "nextgen", "sln softwares", "it solutions", "app development", "portal"
    ],
    "Freight & Transport": [
        "freight", "transport", "logistics", "cargo", "courier", "consignment", "truck",
        "haulage", "cartage", "gta", "goods transport", "blue dart", "vrl", "delhivery", "tci", "western carriers", "dtdc"
    ],
    "Food & Entertainment": [
        "hotel", "restaurant", "catering", "buffet", "dinner", "lunch", "banquet",
        "dining", "food", "cafeteria", "beverages", "swiggy", "zomato", "barbeque", "chai point", "coffee"
    ],
    "Insurance": [
        "insurance", "policy", "premium", "mediclaim", "hdfc ergo", "icici lombard", "tata aig",
        "bajaj allianz", "star health", "assurance", "indemnity", "fire perils", "d&o", "marine open"
    ],
    "Raw Materials": [
        "steel", "polymer", "chemical", "yarn", "fasteners", "bolts", "aluminium", "ingot",
        "resin", "solvent", "raw material", "press tool", "tool room", "moulds", "dies", "copper wire", "punches"
    ],
    "Capital Goods & Office Assets": [
        "laptop", "desktop", "server", "photocopier", "air conditioner", "generator",
        "chairs", "desks", "furniture", "display", "mobile", "smartphone", "handset", "telecom", "hardware", "machinery"
    ],
    "Professional & Legal Services": [
        "audit", "legal", "advocate", "chartered accountant", "consulting", "retainer",
        "trademark", "patent", "statutory audit", "tax audit", "kpmg", "ey", "pwc", "bdo", "company secretary", "roc"
    ],
    "Utilities": [
        "electricity", "broadband", "fiber", "leased line", "water supply", "natural gas",
        "power", "tata power", "bescom", "airtel", "jio", "vodafone", "msedcl"
    ],
    "Rent & Facilities": [
        "rent", "lease", "coworking", "wework", "office premises", "warehouse bay", "common area maintenance", "cam charges"
    ],
    "Marketing & Advertising": [
        "google ads", "advertising", "sponsored", "meta platforms", "facebook ads", "linkedin ads",
        "campaign", "billboard", "hoarding", "seo", "branding", "marketing"
    ],
    "Office Supplies & Stationery": [
        "stationery", "paper", "copier", "reams", "pens", "markers", "stapler",
        "toner", "cartridge", "brochures", "visiting cards", "traders", "sithy vinayagar"
    ],
    "Travel & Conveyance": [
        "flight", "ticket", "airline", "indigo", "air india", "uber", "ola",
        "hotel stay", "lodging", "boarding pass", "travel agency", "makemytrip"
    ],
    "Repairs & Maintenance": [
        "amc", "annual maintenance", "servicing", "repair", "overhaul", "pest control",
        "fumigation", "sanitization", "cctv repair", "elevator maintenance"
    ]
}

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

def clean_ocr_text(text: str) -> str:
    """Removes OCR artifact headers to expose core terms to the classifier."""
    cleaned = re.sub(r"===\s*\[PAGE\s*\d+\s*OF\s*\d+\]\s*===", " ", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"==+", " ", cleaned)
    cleaned = re.sub(r"--+", " ", cleaned)
    return cleaned.strip()

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

    cleaned_text = clean_ocr_text(req.text)
    vendor_hint = (req.vendorNameHint or "").strip()
    
    # Weight vendor hint significantly as company name strongly correlates with category
    combined_input = f"{vendor_hint} {vendor_hint} {cleaned_text}".strip()

    try:
        probabilities = MODEL_PIPELINE.predict_proba([combined_input])[0].copy()
        
        # Apply domain keyword booster prior to refine confidence on noisy OCR
        text_lower = f"{vendor_hint} {cleaned_text}".lower()
        for cat_name, kw_list in CATEGORY_KEYWORDS.items():
            if cat_name in MODEL_CLASSES:
                idx = MODEL_CLASSES.index(cat_name)
                match_count = sum(1 for kw in kw_list if kw in text_lower)
                if match_count > 0:
                    probabilities[idx] += 0.20 * min(match_count, 3)

        # Normalize probabilities
        prob_sum = float(np.sum(probabilities))
        if prob_sum > 0:
            probabilities = probabilities / prob_sum

        top_idx = int(np.argmax(probabilities))
        raw_category = MODEL_CLASSES[top_idx]
        confidence = float(probabilities[top_idx])

        # Confidence thresholding & fallback
        if confidence < CONFIDENCE_THRESHOLD:
            final_category = DEFAULT_CATEGORY
            reason = f"ML model confidence ({confidence*100:.1f}%) below minimal threshold ({CONFIDENCE_THRESHOLD*100:.0f}%); defaulted to Other."
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
