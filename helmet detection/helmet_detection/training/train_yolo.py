from ultralytics import YOLO
import os

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
data_yaml = os.path.join(base_dir, "helmet_detection", "dataset", "data.yaml")
project_dir = os.path.join(base_dir, "helmet_detection", "models")

# Load a model
model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

# Train the model
# We train for a small number of epochs just for demonstration since this is a synthetic dataset.
results = model.train(data=data_yaml, epochs=5, imgsz=640, project=project_dir, name='helmet_detection_v1')

print("Training complete. Model saved in", project_dir)
