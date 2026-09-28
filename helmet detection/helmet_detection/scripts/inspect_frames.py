from ultralytics import YOLOWorld
import os
import glob

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
image_dir = os.path.join(base_dir, "helmet_detection", "dataset", "images", "raw")
images = glob.glob(os.path.join(image_dir, "*.jpg"))

print(f"Inspecting {len(images)} extracted frames using YOLO-World zero-shot detection...")

# Initialize YOLO-World
model = YOLOWorld("yolov8s-worldv2.pt")
classes = ["person wearing construction helmet", "person wearing damaged construction helmet", "person wearing no helmet"]
model.set_classes(classes)

results_summary = {cls: 0 for cls in classes}

for img in images:
    # Run inference
    results = model(img, verbose=False)
    for r in results:
        boxes = r.boxes
        for box in boxes:
            conf = float(box.conf[0])
            if conf > 0.1: # Low threshold just to see what it picks up
                cls_id = int(box.cls[0])
                results_summary[classes[cls_id]] += 1

print("\n--- Visual Inspection Report ---")
for cls, count in results_summary.items():
    print(f"{cls}: {count} detections")

if results_summary["person wearing damaged construction helmet"] == 0:
    print("WARNING: No damaged helmets detected in the extracted frames.")
