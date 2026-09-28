# Helmet Detection AI Model

This project implements an AI-based computer vision model to detect construction helmets and classify their condition (Good, Damaged, or No Helmet).

## Project Structure
```
helmet_detection/
├── dataset/
│   ├── images/
│   ├── labels/
│   └── data.yaml
├── models/               # Trained models are saved here
├── training/             # Training scripts
├── inference/            # Inference scripts
├── output/               # Output video and CSV logs
├── scripts/              # Dataset preparation scripts
├── requirements.txt      # Python dependencies
└── README.md
```

## Setup
1. Create a Python environment (Python 3.8+ recommended).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Dataset Preparation
The system processes raw video to generate a dataset:
1. **Frame Extraction**: Run `python scripts/1_extract_frames.py` to extract frames from the source video at 1 FPS.
2. **Annotation**: Run `python scripts/2_auto_annotate.py`. *Note: For true production use, you must manually annotate the `damaged_helmet` and `no_helmet` classes using a tool like LabelImg, as the auto-annotator currently simulates bounding boxes for the 'good_helmet' class.*
3. **Dataset Split**: Run `python scripts/3_split_dataset.py` to create train/val/test splits and the `data.yaml` config file.

## Training
Train the YOLOv8 model using the generated dataset:
```bash
python training/train_yolo.py
```
This script uses the `ultralytics` package to train the model, automatically applying augmentations like horizontal flip, scaling, and brightness variations. Metrics (Precision, Recall, F1, mAP) and confusion matrices are generated in the `models/helmet_detection_v1/weights/` directory.

## Inference
Run the trained model on the source video:
```bash
python inference/run_inference.py
```
This script processes `Video Project 2 (1).mp4` frame-by-frame and:
- Draws bounding boxes around detected persons.
- Classifies helmet status (Good, Damaged, No Helmet).
- Displays the confidence score.
- Overlays PPE compliance status on the video.
- Saves the processed video to `output/helmet_detection_result.mp4`.
- Logs all PPE violations (Damaged/No Helmet) with timestamps to `output/violation_log.csv`.

## Adding More Training Data
To add more data:
1. Place new images in `dataset/images/raw`.
2. Annotate them using a tool like LabelImg (save in YOLO format to `dataset/labels/raw`).
3. Re-run `python scripts/3_split_dataset.py` to integrate the new data.
4. Re-run `python training/train_yolo.py`.

## Limitations
- **Data Dependency**: The model's ability to detect damaged helmets depends entirely on having sufficient manually annotated examples in the training dataset.
- **Auto-Annotation**: The provided auto-annotation script uses a generic person detector as a placeholder to generate a synthetic dataset structure. It does not replace manual review.
