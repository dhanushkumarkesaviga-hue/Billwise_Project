# BillWise — Custom ML Invoice Category Classifier

A self-trained, real-time supervised Machine Learning text classification microservice that categorizes OCR-extracted Indian GST invoices into BillWise's 15 standard accounting categories.

---

## 1. System Architecture

```mermaid
flowchart LR
    OCR[Tesseract OCR\nExtracted Text] --> IS[Spring Boot\nInvoice Service]
    IS -->|POST /classify| ML[FastAPI ML Service\nPort 8000]
    ML --> TFIDF[TF-IDF N-Gram\nVectorizer]
    TFIDF --> CLF[Calibrated\nLogistic Regression]
    CLF -->|{ category, confidence, reason }| IS
    IS -->|Response| UI[BillWise React Web App]
    ML -.->|Feedback Log| LOG[(feedback_log.jsonl)]
    LOG -.->|Periodic Retraining| TRAIN[train.py Pipeline]
```

---

## 2. 15-Category Accounting Taxonomy

The classifier is strictly trained on BillWise's 15 standard Indian GST accounting categories:

1. **Raw Materials** *(Steel, polymers, yarns, chemicals, fasteners - HSN 72xx, 39xx, 52xx)*
2. **Capital Goods & Office Assets** *(Laptops, servers, ergonomic furniture, ACs, machinery - HSN 84xx, 94xx)*
3. **Cloud Infrastructure** *(AWS EC2/S3, Azure AKS, Google Cloud BigQuery, CDN - SAC 998313)*
4. **Software & Subscriptions** *(Jira, GitHub, Slack, Zoho, Adobe Creative Cloud - SAC 998315)*
5. **Freight & Transport** *(GTA freight, air cargo, courier, container haulage - SAC 996511)*
6. **Food & Entertainment** *(Client dinners, team meals, cafeteria catering, pantry supply - SAC 996331)*
7. **Professional & Legal Services** *(Statutory audit, legal retainer, ROC filing, management consulting - SAC 9982)*
8. **Utilities** *(High-tension electricity, commercial leased-line internet, PNG gas - SAC 9969)*
9. **Rent & Facilities** *(Commercial office lease, coworking desks, warehouse space, CAM charges - SAC 9972)*
10. **Marketing & Advertising** *(Google Ads PPC, Meta sponsored ads, billboard hoardings, SEO retainer - SAC 99836)*
11. **Office Supplies & Stationery** *(A4 copier paper, toner cartridges, brochures, notebooks - HSN 48xx, 49xx)*
12. **Insurance** *(Group health policy, factory fire & perils, D&O liability, marine cargo - SAC 9971)*
13. **Travel & Conveyance** *(Flight tickets, corporate Uber rides, executive hotel stays - SAC 9964)*
14. **Repairs & Maintenance** *(HVAC chiller AMC, DG set overhaul, elevator service, pest control - SAC 9987)*
15. **Other** *(General miscellaneous expenses, municipal fees, unlisted items - SAC 9999)*

---

## 3. Directory Layout

```
ml/
├── data/
│   ├── invoice_categories.jsonl    # Versioned training dataset (750 labeled examples)
│   ├── invoice_categories.csv      # Tabular export for data exploration
│   └── feedback_log.jsonl          # Production inference feedback log for continuous learning
├── models/
│   ├── invoice_classifier.joblib   # Serialized TF-IDF + LogisticRegression pipeline
│   └── model_metadata.json         # Training timestamp, classes, and baseline scores
├── evaluation/
│   ├── confusion_matrix.png        # High-resolution confusion matrix heatmap (300 DPI)
│   └── evaluation_report.json      # Per-category precision, recall, and F1 metrics
├── generate_dataset.py             # Realistic GST invoice dataset generator
├── train.py                        # Stratified 80/20 train/test split & model training script
├── evaluate.py                     # Standalone evaluation & confusion matrix generator
├── serve.py                        # FastAPI / Uvicorn inference HTTP microservice
└── requirements.txt                # Python dependencies
```

---

## 4. Setup & Running

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: (Optional) Re-generate Dataset & Train
```bash
python generate_dataset.py
python train.py
```

### Step 3: Run Evaluation & Plot Confusion Matrix
```bash
python evaluate.py
```
*Generated confusion matrix is saved to `evaluation/confusion_matrix.png`.*

### Step 4: Start the Inference Service (Port 8000)
```bash
python serve.py
# Or via uvicorn directly:
uvicorn serve:app --host 0.0.0.0 --port 8000
```

---

## 5. API Reference

### Health Check
- **GET** `http://localhost:8000/health`
```json
{
  "status": "UP",
  "service": "billwise-ml-classifier",
  "modelLoaded": true,
  "categoriesCount": 15,
  "timestamp": "2026-08-10T14:15:00.123456"
}
```

### Classify Invoice
- **POST** `http://localhost:8000/classify`
- **Request Body:**
```json
{
  "text": "TAX INVOICE\nSupplier: Apex Cloud Technologies Pvt Ltd\nGSTIN: 27AAACA1234F1Z5\nMonthly EC2 compute clusters & S3 Storage\nHSN/SAC: 998313\nSubtotal: INR 45,000.00\nIGST (18%): INR 8,100.00\nTotal: INR 53,100.00",
  "vendorNameHint": "Apex Cloud Technologies Pvt Ltd"
}
```
- **Response Body:**
```json
{
  "category": "Cloud Infrastructure",
  "confidence": 0.912,
  "reason": "Classified by BillWise ML Model (TF-IDF + LogisticRegression with 91.2% confidence)."
}
```

---

## 6. Continuous Learning & Retraining Workflow

1. **Automatic Production Logging**: Every incoming classification request and prediction is automatically appended to `data/feedback_log.jsonl`.
2. **User Corrections**: When accountants or users correct a category dropdown in the BillWise UI, the corrected pair `(text, true_category)` can be appended to `data/invoice_categories.jsonl`.
3. **Batch Retraining**:
   ```bash
   python train.py
   python evaluate.py
   ```
4. **Zero Downtime Reload**: Restart `serve.py` to immediately serve the newly trained model weights.

---

## 7. Comparative Analysis: Custom ML Model vs. General LLM (Gemini / Ollama)

| Criterion | Custom ML Model (TF-IDF + Logistic Regression) | General LLM (Gemini 3.6 Flash / Ollama) |
| :--- | :--- | :--- |
| **Inference Latency** | **1 – 4 ms** (Near instantaneous) | 1,200 – 3,500 ms (Network & generation overhead) |
| **Operational Cost** | **$0.00 / Free** (Runs locally on CPU) | Pay-per-token API cost or heavy local VRAM usage |
| **Offline Capability** | **100% Offline** (Self-contained) | Requires active internet & API keys / Ollama server |
| **Hallucination Risk** | **0%** (Strictly bounded to 15 taxonomy classes) | Can output markdown, formatting errors, or unlisted classes |
| **Confidence Scoring** | **Calibrated Probabilities** via `predict_proba()` | Subjective / heuristic confidence estimations |
| **Out-of-Distribution** | Needs periodic retraining for new terms | Strong zero-shot generalization on unseen phrasings |
