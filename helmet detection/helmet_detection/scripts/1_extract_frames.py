import cv2
import os

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
video_path = os.path.join(base_dir, "Video Project 2 (1).mp4")
output_dir = os.path.join(base_dir, "helmet_detection", "dataset", "images", "raw")

# Create directories
os.makedirs(output_dir, exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "dataset", "labels", "raw"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "models"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "training"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "inference"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "output"), exist_ok=True)
os.makedirs(os.path.join(base_dir, "helmet_detection", "scripts"), exist_ok=True)

cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"Error opening video file {video_path}")
    exit(1)

fps = cap.get(cv2.CAP_PROP_FPS)
interval = int(fps) # 1 frame per second

count = 0
frame_id = 0
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    if count % interval == 0:
        cv2.imwrite(os.path.join(output_dir, f"frame_{frame_id:04d}.jpg"), frame)
        frame_id += 1
    count += 1

cap.release()
print(f"Extracted {frame_id} frames.")
