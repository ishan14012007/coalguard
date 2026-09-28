# People Exit Counter

**AI-based people counting at an exit gate using YOLO + ByteTrack**

---

## What it does

This project counts **how many unique people cross a virtual exit line** in the
configured direction. The final output is simply:

```
PEOPLE EXITED: 25
```

It does **not** identify, name, or store any personal data. Tracking IDs are
used internally only to prevent double-counting — they are not the output.

---

## Project Structure

```
people_exit_counter/
│
├── main.py           ← Entry point — run this
├── config.py         ← All settings (line position, direction, model, …)
├── tracker.py        ← Cross-line counting logic
├── visualizer.py     ← OpenCV drawing helpers
├── requirements.txt
├── README.md
│
├── videos/
│   └── test.mp4      ← Put your video here
│
└── output/           ← Processed video saved here automatically
```

---

## Quick Start

### 1 — Install dependencies

It is recommended to use a virtual environment:

```bash
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

Then install the packages:

```bash
pip install -r requirements.txt
```

> **Note**: `ultralytics` will automatically download PyTorch and ByteTrack on
> first install. The YOLO model weights (`yolov8n.pt` by default) are
> downloaded automatically the first time you run the script.

---

### 2 — Add your video

Copy your video file to:

```
videos/test.mp4
```

Any common format works (`.mp4`, `.avi`, `.mov`, `.mkv`).

---

### 3 — Run

```bash
python main.py
```

That's it. The processed video with the exit count overlay is saved to
`output/exit_counted.mp4`.

#### Other run modes

```bash
# Use a different video file
python main.py --source path/to/your/video.mp4

# Use your webcam (index 0)
python main.py --source 0

# Headless mode — no window, just save the output file
python main.py --no-window
```

Press **Q** in the video window to stop early.

---

## Configuring the Virtual Exit Line

Open `config.py` and change these settings:

### Line position

```python
# Set to a specific pixel coordinate:
LINE_POSITION = 400    # Y pixel (for horizontal line)
LINE_POSITION = 640    # X pixel (for vertical line)

# OR let the system auto-centre the line:
LINE_POSITION = None   # places the line at the middle of the frame
```

### Line orientation

```python
LINE_AXIS = "horizontal"   # line runs left ↔ right (crosses vertical motion)
LINE_AXIS = "vertical"     # line runs top ↕ bottom  (crosses horizontal motion)
```

### Exit direction

```python
# For a HORIZONTAL line:
EXIT_DIRECTION = "down"    # person moves top → bottom = EXIT  (default)
EXIT_DIRECTION = "up"      # person moves bottom → top = EXIT

# For a VERTICAL line:
EXIT_DIRECTION = "right"   # person moves left → right = EXIT  (default)
EXIT_DIRECTION = "left"    # person moves right → left = EXIT
```

---

## Changing the YOLO Model

```python
YOLO_MODEL = "yolov8n.pt"   # nano   — fastest, less accurate
YOLO_MODEL = "yolov8s.pt"   # small
YOLO_MODEL = "yolov8m.pt"   # medium — good balance  ← recommended
YOLO_MODEL = "yolov8l.pt"   # large
YOLO_MODEL = "yolov8x.pt"   # extra large — most accurate, slowest
```

Models are downloaded automatically on first use.

---

## Pipeline Overview

```
Video frame
    │
    ▼
YOLO Detection (person class only)
    │
    ▼
ByteTrack — assigns stable tracker IDs
    │
    ▼
For each tracked person:
    compute foot position (bottom-centre of bounding box)
    determine which side of the virtual line they are on
    │
    ▼
Did they cross from INSIDE → OUTSIDE?
    YES → EXIT COUNT += 1  (only once per tracker ID)
    NO  → ignore
    │
    ▼
Draw: bounding boxes + exit line + "PEOPLE EXITED: N" overlay
    │
    ▼
Display window + save output video
```

---

## How Double-Counting is Prevented

Each person is assigned a stable tracker ID by ByteTrack. The system records
the last known side of the line for every tracker ID. A crossing is only
counted once — the first time a tracker transitions from **inside** to
**outside**. If the same person loiters near the line for 100 frames, the
count increases by **exactly 1**.

---

## Display Colours

| Element              | Colour        |
|----------------------|---------------|
| Virtual exit line    | Red           |
| Detected person box  | Green         |
| Already-counted box  | Orange        |
| Exit counter banner  | Cyan-yellow   |

---

## Requirements

| Package        | Purpose                                |
|----------------|----------------------------------------|
| `ultralytics`  | YOLO model + ByteTrack integration     |
| `opencv-python`| Video I/O and drawing                  |
| `numpy`        | Array operations                       |

Python 3.8+ required.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot open video source` | Check that `videos/test.mp4` exists |
| Very low/high count | Adjust `LINE_POSITION` and `EXIT_DIRECTION` in config.py |
| People counted multiple times | Ensure `CONFIDENCE_THRESHOLD` is not too low (try 0.5) |
| People not detected | Use a larger model (`yolov8m.pt`) or lower `CONFIDENCE_THRESHOLD` |
| Slow performance | Use `yolov8n.pt` and/or set `PROCESS_RESOLUTION = (640, 480)` |
| CUDA/GPU not used | Install the GPU version of PyTorch: https://pytorch.org |
