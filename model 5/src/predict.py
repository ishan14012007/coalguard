import pickle
import sys
import argparse
import numpy as np

def load_models():
    try:
        with open('models/vectorizer.pkl', 'rb') as f:
            vectorizer = pickle.load(f)
        with open('models/category_model.pkl', 'rb') as f:
            cat_model = pickle.load(f)
        with open('models/severity_model.pkl', 'rb') as f:
            sev_model = pickle.load(f)
        return vectorizer, cat_model, sev_model
    except FileNotFoundError:
        print("Error: Models not found. Please run 'python src/train.py' first.")
        sys.exit(1)

def predict_hazard(text, vectorizer, cat_model, sev_model):
    from data_cleaning import clean_text
    
    cleaned_text = clean_text(text)
    if not cleaned_text:
        return {"error": "Empty report after cleaning."}
        
    X = vectorizer.transform([cleaned_text])
    
    cat_pred = cat_model.predict(X)[0]
    sev_pred = sev_model.predict(X)[0]
    
    cat_probs = cat_model.predict_proba(X)[0]
    sev_probs = sev_model.predict_proba(X)[0]
    
    cat_conf = float(np.max(cat_probs)) * 100
    sev_conf = float(np.max(sev_probs)) * 100
    
    # Feature importance (top words)
    feature_names = vectorizer.get_feature_names_out()
    
    # Category important words
    cat_class_idx = list(cat_model.classes_).index(cat_pred)
    # For binary/multiclass logistic regression, coef_ shape varies
    if cat_model.coef_.shape[0] == 1:
        coef = cat_model.coef_[0] if cat_class_idx == 1 else -cat_model.coef_[0]
    else:
        coef = cat_model.coef_[cat_class_idx]
        
    # Get active features in this specific text
    active_features = X.nonzero()[1]
    active_coefs = [(feature_names[i], coef[i]) for i in active_features]
    active_coefs.sort(key=lambda x: x[1], reverse=True)
    top_cat_words = [w for w, c in active_coefs[:3] if c > 0]
    
    return {
        "text": text,
        "category": cat_pred,
        "category_confidence": f"{cat_conf:.1f}%",
        "top_category_words": top_cat_words,
        "severity": sev_pred,
        "severity_confidence": f"{sev_conf:.1f}%"
    }

def print_prediction(result):
    if "error" in result:
        print(f"Error: {result['error']}")
        return
        
    print("\n----------------------------------------")
    print("PREDICTION")
    print("----------------------------------------")
    print("Input:")
    print(result['text'])
    print("\nPredicted Category:")
    print(result['category'])
    print("\nCategory Confidence:")
    print(result['category_confidence'])
    if result['top_category_words']:
        print(f"Important contributing terms: {', '.join(result['top_category_words'])}")
    print("\nPredicted Severity:")
    print(result['severity'])
    print("\nSeverity Confidence:")
    print(result['severity_confidence'])
    print("----------------------------------------\n")

def interactive_mode():
    vectorizer, cat_model, sev_model = load_models()
    print("========================================")
    print("      HAZARD REPORT CLASSIFIER")
    print("========================================")
    print("Type 'exit' to quit.\n")
    
    while True:
        try:
            text = input("Enter hazard report:\n> ")
            if text.strip().lower() == 'exit':
                break
            if not text.strip():
                continue
                
            result = predict_hazard(text, vectorizer, cat_model, sev_model)
            print_prediction(result)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hazard Report Classifier")
    parser.add_argument("--text", type=str, help="Single hazard report text to classify")
    args = parser.parse_args()
    
    if args.text:
        vectorizer, cat_model, sev_model = load_models()
        result = predict_hazard(args.text, vectorizer, cat_model, sev_model)
        print_prediction(result)
    else:
        interactive_mode()
