"""
MineSign AI — Temporal State Machine & Gesture Validation Engine
Implements temporal confidence smoothing (EMA + rolling window),
hysteresis state transitions, open-set / unknown gesture rejection,
and gesture-specific physical/temporal state machines.
"""

import time
from collections import deque
import numpy as np

try:
    from config import (
        GESTURE_CLASSES, GESTURE_METADATA, LABEL_TO_ID, CAMERA_ID, ZONE, SIMULATION_MODE,
        MIN_CONFIDENCE, MIN_CONFIDENCE_MARGIN, DEBOUNCE_COOLDOWN_SEC,
        CONFIDENCE_ENTER_THRESHOLD, CONFIDENCE_EXIT_THRESHOLD,
        CONFIDENCE_SMOOTHING_WINDOW, CONFIDENCE_EMA_ALPHA, CONSISTENT_FRAMES_REQUIRED,
        GAS_LEAK_REQUIRED_HOLD_SEC, GAS_LEAK_DROPOUT_TOLERANCE_SEC, GAS_LEAK_MOUTH_PROXIMITY_THRESHOLD,
        HAZARD_HOLD_SEC, RESCUE_REQUIRED_HOLD_SEC,
        PPE_TAP_WINDOW_SEC, PPE_HEAD_PROXIMITY_THRESHOLD, PPE_RELEASE_THRESHOLD,
        SLIDING_WINDOW_FRAMES
    )
except ImportError:
    from minesign_ai.config import (
        GESTURE_CLASSES, GESTURE_METADATA, LABEL_TO_ID, CAMERA_ID, ZONE, SIMULATION_MODE,
        MIN_CONFIDENCE, MIN_CONFIDENCE_MARGIN, DEBOUNCE_COOLDOWN_SEC,
        CONFIDENCE_ENTER_THRESHOLD, CONFIDENCE_EXIT_THRESHOLD,
        CONFIDENCE_SMOOTHING_WINDOW, CONFIDENCE_EMA_ALPHA, CONSISTENT_FRAMES_REQUIRED,
        GAS_LEAK_REQUIRED_HOLD_SEC, GAS_LEAK_DROPOUT_TOLERANCE_SEC, GAS_LEAK_MOUTH_PROXIMITY_THRESHOLD,
        HAZARD_HOLD_SEC, RESCUE_REQUIRED_HOLD_SEC,
        PPE_TAP_WINDOW_SEC, PPE_HEAD_PROXIMITY_THRESHOLD, PPE_RELEASE_THRESHOLD,
        SLIDING_WINDOW_FRAMES
    )


class MineSignTemporalEngine:
    def __init__(self, window_size=SLIDING_WINDOW_FRAMES):
        self.window_size = window_size
        self.feature_buffer = deque(maxlen=window_size)
        self.timestamp_buffer = deque(maxlen=window_size)
        self.meta_buffer = deque(maxlen=window_size)

        # Temporal confidence smoothing & hysteresis state
        self.smoothed_probabilities = None
        self.raw_class_history = deque(maxlen=CONFIDENCE_SMOOTHING_WINDOW)
        self.active_gesture_state = "NO_GESTURE"
        self.exit_frame_count = 0

        # 1. Gas Leak continuous 4.0s hold tracker with dropout tolerance
        self.gas_hold_start_time = None
        self.gas_last_active_time = None
        self.gas_current_duration = 0.0

        # 2. PPE Damage 5-state temporal tap machine
        # States: PPE_IDLE -> FIRST_TAP -> FIRST_TAP_RELEASE -> SECOND_TAP -> PPE_DAMAGE_CONFIRMED
        self.ppe_state = "PPE_IDLE"
        self.ppe_first_tap_time = None
        self.ppe_second_tap_time = None
        self.ppe_tap_count = 0
        self.ppe_prev_touch = False

        # 3. Crack Worsening oscillation tracker
        self.crack_distance_history = deque(maxlen=60)

        # 4. Rescue Required waving tracker
        self.rescue_start_time = None
        self.rescue_current_duration = 0.0

        # 5. Hazard Here X hold tracker
        self.hazard_start_time = None
        self.hazard_current_duration = 0.0

        # Cooldowns & confirmed events
        self.last_confirmed_events = {}
        self.last_confirmed_payload = None

    def evaluate_decision(self, feature_vector, features_dict, raw_prediction, probabilities, worker_id="W001"):
        """
        Multi-stage Open-Set / Unknown Gesture Rejection & Temporal Smoothing Layer:
        
        Raw Model Probabilities
              ↓
        Stage 1: Temporal Probability Smoothing (EMA + Rolling Consistency)
              ↓
        Stage 2: Hysteresis Transition Gate (Enter: 0.55, Exit: 0.30)
              ↓
        Stage 3: Margin & Confidence Threshold Gate
              ↓
        Stage 4: Gesture-Specific Physical & Temporal State Machine Validation
              ↓
        Stage 5: Debounce Cooldown Filter (5.0s)
              ↓
        Final Decision: [CONFIRMED GESTURE] or [NO_GESTURE]
        """
        now = time.time()
        self.feature_buffer.append(feature_vector)
        self.timestamp_buffer.append(now)
        self.meta_buffer.append(features_dict)

        has_pose = features_dict.get("has_pose", False)

        # -------------------------------------------------------------
        # STAGE 1: Temporal Probability Smoothing (EMA)
        # -------------------------------------------------------------
        if probabilities is not None and len(probabilities) == len(GESTURE_CLASSES):
            prob_arr = np.array(probabilities, dtype=np.float32)
            if self.smoothed_probabilities is None:
                self.smoothed_probabilities = prob_arr.copy()
            else:
                self.smoothed_probabilities = (1.0 - CONFIDENCE_EMA_ALPHA) * self.smoothed_probabilities + CONFIDENCE_EMA_ALPHA * prob_arr
            
            # Raw Top-1 and Top-2
            raw_sorted_indices = np.argsort(prob_arr)[::-1]
            raw_top1_idx = raw_sorted_indices[0]
            raw_top2_idx = raw_sorted_indices[1]
            raw_top1_class = GESTURE_CLASSES[raw_top1_idx]
            raw_top1_conf = float(prob_arr[raw_top1_idx])
            raw_top2_class = GESTURE_CLASSES[raw_top2_idx]
            raw_top2_conf = float(prob_arr[raw_top2_idx])

            # Smoothed Top-1 and Top-2
            sm_sorted_indices = np.argsort(self.smoothed_probabilities)[::-1]
            sm_top1_idx = sm_sorted_indices[0]
            sm_top2_idx = sm_sorted_indices[1]
            sm_top1_class = GESTURE_CLASSES[sm_top1_idx]
            sm_top1_conf = float(self.smoothed_probabilities[sm_top1_idx])
            sm_top2_class = GESTURE_CLASSES[sm_top2_idx]
            sm_top2_conf = float(self.smoothed_probabilities[sm_top2_idx])
            sm_conf_margin = float(sm_top1_conf - sm_top2_conf)
        else:
            raw_top1_class = raw_prediction or "NO_GESTURE"
            raw_top1_conf = 0.0
            raw_top2_class = "NONE"
            raw_top2_conf = 0.0
            sm_top1_class = raw_top1_class
            sm_top1_conf = 0.0
            sm_top2_class = "NONE"
            sm_top2_conf = 0.0
            sm_conf_margin = 0.0

        self.raw_class_history.append(raw_top1_class)

        # Base Telemetry State
        telemetry = {
            "raw_prediction": raw_top1_class,
            "raw_confidence": raw_top1_conf,
            "smoothed_prediction": sm_top1_class,
            "smoothed_confidence": sm_top1_conf,
            "second_prediction": sm_top2_class,
            "second_confidence": sm_top2_conf,
            "confidence_margin": sm_conf_margin,
            "confidence_status": "PASS",
            "gesture_validation_status": "AMBIENT (SAFE)",
            "validation_state": "LISTENING",
            "active_state": self.active_gesture_state,
            "final_result": "NO_GESTURE",
            "is_confirmed": False,
            "confirmed_gesture": None,
            "status_text": "NORMAL MONITORING",
            "gas_timer_str": "0.0 / 4.0s",
            "gas_progress": 0.0,
            "ppe_tap_info": f"Taps: {self.ppe_tap_count}/2",
            "ppe_state": self.ppe_state,
            "detail_msg": ""
        }

        # Check miner presence
        if not has_pose:
            self._reset_all_timers()
            self.active_gesture_state = "NO_GESTURE"
            self.exit_frame_count = 0
            self.smoothed_probabilities = None
            telemetry["confidence_status"] = "NO WORKER"
            telemetry["status_text"] = "SEARCHING FOR WORKER"
            return telemetry, None

        # -------------------------------------------------------------
        # STAGE 2: Temporal Consistency & Margin Verification
        # -------------------------------------------------------------
        recent_matches = sum(1 for c in self.raw_class_history if c == sm_top1_class)
        consistency_pass = bool(recent_matches >= min(len(self.raw_class_history), CONSISTENT_FRAMES_REQUIRED))
        margin_gate_pass = bool(sm_top1_conf >= 0.88 or sm_conf_margin >= MIN_CONFIDENCE_MARGIN)
        confidence_gate_pass = bool(sm_top1_conf >= MIN_CONFIDENCE)

        if self.active_gesture_state == "NO_GESTURE":
            if sm_top1_class != "NO_GESTURE" and confidence_gate_pass and margin_gate_pass and consistency_pass:
                self.active_gesture_state = sm_top1_class
                self.exit_frame_count = 0
        else:
            # Check exit hysteresis condition
            active_idx = LABEL_TO_ID.get(self.active_gesture_state, 0)
            active_conf = float(self.smoothed_probabilities[active_idx]) if self.smoothed_probabilities is not None else 0.0
            if active_conf < CONFIDENCE_EXIT_THRESHOLD:
                self.exit_frame_count += 1
                if self.exit_frame_count >= 3:
                    self.active_gesture_state = "NO_GESTURE"
                    self.exit_frame_count = 0
            else:
                self.exit_frame_count = 0

        # Hard safety default: if ambiguous or inconsistent, displayed class defaults to NO_GESTURE
        if self.active_gesture_state != "NO_GESTURE":
            displayed_class = self.active_gesture_state
            displayed_conf = float(self.smoothed_probabilities[LABEL_TO_ID.get(self.active_gesture_state, 0)]) if self.smoothed_probabilities is not None else sm_top1_conf
        elif confidence_gate_pass and margin_gate_pass and consistency_pass:
            displayed_class = sm_top1_class
            displayed_conf = sm_top1_conf
        else:
            displayed_class = "NO_GESTURE"
            displayed_conf = sm_top1_conf if sm_top1_class != "NO_GESTURE" else 0.0

        telemetry["displayed_class"] = displayed_class
        telemetry["displayed_confidence"] = displayed_conf

        if not confidence_gate_pass:
            telemetry["confidence_status"] = f"BELOW THRESHOLD ({displayed_conf*100:.1f}%)"
        elif not margin_gate_pass:
            telemetry["confidence_status"] = f"AMBIGUOUS MARGIN ({sm_conf_margin*100:.1f}%)"
        elif not consistency_pass:
            telemetry["confidence_status"] = f"INCONSISTENT ({recent_matches}/{CONSISTENT_FRAMES_REQUIRED})"
        else:
            telemetry["confidence_status"] = f"PASS ({displayed_conf*100:.1f}%)"

        # -------------------------------------------------------------
        # STAGE 4: Physical & Temporal State Machines
        # -------------------------------------------------------------
        validator_passed = False
        active_candidate = None

        # 1. PPE DAMAGE: 5-State Multi-Anchor Tap Machine
        min_head_dist = float(features_dict.get("min_hand_to_head", 9.9))
        is_head_touch = bool(features_dict.get("is_hand_at_head", False) or min_head_dist <= PPE_HEAD_PROXIMITY_THRESHOLD)
        is_head_release = bool(min_head_dist >= PPE_RELEASE_THRESHOLD or not is_head_touch)

        if self.ppe_state == "PPE_IDLE":
            if is_head_touch:
                self.ppe_state = "FIRST_TAP"
                self.ppe_first_tap_time = now
                self.ppe_tap_count = 1
        elif self.ppe_state == "FIRST_TAP":
            if (now - self.ppe_first_tap_time) > PPE_TAP_WINDOW_SEC:
                self.ppe_state = "PPE_IDLE"
                self.ppe_tap_count = 0
                self.ppe_first_tap_time = None
            elif is_head_release:
                self.ppe_state = "FIRST_TAP_RELEASE"
        elif self.ppe_state == "FIRST_TAP_RELEASE":
            if (now - self.ppe_first_tap_time) > PPE_TAP_WINDOW_SEC:
                self.ppe_state = "PPE_IDLE"
                self.ppe_tap_count = 0
                self.ppe_first_tap_time = None
            elif is_head_touch:
                self.ppe_state = "SECOND_TAP"
                self.ppe_second_tap_time = now
                self.ppe_tap_count = 2
        elif self.ppe_state in ("SECOND_TAP", "PPE_DAMAGE_CONFIRMED"):
            # Latch second tap confirmation state for 1.0 second before timing out
            if self.ppe_second_tap_time and (now - self.ppe_second_tap_time) > 1.0:
                self.ppe_state = "PPE_IDLE"
                self.ppe_tap_count = 0
                self.ppe_first_tap_time = None
                self.ppe_second_tap_time = None

        telemetry["ppe_tap_info"] = f"Taps: {self.ppe_tap_count}/2"
        telemetry["ppe_state"] = self.ppe_state

        # Crack separation history
        idx_dist = float(features_dict.get("inter_index_dist", 9.9))
        if idx_dist < 5.0:
            self.crack_distance_history.append((now, idx_dist))

        # Evaluate candidate matching
        eval_class = displayed_class if displayed_class != "NO_GESTURE" else raw_top1_class

        if eval_class == "SUSPECTED_GAS_LEAK" or features_dict.get("is_palm_at_mouth", False):
            # 2. SUSPECTED_GAS_LEAK: Continuous 4.0s Hold with Dropout Grace Tolerance (0.85s)
            palm_dist = float(features_dict.get("min_hand_to_mouth", 9.9))
            is_at_mouth = bool(
                features_dict.get("is_palm_at_mouth", False) or 
                palm_dist <= GAS_LEAK_MOUTH_PROXIMITY_THRESHOLD
            )

            if is_at_mouth:
                if self.gas_hold_start_time is None:
                    self.gas_hold_start_time = now
                self.gas_last_active_time = now
                self.gas_current_duration = now - self.gas_hold_start_time
                progress = min(1.0, self.gas_current_duration / GAS_LEAK_REQUIRED_HOLD_SEC)
                telemetry["gas_timer_str"] = f"{self.gas_current_duration:.1f} / {GAS_LEAK_REQUIRED_HOLD_SEC:.1f}s"
                telemetry["gas_progress"] = progress
                telemetry["gesture_validation_status"] = f"HOLDING ({self.gas_current_duration:.1f}s / 4.0s)"
                telemetry["status_text"] = f"HOLDING PALM ON MOUTH ({self.gas_current_duration:.1f}s / 4.0s)"
                telemetry["validation_state"] = "VERIFYING"

                if self.gas_current_duration >= GAS_LEAK_REQUIRED_HOLD_SEC:
                    validator_passed = True
                    active_candidate = "SUSPECTED_GAS_LEAK"
                    telemetry["gesture_validation_status"] = "PASS (4.0s HELD)"
                    telemetry["status_text"] = "SUSPECTED GAS LEAK VISUAL REPORT CONFIRMED"
                    telemetry["validation_state"] = "CONFIRMED"
            else:
                # Check dropout tolerance grace period (0.85s)
                if self.gas_hold_start_time is not None and self.gas_last_active_time is not None:
                    dropout_dur = now - self.gas_last_active_time
                    if dropout_dur <= GAS_LEAK_DROPOUT_TOLERANCE_SEC:
                        # Preserve accumulated hold time across momentary landmark tracking dropout
                        self.gas_current_duration = self.gas_last_active_time - self.gas_hold_start_time
                        progress = min(1.0, self.gas_current_duration / GAS_LEAK_REQUIRED_HOLD_SEC)
                        telemetry["gas_timer_str"] = f"{self.gas_current_duration:.1f} / {GAS_LEAK_REQUIRED_HOLD_SEC:.1f}s"
                        telemetry["gas_progress"] = progress
                        telemetry["gesture_validation_status"] = f"REACQUIRING ({self.gas_current_duration:.1f}s / 4.0s)"
                        telemetry["status_text"] = f"REACQUIRING PALM ON MOUTH ({self.gas_current_duration:.1f}s / 4.0s)"
                        telemetry["validation_state"] = "VERIFYING"
                    else:
                        # Exceeded grace period: worker actually removed palm
                        self.gas_hold_start_time = None
                        self.gas_last_active_time = None
                        self.gas_current_duration = 0.0
                        telemetry["gas_timer_str"] = f"0.0 / {GAS_LEAK_REQUIRED_HOLD_SEC:.1f}s"
                        telemetry["gas_progress"] = 0.0
                        telemetry["gesture_validation_status"] = "FAIL (PALM NOT ON MOUTH)"
                else:
                    telemetry["gas_timer_str"] = f"0.0 / {GAS_LEAK_REQUIRED_HOLD_SEC:.1f}s"
                    telemetry["gas_progress"] = 0.0
                    telemetry["gesture_validation_status"] = "VERIFYING (PALM OVER MOUTH NEEDED)"
                    telemetry["validation_state"] = "VERIFYING"

            # Attach explicit debug telemetry for Gas Leak
            hand_prox_pass = bool(features_dict.get("has_left_hand", False) or features_dict.get("has_right_hand", False) or palm_dist < 1.0)
            if validator_passed and active_candidate == "SUSPECTED_GAS_LEAK":
                temp_valid_str = "PASS"
                rej_reason = "NONE"
            elif self.gas_current_duration > 0.0:
                if is_at_mouth:
                    temp_valid_str = "HOLDING"
                    rej_reason = "HOLD_IN_PROGRESS"
                else:
                    temp_valid_str = "REACQUIRING"
                    rej_reason = "GRACE_PERIOD_ACTIVE"
            else:
                temp_valid_str = "FAIL"
                rej_reason = "PALM_DISTANCE_EXCEEDED" if not is_at_mouth else "AWAITING_CLASSIFIER"

            telemetry["gas_debug"] = {
                "classifier_gesture": sm_top1_class,
                "confidence": round(displayed_conf, 3),
                "face_detected": bool(has_pose),
                "hand_detected": hand_prox_pass,
                "palm_to_face": round(palm_dist, 3),
                "threshold": GAS_LEAK_MOUTH_PROXIMITY_THRESHOLD,
                "face_coverage": "PASS" if is_at_mouth else "FAIL",
                "hand_proximity": "PASS" if hand_prox_pass else "FAIL",
                "temporal_valid": temp_valid_str,
                "hold": f"{self.gas_current_duration:.1f}/{GAS_LEAK_REQUIRED_HOLD_SEC:.1f}s",
                "rejection_reason": rej_reason
            }

        elif eval_class == "PPE_DAMAGE" or self.ppe_tap_count > 0:
            if self.ppe_tap_count == 2 or self.ppe_state in ("SECOND_TAP", "PPE_DAMAGE_CONFIRMED"):
                validator_passed = True
                active_candidate = "PPE_DAMAGE"
                self.ppe_state = "PPE_DAMAGE_CONFIRMED"
                telemetry["gesture_validation_status"] = "PASS (2 TAPS CONFIRMED)"
                telemetry["status_text"] = "PPE 2-TAP PATTERN CONFIRMED"
                telemetry["validation_state"] = "CONFIRMED"
            elif self.ppe_tap_count == 1:
                telemetry["gesture_validation_status"] = f"TAP 1/2 ({self.ppe_state})"
                telemetry["status_text"] = "PPE TAP 1/2 DETECTED (TAP AGAIN)"
                telemetry["validation_state"] = "VERIFYING"
            else:
                telemetry["gesture_validation_status"] = "FAIL (NO 2-TAP PATTERN)"

        elif eval_class == "CRACK_WORSENING":
            telemetry["validation_state"] = "VERIFYING"
            if len(self.crack_distance_history) >= 20:
                dists = [d for _, d in self.crack_distance_history]
                d_min, d_max = min(dists), max(dists)
                spread = d_max - d_min
                if spread > 0.35 and d_max > 0.55 and d_min < 0.35:
                    validator_passed = True
                    active_candidate = "CRACK_WORSENING"
                    telemetry["gesture_validation_status"] = "PASS (WIDENING OSCILLATION)"
                    telemetry["status_text"] = "CRACK WIDENING MOTION CONFIRMED"
                    telemetry["validation_state"] = "CONFIRMED"
                else:
                    telemetry["gesture_validation_status"] = "FAIL (INSUFFICIENT SPREAD / STATIC)"
            else:
                telemetry["gesture_validation_status"] = "INSUFFICIENT FRAMES"

        elif eval_class == "RESCUE_REQUIRED":
            both_overhead = bool(features_dict.get("both_arms_overhead", False) or (features_dict.get("lw_elev", 0) > 0.35 and features_dict.get("rw_elev", 0) > 0.35))
            if both_overhead:
                if self.rescue_start_time is None:
                    self.rescue_start_time = now
                self.rescue_current_duration = now - self.rescue_start_time
                telemetry["gesture_validation_status"] = f"WAVING ({self.rescue_current_duration:.1f}s / {RESCUE_REQUIRED_HOLD_SEC:.1f}s)"
                telemetry["status_text"] = f"OVERHEAD RESCUE WAVING ({self.rescue_current_duration:.1f}s)"
                telemetry["validation_state"] = "VERIFYING"

                if self.rescue_current_duration >= RESCUE_REQUIRED_HOLD_SEC:
                    validator_passed = True
                    active_candidate = "RESCUE_REQUIRED"
                    telemetry["gesture_validation_status"] = "PASS (OVERHEAD WAVING)"
                    telemetry["validation_state"] = "CONFIRMED"
            else:
                self.rescue_start_time = None
                self.rescue_current_duration = 0.0
                telemetry["gesture_validation_status"] = "FAIL (BOTH ARMS NOT OVERHEAD)"

        elif eval_class == "HAZARD_HERE":
            is_crossed = bool(features_dict.get("is_crossed_x", False))
            if is_crossed:
                if self.hazard_start_time is None:
                    self.hazard_start_time = now
                self.hazard_current_duration = now - self.hazard_start_time
                telemetry["gesture_validation_status"] = f"X HELD ({self.hazard_current_duration:.1f}s / {HAZARD_HOLD_SEC:.1f}s)"
                telemetry["status_text"] = f"HAZARD 'X' HELD ({self.hazard_current_duration:.1f}s)"
                telemetry["validation_state"] = "VERIFYING"

                if self.hazard_current_duration >= HAZARD_HOLD_SEC:
                    validator_passed = True
                    active_candidate = "HAZARD_HERE"
                    telemetry["gesture_validation_status"] = "PASS ('X' HELD)"
                    telemetry["validation_state"] = "CONFIRMED"
            else:
                self.hazard_start_time = None
                self.hazard_current_duration = 0.0
                telemetry["gesture_validation_status"] = "FAIL (FOREARMS NOT CROSSED IN 'X')"

        else:
            # NO_GESTURE
            telemetry["gesture_validation_status"] = "AMBIENT (SAFE)"
            telemetry["status_text"] = "NORMAL MONITORING"
            telemetry["validation_state"] = "LISTENING"

        # -------------------------------------------------------------
        # STAGE 5: Final Event Confirmation & Cooldown Gate
        # -------------------------------------------------------------
        confirmed_event_payload = None

        # Determine confirmation eligibility:
        # - For continuous Gas Leak: 4.0s physical hold directly satisfies confirmation
        # - For PPE Damage: Completed 2-tap pattern latch directly satisfies confirmation
        # - For other gestures (Rescue, Hazard, Crack): requires confidence + margin + consistency + physical validator
        can_confirm = False
        if validator_passed and active_candidate and active_candidate != "NO_GESTURE":
            if active_candidate == "SUSPECTED_GAS_LEAK" and self.gas_current_duration >= GAS_LEAK_REQUIRED_HOLD_SEC:
                can_confirm = True
            elif active_candidate == "PPE_DAMAGE" and (self.ppe_tap_count == 2 or self.ppe_state in ("SECOND_TAP", "PPE_DAMAGE_CONFIRMED")):
                can_confirm = True
            elif confidence_gate_pass and margin_gate_pass and consistency_pass:
                can_confirm = True

        if can_confirm:
            if self._can_trigger(active_candidate, now):
                self.last_confirmed_events[active_candidate] = now
                telemetry["is_confirmed"] = True
                telemetry["confirmed_gesture"] = active_candidate
                telemetry["final_result"] = f"CONFIRMED {active_candidate}"
                telemetry["status_text"] = f"*** CONFIRMED: {active_candidate} ***"
                telemetry["validation_state"] = "CONFIRMED"

                confirmed_event_payload = {
                    "event_id": f"event-minesig-{int(now * 1000)}",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(now)),
                    "camera_id": CAMERA_ID,
                    "mine_name": "Demo Coal Mine",
                    "zone": ZONE,
                    "gesture": active_candidate,
                    "priority": GESTURE_METADATA[active_candidate]["priority"],
                    "meaning": GESTURE_METADATA[active_candidate]["meaning"],
                    "confidence": float(round(displayed_conf, 4)),
                    "confidence_margin": float(round(sm_conf_margin, 4)),
                    "status": "CONFIRMED_VALIDATED",
                    "worker_id": worker_id,
                    "simulation_mode": True
                }
                self.last_confirmed_payload = confirmed_event_payload
                self._reset_all_timers()
        else:
            # HARD SAFETY DEFAULT: Everything else is strictly NO_GESTURE
            telemetry["is_confirmed"] = False
            telemetry["confirmed_gesture"] = None
            telemetry["final_result"] = "NO_GESTURE"
            confirmed_event_payload = None

        # HUD Debug Telemetry
        final_hud_state = "CONFIRMED" if telemetry["is_confirmed"] else ("VERIFYING" if (validator_passed or telemetry["validation_state"] == "VERIFYING") and displayed_class != "NO_GESTURE" else "NO_GESTURE")
        telemetry["debug_info"] = {
            "predicted": sm_top1_class,
            "confidence_pct": round(displayed_conf * 100, 1),
            "margin_pct": round(sm_conf_margin * 100, 1),
            "temporal_consistency": f"{recent_matches}/{CONSISTENT_FRAMES_REQUIRED}",
            "physical_validation": "PASS" if validator_passed else "FAIL",
            "final_state": final_hud_state
        }

        return telemetry, confirmed_event_payload

    def _can_trigger(self, gesture_name, current_time):
        """Enforces 5.0-second cooldown per gesture class."""
        last_time = self.last_confirmed_events.get(gesture_name, 0)
        return (current_time - last_time) >= DEBOUNCE_COOLDOWN_SEC

    def _reset_all_timers(self):
        self.gas_hold_start_time = None
        self.gas_last_active_time = None
        self.gas_current_duration = 0.0
        self.ppe_state = "PPE_IDLE"
        self.ppe_first_tap_time = None
        self.ppe_second_tap_time = None
        self.ppe_tap_count = 0
        self.rescue_start_time = None
        self.rescue_current_duration = 0.0
        self.hazard_start_time = None
        self.hazard_current_duration = 0.0
