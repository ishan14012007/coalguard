"""
MineSign AI — Phase 1A MediaPipe Holistic Prototype Verification
Live Laptop Webcam Landmark Extraction & Geometric Signal Telemetry

Verifies:
1. Laptop webcam accessibility via OpenCV
2. MediaPipe Holistic pose (33 pts) and dual-hand (21 pts each) tracking
3. Invariant normalized geometric signals for all 5 gesture classes
4. Zero dependency on YOLO/Torch inside MineSign
"""

import cv2
import time
import sys
import numpy as np

# Import MineSign modules
try:
    from config import SIMULATION_MODE, CAMERA_ID, ZONE, WORKERS
    from feature_extractor import MineSignFeatureExtractor
except ImportError:
    from minesign_ai.config import SIMULATION_MODE, CAMERA_ID, ZONE, WORKERS
    from minesign_ai.feature_extractor import MineSignFeatureExtractor


def draw_hud(frame, features, fps):
    h, w, _ = frame.shape

    # 1. Top Banner: SIMULATION MODE Header
    cv2.rectangle(frame, (0, 0), (w, 55), (20, 20, 20), -1)
    cv2.line(frame, (0, 55), (w, 55), (0, 215, 255), 2)

    # Title & Simulation Badge
    cv2.putText(frame, "MINESIGN AI", (15, 36), cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 255), 2)
    cv2.putText(frame, "[SIMULATION MODE]", (210, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)

    # Engine badge & Metadata
    meta_text = f"Engine: MediaPipe Holistic | Cam: {CAMERA_ID} | Zone: {ZONE} | FPS: {fps:.1f}"
    cv2.putText(frame, meta_text, (w - 620, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)

    # 2. Left Telemetry Panel (Landmark Detection Status)
    overlay = frame.copy()
    cv2.rectangle(overlay, (15, 70), (330, 220), (15, 15, 15), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
    cv2.rectangle(frame, (15, 70), (330, 220), (60, 60, 60), 1)

    cv2.putText(frame, "MEDIAPIPE DETECTION STATUS", (25, 92), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 215, 255), 1)

    # Pose Status (33 landmarks)
    pose_color = (0, 255, 128) if features["has_pose"] else (80, 80, 80)
    pose_status = "LOCKED (33 pts)" if features["has_pose"] else "SEARCHING"
    cv2.putText(frame, f"Pose Track: {pose_status}", (25, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.48, pose_color, 1)

    # Left Hand Status (21 landmarks)
    lh_color = (255, 150, 50) if features["has_left_hand"] else (80, 80, 80)
    lh_status = "DETECTED (21 pts)" if features["has_left_hand"] else "OFF-FRAME"
    cv2.putText(frame, f"Left Hand:  {lh_status}", (25, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.48, lh_color, 1)

    # Right Hand Status (21 landmarks)
    rh_color = (50, 180, 255) if features["has_right_hand"] else (80, 80, 80)
    rh_status = "DETECTED (21 pts)" if features["has_right_hand"] else "OFF-FRAME"
    cv2.putText(frame, f"Right Hand: {rh_status}", (25, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.48, rh_color, 1)

    # Assigned Workers
    cv2.putText(frame, f"Simulated Workers: {', '.join(WORKERS)}", (25, 208), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (150, 150, 150), 1)

    # 3. Right Telemetry Panel (Extracted Geometric Signals for 5 Gestures)
    rx1, rx2 = w - 380, w - 15
    overlay2 = frame.copy()
    cv2.rectangle(overlay2, (rx1, 70), (rx2, 280), (15, 15, 15), -1)
    cv2.addWeighted(overlay2, 0.75, frame, 0.25, 0, frame)
    cv2.rectangle(frame, (rx1, 70), (rx2, 280), (60, 60, 60), 1)

    cv2.putText(frame, "EXTRACTED GEOMETRIC SIGNALS", (rx1 + 10, 92), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (0, 215, 255), 1)

    # 1. PPE_DAMAGE: Hand tapping head/helmet
    h2h = features["min_hand_to_head"]
    h2h_color = (0, 255, 128) if features["is_hand_at_head"] else (180, 180, 180)
    h2h_txt = "HEAD TOUCH (TAP)" if features["is_hand_at_head"] else f"{h2h:.2f} (Target < 0.45)"
    cv2.putText(frame, f"1. Head Tap (PPE): {h2h_txt}", (rx1 + 10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.45, h2h_color, 1)

    # 2. SUSPECTED_GAS_LEAK: Hand to Mouth & Open Palm
    h2m = features["min_hand_to_mouth"]
    h2m_color = (0, 255, 128) if features["is_palm_at_mouth"] else (180, 180, 180)
    palm_txt = "PALM ON MOUTH" if features["is_palm_at_mouth"] else f"{h2m:.2f} (Target < 0.45)"
    cv2.putText(frame, f"2. Palm-to-Mouth: {palm_txt}", (rx1 + 10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.45, h2m_color, 1)

    # 3. CRACK_WORSENING: Inter-Index Fingertip Distance
    iid = features["inter_index_dist"]
    iid_color = (0, 255, 128) if (features["has_left_hand"] and features["has_right_hand"]) else (180, 180, 180)
    cv2.putText(frame, f"3. Index Distance:{iid:.2f} (Widening cyclic)", (rx1 + 10, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.45, iid_color, 1)

    # 4. RESCUE_REQUIRED: Overhead Wrists
    ovh_color = (0, 0, 255) if features["both_arms_overhead"] else (180, 180, 180)
    ovh_text = "YES (ALARM)" if features["both_arms_overhead"] else f"NO (L:{features['lw_elev']:.1f}, R:{features['rw_elev']:.1f})"
    cv2.putText(frame, f"4. Arms Overhead: {ovh_text}", (rx1 + 10, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.45, ovh_color, 1)

    # 5. HAZARD_HERE: Crossed Forearms X
    cross_color = (0, 165, 255) if features["is_crossed_x"] else (180, 180, 180)
    cross_text = "CROSSED X" if features["is_crossed_x"] else "UN-CROSSED"
    cv2.putText(frame, f"5. Forearm Cross: {cross_text}", (rx1 + 10, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.45, cross_color, 1)

    # Bottom Help Bar
    cv2.rectangle(frame, (0, h - 35), (w, h), (20, 20, 20), -1)
    cv2.putText(frame, "Press 'Q' or 'ESC' to exit | MediaPipe Holistic Landmark Test", (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (160, 160, 160), 1)


def main():
    print("\n=======================================================")
    print("🚀 Initializing MineSign AI MediaPipe Holistic Test...")
    print("📡 Mode: SIMULATION MODE (Laptop Webcam)")
    print("=======================================================")

    extractor = MineSignFeatureExtractor()

    # Attempt to open default webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("\n❌ ERROR: Could not open default webcam (device index 0).")
        print("💡 macOS Hint: Ensure Terminal / IDE has Camera permission in System Settings -> Privacy & Security -> Camera.")
        print("💡 If an external camera is used, try changing device_index to 1 in config.py.")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("✅ Webcam opened successfully.")
    print("🎯 Streaming frames to MediaPipe Holistic... Press 'Q' or 'ESC' in video window to exit.\n")

    prev_time = time.time()
    fps = 0.0

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("⚠️ Frame capture failed or stream ended.")
                break

            # Mirror frame for natural ergonomic interaction
            frame = cv2.flip(frame, 1)

            # Process with MediaPipe Holistic
            results = extractor.process_frame(frame)

            # Extract normalized invariant features & metrics
            features, feature_vector = extractor.extract_features(results)

            # Draw MediaPipe skeleton & hand landmarks
            extractor.draw_landmarks(frame, results)

            # Calculate FPS
            curr_time = time.time()
            fps = 0.9 * fps + 0.1 * (1.0 / max(curr_time - prev_time, 1e-5)) if prev_time > 0 else 30.0
            prev_time = curr_time

            # Render Telemetry HUD
            draw_hud(frame, features, fps)

            # Show window
            cv2.imshow("MineSign AI - MediaPipe Holistic Simulation (Press Q to Exit)", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == ord('Q') or key == 27:  # 'q' or ESC
                print("👋 Quitting MineSign MediaPipe webcam test.")
                break

    except KeyboardInterrupt:
        print("\n🛑 Stopped by user interrupt.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        extractor.close()
        print("✅ Webcam and MediaPipe resources released successfully.\n")


if __name__ == "__main__":
    main()
