"""
MineSign AI — Phase 1E Live Temporal Recognition with Strict Rejection & 60% Gate
Real-time webcam inference loop combining MediaPipe Holistic landmark extraction,
sliding window temporal feature aggregation, trained MLP classifier, 60% confidence gate,
confidence margin checks, and physical gesture-specific validators.
"""

import os
import sys
import time
import json
from collections import deque
import numpy as np
import cv2
import joblib

# Import MineSign modules
try:
    from config import (
        GESTURE_CLASSES, GESTURE_METADATA, CAMERA_ID, ZONE, SIMULATION_MODE,
        HOLISTIC_MODEL_PATH, MIN_CONFIDENCE, MIN_CONFIDENCE_MARGIN, WORKERS
    )
    from feature_extractor import MineSignFeatureExtractor
    from train_classifier import (
        extract_temporal_sequence_features, MODEL_V2_FILE, SCALER_V2_FILE, METADATA_V2_FILE
    )
    from temporal_engine import MineSignTemporalEngine
    from backend_bridge import dispatch_event_to_backend
except ImportError:
    from minesign_ai.config import (
        GESTURE_CLASSES, GESTURE_METADATA, CAMERA_ID, ZONE, SIMULATION_MODE,
        HOLISTIC_MODEL_PATH, MIN_CONFIDENCE, MIN_CONFIDENCE_MARGIN, WORKERS
    )
    from minesign_ai.feature_extractor import MineSignFeatureExtractor
    from minesign_ai.train_classifier import (
        extract_temporal_sequence_features, MODEL_V2_FILE, SCALER_V2_FILE, METADATA_V2_FILE
    )
    from minesign_ai.temporal_engine import MineSignTemporalEngine
    from minesign_ai.backend_bridge import dispatch_event_to_backend



def draw_live_hud(frame, features, telemetry, last_event, event_display_until, fps, active_worker="W001", model_name="minesign_classifier_v2.joblib"):
    h, w, _ = frame.shape
    now = time.time()

    # 1. Top Header Banner
    cv2.rectangle(frame, (0, 0), (w, 55), (20, 20, 20), -1)
    cv2.line(frame, (0, 55), (w, 55), (0, 215, 255), 2)
    cv2.putText(frame, "MINESIGN AI — LIVE RECOGNITION (v2)", (15, 38), cv2.FONT_HERSHEY_DUPLEX, 0.78, (255, 255, 255), 2)
    cv2.putText(frame, f"Model: {model_name}", (470, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 215, 255), 1)
    cv2.putText(frame, f"Worker: {active_worker} [Press W] | FPS: {fps:.1f}", (w - 290, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (200, 200, 200), 1)

    # 2. Telemetry Card: Raw ML vs Validated Decision (Top Left)
    overlay = frame.copy()
    cv2.rectangle(overlay, (15, 68), (530, 335), (15, 15, 15), -1)
    cv2.addWeighted(overlay, 0.88, frame, 0.12, 0, frame)
    cv2.rectangle(frame, (15, 68), (530, 335), (60, 60, 60), 1)


    raw_pred = telemetry.get("raw_prediction", "NO_GESTURE")
    raw_conf = telemetry.get("raw_confidence", 0.0)
    second_pred = telemetry.get("second_prediction", "NONE")
    second_conf = telemetry.get("second_confidence", 0.0)
    conf_status = telemetry.get("confidence_status", "PASS")
    val_status = telemetry.get("gesture_validation_status", "FAIL")
    final_res = telemetry.get("final_result", "NO_GESTURE")

    raw_meta = GESTURE_METADATA.get(raw_pred, {"color": (128, 128, 128), "priority": "LOW"})

    # A. Raw Model Prediction & Top-1 Confidence
    cv2.putText(frame, "1. RAW MODEL PREDICTION:", (25, 92), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (0, 215, 255), 1)
    cv2.putText(frame, f"{raw_pred}", (240, 92), cv2.FONT_HERSHEY_DUPLEX, 0.55, raw_meta["color"], 1)

    cv2.putText(frame, f"RAW CONFIDENCE: {raw_conf*100:.1f}%", (25, 118), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (220, 220, 220), 1)
    
    # B. Second Best Prediction & Margin
    cv2.putText(frame, f"SECOND BEST:    {second_pred} ({second_conf*100:.1f}%)", (25, 142), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (160, 160, 160), 1)

    # C. 60% Confidence Gate Status
    gate_color = (0, 255, 128) if "PASS" in conf_status else (0, 0, 255)
    cv2.putText(frame, f"CONFIDENCE GATE (>=60%):", (25, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (220, 220, 220), 1)
    cv2.putText(frame, f"{conf_status}", (250, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.48, gate_color, 2)

    # D. Physical/Temporal Gesture Validation Status
    val_color = (0, 255, 128) if "PASS" in val_status else ((0, 215, 255) if "HOLDING" in val_status or "TAP" in val_status or "WAVING" in val_status or "X" in val_status else (140, 140, 140))
    cv2.putText(frame, f"GESTURE VALIDATION:", (25, 198), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (220, 220, 220), 1)
    cv2.putText(frame, f"{val_status}", (205, 198), cv2.FONT_HERSHEY_SIMPLEX, 0.46, val_color, 1)

    # E. Divider
    cv2.line(frame, (25, 215), (500, 215), (50, 50, 50), 1)

    # F. FINAL VALIDATED RESULT (The Ground Truth Output)
    final_color = (0, 255, 128) if "CONFIRMED" in final_res else ((0, 165, 255) if "COOLDOWN" in final_res else (180, 180, 180))
    cv2.putText(frame, "FINAL RESULT:", (25, 245), cv2.FONT_HERSHEY_DUPLEX, 0.58, (255, 255, 255), 1)
    cv2.putText(frame, f"{final_res}", (170, 246), cv2.FONT_HERSHEY_DUPLEX, 0.65, final_color, 2)

    # Dynamic timers for Gas Hold or PPE Tap
    if raw_pred == "SUSPECTED_GAS_LEAK" or telemetry.get("gas_progress", 0) > 0:
        gas_timer = telemetry.get("gas_timer_str", "0.0 / 4.0s")
        cv2.putText(frame, f"Gas Timer (4.0s min): {gas_timer}", (25, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)
    elif raw_pred == "PPE_DAMAGE" or "Taps" in telemetry.get("ppe_tap_info", ""):
        tap_info = telemetry.get("ppe_tap_info", "")
        cv2.putText(frame, f"PPE Pattern: {tap_info} (TAP -> TAP)", (25, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 215, 255), 1)
    else:
        cv2.putText(frame, "Default State: Safe Ambient Monitoring", (25, 275), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (130, 130, 130), 1)

    cv2.putText(frame, f"Camera: {CAMERA_ID} | Zone: {ZONE}", (25, 298), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (140, 140, 140), 1)

    # 3. Confirmed Event Banner (Bottom Center Pop-up)
    if last_event and now < event_display_until:
        ev_gesture = last_event["gesture"]
        ev_priority = last_event["priority"]
        ev_conf = last_event.get("confidence", 0.0)
        ev_meta = GESTURE_METADATA.get(ev_gesture, {"color": (0, 0, 255)})

        bx1, by1 = w // 2 - 340, h - 145
        bx2, by2 = w // 2 + 340, h - 50

        # Pulsing event card
        cv2.rectangle(frame, (bx1, by1), (bx2, by2), (20, 20, 20), -1)
        cv2.rectangle(frame, (bx1, by1), (bx2, by2), ev_meta["color"], 3)

        cv2.putText(frame, f"🚨 CONFIRMED SAFETY EVENT: {ev_gesture}", (bx1 + 20, by1 + 35), cv2.FONT_HERSHEY_DUPLEX, 0.65, ev_meta["color"], 2)
        cv2.putText(frame, f"Priority: {ev_priority} | Conf: {ev_conf*100:.1f}% | Validated by MineSign Engine", (bx1 + 20, by1 + 65), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (255, 255, 255), 1)

    # 4. Bottom Instructions Bar
    cv2.rectangle(frame, (0, h - 35), (w, h), (15, 15, 15), -1)
    cv2.putText(frame, "Press 'Q' or 'ESC' to exit | Strict 60% Gate + Open-Set Unknown Rejection Active", (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (170, 170, 170), 1)


def run_live_recognition(default_worker="W001"):
    import argparse
    parser = argparse.ArgumentParser(description="MineSign AI Live Recognition (Phase 1G / Phase 2)")
    parser.add_argument("--worker", type=str, default=default_worker, choices=["W001", "W002"], help="Active Worker ID")
    parser.add_argument("--sync-backend", action="store_true", help="Sync confirmed events with CoalGuard Backend API (POST /api/minesign/events)")
    parser.add_argument("--backend-url", type=str, default="http://localhost:5001/api/minesign/events", help="Backend API endpoint URL")
    args, _ = parser.parse_known_args()

    active_worker = args.worker
    sync_backend = args.sync_backend
    backend_url = args.backend_url

    print("\n==========================================================================")
    print("🚀 Initializing MineSign AI Live Recognition with Strict 60% Gate...")
    print("📡 Mode: SIMULATION MODE (Laptop Webcam)")
    print(f"📦 Production Model: {os.path.basename(MODEL_V2_FILE)}")
    print(f"👷 Active Worker: {active_worker} (Press 'W' in window to toggle)")
    print(f"🌐 Backend Sync: {'ENABLED -> ' + backend_url if sync_backend else 'DISABLED (Local Simulation)'}")
    print(f"🛡️  Rule: MIN_CONFIDENCE >= {MIN_CONFIDENCE*100:.0f}% + Physical/Temporal Validator Required")
    print("🛑 Safe State: Any unconfirmed or ambiguous movement -> NO_GESTURE")
    print("==========================================================================\n")


    # 1. Load Model Artifacts
    if not os.path.exists(MODEL_V2_FILE) or not os.path.exists(SCALER_V2_FILE):
        print(f"❌ ERROR: Model artifacts not found ({MODEL_V2_FILE}). Please train model first via train_classifier.py.")
        sys.exit(1)

    print(f"📦 Loading trained classifier from '{MODEL_V2_FILE}'...")
    model = joblib.load(MODEL_V2_FILE)
    scaler = joblib.load(SCALER_V2_FILE)
    model_basename = os.path.basename(MODEL_V2_FILE)

    if os.path.exists(METADATA_V2_FILE):
        with open(METADATA_V2_FILE, "r") as f:
            metadata = json.load(f)
            print(f"ℹ️ Model: {metadata.get('model_name')} | Version: {metadata.get('version')}")

    # 2. Initialize MediaPipe Holistic & Temporal Engine
    extractor = MineSignFeatureExtractor()
    engine = MineSignTemporalEngine(window_size=75)
    sliding_buffer = deque(maxlen=75)
    timestamp_buffer = deque(maxlen=75)

    # 3. Open Webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ ERROR: Could not open default webcam.")
        extractor.close()
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("✅ Live camera stream online. Press 'Q' or 'ESC' to exit, 'W' to toggle worker.\n")

    prev_time = time.time()
    fps = 30.0
    last_confirmed_event = None
    event_display_until = 0.0

    raw_prediction = "NO_GESTURE"
    probabilities = np.zeros(len(GESTURE_CLASSES))

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Mirror frame for natural interaction
            frame = cv2.flip(frame, 1)
            now = time.time()

            # Measure FPS
            fps = 0.9 * fps + 0.1 * (1.0 / max(now - prev_time, 1e-5)) if prev_time > 0 else 30.0
            prev_time = now

            # Process frame with MediaPipe Holistic
            results = extractor.process_frame(frame)
            features_dict, feature_vector = extractor.extract_features(results)

            # Draw skeletal landmarks
            extractor.draw_landmarks(frame, results)

            # Accumulate in sliding temporal buffer
            sliding_buffer.append(feature_vector)
            timestamp_buffer.append(now)

            # Run ML model on temporal sequence buffer when sufficient frames exist
            if len(sliding_buffer) >= 20:
                seq_dur = timestamp_buffer[-1] - timestamp_buffer[0]
                temp_feat = extract_temporal_sequence_features(
                    list(sliding_buffer),
                    timestamps=list(timestamp_buffer),
                    duration_sec=seq_dur
                )
                temp_feat_scaled = scaler.transform([temp_feat])
                probs = model.predict_proba(temp_feat_scaled)[0]
                pred_idx = np.argmax(probs)
                raw_prediction = GESTURE_CLASSES[pred_idx]
                probabilities = probs
            else:
                raw_prediction = "NO_GESTURE"
                probabilities = np.zeros(len(GESTURE_CLASSES))

            # Pass into temporal state machine & validation engine (evaluate_decision)
            telemetry, confirmed_event = engine.evaluate_decision(
                feature_vector,
                features_dict,
                raw_prediction=raw_prediction,
                probabilities=probabilities,
                worker_id=active_worker
            )

            # Handle newly confirmed event
            if confirmed_event:
                last_confirmed_event = confirmed_event
                event_display_until = now + 4.5
                print(f"🎯 [MINESIGN EVENT CONFIRMED - {active_worker}] {confirmed_event['gesture']} (Priority: {confirmed_event['priority']} | Conf: {confirmed_event['confidence']*100:.1f}%)")

                if sync_backend:
                    ok, resp, code = dispatch_event_to_backend(confirmed_event, backend_url=backend_url)
                    if ok:
                        print(f"  📡 [Backend Sync] Event synced successfully (HTTP {code}) -> Event ID: {resp.get('event_id')}")
                    else:
                        print(f"  ⚠️  [Backend Sync Warning] Sync failed (HTTP {code}): {resp.get('message', resp.get('error'))}")


            # Render Live Telemetry HUD
            draw_live_hud(
                frame,
                features_dict,
                telemetry,
                last_confirmed_event,
                event_display_until,
                fps,
                active_worker=active_worker,
                model_name=model_basename
            )

            cv2.imshow("MineSign AI — Live Recognition (Press Q to Exit, W to Toggle Worker)", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in [ord('q'), ord('Q'), 27]:
                print("\n👋 Exiting Live Recognition.")
                break
            elif key in [ord('w'), ord('W')]:
                active_worker = "W002" if active_worker == "W001" else "W001"
                print(f"🔄 Worker toggled to: {active_worker}")

    except KeyboardInterrupt:
        print("\n🛑 Stopped by user interrupt.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        extractor.close()
        print("✅ Resources released.\n")


if __name__ == "__main__":
    run_live_recognition()

