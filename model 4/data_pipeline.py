import pandas as pd
import glob
import os
import numpy as np

def run_pipeline():
    print("Starting data pipeline...")
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("data/cleaned", exist_ok=True)
    os.makedirs("data/processed", exist_ok=True)

    # 1. Discover all chunk files
    chunk_files = glob.glob("LOAD00000001-*_chunk_*.csv")
    print(f"Found {len(chunk_files)} data chunks.")

    cols_to_keep = [
        'MINE_ID', 'AI_DT', 'INJ_DEGR_DESC', 'NO_INJURIES', 
        'DAYS_RESTRICT', 'DAYS_LOST', 'OPERATOR_NAME', 
        'FIPS_STATE_CD', 'COAL_METAL_IND'
    ]

    dfs = []
    for f in chunk_files:
        try:
            # Read only necessary columns to save memory
            df_chunk = pd.read_csv(f, usecols=cols_to_keep, low_memory=False)
            dfs.append(df_chunk)
        except Exception as e:
            print(f"Error reading {f}: {e}")
    
    if not dfs:
        print("No data found!")
        return
        
    df = pd.concat(dfs, ignore_index=True)
    raw_records = len(df)
    print(f"Loaded {raw_records} raw records.")

    # 2. Data Cleaning
    # Drop rows where MINE_ID is missing (if any)
    df = df.dropna(subset=['MINE_ID'])
    
    # Fill missing numeric values intelligently (0 is valid for days lost/restricted if not recorded, but we'll document it)
    df['DAYS_RESTRICT'] = df['DAYS_RESTRICT'].fillna(0).astype(int)
    df['DAYS_LOST'] = df['DAYS_LOST'].fillna(0).astype(int)
    df['NO_INJURIES'] = df['NO_INJURIES'].fillna(0).astype(int)
    
    # Parse dates
    df['AI_DT'] = pd.to_datetime(df['AI_DT'], errors='coerce')
    
    cleaned_records = len(df)
    print(f"Cleaned records: {cleaned_records} (Removed {raw_records - cleaned_records} invalid records)")
    
    # 3. Feature Engineering at Mine Level
    print("Extracting mine-level features...")
    
    # Define severity categories based on actual discovered values
    fatal_mask = df['INJ_DEGR_DESC'] == 'FATALITY'
    severe_mask = df['INJ_DEGR_DESC'].isin([
        'PERM TOT OR PERM PRTL DISABLTY', 
        'DYS AWY FRM WRK & RESTRCTD ACT', 
        'DAYS AWAY FROM WORK ONLY'
    ])
    
    mine_stats = df.groupby('MINE_ID').agg(
        Total_Accidents=('MINE_ID', 'count'),
        Total_Days_Lost=('DAYS_LOST', 'sum'),
        Total_Days_Restricted=('DAYS_RESTRICT', 'sum'),
        Total_Injuries=('NO_INJURIES', 'sum'),
        Last_Accident_Date=('AI_DT', 'max'),
        Operator_Name=('OPERATOR_NAME', 'first'),
        State_CD=('FIPS_STATE_CD', 'first'),
        Coal_Metal_Ind=('COAL_METAL_IND', 'first')
    )
    
    fatal_counts = df[fatal_mask].groupby('MINE_ID').size().rename('Fatal_Accidents')
    severe_counts = df[severe_mask].groupby('MINE_ID').size().rename('Severe_Accidents')
    
    mine_features = pd.concat([mine_stats, fatal_counts, severe_counts], axis=1).fillna(0)
    mine_features['Fatal_Accidents'] = mine_features['Fatal_Accidents'].astype(int)
    mine_features['Severe_Accidents'] = mine_features['Severe_Accidents'].astype(int)
    
    mine_features = mine_features.reset_index()
    
    # 4. Save processed dataset
    processed_path = "data/processed/mine_features.csv"
    mine_features.to_csv(processed_path, index=False)
    print(f"Saved {len(mine_features)} mine records to {processed_path}.")
    
    # Save a stats file for the dashboard
    stats = {
        'raw_records': raw_records,
        'cleaned_records': cleaned_records,
        'mines_analyzed': len(mine_features),
        'missing_datasets': 'Inspections, Violations, Mines (Only Accidents available)'
    }
    pd.Series(stats).to_json("data/processed/pipeline_stats.json")

if __name__ == "__main__":
    run_pipeline()
