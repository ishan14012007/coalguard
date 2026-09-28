"""
main.py — Entry point for the AI-based people occupancy counter.

Pipeline:
  Video → YOLO person detection → ByteTrack → Virtual gate line →
  Direction check → Occupancy count → Display "CURRENT PEOPLE INSIDE"

Usage:
  python main.py
  python main.py --source videos/test.mp4
  python main.py --source 0            # webcam
  python main.py --no-window           # headless (saves output only)
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Validate that ultralytics is available before doing anything else
# ---------------------------------------------------------------------------
try:
    from ultralytics import YOLO
except ImportError:
    print(
        "\n[ERROR] ultralytics is not installed.\n"
        "Run:  pip install ultralytics\n"
    )
    sys.exit(1)

import config
from tracker import OccupancyCounter
from visualizer import (
    draw_counter,
    draw_direction_hint,
    draw_event_flash,
    draw_virtual_line,
    draw_person_box,
)

# COCO class index for 'person'
PERSON_CLASS_ID = 0

# How long (seconds of real time) the ENTRY/EXIT flash remains on screen.
EVENT_FLASH_DURATION = 1.5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_line_position(cap: cv2.VideoCapture) -> int:
    """Return the configured line position, auto-centring if needed."""
    if config.LINE_POSITION is not None:
        return int(config.LINE_POSITION)

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if config.LINE_AXIS == "horizontal":
        return h // 2
    return w // 2


def open_video(source) -> cv2.VideoCapture:
    """Open a video source and raise a clear error if it fails."""
    # If the source looks like a digit string, treat it as a camera index
    if isinstance(source, str) and source.isdigit():
        source = int(source)

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"\n[ERROR] Cannot open video source: {source}")
        if isinstance(source, str):
            p = Path(source)
            if not p.exists():
                print(f"       File does not exist: {p.resolve()}")
            else:
                print("       File exists but could not be opened (codec issue?).")
        sys.exit(1)
    return cap


def make_video_writer(
    cap: cv2.VideoCapture, output_path: str
) -> cv2.VideoWriter | None:
    """Create a VideoWriter that matches the input video properties."""
    if not output_path:
        return None

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(out_path), fourcc, fps, (w, h))
    if not writer.isOpened():
        print(f"[WARNING] Could not create output video writer at {out_path}.")
        return None

    print(f"[INFO] Saving processed video to: {out_path.resolve()}")
    return writer


def resize_if_needed(frame: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Resize the frame to PROCESS_RESOLUTION if configured.
    Returns (resized_frame, scale_factor).
    scale_factor == 1.0 means no resize was applied.
    """
    if config.PROCESS_RESOLUTION is None:
        return frame, 1.0

    target_w, target_h = config.PROCESS_RESOLUTION
    orig_h, orig_w = frame.shape[:2]
    scale = min(target_w / orig_w, target_h / orig_h)
    if abs(scale - 1.0) < 0.01:
        return frame, 1.0

    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    return cv2.resize(frame, (new_w, new_h)), scale


# ---------------------------------------------------------------------------
# Main processing loop
# ---------------------------------------------------------------------------

def run(source=None, show_window: bool | None = None) -> int:
    """
    Run the people occupancy counter.

    Parameters
    ----------
    source :
        Override config.VIDEO_SOURCE. Pass None to use the config value.
    show_window :
        Override config.SHOW_WINDOW. Pass None to use the config value.

    Returns
    -------
    int
        Final occupancy count (people currently inside).
    """
    src = source if source is not None else config.VIDEO_SOURCE
    show = show_window if show_window is not None else config.SHOW_WINDOW

    # Resolve INSIDE_DIRECTION (supports both old and new config key names).
    inside_dir = getattr(config, "INSIDE_DIRECTION", config.EXIT_DIRECTION)

    print(f"\n{'='*60}")
    print("  PEOPLE OCCUPANCY COUNTER — current people inside the space")
    print(f"{'='*60}")
    print(f"  Source          : {src}")
    print(f"  Model           : {config.YOLO_MODEL}")
    print(f"  Line axis       : {config.LINE_AXIS}")
    print(f"  Inside direction: {inside_dir}")
    print(f"  Line position   : {config.LINE_POSITION or 'auto (centre)'}")
    print(f"  Crossing buffer : {getattr(config, 'CROSSING_BUFFER', 15)} px")
    print(f"{'='*60}\n")

    # --- Load YOLO model (downloads automatically if not cached) ----------
    print(f"[INFO] Loading model: {config.YOLO_MODEL} ...")
    model = YOLO(config.YOLO_MODEL)

    # --- Open video source -------------------------------------------------
    cap = open_video(src)

    # Resolve line position now that we know the frame dimensions
    line_pos = resolve_line_position(cap)
    print(f"[INFO] Virtual gate line position: {line_pos} px ({config.LINE_AXIS})")

    # --- Set up counter and writer ----------------------------------------
    counter = OccupancyCounter(
        line_position=line_pos,
        line_axis=config.LINE_AXIS,
        inside_direction=inside_dir,
        crossing_buffer=getattr(config, "CROSSING_BUFFER", 15),
    )

    writer = make_video_writer(cap, config.OUTPUT_VIDEO)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_src = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_idx = 0
    t_start = time.time()

    # Event flash state: (event_type, wall_clock_expiry_time)
    last_event: str | None = None
    event_expiry: float = 0.0

    print("[INFO] Processing … (press Q in the window to quit early)\n")

    # --- Main loop ---------------------------------------------------------
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        # Optional downscale for faster inference
        proc_frame, scale = resize_if_needed(frame)

        # --- YOLO tracking (ByteTrack built-in) ---------------------------
        # classes=[0] restricts to 'person' only, no other COCO classes.
        results = model.track(
            proc_frame,
            persist=True,
            classes=[PERSON_CLASS_ID],
            conf=config.CONFIDENCE_THRESHOLD,
            tracker="bytetrack.yaml",
            verbose=False,
        )

        result = results[0]

        display_frame = frame  # always use original resolution for display

        # If no boxes detected, just draw overlay and continue
        if result.boxes is None or len(result.boxes) == 0:
            draw_virtual_line(display_frame, line_pos)
            draw_counter(display_frame, counter.count)
            draw_direction_hint(display_frame)
        else:
            boxes = result.boxes
            # boxes.xyxy  : (N, 4) tensor — x1,y1,x2,y2 in proc_frame coords
            # boxes.id    : (N, 1) tensor — tracker IDs  (may be None)
            # boxes.conf  : (N,)   tensor — confidence scores

            xyxy = boxes.xyxy.cpu().numpy()
            ids = boxes.id  # may be None if tracking failed this frame
            confs = boxes.conf.cpu().numpy()

            for i, (x1, y1, x2, y2) in enumerate(xyxy):
                # Scale back to original frame coordinates if we downscaled
                if scale != 1.0:
                    x1, y1, x2, y2 = x1 / scale, y1 / scale, x2 / scale, y2 / scale

                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                # Compute centre-bottom of the bounding box as the reference
                # point.  The feet position is more reliable than the body
                # centre for line-crossing decisions.
                cx = (x1 + x2) // 2
                cy = y2   # bottom of bounding box (feet)

                # Filter tiny/noise detections
                area = (x2 - x1) * (y2 - y1)
                if area < config.MIN_BOX_AREA:
                    continue

                if ids is not None:
                    tid = int(ids[i].item())
                else:
                    # If tracker lost IDs, skip this frame's counting but
                    # still draw the box with a placeholder ID of -1.
                    tid = -1

                event: str | None = None
                if tid != -1:
                    event = counter.update(tid, cx, cy)

                # Record the most recent crossing event for the flash overlay.
                if event is not None:
                    last_event = event
                    event_expiry = time.time() + EVENT_FLASH_DURATION
                    direction = "OUTSIDE→INSIDE" if event == "entry" else "INSIDE→OUTSIDE"
                    print(
                        f"  [Frame {frame_idx:>6}]  {direction}  "
                        f"(ID={tid})  → occupancy = {counter.count}"
                    )

                is_inside = counter.is_inside(tid) if tid != -1 else False
                draw_person_box(display_frame, x1, y1, x2, y2, tid, is_inside)

            draw_virtual_line(display_frame, line_pos)
            draw_counter(display_frame, counter.count)
            draw_direction_hint(display_frame)

        # --- Event flash overlay ------------------------------------------
        if last_event is not None and time.time() < event_expiry:
            draw_event_flash(display_frame, last_event)

        # --- Write to output file -----------------------------------------
        if writer is not None:
            writer.write(display_frame)

        # --- Show window --------------------------------------------------
        if show:
            cv2.imshow("People Occupancy Counter  [Q to quit]", display_frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q") or key == ord("Q"):
                print("\n[INFO] User pressed Q — stopping early.")
                break

        # --- Progress log (every ~5 seconds of source video) -------------
        if total_frames > 0 and frame_idx % max(1, int(fps_src * 5)) == 0:
            pct = 100.0 * frame_idx / total_frames
            elapsed = time.time() - t_start
            print(
                f"  Frame {frame_idx:>6}/{total_frames}  ({pct:5.1f}%)  "
                f"Inside: {counter.count}  Elapsed: {elapsed:.1f}s"
            )

    # --- Cleanup ----------------------------------------------------------
    cap.release()
    if writer is not None:
        writer.release()
    if show:
        cv2.destroyAllWindows()

    elapsed_total = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"  FINAL RESULT")
    print(f"{'='*60}")
    print(f"  CURRENT PEOPLE INSIDE: {counter.count}")
    print(f"{'='*60}")
    print(f"  Total frames processed : {frame_idx}")
    print(f"  Processing time        : {elapsed_total:.1f}s")
    if elapsed_total > 0:
        print(f"  Average throughput     : {frame_idx / elapsed_total:.1f} fps")
    if writer is not None:
        print(f"  Output video saved to  : {Path(config.OUTPUT_VIDEO).resolve()}")
    print()

    return counter.count


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args():
    parser = argparse.ArgumentParser(
        description="AI-based people occupancy counter using YOLO + ByteTrack"
    )
    parser.add_argument(
        "--source",
        default=None,
        help="Path to video file or camera index (overrides config.py VIDEO_SOURCE)",
    )
    parser.add_argument(
        "--no-window",
        action="store_true",
        help="Disable the live display window (headless mode)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    show = False if args.no_window else None  # None → use config
    run(source=args.source, show_window=show)
