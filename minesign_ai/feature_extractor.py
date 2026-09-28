"""
MineSign AI Feature Extractor
Extracts normalized spatial landmarks & geometric features using MediaPipe Holistic.
Guaranteed safe against missing hands, occlusions, and body distance variations.
"""

import os
import urllib.request
import ssl
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import PoseLandmarksConnections, HandLandmarksConnections

try:
    from config import HOLISTIC_MODEL_PATH
except ImportError:
    from minesign_ai.config import HOLISTIC_MODEL_PATH


class MineSignFeatureExtractor:
    def __init__(self, model_path=None):
        self.model_path = model_path or HOLISTIC_MODEL_PATH
        self._ensure_model_exists()

        # Initialize MediaPipe Holistic Landmarker
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.HolisticLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.HolisticLandmarker.create_from_options(options)
        print("✅ MediaPipe Holistic Landmarker initialized successfully.")

    def _ensure_model_exists(self):
        """Downloads the official MediaPipe Holistic task bundle if not present."""
        if not os.path.exists(self.model_path) or os.path.getsize(self.model_path) < 1000:
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            print("📦 Downloading MediaPipe Holistic model bundle...")
            url = "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task"
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(url, context=ctx) as u, open(self.model_path, "wb") as f:
                f.write(u.read())
            print(f"✅ Downloaded holistic model ({os.path.getsize(self.model_path)} bytes).")

    def process_frame(self, bgr_frame):
        """
        Runs MediaPipe Holistic on a BGR image frame.
        Returns the HolisticLandmarkerResult object.
        """
        rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        results = self.detector.detect(mp_image)
        return results

    def extract_features(self, results):
        """
        Extracts invariant normalized landmark coordinates and targeted geometric metrics.
        Returns:
            features_dict (dict): Named human-readable metrics.
            feature_vector (np.ndarray): 1D float array suitable for temporal ML classifiers.
        """
        # Detection flags
        has_pose = bool(results.pose_landmarks and len(results.pose_landmarks) > 0)
        has_left_hand = bool(results.left_hand_landmarks and len(results.left_hand_landmarks) > 0)
        has_right_hand = bool(results.right_hand_landmarks and len(results.right_hand_landmarks) > 0)

        # 1. Pose landmarks extraction (33 landmarks * 3 coords = 99 values)
        if has_pose:
            pose_raw = np.array([[lm.x, lm.y, lm.z] for lm in results.pose_landmarks])
            # Anchor: Mid-point between shoulders (index 11 and 12)
            left_shoulder = pose_raw[11]
            right_shoulder = pose_raw[12]
            nose = pose_raw[0]
            mouth_left = pose_raw[9]
            mouth_right = pose_raw[10]
            # Mid-points and facial anchors
            left_eye = pose_raw[2]
            right_eye = pose_raw[5]
            mid_eyes = (left_eye + right_eye) / 2.0
            mid_mouth = (mouth_left + mouth_right) / 2.0
            mid_shoulder = (left_shoulder + right_shoulder) / 2.0

            # Robust scale factor: invariant to torso turns, leaning, and distance changes
            shoulder_width = float(np.linalg.norm(left_shoulder - right_shoulder))
            eye_dist = float(np.linalg.norm(left_eye - right_eye))
            face_height = float(np.linalg.norm(mid_eyes - mid_mouth))
            scale = max(shoulder_width, eye_dist * 3.5, face_height * 2.2, 0.08)

            # Invariant normalized pose
            pose_norm = (pose_raw - mid_shoulder) / scale
        else:
            pose_raw = np.zeros((33, 3), dtype=np.float32)
            pose_norm = np.zeros((33, 3), dtype=np.float32)
            mid_shoulder = np.zeros(3, dtype=np.float32)
            nose = np.zeros(3, dtype=np.float32)
            mid_eyes = np.zeros(3, dtype=np.float32)
            mid_mouth = np.zeros(3, dtype=np.float32)
            scale = 1.0

        # 2. Hand landmarks extraction (21 landmarks * 3 coords each = 63 values)
        if has_left_hand:
            lh_raw = np.array([[lm.x, lm.y, lm.z] for lm in results.left_hand_landmarks])
            lh_norm = (lh_raw - mid_shoulder) / scale
        else:
            lh_raw = np.zeros((21, 3), dtype=np.float32)
            lh_norm = np.zeros((21, 3), dtype=np.float32)

        if has_right_hand:
            rh_raw = np.array([[lm.x, lm.y, lm.z] for lm in results.right_hand_landmarks])
            rh_norm = (rh_raw - mid_shoulder) / scale
        else:
            rh_raw = np.zeros((21, 3), dtype=np.float32)
            rh_norm = np.zeros((21, 3), dtype=np.float32)

        # 3. Targeted ML Geometric Metric Computations (Original 16-element feature vector)
        if has_pose:
            ml_head_top = nose - np.array([0, 0.15 * scale, 0], dtype=np.float32)
            ml_lh_to_head = float(min(np.linalg.norm(lh_raw[pt] - ml_head_top) / scale for pt in [0, 4, 8, 12, 16, 20])) if has_left_hand else 9.9
            ml_rh_to_head = float(min(np.linalg.norm(rh_raw[pt] - ml_head_top) / scale for pt in [0, 4, 8, 12, 16, 20])) if has_right_hand else 9.9
            ml_lh_to_mouth = float(min(np.linalg.norm(lh_raw[pt] - mid_mouth) / scale for pt in [0, 4, 8, 12, 16, 20])) if has_left_hand else 9.9
            ml_rh_to_mouth = float(min(np.linalg.norm(rh_raw[pt] - mid_mouth) / scale for pt in [0, 4, 8, 12, 16, 20])) if has_right_hand else 9.9
            ml_lh_open = float(np.mean([np.linalg.norm(lh_raw[tip] - lh_raw[0]) for tip in [8, 12, 16, 20]]) / scale) if has_left_hand else 0.0
            ml_rh_open = float(np.mean([np.linalg.norm(rh_raw[tip] - rh_raw[0]) for tip in [8, 12, 16, 20]]) / scale) if has_right_hand else 0.0

            ml_lw_elev = float((mid_shoulder[1] - pose_raw[15, 1]) / scale)
            ml_rw_elev = float((mid_shoulder[1] - pose_raw[16, 1]) / scale)
            ml_both_arms_overhead = float(ml_lw_elev > 0.35 and ml_rw_elev > 0.35)
            ml_wrist_lateral_dist = float(abs(pose_raw[15, 0] - pose_raw[16, 0]) / scale)
            ml_is_crossed_x = float(pose_raw[15, 0] > pose_raw[16, 0])
        else:
            ml_lh_to_head = 9.9
            ml_rh_to_head = 9.9
            ml_lh_to_mouth = 9.9
            ml_rh_to_mouth = 9.9
            ml_lh_open = 0.0
            ml_rh_open = 0.0
            ml_lw_elev = 0.0
            ml_rw_elev = 0.0
            ml_both_arms_overhead = 0.0
            ml_wrist_lateral_dist = 0.0
            ml_is_crossed_x = 0.0

        ml_min_hand_to_head = min(ml_lh_to_head, ml_rh_to_head)
        ml_is_hand_at_head = float(ml_min_hand_to_head < 0.35)
        ml_lh_head_touch = float(ml_lh_to_head < 0.35)
        ml_min_hand_to_mouth = min(ml_lh_to_mouth, ml_rh_to_mouth)
        ml_is_palm_at_mouth = float(ml_min_hand_to_mouth < 0.35)
        ml_is_palm_open = float(max(ml_lh_open, ml_rh_open) > 0.25)

        if has_left_hand and has_right_hand:
            ml_inter_index_dist = float(np.linalg.norm((lh_raw[8] - rh_raw[8]) / scale))
        else:
            ml_inter_index_dist = 9.9

        # 16 Geometric Invariant Signals (Strictly matching StandardScaler & Classifier training)
        geometric_signals = np.array([
            float(has_pose),
            float(has_left_hand),
            float(has_right_hand),
            ml_min_hand_to_head,
            ml_is_hand_at_head,
            ml_lh_head_touch,
            ml_min_hand_to_mouth,
            ml_is_palm_at_mouth,
            ml_is_palm_open,
            ml_inter_index_dist,
            ml_lw_elev,
            ml_rw_elev,
            ml_both_arms_overhead,
            ml_wrist_lateral_dist,
            ml_is_crossed_x,
            float(scale)
        ], dtype=np.float32)

        # Full Feature Vector: Pose (33*3=99) + LeftHand (21*3=63) + RightHand (21*3=63) + Signals (16) = 241 dimensions
        feature_vector = np.concatenate([
            pose_norm.flatten(),
            lh_norm.flatten(),
            rh_norm.flatten(),
            geometric_signals
        ]).astype(np.float32)

        # Explicit Diagnostic Assertion for ML Feature Vector Dimension
        assert len(feature_vector) == 241, f"ML FEATURE DIMENSION = {len(feature_vector)}, expected 241"

        # -------------------------------------------------------------------------
        # 4. SEPARATE PHYSICAL VALIDATOR METRICS (Decoupled from ML feature vector)
        # -------------------------------------------------------------------------
        if has_pose:
            # A. Robust Head / Helmet Tap Anchors
            head_top = nose - np.array([0, 0.30 * scale, 0], dtype=np.float32)
            forehead = mid_eyes - np.array([0, 0.16 * scale, 0], dtype=np.float32)
            temple_l = mid_eyes + np.array([-0.22 * scale, -0.12 * scale, 0], dtype=np.float32)
            temple_r = mid_eyes + np.array([0.22 * scale, -0.12 * scale, 0], dtype=np.float32)
            ear_l = pose_raw[7] - np.array([0, 0.08 * scale, 0], dtype=np.float32)
            ear_r = pose_raw[8] - np.array([0, 0.08 * scale, 0], dtype=np.float32)
            head_anchors = [head_top, forehead, temple_l, temple_r, ear_l, ear_r]

            lh_palm_center = (pose_raw[15] + pose_raw[19]) / 2.0
            lh_pts = [pose_raw[15], pose_raw[17], pose_raw[19], pose_raw[21], lh_palm_center]
            if has_left_hand:
                lh_pts.extend([lh_raw[0], lh_raw[4], lh_raw[8], lh_raw[12], lh_raw[16], lh_raw[20]])

            rh_palm_center = (pose_raw[16] + pose_raw[20]) / 2.0
            rh_pts = [pose_raw[16], pose_raw[18], pose_raw[20], pose_raw[22], rh_palm_center]
            if has_right_hand:
                rh_pts.extend([rh_raw[0], rh_raw[4], rh_raw[8], rh_raw[12], rh_raw[16], rh_raw[20]])

            val_lh_to_head = float(min(np.linalg.norm(pt - a) / scale for pt in lh_pts for a in head_anchors))
            val_rh_to_head = float(min(np.linalg.norm(pt - a) / scale for pt in rh_pts for a in head_anchors))
            val_min_hand_to_head = min(val_lh_to_head, val_rh_to_head)
            val_is_hand_at_head = float(val_min_hand_to_head < 0.72)
            val_lh_head_touch = float(val_lh_to_head < 0.72)
            val_rh_head_touch = float(val_rh_to_head < 0.72)

            # B. Robust Face / Mouth Covering Anchors (Gas Leak 4s Hold)
            chin = mid_mouth + (mid_mouth - nose) * 0.55
            lower_nose = (nose + mid_mouth) / 2.0
            cheek_l = mid_mouth + np.array([-0.18 * scale, 0, 0], dtype=np.float32)
            cheek_r = mid_mouth + np.array([0.18 * scale, 0, 0], dtype=np.float32)
            face_anchors = [mid_mouth, nose, lower_nose, chin, cheek_l, cheek_r]

            lh_face_pts = [pose_raw[15], pose_raw[17], pose_raw[19], pose_raw[21], lh_palm_center]
            lh_open_score = 0.0
            if has_left_hand:
                lh_face_pts.extend([lh_raw[0], lh_raw[5], lh_raw[8], lh_raw[9], lh_raw[12], lh_raw[13], lh_raw[16], lh_raw[17], lh_raw[20]])
                lh_open_score = float(np.mean([np.linalg.norm(lh_raw[tip] - lh_raw[0]) for tip in [8, 12, 16, 20]]) / scale)

            rh_face_pts = [pose_raw[16], pose_raw[18], pose_raw[20], pose_raw[22], rh_palm_center]
            rh_open_score = 0.0
            if has_right_hand:
                rh_face_pts.extend([rh_raw[0], rh_raw[5], rh_raw[8], rh_raw[9], rh_raw[12], rh_raw[13], rh_raw[16], rh_raw[17], rh_raw[20]])
                rh_open_score = float(np.mean([np.linalg.norm(rh_raw[tip] - rh_raw[0]) for tip in [8, 12, 16, 20]]) / scale)

            val_lh_to_mouth = float(min(np.linalg.norm(pt - a) / scale for pt in lh_face_pts for a in face_anchors))
            val_rh_to_mouth = float(min(np.linalg.norm(pt - a) / scale for pt in rh_face_pts for a in face_anchors))
            val_min_hand_to_mouth = min(val_lh_to_mouth, val_rh_to_mouth)
            val_is_palm_at_mouth = float(val_min_hand_to_mouth < 0.75)
            val_is_palm_open = float(max(lh_open_score, rh_open_score) > 0.18 or (has_pose and val_min_hand_to_mouth < 0.65))

            # C. Crack Fingertip Distance
            if has_left_hand and has_right_hand:
                val_inter_index_dist = float(np.linalg.norm((lh_raw[8] - rh_raw[8]) / scale))
            else:
                val_inter_index_dist = float(np.linalg.norm((pose_raw[15] - pose_raw[16]) / scale))

            # D. Overhead Arm Elevation & Waving (Rescue Required)
            val_lw_elev = float((mid_shoulder[1] - pose_raw[15, 1]) / scale)
            val_rw_elev = float((mid_shoulder[1] - pose_raw[16, 1]) / scale)
            val_both_arms_overhead = float(
                val_lw_elev > 0.35 and val_rw_elev > 0.35 and
                pose_raw[15, 1] < nose[1] and pose_raw[16, 1] < nose[1]
            )
            val_wrist_lateral_dist = float(abs(pose_raw[15, 0] - pose_raw[16, 0]) / scale)

            # E. Forearms Crossed into X in front of Chest (Hazard Here)
            # In front-facing camera: Left wrist (15) crosses to the right side (smaller X) and Right wrist (16) to left side (larger X)
            wrist_x_diff = float((pose_raw[15, 0] - pose_raw[16, 0]) / scale)
            wrist_dist = float(abs(pose_raw[15, 0] - pose_raw[16, 0]) / scale)
            vert_diff = float(abs(pose_raw[15, 1] - pose_raw[16, 1]) / scale)
            chest_level = (
                pose_raw[15, 1] > nose[1] and pose_raw[16, 1] > nose[1] and
                pose_raw[15, 1] < (mid_shoulder[1] + 1.2 * scale) and
                pose_raw[16, 1] < (mid_shoulder[1] + 1.2 * scale)
            )
            is_crossed = (
                (wrist_x_diff <= 0.25) or 
                (wrist_dist < 0.45 and pose_raw[15, 0] < pose_raw[11, 0] and pose_raw[16, 0] > pose_raw[12, 0])
            )
            val_is_crossed_x = float(is_crossed and chest_level and vert_diff < 0.65)

        else:
            val_min_hand_to_head = 9.9
            val_is_hand_at_head = 0.0
            val_lh_head_touch = 0.0
            val_rh_head_touch = 0.0
            val_min_hand_to_mouth = 9.9
            val_is_palm_at_mouth = 0.0
            val_is_palm_open = 0.0
            val_inter_index_dist = 9.9
            val_lw_elev = 0.0
            val_rw_elev = 0.0
            val_both_arms_overhead = 0.0
            val_wrist_lateral_dist = 0.0
            val_is_crossed_x = 0.0

        # Structured dictionary for telemetry HUD & physical validation state machines
        features_dict = {
            "has_pose": has_pose,
            "has_left_hand": has_left_hand,
            "has_right_hand": has_right_hand,
            "min_hand_to_head": round(val_min_hand_to_head, 3),
            "is_hand_at_head": val_is_hand_at_head,
            "lh_head_touch": val_lh_head_touch,
            "rh_head_touch": val_rh_head_touch,
            "min_hand_to_mouth": round(val_min_hand_to_mouth, 3),
            "is_palm_at_mouth": val_is_palm_at_mouth,
            "is_palm_open": val_is_palm_open,
            "inter_index_dist": round(val_inter_index_dist, 3),
            "both_arms_overhead": val_both_arms_overhead,
            "lw_elev": round(val_lw_elev, 3),
            "rw_elev": round(val_rw_elev, 3),
            "wrist_lateral_dist": round(val_wrist_lateral_dist, 3),
            "is_crossed_x": val_is_crossed_x,
            "validator_metrics": {
                "hand_to_mouth": round(val_min_hand_to_mouth, 3),
                "is_palm_at_mouth": bool(val_is_palm_at_mouth),
                "hand_to_head": round(val_min_hand_to_head, 3),
                "is_hand_at_head": bool(val_is_hand_at_head),
                "inter_index_dist": round(val_inter_index_dist, 3),
                "both_arms_overhead": bool(val_both_arms_overhead),
                "is_crossed_x": bool(val_is_crossed_x)
            }
        }

        return features_dict, feature_vector

    def draw_landmarks(self, frame, results):
        """
        Draws MediaPipe Holistic pose and hand landmarks on the BGR frame.
        """
        h, w, _ = frame.shape

        # 1. Draw Pose Landmarks & Connections
        if results.pose_landmarks and len(results.pose_landmarks) > 0:
            pose_pts = [(int(lm.x * w), int(lm.y * h)) for lm in results.pose_landmarks]

            # Draw Pose Connections
            for conn in PoseLandmarksConnections.POSE_LANDMARKS:
                i1, i2 = conn.start, conn.end
                if i1 < len(pose_pts) and i2 < len(pose_pts):
                    # Draw upper body / arms with prominent cyan-yellow line
                    color = (0, 215, 255) if (i1 <= 16 or i2 <= 16) else (100, 180, 100)
                    cv2.line(frame, pose_pts[i1], pose_pts[i2], color, 2)

            # Draw Pose Points
            for i, pt in enumerate(pose_pts):
                if i in [15, 16]:  # Wrists
                    cv2.circle(frame, pt, 6, (0, 255, 128), -1)
                elif i in [0, 9, 10]:  # Nose & Mouth
                    cv2.circle(frame, pt, 4, (255, 100, 50), -1)
                else:
                    cv2.circle(frame, pt, 3, (0, 255, 255), -1)

        # 2. Draw Left Hand (21 landmarks)
        if results.left_hand_landmarks and len(results.left_hand_landmarks) > 0:
            lh_pts = [(int(lm.x * w), int(lm.y * h)) for lm in results.left_hand_landmarks]
            for conn in HandLandmarksConnections.HAND_CONNECTIONS:
                i1, i2 = conn.start, conn.end
                if i1 < len(lh_pts) and i2 < len(lh_pts):
                    cv2.line(frame, lh_pts[i1], lh_pts[i2], (255, 150, 50), 2)
            for pt in lh_pts:
                cv2.circle(frame, pt, 3, (255, 200, 100), -1)

        # 3. Draw Right Hand (21 landmarks)
        if results.right_hand_landmarks and len(results.right_hand_landmarks) > 0:
            rh_pts = [(int(lm.x * w), int(lm.y * h)) for lm in results.right_hand_landmarks]
            for conn in HandLandmarksConnections.HAND_CONNECTIONS:
                i1, i2 = conn.start, conn.end
                if i1 < len(rh_pts) and i2 < len(rh_pts):
                    cv2.line(frame, rh_pts[i1], rh_pts[i2], (50, 180, 255), 2)
            for pt in rh_pts:
                cv2.circle(frame, pt, 3, (100, 220, 255), -1)

    def close(self):
        if hasattr(self, 'detector'):
            self.detector.close()
