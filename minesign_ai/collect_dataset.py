"""
MineSign AI — Phase 1B Temporal Dataset Collector
Captures complete MediaPipe Holistic temporal sequences for all 6 gesture classes.
Organizes data by gesture and worker with built-in quality validation and manifest indexing.
"""

import os
import sys
import time
import json
import glob
from datetime import datetime
import numpy as np
import cv2

# Import MineSign modules
try:
    from config import (
        GESTURE_CLASSES, GESTURE_METADATA, WORKERS, DATA_DIR,
        MANIFEST_PATH, TARGET_SAMPLES_PER_GESTURE, COUNTDOWN_SECONDS,
        CAMERA_ID, ZONE, SIMULATION_MODE
    )
    from feature_extractor import MineSignFeatureExtractor
except ImportError:
    from minesign_ai.config import (
        GESTURE_CLASSES, GESTURE_METADATA, WORKERS, DATA_DIR,
        MANIFEST_PATH, TARGET_SAMPLES_PER_GESTURE, COUNTDOWN_SECONDS,
        CAMERA_ID, ZONE, SIMULATION_MODE
    )
    from minesign_ai.feature_extractor import MineSignFeatureExtractor


# Collector States
STATE_IDLE = "IDLE"
STATE_COUNTDOWN = "COUNTDOWN"
STATE_RECORDING = "RECORDING"
STATE_VALIDATING = "VALIDATING"


class MineSignDatasetCollector:
    def __init__(self, data_dir=DATA_DIR, manifest_path=MANIFEST_PATH):
        self.data_dir = data_dir
        self.manifest_path = manifest_path
        self.extractor = MineSignFeatureExtractor()
        self._init_data_structure()
        self.manifest = self._load_manifest()

    def _init_data_structure(self):
        """Creates directory tree for all gestures and workers."""
        os.makedirs(self.data_dir, exist_ok=True)
        for gesture in GESTURE_CLASSES:
            for worker in WORKERS:
                folder = os.path.join(self.data_dir, gesture, worker)
                os.makedirs(folder, exist_ok=True)

    def _load_manifest(self):
        """Loads or initializes dataset manifest index."""
        if os.path.exists(self.manifest_path):
            try:
                with open(self.manifest_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"samples": [], "summary": {}, "last_updated": None}

    def _save_manifest(self):
        """Saves updated manifest to disk."""
        self.manifest["last_updated"] = datetime.now().isoformat()
        self.manifest["summary"] = self.get_summary()
        with open(self.manifest_path, "w") as f:
            json.dump(self.manifest, f, indent=2)

    def count_samples(self, gesture, worker):
        """Counts existing valid sequence files for a specific gesture and worker."""
        folder = os.path.join(self.data_dir, gesture, worker)
        files = glob.glob(os.path.join(folder, "*.npz"))
        return len(files)

    def get_summary(self):
        """Returns total counts per gesture and per worker."""
        summary = {}
        for gesture in GESTURE_CLASSES:
            summary[gesture] = {}
            for worker in WORKERS:
                summary[gesture][worker] = self.count_samples(gesture, worker)
            summary[gesture]["total"] = sum(summary[gesture][w] for w in WORKERS)
        return summary

    def validate_sequence(self, sequence_data, gesture):
        """
        Validates the captured temporal sequence against quality standards.
        Returns: (is_valid, reason)
        """
        frames = sequence_data["feature_vectors"]
        duration = sequence_data["duration_sec"]
        has_pose_list = sequence_data["has_pose_list"]

        min_duration = GESTURE_METADATA[gesture].get("min_duration_sec", 1.5)

        # 1. Minimum frame count
        if len(frames) < 15:
            return False, f"Sequence too short ({len(frames)} frames). Minimum 15 frames required."

        # 2. Duration check (especially critical for SUSPECTED_GAS_LEAK >= 4.0s)
        if duration < min_duration:
            return False, f"Duration {duration:.1f}s < required minimum {min_duration:.1f}s."

        # 3. Pose detection ratio check
        pose_ratio = sum(has_pose_list) / max(len(has_pose_list), 1)
        if pose_ratio < 0.50:
            return False, f"Body landmarks lost in {int((1-pose_ratio)*100)}% of frames. Please stay in view."

        return True, "Valid"

    def save_sequence(self, sequence_data):
        """
        Persists validated sequence to an isolated .npz file and updates manifest.
        Returns: filepath
        """
        gesture = sequence_data["gesture"]
        worker = sequence_data["worker_id"]
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:19]
        existing_count = self.count_samples(gesture, worker) + 1
        sample_id = f"seq_{worker}_{gesture}_{timestamp_str}_{existing_count:03d}"
        
        folder = os.path.join(self.data_dir, gesture, worker)
        os.makedirs(folder, exist_ok=True)
        filepath = os.path.join(folder, f"{sample_id}.npz")

        # Save binary arrays & metadata
        metadata_dict = {
            "sample_id": sample_id,
            "worker_id": worker,
            "gesture": gesture,
            "num_frames": int(len(sequence_data["feature_vectors"])),
            "duration_sec": float(round(sequence_data["duration_sec"], 2)),
            "fps": float(round(sequence_data["fps"], 1)),
            "camera_id": CAMERA_ID,
            "zone": ZONE,
            "created_at": datetime.now().isoformat(),
            "target_duration_sec": float(sequence_data.get("target_duration_sec", 3.0))
        }

        np.savez_compressed(
            filepath,
            feature_vectors=np.array(sequence_data["feature_vectors"], dtype=np.float32),
            timestamps=np.array(sequence_data["timestamps"], dtype=np.float32),
            metadata_json=json.dumps(metadata_dict)
        )

        # Update manifest record
        manifest_record = {
            **metadata_dict,
            "filepath": filepath,
            "relative_path": os.path.relpath(filepath, self.data_dir)
        }
        self.manifest["samples"].append(manifest_record)
        self._save_manifest()

        return filepath, sample_id

    def close(self):
        self.extractor.close()


def draw_collector_hud(frame, state, worker, gesture, gesture_idx, count, target,
                       countdown_val, rec_elapsed, rec_target, msg, msg_color, fps):
    """Draws rich interactive dataset collector HUD."""
    h, w, _ = frame.shape
    meta = GESTURE_METADATA[gesture]

    # 1. Top Header Banner
    cv2.rectangle(frame, (0, 0), (w, 60), (20, 20, 20), -1)
    cv2.line(frame, (0, 60), (w, 60), (0, 215, 255), 2)
    cv2.putText(frame, "MINESIGN DATASET COLLECTOR", (15, 40), cv2.FONT_HERSHEY_DUPLEX, 0.85, (255, 255, 255), 2)
    cv2.putText(frame, "[SIMULATION MODE]", (470, 39), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (0, 215, 255), 2)
    cv2.putText(frame, f"FPS: {fps:.1f}", (w - 120, 39), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

    # 2. Worker & Gesture Control Card (Top Left)
    overlay = frame.copy()
    cv2.rectangle(overlay, (15, 75), (460, 245), (15, 15, 15), -1)
    cv2.addWeighted(overlay, 0.80, frame, 0.20, 0, frame)
    cv2.rectangle(frame, (15, 75), (460, 245), (60, 60, 60), 1)

    # Worker Selector Indicator
    cv2.putText(frame, f"WORKER: {worker} (Press 'W' to toggle)", (25, 102), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 128), 2)

    # Gesture Selector & Class index
    cv2.putText(frame, f"GESTURE [{gesture_idx+1}/6]: {gesture}", (25, 132), cv2.FONT_HERSHEY_SIMPLEX, 0.60, (0, 215, 255), 2)
    cv2.putText(frame, f"Priority: {meta['priority']}", (25, 156), cv2.FONT_HERSHEY_SIMPLEX, 0.48, meta["color"], 1)

    # Instruction / Gesture description
    desc_lines = [meta["description"][:50], meta["description"][50:]]
    cv2.putText(frame, f"Action: {desc_lines[0]}", (25, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 220, 220), 1)
    if desc_lines[1]:
        cv2.putText(frame, f"        {desc_lines[1]}", (25, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (220, 220, 220), 1)

    # Progress Counter
    pct = int((count / max(target, 1)) * 100)
    cv2.putText(frame, f"Collected: {count}/{target} sequences ({pct}%)", (25, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.50, (255, 255, 0), 1)

    # 3. State & Recording Display
    if state == STATE_IDLE:
        # Prompt to start recording
        cv2.rectangle(frame, (w//2 - 250, h - 110), (w//2 + 250, h - 50), (20, 20, 20), -1)
        cv2.rectangle(frame, (w//2 - 250, h - 110), (w//2 + 250, h - 50), (0, 255, 128), 2)
        cv2.putText(frame, "PRESS [SPACE] TO RECORD", (w//2 - 210, h - 72), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 255, 128), 2)

    elif state == STATE_COUNTDOWN:
        # Large Countdown Overlay in center of screen
        cd_text = str(countdown_val)
        cv2.circle(frame, (w//2, h//2), 90, (0, 0, 0), -1)
        cv2.circle(frame, (w//2, h//2), 90, (0, 215, 255), 4)
        cv2.putText(frame, cd_text, (w//2 - 28, h//2 + 35), cv2.FONT_HERSHEY_DUPLEX, 3.2, (0, 215, 255), 5)
        cv2.putText(frame, "GET READY...", (w//2 - 95, h//2 + 130), cv2.FONT_HERSHEY_SIMPLEX, 0.80, (255, 255, 255), 2)

    elif state == STATE_RECORDING:
        # Recording Red Border & Flashing Indicator
        cv2.rectangle(frame, (0, 0), (w, h), (0, 0, 255), 6)
        cv2.circle(frame, (w - 180, 100), 14, (0, 0, 255), -1)
        cv2.putText(frame, "RECORDING", (w - 155, 107), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 0, 255), 2)

        # Timer & Progress Bar
        bar_w = 400
        bar_x = w // 2 - bar_w // 2
        bar_y = h - 90
        progress = min(rec_elapsed / max(rec_target, 0.1), 1.0)

        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + 25), (30, 30, 30), -1)
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + int(bar_w * progress), bar_y + 25), (0, 0, 255), -1)
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + 25), (200, 200, 200), 2)

        timer_txt = f"{rec_elapsed:.1f}s / {rec_target:.1f}s"
        cv2.putText(frame, timer_txt, (bar_x + bar_w // 2 - 45, bar_y + 19), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        # Highlight minimum duration threshold for SUSPECTED_GAS_LEAK
        if gesture == "SUSPECTED_GAS_LEAK":
            min_x = bar_x + int(bar_w * (4.0 / rec_target))
            cv2.line(frame, (min_x, bar_y - 5), (min_x, bar_y + 30), (0, 255, 0), 2)
            cv2.putText(frame, "4.0s min", (min_x - 25, bar_y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 255, 0), 1)

    # 4. Status Message Banner (Save / Reject Feedback)
    if msg:
        cv2.rectangle(frame, (w//2 - 280, 75), (w//2 + 280, 115), (20, 20, 20), -1)
        cv2.rectangle(frame, (w//2 - 280, 75), (w//2 + 280, 115), msg_color, 2)
        cv2.putText(frame, msg, (w//2 - 265, 102), cv2.FONT_HERSHEY_SIMPLEX, 0.52, msg_color, 1)

    # 5. Bottom Navigation Bar
    cv2.rectangle(frame, (0, h - 40), (w, h), (15, 15, 15), -1)
    nav_text = "[SPACE] Record | [1-6] Gesture | [N/P] Next/Prev | [W] Worker | [R] Retake | [Q/ESC] Quit"
    cv2.putText(frame, nav_text, (20, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (180, 180, 180), 1)


def run_dataset_collector():
    print("\n=======================================================")
    print("🎥 Initializing MineSign AI Dataset Collector...")
    print("📡 Mode: SIMULATION MODE (Laptop Webcam)")
    print("📁 Storage Root: minesign_ai/data/")
    print("=======================================================\n")

    collector = MineSignDatasetCollector()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("\n❌ ERROR: Could not open default webcam (device index 0).")
        print("💡 Ensure camera permissions are active in System Settings -> Privacy & Security -> Camera.")
        collector.close()
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    # State variables
    worker_idx = 0
    gesture_idx = 0
    state = STATE_IDLE
    countdown_start = 0
    rec_start_time = 0
    rec_frames = []
    rec_timestamps = []
    rec_pose_visible = []
    feedback_msg = ""
    feedback_color = (0, 255, 128)
    feedback_until = 0

    prev_time = time.time()
    fps = 30.0

    print("✅ Dataset collector ready.")
    print("👉 Use the OpenCV window to select gestures, switch workers, and record sequences.\n")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Mirror for natural ergonomic view
            frame = cv2.flip(frame, 1)
            curr_time = time.time()

            # Measure FPS
            fps = 0.9 * fps + 0.1 * (1.0 / max(curr_time - prev_time, 1e-5)) if prev_time > 0 else 30.0
            prev_time = curr_time

            current_worker = WORKERS[worker_idx]
            current_gesture = GESTURE_CLASSES[gesture_idx]
            meta = GESTURE_METADATA[current_gesture]
            target_duration = meta.get("default_duration_sec", 3.5)

            # Process frame with MediaPipe Holistic
            results = collector.extractor.process_frame(frame)
            features, feature_vector = collector.extractor.extract_features(results)

            # Draw skeletal landmarks
            collector.extractor.draw_landmarks(frame, results)

            # State Machine Handling
            countdown_val = 0
            rec_elapsed = 0.0

            if state == STATE_COUNTDOWN:
                elapsed_cd = curr_time - countdown_start
                countdown_val = int(COUNTDOWN_SECONDS - elapsed_cd) + 1
                if elapsed_cd >= COUNTDOWN_SECONDS:
                    # Transition to Recording
                    state = STATE_RECORDING
                    rec_start_time = time.time()
                    rec_frames = []
                    rec_timestamps = []
                    rec_pose_visible = []

            elif state == STATE_RECORDING:
                rec_elapsed = curr_time - rec_start_time
                rec_frames.append(feature_vector)
                rec_timestamps.append(rec_elapsed)
                rec_pose_visible.append(bool(features["has_pose"]))

                # Auto-stop when target duration reached
                if rec_elapsed >= target_duration:
                    state = STATE_VALIDATING

            if state == STATE_VALIDATING:
                seq_data = {
                    "gesture": current_gesture,
                    "worker_id": current_worker,
                    "feature_vectors": rec_frames,
                    "timestamps": rec_timestamps,
                    "duration_sec": rec_timestamps[-1] if rec_timestamps else 0.0,
                    "has_pose_list": rec_pose_visible,
                    "fps": len(rec_frames) / max(rec_timestamps[-1], 0.1) if rec_timestamps else 30.0,
                    "target_duration_sec": target_duration
                }

                is_valid, reason = collector.validate_sequence(seq_data, current_gesture)
                if is_valid:
                    filepath, sample_id = collector.save_sequence(seq_data)
                    feedback_msg = f"SAVED: {sample_id} ({len(rec_frames)} frames)"
                    feedback_color = (0, 255, 128)
                    print(f"✅ Saved sequence: {sample_id} [{current_gesture} | {current_worker} | {seq_data['duration_sec']:.1f}s]")
                else:
                    feedback_msg = f"REJECTED: {reason}"
                    feedback_color = (0, 0, 255)
                    print(f"⚠️ Sequence rejected: {reason}")

                feedback_until = curr_time + 3.0
                state = STATE_IDLE

            # Clear temporary feedback message
            disp_msg = feedback_msg if curr_time < feedback_until else ""

            # Current sample count for worker + gesture
            count = collector.count_samples(current_gesture, current_worker)

            # Render HUD
            draw_collector_hud(
                frame, state, current_worker, current_gesture, gesture_idx, count,
                TARGET_SAMPLES_PER_GESTURE, countdown_val, rec_elapsed, target_duration,
                disp_msg, feedback_color, fps
            )

            cv2.imshow("MineSign AI - Temporal Dataset Collector", frame)
            key = cv2.waitKey(1) & 0xFF

            if key in [ord('q'), ord('Q'), 27]:  # Quit
                print("\n👋 Exiting Dataset Collector.")
                break

            elif key == ord(' ') and state == STATE_IDLE:  # Start recording
                state = STATE_COUNTDOWN
                countdown_start = time.time()

            elif key in [ord('w'), ord('W')] and state == STATE_IDLE:  # Switch Worker
                worker_idx = (worker_idx + 1) % len(WORKERS)

            elif key in [ord('n'), ord('N')] and state == STATE_IDLE:  # Next gesture
                gesture_idx = (gesture_idx + 1) % len(GESTURE_CLASSES)

            elif key in [ord('p'), ord('P')] and state == STATE_IDLE:  # Previous gesture
                gesture_idx = (gesture_idx - 1) % len(GESTURE_CLASSES)

            elif key in [ord('r'), ord('R')] and state == STATE_IDLE:  # Retake current gesture
                state = STATE_COUNTDOWN
                countdown_start = time.time()

            elif ord('1') <= key <= ord('6') and state == STATE_IDLE:  # Jump directly to 1..6
                gesture_idx = key - ord('1')

    except KeyboardInterrupt:
        print("\n🛑 Stopped by user interrupt.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        collector.close()
        print("✅ Resources released and dataset manifest synchronized.\n")


if __name__ == "__main__":
    run_dataset_collector()
