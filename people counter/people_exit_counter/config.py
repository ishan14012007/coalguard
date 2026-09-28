# =============================================================================
# config.py — Configuration for People Occupancy Counter
# =============================================================================

# ---------------------------------------------------------------------------
# VIDEO SOURCE
# ---------------------------------------------------------------------------
# Path to input video file.
# Set to 0 to use a webcam instead.
VIDEO_SOURCE = "videos/test.mp4"

# Path to save the processed output video.
# Set to None or "" to disable saving.
OUTPUT_VIDEO = "output/occupancy_counted.mp4"

# ---------------------------------------------------------------------------
# YOLO MODEL
# ---------------------------------------------------------------------------
# Pretrained model to use. Options (download automatically on first run):
#   "yolov8n.pt"  — nano, fastest, least accurate
#   "yolov8s.pt"  — small
#   "yolov8m.pt"  — medium (good balance)
#   "yolov8l.pt"  — large
#   "yolov8x.pt"  — extra-large, slowest, most accurate
YOLO_MODEL = "yolov8n.pt"

# Minimum confidence threshold for a person detection (0.0 – 1.0)
CONFIDENCE_THRESHOLD = 0.4

# ---------------------------------------------------------------------------
# VIRTUAL EXIT LINE
# ---------------------------------------------------------------------------
# LINE_AXIS: which axis the line runs along
#   "horizontal"  → line drawn left-to-right at a fixed Y coordinate
#                   People moving TOP → BOTTOM cross the line downward
#   "vertical"    → line drawn top-to-bottom at a fixed X coordinate
#                   People moving LEFT → RIGHT cross the line rightward
LINE_AXIS = "horizontal"

# Pixel coordinate of the line on its axis.
#   For "horizontal": Y pixel position (e.g. 400 means 400 px from the top)
#   For "vertical"  : X pixel position (e.g. 640 means 640 px from the left)
#
# TIP: Set to None to auto-place the line at the middle of the frame.
LINE_POSITION = 350    # people start near Y=380, cross upward through Y=350

# ---------------------------------------------------------------------------
# INSIDE DIRECTION (replaces EXIT_DIRECTION)
# ---------------------------------------------------------------------------
# Defines which movement direction a person travels TO ENTER the space.
# The opposite direction is therefore the exit direction.
#
# For LINE_AXIS = "horizontal":
#   "down" → person moves TOP → BOTTOM to enter   (INSIDE is below the line)
#   "up"   → person moves BOTTOM → TOP to enter   (INSIDE is above the line) [this video]
#
# For LINE_AXIS = "vertical":
#   "right" → person moves LEFT → RIGHT to enter  (INSIDE is right of line)
#   "left"  → person moves RIGHT → LEFT to enter  (INSIDE is left of line)
INSIDE_DIRECTION = "up"

# Keep EXIT_DIRECTION as an alias so old scripts that import it don't break.
EXIT_DIRECTION = INSIDE_DIRECTION

# ---------------------------------------------------------------------------
# TRACKER SETTINGS
# ---------------------------------------------------------------------------
# ByteTrack configuration (passed to Ultralytics tracker).
# Decrease TRACK_BUFFER to forget lost tracks faster.
TRACK_BUFFER = 30          # frames to keep a lost track alive
MIN_BOX_AREA = 500         # minimum bounding-box area in px² to consider

# Half-width (px) of the dead-zone around the virtual line.
# While a person's reference point is within this band their last confirmed
# side is preserved — prevents jitter double-counts near the line.
CROSSING_BUFFER = 15

# ---------------------------------------------------------------------------
# DISPLAY SETTINGS
# ---------------------------------------------------------------------------
# Show the live video window while processing.
SHOW_WINDOW = True

# Show bounding boxes around detected people.
SHOW_BOXES = True

# Show the individual numeric tracker ID on each person's box.
# Disabled by default — the main output is just the exit count.
SHOW_TRACKER_IDS = False

# Thickness (px) of the virtual exit line drawn on the video.
LINE_THICKNESS = 3

# Colour of the virtual exit line: (Blue, Green, Red) in OpenCV BGR.
LINE_COLOR = (0, 0, 255)          # Red

# Colour of the bounding boxes drawn around detected people.
BOX_COLOR = (0, 255, 0)           # Green

# Colour of boxes for people confirmed to be INSIDE (have crossed the line).
INSIDE_BOX_COLOR = (0, 200, 255)  # Cyan

# Kept for backward compat — maps to INSIDE_BOX_COLOR.
COUNTED_BOX_COLOR = INSIDE_BOX_COLOR

# Font scale for the main "CURRENT PEOPLE INSIDE" overlay text.
COUNTER_FONT_SCALE = 1.2

# ---------------------------------------------------------------------------
# PERFORMANCE
# ---------------------------------------------------------------------------
# Resize the frame before processing to speed up inference.
# Set to None to use the original frame size.
# Example: (640, 480) or (1280, 720)
PROCESS_RESOLUTION = None
