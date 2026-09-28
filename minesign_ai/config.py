"""
MineSign AI Configuration & Gesture Vocabulary
Prototype Simulation for CoalGuard Safety & Governance
"""

import os

# Simulation Metadata
SIMULATION_MODE = True
CAMERA_ID = "CAM-MINESIGN-DEMO"
MINE_ID = "demo-mine"
MINE_NAME = "Demo Coal Mine"
ZONE = "Conveyor Zone 4"
WORKERS = ["W001", "W002"]

# Gesture Vocabulary & Target Classes
GESTURE_CLASSES = [
    "NO_GESTURE",
    "PPE_DAMAGE",
    "SUSPECTED_GAS_LEAK",
    "CRACK_WORSENING",
    "RESCUE_REQUIRED",
    "HAZARD_HERE"
]

LABEL_TO_ID = {name: idx for idx, name in enumerate(GESTURE_CLASSES)}
ID_TO_LABEL = {idx: name for idx, name in enumerate(GESTURE_CLASSES)}

# Gesture Descriptions, Duration Guidelines & Priority Metadata
GESTURE_METADATA = {
    "NO_GESTURE": {
        "priority": "LOW",
        "description": "Normal activity: standing, talking, walking, scratching, hands in pockets",
        "default_duration_sec": 3.0,
        "min_duration_sec": 2.0,
        "color": (128, 128, 128)
    },
    "PPE_DAMAGE": {
        "priority": "HIGH",
        "description": "Tap top of head/helmet twice with one hand (TAP -> TAP -> STOP)",
        "meaning": "Worker reports damaged helmet/PPE needing attention",
        "default_duration_sec": 3.0,
        "min_duration_sec": 1.8,
        "color": (0, 165, 255)  # Orange
    },
    "SUSPECTED_GAS_LEAK": {
        "priority": "CRITICAL",
        "description": "Open palm covers nose/mouth continuously for AT LEAST 4 seconds",
        "meaning": "Visual report: Worker suspects gas leak in sector (NOT gas sensor)",
        "default_duration_sec": 5.0,
        "min_duration_sec": 4.0,
        "color": (0, 0, 255)  # Red
    },
    "CRACK_WORSENING": {
        "priority": "CRITICAL",
        "description": "Both index fingers start close, move apart, return close, repeat widening",
        "meaning": "Worker reports ground strata crack separation worsening",
        "default_duration_sec": 4.0,
        "min_duration_sec": 2.5,
        "color": (0, 215, 255)  # Yellow-Amber
    },
    "RESCUE_REQUIRED": {
        "priority": "CRITICAL",
        "description": "Both hands/arms raised overhead, repeatedly waving overhead for 2-3s",
        "meaning": "Immediate rescue / emergency assistance required",
        "default_duration_sec": 3.5,
        "min_duration_sec": 2.0,
        "color": (0, 0, 255)  # Urgent Red
    },
    "HAZARD_HERE": {
        "priority": "HIGH",
        "description": "Cross both forearms forming a clear 'X' in front of chest (~1s hold)",
        "meaning": "Specific physical hazard present at this location",
        "default_duration_sec": 3.0,
        "min_duration_sec": 1.5,
        "color": (255, 140, 0)  # Deep Orange
    }
}

# -------------------------------------------------------------
# Decision & Validation Gates (Open-Set & Rejection Layer)
# -------------------------------------------------------------
# Confidence & Hysteresis Gates (Conservative safety default)
MIN_CONFIDENCE = 0.60
CONFIDENCE_ENTER_THRESHOLD = 0.60
CONFIDENCE_EXIT_THRESHOLD = 0.35

# Top-1 vs Top-2 Confidence Margin Gate (Rejects ambiguous multi-class confusion)
MIN_CONFIDENCE_MARGIN = 0.18

# Temporal Confidence Smoothing & Consistency Requirements
CONFIDENCE_SMOOTHING_WINDOW = 10
CONFIDENCE_EMA_ALPHA = 0.30
CONSISTENT_FRAMES_REQUIRED = 5

# Gesture-Specific Temporal Hold & Window Thresholds
DEBOUNCE_COOLDOWN_SEC = 5.0
GAS_LEAK_REQUIRED_HOLD_SEC = 4.0
GAS_LEAK_DROPOUT_TOLERANCE_SEC = 0.85
GAS_LEAK_MOUTH_PROXIMITY_THRESHOLD = 0.75
HAZARD_HOLD_SEC = 1.0
RESCUE_REQUIRED_HOLD_SEC = 2.0
PPE_TAP_WINDOW_SEC = 3.2
PPE_HEAD_PROXIMITY_THRESHOLD = 0.72
PPE_RELEASE_THRESHOLD = 0.85
SLIDING_WINDOW_FRAMES = 75

# Paths & Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HOLISTIC_MODEL_PATH = os.path.join(BASE_DIR, "models", "holistic_landmarker.task")
DATA_DIR = os.path.join(BASE_DIR, "data")
MANIFEST_PATH = os.path.join(DATA_DIR, "dataset_manifest.json")

# Dataset Collection Targets
TARGET_SAMPLES_PER_GESTURE = 20
COUNTDOWN_SECONDS = 3

# Camera Stream Configuration
CAMERA_CONFIG = {
    "device_index": 0,
    "target_fps": 30,
    "frame_width": 1280,
    "frame_height": 720
}
