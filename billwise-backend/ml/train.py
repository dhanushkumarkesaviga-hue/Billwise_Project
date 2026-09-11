"""
BillWise — Custom ML Invoice Category Classifier Trainer
Trains a TF-IDF + LogisticRegression supervised text classifier on the labeled invoice dataset.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, f1_score

ALLOWED_CATEGORIES = [
    "Raw Materials",
    "Capital Goods & Office Assets",
    "Cloud Infrastructure",
    "Software & Subscriptions",
    "Freight & Transport",
    "Food & Entertainment",
    "Professional & Legal Services",
    "Utilities",
    "Rent & Facilities",
    "Marketing & Advertising",
    "Office Supplies & Stationery",
    "Insurance",
    "Travel & Conveyance",
    "Repairs & Maintenance",
    "Other"
]

def load_dataset(data_path):
    print(f"Loading dataset from: {data_path}")
    records = []
    if data_path.endswith(".jsonl"):
        with open(data_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    records.append(json.loads(line))
    elif data_path.endswith(".csv"):
        df = pd.read_csv(data_path)
        records = df.to_dict(orient="records")
    else:
        raise ValueError(f"Unsupported file format: {data_path}")
        
    texts = [r["text"] for r in records]
    categories = [r["category"] for r in records]
    print(f"Loaded {len(texts)} samples across {len(set(categories))} distinct categories.")
    return texts, categories

def train_model(texts, categories):
    print("\nSplitting dataset into stratified 80/20 train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        texts, categories,
        test_size=0.20,
        random_state=42,
        stratify=categories
    )
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")
    
    print("\nBuilding TF-IDF + LogisticRegression Pipeline...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            strip_accents='unicode',
            min_df=1,
            token_pattern=r'(?u)\b[A-Za-z0-9_#/-]{2,}\b',
            max_features=25000
        )),
        ('clf', LogisticRegression(
            C=10.0,
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        ))
    ])
    
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    print("\nEvaluating on held-out test set (20%)...")
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    
    print(f"\n" + "="*70)
    print(f"MODEL PERFORMANCE SUMMARY")
    print(f"="*70)
    print(f"Overall Test Accuracy: {acc * 100:.2f}%")
    print(f"Macro Average F1-Score: {macro_f1 * 100:.2f}%")
    print("-"*70)
    print("Detailed Classification Report per Category:")
    print("-"*70)
    report = classification_report(y_test, y_pred, labels=ALLOWED_CATEGORIES, digits=4, zero_division=0)
    print(report)
    print("="*70)
    
    return pipeline, {
        "accuracy": acc,
        "macro_f1": macro_f1,
        "test_report": report,
        "classes": list(pipeline.classes_),
        "num_train": len(X_train),
        "num_test": len(X_test),
        "trained_at": datetime.now().isoformat()
    }

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "invoice_categories.jsonl")
    
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Running generator first...")
        from generate_dataset import main as gen_main
        gen_main()
        
    texts, categories = load_dataset(data_path)
    model_pipeline, metadata = train_model(texts, categories)
    
    # Save model and metadata
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    model_file = os.path.join(models_dir, "invoice_classifier.joblib")
    meta_file = os.path.join(models_dir, "model_metadata.json")
    
    print(f"\nSaving trained pipeline to: {model_file}")
    joblib.dump(model_pipeline, model_file, compress=3)
    
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"[OK] Training complete. Model is ready for serving and evaluation.")

if __name__ == "__main__":
    main()
