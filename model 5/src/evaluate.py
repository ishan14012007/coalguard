import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
import json
import os

def evaluate_model(y_true, y_pred, classes, target_name):
    print(f"\\nEvaluating {target_name} Model...")
    
    # Calculate metrics
    acc = accuracy_score(y_true, y_pred)
    macro_f1 = f1_score(y_true, y_pred, average='macro')
    weighted_f1 = f1_score(y_true, y_pred, average='weighted')
    
    report_dict = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    report_str = classification_report(y_true, y_pred, zero_division=0)
    
    print(report_str)
    
    os.makedirs('reports/metrics', exist_ok=True)
    
    # Save JSON report
    with open(f'reports/metrics/{target_name}_metrics.json', 'w') as f:
        json.dump(report_dict, f, indent=4)
        
    # Plot and save confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=classes, yticklabels=classes)
    plt.title(f'Confusion Matrix - {target_name}')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(f'reports/{target_name}_confusion_matrix.png')
    plt.close()
    
    return acc, macro_f1, weighted_f1, report_str
