"""
MineSign AI — Real-time HTTP Inference Service
Bridges browser webcam frame stream with MediaPipe Holistic,
temporal sequence ML classifier, open-set rejection, and temporal validation engine.
"""

import os
import sys
import time
import json
import base64
from io import BytesIO
from collections import deque
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
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

PORT = 5005
HOST = "127.0.0.1"


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class MineSignInferenceEngine:
    def __init__(self):
        print(f"📦 Loading classifier from '{MODEL_V2_FILE}'...")
        self.model = joblib.load(MODEL_V2_FILE)
        self.scaler = joblib.load(SCALER_V2_FILE)
        self.extractor = MineSignFeatureExtractor()
        self.engine = MineSignTemporalEngine(window_size=75)
        self.sliding_buffer = deque(maxlen=75)
        self.timestamp_buffer = deque(maxlen=75)
        self.active_worker = "W001"
        print("✅ MineSign Inference Engine loaded and ready.")

    def reset(self):
        self.sliding_buffer.clear()
        self.timestamp_buffer.clear()
        self.engine._reset_all_timers()
        self.engine.last_confirmed_payload = None

    def process_image(self, bgr_frame, worker_id="W001"):
        now = time.time()
        self.active_worker = worker_id or "W001"

        # 1. Run MediaPipe Holistic Landmark Extraction
        results = self.extractor.process_frame(bgr_frame)
        features_dict, feature_vector = self.extractor.extract_features(results)
        has_pose = features_dict.get("has_pose", False)

        raw_prediction = "NO_GESTURE"
        probabilities = np.zeros(len(GESTURE_CLASSES))

        if has_pose:
            self.sliding_buffer.append(feature_vector)
            self.timestamp_buffer.append(now)

            # 2. Run Temporal ML Classifier over Sliding Window
            if len(self.sliding_buffer) >= 15:
                seq_dur = self.timestamp_buffer[-1] - self.timestamp_buffer[0]
                temp_feat = extract_temporal_sequence_features(
                    list(self.sliding_buffer),
                    timestamps=list(self.timestamp_buffer),
                    duration_sec=seq_dur
                )
                temp_feat_scaled = self.scaler.transform([temp_feat])
                probs = self.model.predict_proba(temp_feat_scaled)[0]
                pred_idx = np.argmax(probs)
                raw_prediction = GESTURE_CLASSES[pred_idx]
                probabilities = probs
        else:
            self.sliding_buffer.clear()
            self.timestamp_buffer.clear()
            self.engine._reset_all_timers()

        # 3. Pass through Strict Temporal State Machine & Gesture Validation Engine
        telemetry, confirmed_event = self.engine.evaluate_decision(
            feature_vector,
            features_dict,
            raw_prediction=raw_prediction,
            probabilities=probabilities,
            worker_id=self.active_worker
        )

        return {
            "has_worker": bool(has_pose),
            "raw_prediction": telemetry.get("raw_prediction", "NO_GESTURE"),
            "raw_confidence": float(round(telemetry.get("raw_confidence", 0.0), 4)),
            "smoothed_prediction": telemetry.get("smoothed_prediction", "NO_GESTURE"),
            "smoothed_confidence": float(round(telemetry.get("smoothed_confidence", 0.0), 4)),
            "displayed_class": telemetry.get("displayed_class", "NO_GESTURE"),
            "displayed_confidence": float(round(telemetry.get("displayed_confidence", 0.0), 4)),
            "second_prediction": telemetry.get("second_prediction", "NONE"),
            "second_confidence": float(round(telemetry.get("second_confidence", 0.0), 4)),
            "confidence_margin": float(round(telemetry.get("confidence_margin", 0.0), 4)),
            "confidence_status": telemetry.get("confidence_status", "PASS"),
            "gesture_validation_status": telemetry.get("gesture_validation_status", "AMBIENT"),
            "validation_state": telemetry.get("validation_state", "LISTENING"),
            "active_state": telemetry.get("active_state", "NO_GESTURE"),
            "final_result": telemetry.get("final_result", "NO_GESTURE"),
            "is_confirmed": bool(telemetry.get("is_confirmed", False)),
            "confirmed_gesture": telemetry.get("confirmed_gesture"),
            "status_text": telemetry.get("status_text", "NORMAL MONITORING"),
            "gas_timer_str": telemetry.get("gas_timer_str", "0.0 / 4.0s"),
            "gas_progress": float(round(telemetry.get("gas_progress", 0.0), 3)),
            "gas_debug": telemetry.get("gas_debug", {}),
            "ppe_tap_info": telemetry.get("ppe_tap_info", "Taps: 0/2"),
            "ppe_state": telemetry.get("ppe_state", "PPE_IDLE"),
            "debug_info": telemetry.get("debug_info", {}),
            "confirmed_event": confirmed_event
        }


# Global inference engine instance
INFERENCE_ENGINE = None


class InferenceRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "online",
                "service": "MineSign AI Real-Time Inference Bridge",
                "model": "minesign_classifier_v2.joblib",
                "classes": GESTURE_CLASSES,
                "simulation_mode": True
            })
        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        if self.path == "/process_frame":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                req_data = json.loads(body.decode("utf-8"))

                img_data = req_data.get("image", "")
                worker_id = req_data.get("worker_id", "W001")

                if not img_data:
                    self._send_json(400, {"error": "Missing image in request body"})
                    return

                # Parse Base64 Image
                if "," in img_data:
                    img_data = img_data.split(",", 1)[1]

                img_bytes = base64.b64decode(img_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                bgr_frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

                if bgr_frame is None:
                    self._send_json(400, {"error": "Could not decode image from base64"})
                    return

                result = INFERENCE_ENGINE.process_image(bgr_frame, worker_id=worker_id)
                self._send_json(200, result)

            except Exception as e:
                self._send_json(500, {"error": str(e), "message": "Inference failure"})

        elif self.path == "/reset":
            INFERENCE_ENGINE.reset()
            self._send_json(200, {"message": "Inference buffer and timers reset."})

        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def log_message(self, format, *args):
        # Suppress verbose request logs during high-frequency frame processing
        return


def start_server(port=PORT):
    global INFERENCE_ENGINE
    INFERENCE_ENGINE = MineSignInferenceEngine()
    server = ThreadedHTTPServer((HOST, port), InferenceRequestHandler)
    print(f"\n==========================================================================")
    print(f"🚀 MineSign AI HTTP Inference Service listening on http://{HOST}:{port}")
    print(f"📡 Real-time frame processing endpoint: POST http://{HOST}:{port}/process_frame")
    print(f"==========================================================================\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down MineSign AI Inference Service.")
    finally:
        server.server_close()


if __name__ == "__main__":
    start_server()
