import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import pickle
import json
import os
import datetime

from data_cleaning import clean_data
from preprocessing import preprocess_and_vectorize
from evaluate import evaluate_model

def train_models():
    # 1. Clean Data
    raw_path = "data/raw/dataset.csv"
    cleaned_path = "data/cleaned/dataset.csv"
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} not found.")
        return
        
    clean_data(raw_path, cleaned_path)
    
    # 2. Load cleaned data
    df = pd.read_csv(cleaned_path)
    
    # Due to very small classes in Severity (e.g., V has 8 samples), standard stratify might struggle 
    # if we do multi-label stratification, so we stratify on Severity as it is the most imbalanced.
    X_train_text, X_test_text, y_train_cat, y_test_cat, y_train_sev, y_test_sev = train_test_split(
        df[['Description']], df['Category'], df['Severity'], 
        test_size=0.2, random_state=42, stratify=df['Severity']
    )
    
    # 3. Preprocess and vectorize
    X_train, X_test, vectorizer = preprocess_and_vectorize(X_train_text, X_test_text)
    
    # 4. Train Category Model
    print("Training Category Model...")
    cat_model = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    cat_model.fit(X_train, y_train_cat)
    
    # 5. Train Severity Model
    print("Training Severity Model...")
    sev_model = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)
    sev_model.fit(X_train, y_train_sev)
    
    # 6. Evaluate
    y_pred_cat = cat_model.predict(X_test)
    cat_classes = np.unique(df['Category'])
    cat_acc, cat_macro, cat_weighted, cat_rep = evaluate_model(y_test_cat, y_pred_cat, cat_classes, "Category")
    
    y_pred_sev = sev_model.predict(X_test)
    sev_classes = np.unique(df['Severity'])
    sev_acc, sev_macro, sev_weighted, sev_rep = evaluate_model(y_test_sev, y_pred_sev, sev_classes, "Severity")
    
    # 7. Save Models
    os.makedirs('models', exist_ok=True)
    with open('models/category_model.pkl', 'wb') as f:
        pickle.dump(cat_model, f)
    with open('models/severity_model.pkl', 'wb') as f:
        pickle.dump(sev_model, f)
        
    # 8. Save Metadata
    metadata = {
        "training_date": datetime.datetime.now().isoformat(),
        "dataset_samples": len(df),
        "model_type": "Logistic Regression (TF-IDF)",
        "categories": list(cat_classes),
        "severities": list(sev_classes),
        "evaluation": {
            "category": {
                "accuracy": cat_acc,
                "macro_f1": cat_macro,
                "weighted_f1": cat_weighted
            },
            "severity": {
                "accuracy": sev_acc,
                "macro_f1": sev_macro,
                "weighted_f1": sev_weighted
            }
        }
    }
    
    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=4)
        
    # 9. Save comprehensive training report
    with open('reports/training_report.txt', 'w') as f:
        f.write("========================================\n")
        f.write("       TRAINING REPORT\n")
        f.write("========================================\n\n")
        f.write(f"Date: {metadata['training_date']}\n")
        f.write(f"Dataset Size: {len(df)}\n")
        f.write(f"Model Type: Logistic Regression\n\n")
        f.write("--- CATEGORY EVALUATION ---\n")
        f.write(cat_rep + "\n\n")
        f.write("--- SEVERITY EVALUATION ---\n")
        f.write(sev_rep + "\n")
        
    print("Training complete! Models and metadata saved to models/ directory.")

if __name__ == "__main__":
    train_models()
