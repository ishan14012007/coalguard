#!/usr/bin/env python3
import sys
import os
import json
import pickle
import warnings
import numpy as np

# Suppress sklearn unpickling warnings
warnings.filterwarnings('ignore')

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

def get_model5():
    m5_dir = os.path.join(BASE_DIR, 'model 5')
    src_dir = os.path.join(m5_dir, 'src')
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)
    
    vec_path = os.path.join(m5_dir, 'models', 'vectorizer.pkl')
    cat_path = os.path.join(m5_dir, 'models', 'category_model.pkl')
    sev_path = os.path.join(m5_dir, 'models', 'severity_model.pkl')
    
    with open(vec_path, 'rb') as f:
        vectorizer = pickle.load(f)
    with open(cat_path, 'rb') as f:
        cat_model = pickle.load(f)
    with open(sev_path, 'rb') as f:
        sev_model = pickle.load(f)
        
    return vectorizer, cat_model, sev_model

def classify_hazard(text):
    vectorizer, cat_model, sev_model = get_model5()
    import data_cleaning
    clean_text = data_cleaning.clean_text
    
    cleaned = clean_text(text)
    if not cleaned:
        cleaned = text.lower()
        
    X = vectorizer.transform([cleaned])
    cat_pred = cat_model.predict(X)[0]
    sev_pred = sev_model.predict(X)[0]
    
    cat_probs = cat_model.predict_proba(X)[0]
    sev_probs = sev_model.predict_proba(X)[0]
    
    cat_conf = float(np.max(cat_probs)) * 100
    sev_conf = float(np.max(sev_probs)) * 100
    
    # Feature importance
    feature_names = vectorizer.get_feature_names_out()
    cat_class_idx = list(cat_model.classes_).index(cat_pred)
    if cat_model.coef_.shape[0] == 1:
        coef = cat_model.coef_[0] if cat_class_idx == 1 else -cat_model.coef_[0]
    else:
        coef = cat_model.coef_[cat_class_idx]
        
    active_features = X.nonzero()[1]
    active_coefs = [(feature_names[i], float(coef[i])) for i in active_features]
    active_coefs.sort(key=lambda x: x[1], reverse=True)
    top_cat_words = [w for w, c in active_coefs[:4] if c > 0]
    
    # Statutory DGMS Severity mapping
    sev_mapping = {
        'I': {'label': 'Critical (Cat I)', 'color': 'red', 'slaHours': 4},
        'II': {'label': 'High (Cat II)', 'color': 'orange', 'slaHours': 12},
        'III': {'label': 'Medium (Cat III)', 'color': 'amber', 'slaHours': 24},
        'IV': {'label': 'Low (Cat IV)', 'color': 'blue', 'slaHours': 48},
        'V': {'label': 'Observation (Cat V)', 'color': 'gray', 'slaHours': 72}
    }
    
    return {
        "text": text,
        "category": str(cat_pred),
        "category_confidence": round(cat_conf, 1),
        "top_contributing_terms": top_cat_words,
        "severity": str(sev_pred),
        "severity_info": sev_mapping.get(str(sev_pred), {'label': f'Severity {sev_pred}', 'color': 'blue', 'slaHours': 24}),
        "severity_confidence": round(sev_conf, 1)
    }

def get_model4():
    import joblib
    m4_dir = os.path.join(BASE_DIR, 'model 4')
    model = joblib.load(os.path.join(m4_dir, 'data', 'models', 'risk_classifier.pkl'))
    encoders = joblib.load(os.path.join(m4_dir, 'data', 'models', 'encoders.pkl'))
    baseline = joblib.load(os.path.join(m4_dir, 'data', 'models', 'baseline_risk.pkl'))
    return model, encoders, baseline

def get_risk_options():
    _, encoders, baseline = get_model4()
    options = {}
    for k, v in encoders.items():
        opts = list(v.classes_)
        if '<UNKNOWN>' in opts: opts.remove('<UNKNOWN>')
        if 'UNKNOWN' in opts: opts.remove('UNKNOWN')
        options[k] = sorted([str(x) for x in opts])
    return {
        "options": options,
        "baseline_risk": round(float(baseline) * 100, 2)
    }

def predict_risk(inputs):
    import pandas as pd
    model, encoders, baseline = get_model4()
    
    feature_order = [
        'AI_ACTY_DESC', 'MINING_EQUIP', 'UG_LOCATION', 'COAL_METAL_IND',
        'EXPER_TOT_CALC', 'ACCIDENT_TIME', 'UG_MINING_METHOD', 'AI_CLASS_DESC'
    ]
    
    encoded_input = {}
    for feat in feature_order:
        val = inputs.get(feat)
        if val is not None and val in encoders[feat].classes_:
            encoded_input[feat] = encoders[feat].transform([val])[0]
        else:
            encoded_input[feat] = encoders[feat].transform(['<UNKNOWN>'])[0]
            
    df_input = pd.DataFrame([encoded_input], columns=feature_order)
    prob = float(model.predict_proba(df_input)[0][1])
    
    baseline_pct = float(baseline) * 100
    prob_pct = prob * 100
    delta = prob_pct - baseline_pct
    
    if prob > baseline * 1.5:
        level = "CRITICAL"
        color = "red"
        explanation = "HIGH RISK: This specific combination of operational activity, equipment, time of shift, and worker experience presents significantly elevated probability of severe incidents."
    elif prob > baseline * 1.1:
        level = "WATCH"
        color = "orange"
        explanation = "ELEVATED RISK: Higher than baseline risk. Requires heightened supervisor oversight and equipment pre-checks."
    elif prob < baseline * 0.7:
        level = "SAFE"
        color = "emerald"
        explanation = "LOW RISK: Statistical situational risk is comfortably below industry baseline. Standard safety protocols apply."
    else:
        level = "MODERATE"
        color = "blue"
        explanation = "AVERAGE RISK: Risk levels consistent with typical underground coal operations baseline."
        
    return {
        "baseline_risk_pct": round(baseline_pct, 1),
        "predicted_risk_pct": round(prob_pct, 1),
        "delta_pct": round(delta, 1),
        "risk_level": level,
        "risk_color": color,
        "explanation": explanation,
        "inputs": inputs
    }

def simulate_whatif(params):
    # Model 6 What-If Simulator: Combines baseline Model 4 situational scoring with environmental rainfall / gas anomalies
    base_activity = params.get('activity', 'Continuous Miner Operations')
    rainfall_anomaly_mm = float(params.get('rainfall_anomaly_mm', 0))
    experience_ratio = float(params.get('experience_ratio_pct', 70)) # % of workforce >5 yrs
    equipment_type = params.get('equipment', 'Continuous miner')
    shift_time = params.get('shift', 'Morning Shift (0600-1400)')
    gas_ppm = float(params.get('gas_ppm', 350))
    monsoon_factor = float(params.get('monsoon_factor', 1.0))
    
    # Calculate base risk from Model 4
    m4_input = {
        'AI_ACTY_DESC': 'Continuous miner' if 'Continuous' in base_activity else 'Handling supplies/materials',
        'MINING_EQUIP': 'Continuous miner' if 'Continuous' in equipment_type else 'Belt conveyor',
        'UG_LOCATION': 'FACE' if 'Continuous' in base_activity else 'INTERSECTION',
        'COAL_METAL_IND': 'C',
        'EXPER_TOT_CALC': '>10 Years' if experience_ratio > 75 else ('1-5 Years' if experience_ratio > 40 else '<1 Year'),
        'ACCIDENT_TIME': shift_time,
        'UG_MINING_METHOD': 'Continuous Mining',
        'AI_CLASS_DESC': 'FALL OF FACE/RIB/PILLAR/HIGHWALL'
    }
    
    base_res = predict_risk(m4_input)
    simulated_score = base_res['predicted_risk_pct']
    
    # Environmental Rainfall Inundation modifier (Model 6 rainfall dataset)
    rainfall_penalty = 0.0
    if rainfall_anomaly_mm > 150:
        rainfall_penalty = (rainfall_anomaly_mm - 150) * 0.08 * monsoon_factor
    elif rainfall_anomaly_mm > 50:
        rainfall_penalty = (rainfall_anomaly_mm - 50) * 0.04 * monsoon_factor
        
    # Experience buffer
    exp_modifier = (70.0 - experience_ratio) * 0.15
    
    # Gas PPM modifier (DGMS threshold: >500 PPM warning, >800 PPM danger)
    gas_penalty = 0.0
    if gas_ppm > 800:
        gas_penalty = (gas_ppm - 800) * 0.05 + 12.0
    elif gas_ppm > 500:
        gas_penalty = (gas_ppm - 500) * 0.02
        
    final_simulated_risk = max(5.0, min(98.5, simulated_score + rainfall_penalty + exp_modifier + gas_penalty))
    risk_delta = final_simulated_risk - base_res['baseline_risk_pct']
    
    # Mitigation suggestions
    recommendations = []
    if rainfall_anomaly_mm > 100:
        recommendations.append("Deploy auxiliary sump pumping units and double drainage inspection frequency (DGMS Reg 148).")
    if experience_ratio < 50:
        recommendations.append("Pair novice miners (<1 yr) with Level-III certified sirdars on high-wall extraction faces.")
    if gas_ppm > 500:
        recommendations.append("Increase main ventilation intake fan airflow to >2,500 m³/min and activate continuous telemetry.")
    if 'Night' in shift_time:
        recommendations.append("Implement mandatory 15-min alertness intervals and supplemental LED face lighting.")
        
    if not recommendations:
        recommendations.append("Current operational parameters maintain standard safety threshold. Continue scheduled monitoring.")

    return {
        "simulated_risk_score": round(final_simulated_risk, 1),
        "baseline_risk": base_res['baseline_risk_pct'],
        "risk_delta": round(risk_delta, 1),
        "risk_level": "CRITICAL" if final_simulated_risk > 70 else ("HIGH" if final_simulated_risk > 50 else ("WATCH" if final_simulated_risk > 30 else "SAFE")),
        "rainfall_impact_pts": round(rainfall_penalty, 1),
        "experience_impact_pts": round(exp_modifier, 1),
        "gas_impact_pts": round(gas_penalty, 1),
        "mitigation_recommendations": recommendations,
        "trajectory": [
            {"hour": "T-0h (Current)", "score": round(base_res['predicted_risk_pct'], 1)},
            {"hour": "T+2h (Projected)", "score": round(base_res['predicted_risk_pct'] + (risk_delta * 0.4), 1)},
            {"hour": "T+4h (Peak Load)", "score": round(final_simulated_risk, 1)},
            {"hour": "T+6h (Post-Mitigation)", "score": round(max(15.0, final_simulated_risk - 18.5), 1)}
        ]
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action specified"}))
        sys.exit(1)
        
    action = sys.argv[1]
    
    try:
        if action == 'classify':
            text = sys.argv[2] if len(sys.argv) > 2 else ""
            res = classify_hazard(text)
            print(json.dumps(res))
        elif action == 'risk_options':
            res = get_risk_options()
            print(json.dumps(res))
        elif action == 'predict_risk':
            inputs = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
            res = predict_risk(inputs)
            print(json.dumps(res))
        elif action == 'simulate_whatif':
            inputs = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
            res = simulate_whatif(inputs)
            print(json.dumps(res))
        else:
            print(json.dumps({"error": f"Unknown action: {action}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
