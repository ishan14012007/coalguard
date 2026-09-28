import cv2
import os
from ultralytics import YOLO, YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")
output_video_path = os.path.join(base_dir, "helmet_detection", "output", "test_tracking.mp4")

print("Initializing models...")
tracker_model = YOLO("yolov8n.pt")
helmet_model = YOLOWorld("yolov8s-worldv2.pt")
helmet_model.set_classes(["hard hat"])

cap = cv2.VideoCapture(video_path)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))

print("Processing video frames...")
frame_count = 0
while cap.isOpened() and frame_count < 60: # Test on 60 frames
    ret, frame = cap.read()
    if not ret:
        break
        
    # Track people
    track_results = tracker_model.track(frame, persist=True, classes=[0], verbose=False)
    
    # Detect helmets
    helmet_results = helmet_model(frame, verbose=False)
    helmets = []
    for r in helmet_results:
        for box in r.boxes:
            if float(box.conf[0]) > 0.15:
                helmets.append(box.xyxy[0].tolist())
                
    # Match helmets to people
    for r in track_results:
        if r.boxes.id is None:
            continue
        boxes = r.boxes.xyxy.tolist()
        ids = r.boxes.id.tolist()
        
        for box, track_id in zip(boxes, ids):
            px1, py1, px2, py2 = map(int, box)
            
            has_helmet = False
            for hx1, hy1, hx2, hy2 in helmets:
                # Check if helmet center is inside person's upper half
                hcx, hcy = (hx1 + hx2) / 2, (hy1 + hy2) / 2
                if px1 < hcx < px2 and py1 < hcy < (py1 + (py2 - py1) * 0.5):
                    has_helmet = True
                    break
                    
            if has_helmet:
                color = (0, 255, 0)
                label = f"HELMET id:{int(track_id)}"
            else:
                color = (0, 0, 255)
                label = f"NO HELMET id:{int(track_id)}"
                
            cv2.rectangle(frame, (px1, py1), (px2, py2), color, 2)
            cv2.putText(frame, label, (px1, py1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
    out.write(frame)
    frame_count += 1
    
cap.release()
out.release()
print("Test complete.")
