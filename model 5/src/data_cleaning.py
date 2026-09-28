import pandas as pd
import re
import os

def clean_text(text):
    if not isinstance(text, str):
        return ""
    # Lowercase
    text = text.lower()
    # Remove excess whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def clean_data(input_path, output_path):
    print(f"Loading data from {input_path}...")
    df = pd.read_csv(input_path)
    
    raw_samples = len(df)
    
    # Drop rows with no description
    df = df.dropna(subset=['Description'])
    df['Description'] = df['Description'].apply(clean_text)
    df = df[df['Description'] != ""]
    
    # We will use 'Industry Sector' as 'Category' and 'Accident Level' as 'Severity'
    # as the requested specific labels don't exist in the dataset.
    df['Category'] = df['Industry Sector']
    df['Severity'] = df['Accident Level']
    
    cleaned_samples = len(df)
    
    final_cols = ['Description', 'Category', 'Severity']
    df_final = df[final_cols].copy()
    
    # Save cleaned
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_final.to_csv(output_path, index=False)
    
    print(f"Cleaned data saved to {output_path}")
    print(f"Raw samples: {raw_samples}")
    print(f"Cleaned samples: {cleaned_samples}")
    
    # Generate stats report
    report = f"""Data Quality Report
===================
Raw samples: {raw_samples}
Cleaned samples: {cleaned_samples}
Removed empty/null descriptions: {raw_samples - cleaned_samples}

Category Distribution:
{df_final['Category'].value_counts().to_string()}

Severity Distribution:
{df_final['Severity'].value_counts().to_string()}
"""
    os.makedirs("reports", exist_ok=True)
    with open("reports/data_quality_report.txt", "w") as f:
        f.write(report)
    print("Data quality report generated at reports/data_quality_report.txt")

if __name__ == "__main__":
    clean_data("data/raw/dataset.csv", "data/cleaned/dataset.csv")
