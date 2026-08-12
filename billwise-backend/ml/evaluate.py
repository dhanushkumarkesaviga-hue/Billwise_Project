"""
BillWise — Custom ML Invoice Category Classifier Evaluation
Evaluates the trained model on test data, generates precision/recall/F1 metrics,
and renders a high-resolution confusion matrix heatmap.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Headless plotting
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

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

def load_data_and_model():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "invoice_classifier.joblib")
    data_path = os.path.join(base_dir, "data", "invoice_categories.jsonl")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Trained model not found at {model_path}. Run train.py first.")
        
    print(f"Loading model from: {model_path}")
    pipeline = joblib.load(model_path)
    
    print(f"Loading test data from: {data_path}")
    records = []
    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
                
    texts = [r["text"] for r in records]
    categories = [r["category"] for r in records]
    
    # Use exact same split random_state=42 as train.py to evaluate on held-out 20%
    _, X_test, _, y_test = train_test_split(
        texts, categories,
        test_size=0.20,
        random_state=42,
        stratify=categories
    )
    
    return pipeline, X_test, y_test

def evaluate_and_plot(pipeline, X_test, y_test):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    eval_dir = os.path.join(base_dir, "evaluation")
    os.makedirs(eval_dir, exist_ok=True)
    
    print(f"\nEvaluating model across {len(X_test)} held-out test samples...")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)
    
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average='macro')
    weighted_f1 = f1_score(y_test, y_pred, average='weighted')
    
    print("\n" + "="*75)
    print("                 BILLWISE ML MODEL EVALUATION REPORT")
    print("="*75)
    print(f"Total Test Instances : {len(X_test)}")
    print(f"Test Accuracy        : {acc * 100:.2f}%")
    print(f"Macro F1-Score       : {macro_f1 * 100:.2f}%")
    print(f"Weighted F1-Score    : {weighted_f1 * 100:.2f}%")
    print("-" * 75)
    
    report_dict = classification_report(
        y_test, y_pred,
        labels=ALLOWED_CATEGORIES,
        target_names=ALLOWED_CATEGORIES,
        output_dict=True,
        zero_division=0
    )
    
    report_text = classification_report(
        y_test, y_pred,
        labels=ALLOWED_CATEGORIES,
        target_names=ALLOWED_CATEGORIES,
        digits=4,
        zero_division=0
    )
    print(report_text)
    print("="*75)
    
    # Save report to text/JSON
    report_file = os.path.join(eval_dir, "evaluation_report.json")
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump({
            "accuracy": acc,
            "macro_f1": macro_f1,
            "weighted_f1": weighted_f1,
            "detailed_metrics": report_dict
        }, f, indent=2)
    print(f"Metrics saved to: {report_file}")
    
    # Generate Confusion Matrix
    cm = confusion_matrix(y_test, y_pred, labels=ALLOWED_CATEGORIES)
    
    # Shorten labels for clean plot display if needed
    short_labels = [
        "Raw Mat.", "Capital Goods", "Cloud Infra", "Software/SaaS", "Freight",
        "Food & Ent.", "Legal/Prof.", "Utilities", "Rent & Fac.", "Marketing",
        "Office Supply", "Insurance", "Travel", "Repairs", "Other"
    ]
    
    plt.figure(figsize=(12, 10))
    sns.set_theme(style="white")
    
    ax = sns.heatmap(
        cm,
        annot=True,
        fmt='d',
        cmap='Blues',
        xticklabels=short_labels,
        yticklabels=short_labels,
        cbar=True,
        linewidths=0.5,
        linecolor='gray'
    )
    
    plt.title(f"BillWise Invoice Category Classifier - Confusion Matrix\n(Accuracy: {acc*100:.1f}% | Macro F1: {macro_f1*100:.1f}%)", fontsize=14, pad=15, weight='bold')
    plt.xlabel("Predicted Category", fontsize=12, labelpad=10, weight='bold')
    plt.ylabel("True (Ground Truth) Category", fontsize=12, labelpad=10, weight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=10)
    plt.yticks(rotation=0, fontsize=10)
    plt.tight_layout()
    
    cm_path = os.path.join(eval_dir, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=300)
    plt.close()
    print(f"[OK] Confusion matrix plot saved to: {cm_path}")
    
    # Test confidence score distribution
    top_confidences = np.max(y_proba, axis=1)
    print(f"\nAverage prediction confidence on test set: {np.mean(top_confidences)*100:.1f}%")
    print(f"Min prediction confidence: {np.min(top_confidences)*100:.1f}% | Max: {np.max(top_confidences)*100:.1f}%")

def main():
    pipeline, X_test, y_test = load_data_and_model()
    evaluate_and_plot(pipeline, X_test, y_test)

if __name__ == "__main__":
    main()
