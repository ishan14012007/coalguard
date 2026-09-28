"""
Utility script to inspect the generated CCTV Fire & Smoke training footage,
extract dataset splits (train/val frames), and verify annotations.
"""

import os
import cv2
import csv
import json
import argparse

def inspect_dataset(video_file="fire_smoke_cctv_training_video.mp4", 
                    csv_file="ground_truth_labels.csv", 
                    json_file="dataset_manifest.json"):
    print("==================================================")
    print("CCTV Fire & Smoke Training Dataset Inspection")
    print("==================================================")
    
    if not os.path.exists(video_file):
        print(f"Error: {video_file} not found!")
        return
        
    cap = cv2.VideoCapture(video_file)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    
    print(f"Video File       : {video_file}")
    print(f"Video Resolution : {width}x{height}")
    print(f"Frame Rate (FPS) : {fps}")
    print(f"Total Frames     : {total_frames}")
    print(f"Total Duration   : {duration:.2f} seconds ({duration/60:.2f} min)")
    print(f"Ground Truth CSV : {csv_file}")
    print(f"Manifest JSON    : {json_file}")
    print("--------------------------------------------------")
    
    if os.path.exists(json_file):
        with open(json_file, 'r') as f:
            manifest = json.load(f)
            print("Timeline Segment Breakdown:")
            for seg in manifest.get("timeline_segments", []):
                print(f"  [Phase {seg['phase']}] {seg['time_range']} ({seg['label']:12s}) | Frames {seg['start_frame']:4d}-{seg['end_frame']:4d} | {seg['description']}")
    print("==================================================")

def extract_dataset_frames(video_file="fire_smoke_cctv_training_video.mp4", 
                           csv_file="ground_truth_labels.csv", 
                           output_dir="dataset_extracted",
                           sample_interval=5):
    """
    Extracts labeled frames into subdirectories organized by class label:
    dataset_extracted/
      NORMAL/
      SMOKE/
      FIRE/
      FIRE_AND_SMOKE/
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_file)
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        records = list(csv.DictReader(f))
        
    print(f"Extracting sample frames every {sample_interval} frames into '{output_dir}'...")
    count = 0
    for i, rec in enumerate(records):
        if i % sample_interval != 0:
            continue
            
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if not ret:
            break
            
        label = rec['class_label'].replace(" + ", "_AND_").replace(" ", "_")
        class_folder = os.path.join(output_dir, label)
        os.makedirs(class_folder, exist_ok=True)
        
        frame_filename = f"frame_{i:04d}_t{float(rec['timestamp_sec']):05.2f}s.jpg"
        save_path = os.path.join(class_folder, frame_filename)
        cv2.imwrite(save_path, frame)
        count += 1
        
    cap.release()
    print(f"Successfully extracted {count} labeled images into '{output_dir}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect or Extract CCTV Training Footage")
    parser.add_argument("--extract", action="store_true", help="Extract frames into class folders")
    parser.add_argument("--step", type=int, default=5, help="Sampling step for frame extraction")
    args = parser.parse_args()
    
    inspect_dataset()
    if args.extract:
        extract_dataset_frames(sample_interval=args.step)
