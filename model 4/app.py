import streamlit as st
import joblib
import os
import pandas as pd

st.set_page_config(page_title="MSHA Mine Risk Predictor", layout="centered")

st.title("🛡️ Mine Risk Predictor (Situational)")

@st.cache_resource
def load_models():
    model_path = "data/models/risk_classifier.pkl"
    encoder_path = "data/models/encoders.pkl"
    baseline_path = "data/models/baseline_risk.pkl"
    
    if not os.path.exists(model_path):
        return None, None, None
        
    model = joblib.load(model_path)
    encoders = joblib.load(encoder_path)
    baseline_risk = joblib.load(baseline_path)
    return model, encoders, baseline_risk

model, encoders, baseline_risk = load_models()

if model is None:
    st.error("Model files not found! Please run `python train_model.py` first to generate the model.")
    st.stop()

st.markdown("""
> **Note on Data Accuracy**: This tool strictly uses actual MSHA Accident Injury datasets. Features like *Weather* and *Depth* are not recorded by MSHA for these incidents, so they are not included. Instead, we use recorded situational factors like Experience Level, Time of Shift, and Mining Method.
""")

st.subheader("Current Situation Configuration")

# Create a dictionary to hold user selections
user_input = {}

# Layout the dropdowns in columns
col1, col2 = st.columns(2)

with col1:
    # We remove <UNKNOWN> from the options so the user doesn't pick it (it's for unseen data)
    def get_options(feat):
        opts = list(encoders[feat].classes_)
        if '<UNKNOWN>' in opts: opts.remove('<UNKNOWN>')
        if 'UNKNOWN' in opts: opts.remove('UNKNOWN')
        return sorted(opts)
        
    user_input['AI_ACTY_DESC'] = st.selectbox("Current Activity", get_options('AI_ACTY_DESC'))
    user_input['MINING_EQUIP'] = st.selectbox("Equipment Used", get_options('MINING_EQUIP'))
    user_input['UG_LOCATION'] = st.selectbox("Mine Location", get_options('UG_LOCATION'))
    user_input['AI_CLASS_DESC'] = st.selectbox("Accident Classification Type", get_options('AI_CLASS_DESC'))

with col2:
    user_input['COAL_METAL_IND'] = st.selectbox("Mine Type (Coal vs Metal)", get_options('COAL_METAL_IND'))
    user_input['UG_MINING_METHOD'] = st.selectbox("Underground Mining Method", get_options('UG_MINING_METHOD'))
    user_input['EXPER_TOT_CALC'] = st.selectbox("Miner Experience Level", get_options('EXPER_TOT_CALC'))
    user_input['ACCIDENT_TIME'] = st.selectbox("Time of Shift", get_options('ACCIDENT_TIME'))

if st.button("Calculate Risk Score", type="primary"):
    # Encode inputs
    encoded_input = {}
    for feat, val in user_input.items():
        if val in encoders[feat].classes_:
            encoded_input[feat] = encoders[feat].transform([val])[0]
        else:
            encoded_input[feat] = encoders[feat].transform(['<UNKNOWN>'])[0]
            
    # Define correct feature order matching training script
    feature_order = [
        'AI_ACTY_DESC', 'MINING_EQUIP', 'UG_LOCATION', 'COAL_METAL_IND',
        'EXPER_TOT_CALC', 'ACCIDENT_TIME', 'UG_MINING_METHOD', 'AI_CLASS_DESC'
    ]
    
    # Prepare DataFrame with correct column order
    df_input = pd.DataFrame([encoded_input], columns=feature_order)
    
    # Predict
    prob = model.predict_proba(df_input)[0][1] # Probability of Class 1 (Severe)
    
    st.divider()
    st.subheader("Prediction Results")
    
    col3, col4 = st.columns(2)
    with col3:
        st.metric(label="Global Baseline Risk", value=f"{baseline_risk*100:.1f}%")
    with col4:
        delta = prob - baseline_risk
        st.metric(label="Situational Predicted Risk", value=f"{prob*100:.1f}%", delta=f"{delta*100:.1f}%", delta_color="inverse")
        
    st.markdown("### Risk Explanation")
    if prob > baseline_risk * 1.5:
        st.error("🚨 **HIGH RISK**: This specific combination of activity, equipment, time, and experience is significantly more dangerous than the historical average.")
    elif prob < baseline_risk * 0.7:
        st.success("✅ **LOWER RISK**: Based on MSHA data, this situation has a lower probability of resulting in a severe or fatal incident compared to the baseline.")
    else:
        st.info("ℹ️ **AVERAGE RISK**: This situation presents a risk level consistent with the overall industry average.")
        
    st.caption("Risk scores represent the probability that *if* an accident occurs in this situation, it will be Severe or Fatal.")
