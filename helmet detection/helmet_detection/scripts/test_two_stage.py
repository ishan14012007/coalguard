import cv2
import os
from ultralytics import YOLO, YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")

print("Initializing models...")
# Stage 1: Standard YOLO for fast person detection
person_model = YOLO("yolov8n.pt") 

# Stage 2: YOLO-World for specific helmet classification on the head crop
helmet_model = YOLOWorld("yolov8s-worldv2.pt")
helmet_classes = ["intact hard hat", "damaged hard hat", "bare human head"]
helmet_model.set_classes(helmet_classes)

cap = cv2.VideoCapture(video_path)
frame_count = 0

print("\nTesting Two-Stage Pipeline...")
while cap.isOpened() and frame_count < 30:
    ret, frame = cap.read()
    if not ret:
        break
    
    if frame_count % 15 == 0:
        print(f"\n--- Frame {frame_count} ---")
        
        # 1. Detect person
        person_results = person_model(frame, classes=[0], verbose=False) # class 0 is person
        
        for r in person_results:
            for box in r.boxes:
                # Get person coordinates
                px1, py1, px2, py2 = map(int, box.xyxy[0])
                
                # Crop upper body / head region (top 30%)
                height = py2 - py1
                width = px2 - px1
                
                # Expand head box slightly outside person box just in case
                hx1 = max(0, px1 - int(width * 0.1))
                hx2 = min(frame.shape[1], px2 + int(width * 0.1))
                hy1 = max(0, py1 - int(height * 0.1))
                hy2 = min(frame.shape[0], py1 + int(height * 0.3)) # Top 30%
                
                if hy2 <= hy1 or hx2 <= hx1:
                    continue
                
                head_crop = frame[hy1:hy2, hx1:hx2]
                
                # 2. Classify helmet on the head crop
                helmet_results = helmet_model(head_crop, verbose=False)
                
                best_class = "UNKNOWN"
                best_conf = 0.0
                
                for hr in helmet_results:
                    for h_box in hr.boxes:
                        conf = float(h_box.conf[0])
                        cls_idx = int(h_box.cls[0])
                        
                        if conf > best_conf and conf > 0.05:
                            best_conf = conf
                            best_class = helmet_classes[cls_idx]
                            
                print(f"Person detected at [{px1}, {py1}, {px2}, {py2}] -> Head classified as: {best_class} ({best_conf:.2f})")

    frame_count += 1

cap.release()
print("\n--- TEST COMPLETE ---")
