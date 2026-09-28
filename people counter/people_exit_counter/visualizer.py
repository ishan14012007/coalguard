"""
visualizer.py -- All OpenCV drawing helpers for the people occupancy counter.
"""

from __future__ import annotations

import cv2
import numpy as np

import config


def draw_virtual_line(frame: np.ndarray, line_position: int) -> None:
    """Draw the virtual gate line across the full frame."""
    h, w = frame.shape[:2]

    if config.LINE_AXIS == "horizontal":
        pt1 = (0, line_position)
        pt2 = (w, line_position)
    else:
        pt1 = (line_position, 0)
        pt2 = (line_position, h)

    cv2.line(frame, pt1, pt2, config.LINE_COLOR, config.LINE_THICKNESS)

    # Label the line
    label = "GATE LINE"
    font = cv2.FONT_HERSHEY_SIMPLEX
    fs = 0.55
    thickness = 2
    (tw, th), _ = cv2.getTextSize(label, font, fs, thickness)

    if config.LINE_AXIS == "horizontal":
        tx = max(w - tw - 10, 5)
        ty = line_position - 8
    else:
        tx = line_position + 8
        ty = th + 5

    # Drop-shadow for readability
    cv2.putText(frame, label, (tx + 1, ty + 1), font, fs, (0, 0, 0), thickness + 1, cv2.LINE_AA)
    cv2.putText(frame, label, (tx, ty), font, fs, config.LINE_COLOR, thickness, cv2.LINE_AA)


# Keep the old function name as an alias for any external callers.
def draw_exit_line(frame: np.ndarray, line_position: int) -> None:
    """Backward-compat alias for draw_virtual_line."""
    draw_virtual_line(frame, line_position)


def draw_person_box(
    frame: np.ndarray,
    x1: int, y1: int, x2: int, y2: int,
    tracker_id: int,
    is_inside: bool,
) -> None:
    """Draw a bounding box (and optional tracker ID) around a detected person."""
    if not config.SHOW_BOXES:
        return

    color = config.INSIDE_BOX_COLOR if is_inside else config.BOX_COLOR
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

    if config.SHOW_TRACKER_IDS:
        label = f"#{tracker_id}"
        font = cv2.FONT_HERSHEY_SIMPLEX
        fs = 0.5
        (tw, th), _ = cv2.getTextSize(label, font, fs, 1)
        bg_tl = (x1, y1 - th - 6)
        bg_br = (x1 + tw + 4, y1)
        cv2.rectangle(frame, bg_tl, bg_br, color, -1)
        cv2.putText(frame, label, (x1 + 2, y1 - 4), font, fs, (0, 0, 0), 1, cv2.LINE_AA)


def draw_counter(frame: np.ndarray, count: int) -> None:
    """Draw the prominent occupancy count banner at the top of the frame."""
    h, w = frame.shape[:2]

    text = f"CURRENT PEOPLE INSIDE: {count}"
    font = cv2.FONT_HERSHEY_SIMPLEX
    fs = config.COUNTER_FONT_SCALE
    thickness = 3

    (tw, th), _ = cv2.getTextSize(text, font, fs, thickness)

    # Semi-transparent dark background pill
    pad_x, pad_y = 18, 10
    bg_x1, bg_y1 = 12, 12
    bg_x2, bg_y2 = bg_x1 + tw + pad_x * 2, bg_y1 + th + pad_y * 2

    overlay = frame.copy()
    cv2.rectangle(overlay, (bg_x1, bg_y1), (bg_x2, bg_y2), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    # Border
    cv2.rectangle(frame, (bg_x1, bg_y1), (bg_x2, bg_y2), (0, 200, 255), 2)

    tx = bg_x1 + pad_x
    ty = bg_y1 + pad_y + th

    # Drop-shadow
    cv2.putText(frame, text, (tx + 2, ty + 2), font, fs, (0, 0, 0), thickness + 2, cv2.LINE_AA)
    # Main text (bright cyan-yellow)
    cv2.putText(frame, text, (tx, ty), font, fs, (0, 230, 255), thickness, cv2.LINE_AA)


def draw_event_flash(frame: np.ndarray, event: str) -> None:
    """
    Draw a temporary event label (``"ENTRY +1"`` or ``"EXIT -1"``) in the
    upper-right corner of the frame.

    Parameters
    ----------
    frame : np.ndarray
        The frame to draw on (modified in place).
    event : str
        ``"entry"`` or ``"exit"``.
    """
    if event not in ("entry", "exit"):
        return

    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX

    if event == "entry":
        label = "ENTRY  +1"
        text_color = (0, 255, 100)    # bright green
        border_color = (0, 200, 80)
    else:
        label = "EXIT  -1"
        text_color = (0, 100, 255)    # orange-red
        border_color = (0, 80, 200)

    fs = 0.85
    thickness = 2
    (tw, th), baseline = cv2.getTextSize(label, font, fs, thickness)

    pad_x, pad_y = 14, 8
    bg_x2 = w - 12
    bg_x1 = bg_x2 - tw - pad_x * 2
    bg_y1 = 12
    bg_y2 = bg_y1 + th + pad_y * 2 + baseline

    # Semi-transparent dark background
    overlay = frame.copy()
    cv2.rectangle(overlay, (bg_x1, bg_y1), (bg_x2, bg_y2), (10, 10, 10), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Coloured border
    cv2.rectangle(frame, (bg_x1, bg_y1), (bg_x2, bg_y2), border_color, 2)

    tx = bg_x1 + pad_x
    ty = bg_y1 + pad_y + th

    # Drop-shadow + main text
    cv2.putText(frame, label, (tx + 1, ty + 1), font, fs, (0, 0, 0), thickness + 1, cv2.LINE_AA)
    cv2.putText(frame, label, (tx, ty), font, fs, text_color, thickness, cv2.LINE_AA)


def draw_direction_hint(frame: np.ndarray) -> None:
    """Draw a small label showing which side is INSIDE and which is OUTSIDE."""
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX

    inside_dir = getattr(config, "INSIDE_DIRECTION", config.EXIT_DIRECTION)

    # Map INSIDE_DIRECTION to a short label for each side of the line.
    side_labels = {
        "down":  ("OUTSIDE ^", "INSIDE v"),   # top = outside, bottom = inside
        "up":    ("INSIDE ^",  "OUTSIDE v"),  # top = inside,  bottom = outside
        "right": ("OUTSIDE <-", "INSIDE ->"),
        "left":  ("INSIDE <-",  "OUTSIDE ->"),
    }
    top_label, bot_label = side_labels.get(inside_dir, ("OUTSIDE", "INSIDE"))

    fs = 0.45
    color = (200, 200, 200)  # light grey

    if config.LINE_AXIS == "horizontal":
        # Put labels above and below the line
        lp = getattr(config, "LINE_POSITION", h // 2) or h // 2
        cv2.putText(frame, top_label, (8, max(lp - 14, 12)),
                    font, fs, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, top_label, (8, max(lp - 14, 12)),
                    font, fs, color, 1, cv2.LINE_AA)
        cv2.putText(frame, bot_label, (8, min(lp + 22, h - 6)),
                    font, fs, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, bot_label, (8, min(lp + 22, h - 6)),
                    font, fs, color, 1, cv2.LINE_AA)
    else:
        lp = getattr(config, "LINE_POSITION", w // 2) or w // 2
        cv2.putText(frame, top_label, (max(lp - 80, 4), 22),
                    font, fs, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, top_label, (max(lp - 80, 4), 22),
                    font, fs, color, 1, cv2.LINE_AA)
        cv2.putText(frame, bot_label, (min(lp + 8, w - 90), 22),
                    font, fs, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, bot_label, (min(lp + 8, w - 90), 22),
                    font, fs, color, 1, cv2.LINE_AA)
