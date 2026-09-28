import pandas as pd
import glob
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

def train():
    print("Starting model training pipeline...")
    os.makedirs("data/models", exist_ok=True)

    # 1. Load Data
    chunk_files = glob.glob("LOAD00000001-*_chunk_*.csv")
    if not chunk_files:
        print("No data found!")
        return
        
    cols_to_keep = [
        'INJ_DEGR_DESC', 'AI_ACTY_DESC', 'MINING_EQUIP', 
        'UG_LOCATION', 'COAL_METAL_IND',
        'EXPER_TOT_CALC', 'ACCIDENT_TIME', 'UG_MINING_METHOD', 'AI_CLASS_DESC'
    ]

    print("Reading data chunks...")
    dfs = []
    # Using only a subset to speed up training for the prototype
    for f in chunk_files[:3]: 
        df_chunk = pd.read_csv(f, usecols=cols_to_keep, low_memory=False)
        dfs.append(df_chunk)
        
    df = pd.concat(dfs, ignore_index=True)
    print(f"Loaded {len(df)} records for training.")

    # 2. Data Cleaning
    df = df.dropna(subset=['INJ_DEGR_DESC'])
    df['AI_ACTY_DESC'] = df['AI_ACTY_DESC'].fillna('UNKNOWN')
    df['MINING_EQUIP'] = df['MINING_EQUIP'].fillna('UNKNOWN')
    df['UG_LOCATION'] = df['UG_LOCATION'].fillna('UNKNOWN')
    df['COAL_METAL_IND'] = df['COAL_METAL_IND'].fillna('UNKNOWN')
    df['UG_MINING_METHOD'] = df['UG_MINING_METHOD'].fillna('UNKNOWN')
    df['AI_CLASS_DESC'] = df['AI_CLASS_DESC'].fillna('UNKNOWN')
    
    # Bucket Experience
    df['EXPER_TOT_CALC'] = pd.to_numeric(df['EXPER_TOT_CALC'], errors='coerce').fillna(-1)
    def bucket_exp(x):
        if x < 0: return 'UNKNOWN'
        elif x < 1: return '<1 Year'
        elif x <= 5: return '1-5 Years'
        elif x <= 10: return '5-10 Years'
        else: return '>10 Years'
    df['EXPER_TOT_CALC'] = df['EXPER_TOT_CALC'].apply(bucket_exp)
    
    # Bucket Time
    df['ACCIDENT_TIME'] = pd.to_numeric(df['ACCIDENT_TIME'], errors='coerce').fillna(-1)
    def bucket_time(t):
        if t < 0: return 'UNKNOWN'
        if 600 <= t < 1400: return 'Morning Shift (0600-1400)'
        elif 1400 <= t < 2200: return 'Afternoon Shift (1400-2200)'
        else: return 'Night Shift (2200-0600)'
    df['ACCIDENT_TIME'] = df['ACCIDENT_TIME'].apply(bucket_time)
    
    # 3. Create Target Variable (1 = Severe/Fatal, 0 = Minor)
    severe_labels = [
        'FATALITY', 
        'PERM TOT OR PERM PRTL DISABLTY', 
        'DYS AWY FRM WRK & RESTRCTD ACT', 
        'DAYS AWAY FROM WORK ONLY'
    ]
    df['Target'] = df['INJ_DEGR_DESC'].isin(severe_labels).astype(int)
    
    # Baseline Risk
    baseline_risk = df['Target'].mean()
    print(f"Historical Baseline Risk of Severe Incident: {baseline_risk:.2%}")

    # 4. Encode Features
    print("Encoding features...")
    encoders = {}
    features = [
        'AI_ACTY_DESC', 'MINING_EQUIP', 'UG_LOCATION', 'COAL_METAL_IND',
        'EXPER_TOT_CALC', 'ACCIDENT_TIME', 'UG_MINING_METHOD', 'AI_CLASS_DESC'
    ]
    
    for feat in features:
        le = LabelEncoder()
        # Add a special '<UNKNOWN>' class for unseen inputs during inference
        unique_vals = list(df[feat].unique()) + ['<UNKNOWN>']
        le.fit(unique_vals)
        df[feat] = le.transform(df[feat])
        encoders[feat] = le

    X = df[features]
    y = df['Target']

    # 5. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 6. Train Model
    print("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # 7. Evaluate
    y_pred = model.predict(X_test)
    print("\nModel Evaluation:")
    print(classification_report(y_test, y_pred))

    # 8. Save artifacts
    print("Saving model and encoders...")
    joblib.dump(model, "data/models/risk_classifier.pkl")
    joblib.dump(encoders, "data/models/encoders.pkl")
    joblib.dump(baseline_risk, "data/models/baseline_risk.pkl")
    print("Training complete.")

if __name__ == "__main__":
    train()
