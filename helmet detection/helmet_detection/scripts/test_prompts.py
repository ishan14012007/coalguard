import cv2
import os
from ultralytics import YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")

model = YOLOWorld("yolov8s-worldv2.pt")
classes_list = [
    ["person wearing good helmet", "person wearing damaged helmet", "person with bare head"],
    ["person with intact hard hat", "person with broken hard hat", "person without hard hat"],
]

cap = cv2.VideoCapture(video_path)
ret, frame = cap.read()
cap.release()

if ret:
    print("Testing different prompt combinations on first frame...")
    for classes in classes_list:
        print(f"\n--- Testing classes: {classes} ---")
        model.set_classes(classes)
        results = model(frame, verbose=False)
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                if conf > 0.1:
                    cls_name = classes[int(box.cls[0])]
                    print(f"Detected: {cls_name} -> Confidence: {conf:.2f}")
else:
    print("Could not read frame")
