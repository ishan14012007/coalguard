import os
import glob
from ultralytics import YOLOWorld

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
image_dir = os.path.join(base_dir, "helmet_detection", "dataset", "images", "raw")
label_dir = os.path.join(base_dir, "helmet_detection", "dataset", "labels", "raw")

print("Initializing YOLO-World for dataset auto-annotation...")
model = YOLOWorld("yolov8s-worldv2.pt") 
classes = ["person wearing good construction helmet", "person wearing damaged construction helmet", "person with no construction helmet"]
model.set_classes(classes)

images = glob.glob(os.path.join(image_dir, "*.jpg"))
stats = {0: 0, 1: 0, 2: 0}

CONFIDENCE_THRESHOLD = 0.05

for img_path in images:
    results = model(img_path, verbose=False)
    img_name = os.path.basename(img_path)
    label_name = img_name.replace(".jpg", ".txt")
    label_path = os.path.join(label_dir, label_name)
    
    with open(label_path, "w") as f:
        for r in results:
            boxes = r.boxes
            for box in boxes:
                conf = float(box.conf[0])
                if conf > CONFIDENCE_THRESHOLD:
                    cls = int(box.cls[0])
                    stats[cls] += 1
                    x, y, w, h = box.xywhn[0].tolist()
                    f.write(f"{cls} {x} {y} {w} {h}\n")

print(f"\nGenerated annotations for {len(images)} images based on actual YOLO-World detections.")
print(f"Class 0 (Good Helmet) occurrences: {stats[0]}")
print(f"Class 1 (Damaged Helmet) occurrences: {stats[1]}")
print(f"Class 2 (No Helmet) occurrences: {stats[2]}")

if stats[1] == 0:
    print("\nWARNING: No damaged helmets were detected in the extracted frames.")
    print("If you train a model on this dataset, it will NOT learn to detect damaged helmets.")
    print("Please provide frames containing damaged helmets to ensure the custom model learns this class.")
