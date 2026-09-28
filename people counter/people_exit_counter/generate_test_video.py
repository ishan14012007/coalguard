"""
generate_test_video.py
Creates a synthetic test video with animated rectangles that walk across
the exit line — so you can test the counter without a real video.

Run: python generate_test_video.py
"""

import cv2
import numpy as np
import random
import os

OUTPUT = "videos/test.mp4"
WIDTH, HEIGHT = 960, 540
FPS = 25
DURATION_SEC = 20          # 20 second video
LINE_Y = HEIGHT // 2       # exit line at centre

os.makedirs("videos", exist_ok=True)

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
writer = cv2.VideoWriter(OUTPUT, fourcc, FPS, (WIDTH, HEIGHT))

TOTAL_FRAMES = FPS * DURATION_SEC


# --- Define people (walkers) ------------------------------------------------
# Each person is: start_x, start_y, speed_y, width, height, color, start_frame
random.seed(42)

def make_person(start_frame):
    x = random.randint(60, WIDTH - 120)
    return {
        "x": x,
        "y": random.randint(30, LINE_Y - 120),   # start above the line
        "speed": random.uniform(4, 9),
        "w": random.randint(40, 60),
        "h": random.randint(80, 110),
        "color": (
            random.randint(50, 200),
            random.randint(50, 200),
            random.randint(50, 200),
        ),
        "start": start_frame,
        "active": False,
    }

# Stagger 15 walkers across the video
people = [make_person(int(i * FPS * 1.2)) for i in range(15)]

print(f"Generating synthetic test video: {OUTPUT}")
print(f"  {WIDTH}x{HEIGHT} @ {FPS}fps  |  {DURATION_SEC}s  |  {TOTAL_FRAMES} frames")
print(f"  Exit line at Y={LINE_Y}")
print(f"  {len(people)} people will cross the line (some may bunch up)")

for frame_idx in range(TOTAL_FRAMES):
    # Dark grey background
    frame = np.full((HEIGHT, WIDTH, 3), (30, 30, 30), dtype=np.uint8)

    # Subtle grid
    for gx in range(0, WIDTH, 80):
        cv2.line(frame, (gx, 0), (gx, HEIGHT), (45, 45, 45), 1)
    for gy in range(0, HEIGHT, 60):
        cv2.line(frame, (0, gy), (WIDTH, gy), (45, 45, 45), 1)

    # Labels
    cv2.putText(frame, "INSIDE (above line)",  (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1, cv2.LINE_AA)
    cv2.putText(frame, "OUTSIDE (below line)", (20, HEIGHT - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1, cv2.LINE_AA)

    # Draw exit line
    cv2.line(frame, (0, LINE_Y), (WIDTH, LINE_Y), (0, 0, 220), 3)
    cv2.putText(frame, "EXIT LINE", (WIDTH - 140, LINE_Y - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 220), 2, cv2.LINE_AA)

    # Animate people
    for p in people:
        if frame_idx < p["start"]:
            continue
        if frame_idx == p["start"]:
            p["active"] = True

        if not p["active"]:
            continue

        p["y"] += p["speed"]

        # Draw person as a filled rectangle (body) + circle (head)
        x, y, w, h = int(p["x"]), int(p["y"]), p["w"], p["h"]
        if y > HEIGHT + h:
            p["active"] = False
            continue

        # Body
        cv2.rectangle(frame, (x, y), (x + w, y + h), p["color"], -1)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 255), 1)

        # Head
        head_r = w // 3
        head_cx = x + w // 2
        head_cy = y - head_r
        cv2.circle(frame, (head_cx, head_cy), head_r, p["color"], -1)
        cv2.circle(frame, (head_cx, head_cy), head_r, (255, 255, 255), 1)

    # Frame counter watermark
    cv2.putText(frame, f"frame {frame_idx}", (WIDTH - 130, HEIGHT - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)

    writer.write(frame)

    if frame_idx % (FPS * 5) == 0:
        print(f"  {frame_idx}/{TOTAL_FRAMES} frames written ...")

writer.release()
print(f"\nDone! Video saved to: {os.path.abspath(OUTPUT)}")
print("Now run:  python main.py")
