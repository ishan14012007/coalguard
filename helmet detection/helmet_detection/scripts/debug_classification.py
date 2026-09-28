import os
import cv2
from ultralytics import YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")

print("--- DEBUGGING HELMET CLASSIFICATION ---")
print("Loading YOLO-World...")
model_person_based = YOLOWorld("yolov8s-worldv2.pt")
model_person_based.set_classes(["person wearing good construction helmet", "person wearing damaged construction helmet", "person with no construction helmet"])

model_head_based = YOLOWorld("yolov8s-worldv2.pt")
model_head_based.set_classes(["intact hard hat", "damaged hard hat", "bare human head"])

cap = cv2.VideoCapture(video_path)
frame_count = 0

print("\nExtracting and analyzing frames to identify classification issues...")
while cap.isOpened() and frame_count < 30: # Just check first few seconds for debugging
    ret, frame = cap.read()
    if not ret:
        break
    
    if frame_count % 15 == 0:
        print(f"\n--- Frame {frame_count} ---")
        
        # Test 1: Person-based prompts
        print("Approach 1: Person-based Prompts (Current implementation)")
        res1 = model_person_based(frame, verbose=False)
        for r in res1:
            for box in r.boxes:
                cls_name = model_person_based.names[int(box.cls[0])]
                conf = float(box.conf[0])
                if conf > 0.05:
                    print(f"Detected: {cls_name} -> Confidence: {conf:.2f}")

        # Test 2: Helmet/Head-based prompts
        print("\nApproach 2: Object-based Prompts (Focusing on Head/Helmet region)")
        res2 = model_head_based(frame, verbose=False)
        for r in res2:
            for box in r.boxes:
                cls_name = model_head_based.names[int(box.cls[0])]
                conf = float(box.conf[0])
                if conf > 0.05:
                    print(f"Detected: {cls_name} -> Confidence: {conf:.2f}")
                    
    frame_count += 1

cap.release()
print("\n--- DEBUGGING COMPLETE ---")
