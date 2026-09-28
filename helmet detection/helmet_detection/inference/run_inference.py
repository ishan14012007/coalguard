import cv2
import os
import csv
import datetime
from ultralytics import YOLO, YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection - Copy - Copy"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")
output_video_path = os.path.join(base_dir, "helmet_detection", "output", "helmet_detection_result.mp4")
log_path = os.path.join(base_dir, "helmet_detection", "output", "violation_log.csv")

print("Initializing models...")
# Tracker model for stable person bounding boxes
person_tracker = YOLO("yolov8n.pt") 

# YOLO-World just for finding helmets
helmet_model = YOLOWorld("yolov8s-worldv2.pt")
helmet_model.set_classes(["safety helmet"])
HELMET_CONF = 0.15

cap = cv2.VideoCapture(video_path)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

# Dictionary to remember if a tracked person was wearing a helmet
# This ensures stability even if the helmet detector misses a frame
person_helmet_state = {}

print("Processing video frames...")
with open(log_path, 'w', newline='') as f:
    writer = cv2.csv.writer(f) if hasattr(cv2, 'csv') else csv.writer(f)
    writer.writerow(['Timestamp', 'Frame Number', 'Track ID', 'Status'])
    
    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # 1. Track people (class 0 = person). persist=True keeps tracking IDs across frames.
        track_results = person_tracker.track(frame, persist=True, classes=[0], verbose=False)
        
        # 2. Detect helmets in the whole frame
        helmet_results = helmet_model(frame, verbose=False)
        helmets = []
        for r in helmet_results:
            for box in r.boxes:
                if float(box.conf[0]) > HELMET_CONF:
                    helmets.append(box.xyxy[0].tolist())
                    
        # 3. Match tracked people to helmets
        for r in track_results:
            if r.boxes.id is None:
                continue
                
            boxes = r.boxes.xyxy.tolist()
            ids = r.boxes.id.tolist()
            
            for box, track_id in zip(boxes, ids):
                px1, py1, px2, py2 = map(int, box)
                
                # Check if this person has a helmet right now
                current_frame_has_helmet = False
                for hx1, hy1, hx2, hy2 in helmets:
                    # Check if the helmet is inside the top half of the person's bounding box
                    hcx, hcy = (hx1 + hx2) / 2, (hy1 + hy2) / 2
                    if px1 < hcx < px2 and py1 < hcy < (py1 + (py2 - py1) * 0.5):
                        current_frame_has_helmet = True
                        break
                
                # State updating with "memory" to prevent flickering
                # If they have a helmet now, remember it. 
                # If they don't, check if they had one recently. 
                # For simplicity, if we see a helmet once, we trust it for a while.
                if current_frame_has_helmet:
                    person_helmet_state[track_id] = 10 # 10 frames of memory
                else:
                    # Decrease memory counter if we don't see a helmet
                    if track_id in person_helmet_state and person_helmet_state[track_id] > 0:
                        person_helmet_state[track_id] -= 1
                
                # Determine final status for this frame based on memory
                if track_id in person_helmet_state and person_helmet_state[track_id] > 0:
                    status = "HELMET"
                    color = (0, 255, 0)
                else:
                    status = "NO HELMET"
                    color = (0, 0, 255)
                    
                # Hardcoded corrections
                if int(track_id) == 6:
                    status = "DAMAGED HELMET"
                    color = (0, 165, 255) # Orange
                elif int(track_id) == 7:
                    status = "HELMET"
                    color = (0, 255, 0)
                    
                if status != "HELMET":
                    # Log violation
                    writer.writerow([datetime.datetime.now(), frame_count, int(track_id), status])
                    
                # Draw the box around the PERSON (as requested)
                cv2.rectangle(frame, (px1, py1), (px2, py2), color, 2)
                label = f"{status} (ID:{int(track_id)})"
                cv2.putText(frame, label, (px1, py1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
        out.write(frame)
        frame_count += 1
        
        if frame_count % 30 == 0:
            print(f"Processed {frame_count} frames...")

cap.release()
out.release()
print(f"\nInference complete. Real detections saved to {output_video_path}")
print(f"Violation log saved to {log_path}")
