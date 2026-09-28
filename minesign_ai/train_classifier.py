"""
MineSign AI — Phase 1F Combined Two-Worker (W001 + W002) Training & Cross-Worker Evaluation Pipeline
Trains and evaluates:
1. Cross-Worker Evaluation A: Train on W001 -> Test on unseen W002
2. Cross-Worker Evaluation B: Train on W002 -> Test on unseen W001
3. Combined Production Model: 240 sequences (W001 + W002) with sequence-level stratified splits
"""

import os
import sys
import json
import glob
from datetime import datetime
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

# Import MineSign configuration
try:
    from config import GESTURE_CLASSES, LABEL_TO_ID, ID_TO_LABEL, DATA_DIR, BASE_DIR
except ImportError:
    from minesign_ai.config import GESTURE_CLASSES, LABEL_TO_ID, ID_TO_LABEL, DATA_DIR, BASE_DIR

MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_V2_FILE = os.path.join(MODELS_DIR, "minesign_classifier_v2.joblib")
SCALER_V2_FILE = os.path.join(MODELS_DIR, "minesign_scaler_v2.joblib")
METADATA_V2_FILE = os.path.join(MODELS_DIR, "model_metadata_v2.json")
EVAL_REPORT_V2_FILE = os.path.join(MODELS_DIR, "evaluation_report_v2.json")
CROSS_WORKER_REPORT_FILE = os.path.join(MODELS_DIR, "cross_worker_eval_report.json")
CONFUSION_MATRIX_V2_FILE = os.path.join(MODELS_DIR, "confusion_matrix_v2.json")

# Aliases for default loader
MODEL_FILE = MODEL_V2_FILE
SCALER_FILE = SCALER_V2_FILE
METADATA_FILE = METADATA_V2_FILE



def extract_temporal_sequence_features(feature_vectors, timestamps=None, duration_sec=None):
    """
    Transforms a variable-length temporal sequence of MediaPipe feature vectors (T, 241)
    into a fixed-length, highly discriminative temporal sequence representation.
    Total dimension = 2172 features.
    """
    arr = np.array(feature_vectors, dtype=np.float32)
    T, D = arr.shape

    if T < 2:
        arr = np.repeat(arr, 2, axis=0)
        T = 2

    # 1. Global statistical moments across entire sequence
    mean_feat = np.mean(arr, axis=0)
    std_feat = np.std(arr, axis=0)
    min_feat = np.min(arr, axis=0)
    max_feat = np.max(arr, axis=0)

    # 2. 3-Phase temporal segment pooling (Beginning, Middle, End)
    p1_end = max(1, T // 3)
    p2_end = max(p1_end + 1, (2 * T) // 3)
    
    phase1_mean = np.mean(arr[:p1_end], axis=0)
    phase2_mean = np.mean(arr[p1_end:p2_end], axis=0)
    phase3_mean = np.mean(arr[p2_end:], axis=0)

    # 3. First-order temporal velocity (delta features)
    deltas = np.diff(arr, axis=0)
    mean_vel = np.mean(deltas, axis=0)
    std_vel = np.std(deltas, axis=0)

    # 4. Temporal metadata
    dur = float(duration_sec if duration_sec is not None else (timestamps[-1] if timestamps is not None and len(timestamps) > 0 else T * 0.033))
    fps = float(T / max(dur, 0.1))
    meta_feat = np.array([dur, float(T), fps], dtype=np.float32)

    # Concatenate into unified fixed-size temporal vector
    temporal_vector = np.concatenate([
        mean_feat,
        std_feat,
        min_feat,
        max_feat,
        phase1_mean,
        phase2_mean,
        phase3_mean,
        mean_vel,
        std_vel,
        meta_feat
    ]).astype(np.float32)

    return temporal_vector


def load_full_dataset(data_dir=DATA_DIR):
    """
    Loads all recorded sequence files for both W001 and W002.
    Returns structured dictionaries partitioned by worker.
    """
    data_by_worker = {"W001": {"X": [], "y": [], "meta": []}, "W002": {"X": [], "y": [], "meta": []}}

    for class_name in GESTURE_CLASSES:
        class_id = LABEL_TO_ID[class_name]
        for worker in ["W001", "W002"]:
            pattern = os.path.join(data_dir, class_name, worker, "*.npz")
            files = sorted(glob.glob(pattern))

            for fpath in files:
                data = np.load(fpath)
                fvecs = data["feature_vectors"]
                ts = data["timestamps"]
                meta_json = str(data["metadata_json"])
                meta = json.loads(meta_json) if meta_json else {}

                dur = meta.get("duration_sec", ts[-1] if len(ts) > 0 else len(fvecs) * 0.033)
                temp_feat = extract_temporal_sequence_features(fvecs, timestamps=ts, duration_sec=dur)

                data_by_worker[worker]["X"].append(temp_feat)
                data_by_worker[worker]["y"].append(class_id)
                data_by_worker[worker]["meta"].append({
                    "sample_id": meta.get("sample_id", os.path.basename(fpath)),
                    "worker_id": worker,
                    "gesture": class_name,
                    "class_id": class_id,
                    "duration_sec": dur,
                    "num_frames": len(fvecs),
                    "filepath": fpath
                })

    for w in ["W001", "W002"]:
        data_by_worker[w]["X"] = np.array(data_by_worker[w]["X"], dtype=np.float32)
        data_by_worker[w]["y"] = np.array(data_by_worker[w]["y"], dtype=np.int32)

    return data_by_worker


def evaluate_cross_worker(data_by_worker):
    """
    Performs rigorous cross-worker generalization tests:
    - Train on W001 -> Test on unseen W002
    - Train on W002 -> Test on unseen W001
    """
    print("\n" + "=" * 75)
    print("🔬 CROSS-WORKER GENERALIZATION EVALUATION (Leave-One-Person-Out)")
    print("=" * 75)

    reports = {}

    for train_w, test_w in [("W001", "W002"), ("W002", "W001")]:
        print(f"\n--- Cross-Worker Test: Train on {train_w} (120 seqs) -> Test on {test_w} (120 seqs) ---")
        X_train, y_train = data_by_worker[train_w]["X"], data_by_worker[train_w]["y"]
        X_test, y_test = data_by_worker[test_w]["X"], data_by_worker[test_w]["y"]

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        clf = MLPClassifier(
            hidden_layer_sizes=(128, 64),
            activation="relu",
            solver="adam",
            alpha=0.01,
            max_iter=600,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.15,
            n_iter_no_change=25
        )
        clf.fit(X_train_scaled, y_train)

        y_pred = clf.predict(X_test_scaled)
        acc = float(accuracy_score(y_test, y_pred))
        precision, recall, f1, support = precision_recall_fscore_support(
            y_test, y_pred, labels=list(range(len(GESTURE_CLASSES))), zero_division=0
        )
        cm = confusion_matrix(y_test, y_pred, labels=list(range(len(GESTURE_CLASSES))))

        print(f"🏆 Cross-Worker Accuracy ({train_w} -> {test_w}): {acc * 100:.2f}% ({int(acc * len(y_test))}/{len(y_test)})")
        print("\nPer-Class Breakdown:")
        print(f"{'Class Name':<22s} | {'Precision':<10s} | {'Recall':<10s} | {'F1-Score':<10s} | {'Support':<8s}")
        print("-" * 72)
        class_metrics = {}
        for i, name in enumerate(GESTURE_CLASSES):
            class_metrics[name] = {
                "precision": float(round(precision[i], 4)),
                "recall": float(round(recall[i], 4)),
                "f1_score": float(round(f1[i], 4)),
                "support": int(support[i])
            }
            print(f"{name:<22s} | {precision[i]*100:>8.2f}% | {recall[i]*100:>8.2f}% | {f1[i]*100:>8.2f}% | {support[i]:>6d}")

        reports[f"{train_w}_to_{test_w}"] = {
            "train_worker": train_w,
            "test_worker": test_w,
            "accuracy": float(round(acc, 4)),
            "per_class_metrics": class_metrics,
            "confusion_matrix": cm.tolist()
        }

    with open(CROSS_WORKER_REPORT_FILE, "w") as f:
        json.dump(reports, f, indent=2)
    print(f"\n💾 Cross-worker evaluation report saved -> {CROSS_WORKER_REPORT_FILE}")

    return reports


def train_combined_production_model(data_by_worker):
    """
    Trains final production classifier on combined W001 + W002 dataset (240 sequences).
    Uses sequence-level stratified 70% Train, 15% Val, 15% Test split.
    """
    print("\n" + "=" * 75)
    print("🚀 TRAINING COMBINED PRODUCTION CLASSIFIER (W001 + W002)")
    print("=" * 75)

    X_all = np.vstack([data_by_worker["W001"]["X"], data_by_worker["W002"]["X"]])
    y_all = np.concatenate([data_by_worker["W001"]["y"], data_by_worker["W002"]["y"]])
    meta_all = data_by_worker["W001"]["meta"] + data_by_worker["W002"]["meta"]

    total_samples = len(X_all)
    feature_dim = X_all.shape[1]
    print(f"📊 Combined Dataset: {total_samples} sequences across {len(GESTURE_CLASSES)} classes (40 per class)")
    print(f"📐 Feature Dimension: {feature_dim} dims")

    # Sequence-level stratified split (70% Train = 168, 15% Val = 36, 15% Test = 36)
    X_train_val, X_test, y_train_val, y_test, meta_train_val, meta_test = train_test_split(
        X_all, y_all, meta_all, test_size=0.15, random_state=42, stratify=y_all
    )
    X_train, X_val, y_train, y_val, meta_train, meta_val = train_test_split(
        X_train_val, y_train_val, meta_train_val, test_size=(0.15 / 0.85), random_state=42, stratify=y_train_val
    )

    print("\n📦 Stratified Sequence Split:")
    print(f"  • Training Set   : {len(X_train):3d} sequences ({len(X_train)/total_samples*100:.1f}%) — {len(X_train)//len(GESTURE_CLASSES)} per class")
    print(f"  • Validation Set : {len(X_val):3d} sequences ({len(X_val)/total_samples*100:.1f}%) — {len(X_val)//len(GESTURE_CLASSES)} per class")
    print(f"  • Held-Out Test  : {len(X_test):3d} sequences ({len(X_test)/total_samples*100:.1f}%) — {len(X_test)//len(GESTURE_CLASSES)} per class")

    # Fit Preprocessing Scaler strictly on Training Data
    scaler_v2 = StandardScaler()
    X_train_scaled = scaler_v2.fit_transform(X_train)
    X_val_scaled = scaler_v2.transform(X_val)
    X_test_scaled = scaler_v2.transform(X_test)

    # 5-Fold Stratified Cross-Validation on Combined Dataset
    print("\n🔄 Running 5-Fold Stratified Cross-Validation on Combined Data...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_clf = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        alpha=0.01,
        max_iter=600,
        random_state=42,
        early_stopping=False
    )
    cv_scores = cross_val_score(cv_clf, scaler_v2.transform(X_train_val), y_train_val, cv=cv, scoring="accuracy")
    print(f"  • 5-Fold Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (±{cv_scores.std()*100:.2f}%)")
    print(f"  • Fold Scores: {[round(float(s)*100, 1) for s in cv_scores]}")

    # Train Final Production Model
    print("\n⚙️  Training Final Multi-Layer Perceptron (MLP) Classifier...")
    model_v2 = MLPClassifier(
        hidden_layer_sizes=(128, 64),
        activation="relu",
        solver="adam",
        alpha=0.01,
        max_iter=600,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=25
    )
    model_v2.fit(X_train_scaled, y_train)

    train_acc = accuracy_score(y_train, model_v2.predict(X_train_scaled))
    val_acc = accuracy_score(y_val, model_v2.predict(X_val_scaled))
    print(f"  • Training Accuracy   : {train_acc * 100:.2f}%")
    print(f"  • Validation Accuracy : {val_acc * 100:.2f}%")

    # Evaluate on Held-Out Test Set (36 unseen sequences)
    print("\n" + "=" * 75)
    print("🎯 HELD-OUT TEST SET EVALUATION (36 Unseen Sequences)")
    print("=" * 75)

    y_test_pred = model_v2.predict(X_test_scaled)
    test_acc = accuracy_score(y_test, y_test_pred)
    print(f"\n🏆 Overall Held-Out Test Accuracy: {test_acc * 100:.2f}% ({int(test_acc * len(y_test))}/{len(y_test)})")

    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, y_test_pred, labels=list(range(len(GESTURE_CLASSES))), zero_division=0
    )

    print("\nPer-Class Performance on Held-Out Test Set:")
    print(f"{'Class Name':<22s} | {'Precision':<10s} | {'Recall':<10s} | {'F1-Score':<10s} | {'Support':<8s}")
    print("-" * 72)
    per_class_metrics = {}
    for i, name in enumerate(GESTURE_CLASSES):
        per_class_metrics[name] = {
            "precision": float(round(precision[i], 4)),
            "recall": float(round(recall[i], 4)),
            "f1_score": float(round(f1[i], 4)),
            "support": int(support[i])
        }
        print(f"{name:<22s} | {precision[i]*100:>8.2f}% | {recall[i]*100:>8.2f}% | {f1[i]*100:>8.2f}% | {support[i]:>6d}")

    # Confusion Matrix
    cm = confusion_matrix(y_test, y_test_pred, labels=list(range(len(GESTURE_CLASSES))))
    print("\nConfusion Matrix (Rows: Ground Truth, Columns: Predicted):")
    print("      " + " ".join([f"{c[:4]:>5s}" for c in GESTURE_CLASSES]))
    for idx, row in enumerate(cm):
        row_str = " ".join([f"{val:>5d}" for val in row])
        print(f"{GESTURE_CLASSES[idx][:4]:>4s}  [{row_str}]  <- {GESTURE_CLASSES[idx]}")

    # Specific check for NO_GESTURE cross-talk
    no_gesture_confusions = {}
    for i in range(1, len(GESTURE_CLASSES)):
        g_name = GESTURE_CLASSES[i]
        no_gesture_confusions[f"NO_GESTURE -> {g_name}"] = int(cm[0, i])
        no_gesture_confusions[f"{g_name} -> NO_GESTURE"] = int(cm[i, 0])

    print("\nNO_GESTURE Cross-Talk Verification:")
    for pair_name, count in no_gesture_confusions.items():
        print(f"  • {pair_name:<32s}: {count} errors")

    # Save Model Artifacts
    print("\n" + "=" * 75)
    print("💾 SAVING VERSIONED MODEL ARTIFACTS (v2)")
    print("=" * 75)

    joblib.dump(model_v2, MODEL_V2_FILE)
    print(f"  • Model Serialized  -> {MODEL_V2_FILE}")

    joblib.dump(scaler_v2, SCALER_V2_FILE)
    print(f"  • Scaler Serialized -> {SCALER_V2_FILE}")

    metadata_v2 = {
        "model_name": "MineSign-Temporal-MLP-v2",
        "version": "2.0.0-SIH2026-COMBINED-W001-W002",
        "trained_at": datetime.now().isoformat(),
        "architecture": "MLPClassifier (128, 64, ReLU, Adam, alpha=0.01)",
        "input_feature_dim": feature_dim,
        "classes": GESTURE_CLASSES,
        "label_to_id": LABEL_TO_ID,
        "id_to_label": ID_TO_LABEL,
        "training_metadata": {
            "total_samples": total_samples,
            "samples_per_worker": {"W001": 120, "W002": 120},
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "evaluation_notice": "Two-person prototype evaluation. Cross-worker results are more informative than random sequence splitting, but the dataset is still small and should not be interpreted as real coal-mine deployment accuracy.",
            "random_seed": 42
        }
    }
    with open(METADATA_V2_FILE, "w") as f:
        json.dump(metadata_v2, f, indent=2)
    print(f"  • Metadata v2       -> {METADATA_V2_FILE}")

    eval_report_v2 = {
        "evaluation_notice": "Two-person prototype evaluation. Cross-worker results are more informative than random sequence splitting, but the dataset is still small and should not be interpreted as real coal-mine deployment accuracy.",
        "test_accuracy": float(round(test_acc, 4)),
        "validation_accuracy": float(round(val_acc, 4)),
        "training_accuracy": float(round(train_acc, 4)),
        "cv_5fold_mean_accuracy": float(round(cv_scores.mean(), 4)),
        "cv_5fold_std": float(round(cv_scores.std(), 4)),
        "per_class_metrics": per_class_metrics,
        "confusion_matrix": cm.tolist(),
        "no_gesture_cross_talk": no_gesture_confusions,
        "classes": GESTURE_CLASSES
    }
    with open(EVAL_REPORT_V2_FILE, "w") as f:
        json.dump(eval_report_v2, f, indent=2)
    print(f"  • Eval Report v2    -> {EVAL_REPORT_V2_FILE}")

    cm_data = {
        "classes": GESTURE_CLASSES,
        "matrix": cm.tolist(),
        "labels": {idx: name for idx, name in enumerate(GESTURE_CLASSES)}
    }
    with open(CONFUSION_MATRIX_V2_FILE, "w") as f:
        json.dump(cm_data, f, indent=2)
    print(f"  • Confusion Matrix  -> {CONFUSION_MATRIX_V2_FILE}")

    return model_v2, scaler_v2, eval_report_v2


if __name__ == "__main__":
    data_by_worker = load_full_dataset()
    cross_reports = evaluate_cross_worker(data_by_worker)
    model_v2, scaler_v2, eval_v2 = train_combined_production_model(data_by_worker)
    print("\n✅ PHASE 1F TRAINING & CROSS-WORKER EVALUATION COMPLETE!\n")
