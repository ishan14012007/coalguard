"""
MineSign AI — Phase 5D Comprehensive False-Positive & Strict Gating Test Suite
Validates strict NO_GESTURE safety default, confidence & margin gates, temporal consistency,
and gesture-specific physical validation across all 15 required test scenarios.
"""

import time
import numpy as np
import joblib

from config import (
    GESTURE_CLASSES, MIN_CONFIDENCE, MIN_CONFIDENCE_MARGIN,
    GAS_LEAK_REQUIRED_HOLD_SEC, GAS_LEAK_DROPOUT_TOLERANCE_SEC,
    HAZARD_HOLD_SEC, RESCUE_REQUIRED_HOLD_SEC, PPE_TAP_WINDOW_SEC
)
from temporal_engine import MineSignTemporalEngine
from train_classifier import extract_temporal_sequence_features, MODEL_V2_FILE, SCALER_V2_FILE


def test_strict_pipeline():
    print("\n" + "=" * 80)
    print("🧪 RUNNING MINESIGN PHASE 5D STRICT NO-GESTURE & FALSE-POSITIVE TEST SUITE")
    print("=" * 80)

    model = joblib.load(MODEL_V2_FILE)
    scaler = joblib.load(SCALER_V2_FILE)

    # -------------------------------------------------------------------------
    # PART 1: Strict Negative Tests (TEST 1 to TEST 10) - MUST PRODUCE 0 EVENTS
    # -------------------------------------------------------------------------
    print("\n--- PART 1: NEGATIVE & AMBIGUOUS CASES (Must ALL produce 0 events) ---")

    # TEST 1: Standing Still
    print("\n[TEST 1] Standing still...")
    eng1 = MineSignTemporalEngine(window_size=75)
    t1, ev1 = eng1.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 1.5, "min_hand_to_mouth": 1.5, "inter_index_dist": 2.0}, "NO_GESTURE", np.zeros(len(GESTURE_CLASSES)))
    assert t1["final_result"] == "NO_GESTURE" and ev1 is None, f"TEST 1 Failed: Got {t1['final_result']}"
    print(f"  • Result: {t1['final_result']} | Events: 0 ✅")

    # TEST 2: Walking Normally
    print("\n[TEST 2] Walking normally (ambient motion)...")
    eng2 = MineSignTemporalEngine(window_size=75)
    for _ in range(15):
        t2, ev2 = eng2.evaluate_decision(np.random.randn(241).astype(np.float32), {"has_pose": True, "min_hand_to_head": 1.4, "min_hand_to_mouth": 1.3}, "NO_GESTURE", np.zeros(len(GESTURE_CLASSES)))
    assert t2["final_result"] == "NO_GESTURE" and ev2 is None, f"TEST 2 Failed: Got {t2['final_result']}"
    print(f"  • Result: {t2['final_result']} | Events: 0 ✅")

    # TEST 3: Talking and Moving Hands Normally
    print("\n[TEST 3] Talking and moving hands normally (chest/waist level)...")
    eng3 = MineSignTemporalEngine(window_size=75)
    for _ in range(15):
        t3, ev3 = eng3.evaluate_decision(np.random.randn(241).astype(np.float32), {"has_pose": True, "min_hand_to_head": 1.1, "min_hand_to_mouth": 0.95}, "NO_GESTURE", np.zeros(len(GESTURE_CLASSES)))
    assert t3["final_result"] == "NO_GESTURE" and ev3 is None, f"TEST 3 Failed: Got {t3['final_result']}"
    print(f"  • Result: {t3['final_result']} | Events: 0 ✅")

    # TEST 4: Scratching Head (Single touch, no 2-tap pattern)
    print("\n[TEST 4] Scratching head (Single touch without tap-release-tap)...")
    eng4 = MineSignTemporalEngine(window_size=75)
    p_scratch = np.zeros(len(GESTURE_CLASSES))
    p_scratch[1] = 0.75  # ML might briefly spike PPE
    for _ in range(12):
        t4, ev4 = eng4.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 0.35}, "PPE_DAMAGE", p_scratch)
    assert t4["final_result"] == "NO_GESTURE" and ev4 is None, f"TEST 4 Failed: Single touch created event! Got {t4['final_result']}"
    print(f"  • Result: {t4['final_result']} (Taps: {t4['ppe_tap_info']}) | Events: 0 ✅")

    # TEST 5: Adjusting Glasses / Touching Forehead
    print("\n[TEST 5] Adjusting glasses / Touching forehead briefly...")
    eng5 = MineSignTemporalEngine(window_size=75)
    p_glasses = np.zeros(len(GESTURE_CLASSES))
    p_glasses[2] = 0.70  # ML might confuse face touch
    for _ in range(8):
        t5, ev5 = eng5.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 0.50, "min_hand_to_mouth": 0.85}, "SUSPECTED_GAS_LEAK", p_glasses)
    assert t5["final_result"] == "NO_GESTURE" and ev5 is None, f"TEST 5 Failed: Got {t5['final_result']}"
    print(f"  • Result: {t5['final_result']} | Events: 0 ✅")

    # TEST 6: Waving Normally (Single hand at shoulder level)
    print("\n[TEST 6] Waving normally (Single hand at shoulder level)...")
    eng6 = MineSignTemporalEngine(window_size=75)
    p_wave = np.zeros(len(GESTURE_CLASSES))
    p_wave[4] = 0.72
    for _ in range(15):
        t6, ev6 = eng6.evaluate_decision(np.zeros(241), {"has_pose": True, "both_arms_overhead": False, "lw_elev": 0.1, "rw_elev": 0.4}, "RESCUE_REQUIRED", p_wave)
    assert t6["final_result"] == "NO_GESTURE" and ev6 is None, f"TEST 6 Failed: Single hand wave created event! Got {t6['final_result']}"
    print(f"  • Result: {t6['final_result']} | Events: 0 ✅")

    # TEST 7: One Hand Raised
    print("\n[TEST 7] One hand raised overhead (Not both arms)...")
    eng7 = MineSignTemporalEngine(window_size=75)
    for _ in range(20):
        t7, ev7 = eng7.evaluate_decision(np.zeros(241), {"has_pose": True, "both_arms_overhead": False, "lw_elev": 0.6, "rw_elev": 0.0}, "RESCUE_REQUIRED", p_wave)
    assert t7["final_result"] == "NO_GESTURE" and ev7 is None, f"TEST 7 Failed: Got {t7['final_result']}"
    print(f"  • Result: {t7['final_result']} | Events: 0 ✅")

    # TEST 8: Random Arm Movements / Gestures
    print("\n[TEST 8] Random arm movements (Fluctuating classes)...")
    eng8 = MineSignTemporalEngine(window_size=75)
    classes_to_jitter = ["PPE_DAMAGE", "RESCUE_REQUIRED", "HAZARD_HERE", "CRACK_WORSENING", "SUSPECTED_GAS_LEAK"]
    for i in range(25):
        c = classes_to_jitter[i % len(classes_to_jitter)]
        p_jit = np.zeros(len(GESTURE_CLASSES))
        p_jit[GESTURE_CLASSES.index(c)] = 0.65
        t8, ev8 = eng8.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 1.2, "min_hand_to_mouth": 1.2}, c, p_jit)
        assert t8["final_result"] == "NO_GESTURE" and ev8 is None, f"TEST 8 Failed on iteration {i}: Jitter created event!"
    print(f"  • Result: {t8['final_result']} (Consistency gate rejected jitter) | Events: 0 ✅")

    # TEST 9: Random Movement Classifier Mistake for PPE -> Physical PPE Validator Rejects
    print("\n[TEST 9] Random movement classifier labels as PPE -> Physical PPE validator rejects...")
    eng9 = MineSignTemporalEngine(window_size=75)
    p_ppe_mistake = np.zeros(len(GESTURE_CLASSES))
    p_ppe_mistake[1] = 0.92  # High ML confidence, but hands are at waist
    for _ in range(15):
        t9, ev9 = eng9.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 1.35}, "PPE_DAMAGE", p_ppe_mistake)
    assert t9["final_result"] == "NO_GESTURE" and ev9 is None, f"TEST 9 Failed: PPE mistake triggered event! Got {t9['final_result']}"
    print(f"  • Result: {t9['final_result']} (Physical validator blocked raw ML prediction) | Events: 0 ✅")

    # TEST 10: Random Movement Classifier Mistake for Gas Leak -> Gas Physical Validator Rejects
    print("\n[TEST 10] Random movement classifier labels as Gas Leak -> Gas physical validator rejects...")
    eng10 = MineSignTemporalEngine(window_size=75)
    p_gas_mistake = np.zeros(len(GESTURE_CLASSES))
    p_gas_mistake[2] = 0.88  # High ML confidence, but hand is at waist
    for _ in range(25):
        t10, ev10 = eng10.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_mouth": 1.45, "is_palm_at_mouth": False}, "SUSPECTED_GAS_LEAK", p_gas_mistake)
    assert t10["final_result"] == "NO_GESTURE" and ev10 is None, f"TEST 10 Failed: Gas mistake triggered event! Got {t10['final_result']}"
    print(f"  • Result: {t10['final_result']} (Physical hold validator blocked raw ML prediction) | Events: 0 ✅")

    # -------------------------------------------------------------------------
    # PART 2: Strict Positive Tests (TEST 11 to TEST 15) - MUST CONFIRM
    # -------------------------------------------------------------------------
    print("\n--- PART 2: ACTUAL GESTURE VERIFICATION (Must ALL confirm when performed) ---")

    # TEST 11: Actual PPE Damage (Tap 1 -> Release -> Tap 2)
    print("\n[TEST 11] Actual PPE Damage gesture (tap -> release -> tap)...")
    eng11 = MineSignTemporalEngine(window_size=75)
    p_ppe = np.zeros(len(GESTURE_CLASSES))
    p_ppe[1] = 0.92
    # Pre-fill consistency buffer
    for _ in range(5):
        eng11.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 1.2}, "PPE_DAMAGE", p_ppe)
    # Tap 1
    eng11.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 0.30}, "PPE_DAMAGE", p_ppe)
    # Release
    eng11.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 0.90}, "PPE_DAMAGE", p_ppe)
    # Tap 2
    t11, ev11 = eng11.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_head": 0.28}, "PPE_DAMAGE", p_ppe)
    assert t11["is_confirmed"] and ev11 is not None and ev11["gesture"] == "PPE_DAMAGE", "TEST 11 Failed: PPE not confirmed!"
    print(f"  • Confirmed: {ev11['gesture']} | Conf: {ev11['confidence']*100:.1f}% ✅")

    # TEST 12: Actual Gas Leak (Continuous 4.0s hold)
    print("\n[TEST 12] Actual Gas Leak gesture (Continuous >= 4.0s hold)...")
    eng12 = MineSignTemporalEngine(window_size=75)
    p_gas = np.zeros(len(GESTURE_CLASSES))
    p_gas[2] = 0.94
    ev12 = None
    for _ in range(125):
        time.sleep(0.035)
        t12, ev12 = eng12.evaluate_decision(np.zeros(241), {"has_pose": True, "min_hand_to_mouth": 0.25, "is_palm_at_mouth": True}, "SUSPECTED_GAS_LEAK", p_gas)
        if ev12 is not None:
            break
    assert ev12 is not None and ev12["gesture"] == "SUSPECTED_GAS_LEAK", "TEST 12 Failed: Gas leak not confirmed!"
    print(f"  • Confirmed: {ev12['gesture']} | Conf: {ev12['confidence']*100:.1f}% ✅")

    # TEST 13: Actual Rescue Required (Both arms overhead waving >= 2.0s)
    print("\n[TEST 13] Actual Rescue Required gesture (Both arms overhead waving >= 2.0s)...")
    eng13 = MineSignTemporalEngine(window_size=75)
    p_resc = np.zeros(len(GESTURE_CLASSES))
    p_resc[4] = 0.95
    ev13 = None
    for _ in range(65):
        time.sleep(0.035)
        t13, ev13 = eng13.evaluate_decision(np.zeros(241), {"has_pose": True, "both_arms_overhead": True, "lw_elev": 0.6, "rw_elev": 0.6}, "RESCUE_REQUIRED", p_resc)
        if ev13 is not None:
            break
    assert ev13 is not None and ev13["gesture"] == "RESCUE_REQUIRED", "TEST 13 Failed: Rescue required not confirmed!"
    print(f"  • Confirmed: {ev13['gesture']} | Conf: {ev13['confidence']*100:.1f}% ✅")

    # TEST 14: Actual Hazard Here (Forearms X held >= 1.0s)
    print("\n[TEST 14] Actual Hazard Here gesture (Forearms X held >= 1.0s)...")
    eng14 = MineSignTemporalEngine(window_size=75)
    p_haz = np.zeros(len(GESTURE_CLASSES))
    p_haz[5] = 0.93
    ev14 = None
    for _ in range(35):
        time.sleep(0.035)
        t14, ev14 = eng14.evaluate_decision(np.zeros(241), {"has_pose": True, "is_crossed_x": True}, "HAZARD_HERE", p_haz)
        if ev14 is not None:
            break
    assert ev14 is not None and ev14["gesture"] == "HAZARD_HERE", "TEST 14 Failed: Hazard here not confirmed!"
    print(f"  • Confirmed: {ev14['gesture']} | Conf: {ev14['confidence']*100:.1f}% ✅")

    # TEST 15: Actual Crack Worsening (Widening finger oscillation)
    print("\n[TEST 15] Actual Crack Worsening gesture (Widening finger oscillation)...")
    eng15 = MineSignTemporalEngine(window_size=75)
    p_crack = np.zeros(len(GESTURE_CLASSES))
    p_crack[3] = 0.92
    ev15 = None
    for i in range(25):
        time.sleep(0.01)
        sim_dist = 0.20 + 0.45 * (i % 2)
        t15, ev15 = eng15.evaluate_decision(np.zeros(241), {"has_pose": True, "inter_index_dist": sim_dist}, "CRACK_WORSENING", p_crack)
        if ev15 is not None:
            break
    assert ev15 is not None and ev15["gesture"] == "CRACK_WORSENING", "TEST 15 Failed: Crack worsening not confirmed!"
    print(f"  • Confirmed: {ev15['gesture']} | Conf: {ev15['confidence']*100:.1f}% ✅")

    print("\n" + "=" * 80)
    print("🎉 ALL 15 STRICT FALSE-POSITIVE & POSITIVE GESTURE TESTS PASSED!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    test_strict_pipeline()
