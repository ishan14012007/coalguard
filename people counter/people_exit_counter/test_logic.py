"""
test_logic.py -- Offline unit tests for the occupancy counter (tracker.py).

Tests all 8 required scenarios plus extras.
Does NOT require OpenCV, YOLO, or a video file.

Run:
    python test_logic.py
"""

import sys
import os
import types

# Force UTF-8 output so Unicode chars don't crash on Windows cp1252 consoles.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Bootstrap: add project root and mock config so tests are self-contained.
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

cfg = types.ModuleType("config")
cfg.LINE_AXIS = "horizontal"
cfg.INSIDE_DIRECTION = "up"   # entering = moving upward (bottom -> top)
cfg.EXIT_DIRECTION = "up"     # backward-compat alias
cfg.LINE_POSITION = 500
cfg.CROSSING_BUFFER = 15
cfg.SHOW_BOXES = True
cfg.SHOW_TRACKER_IDS = False
cfg.LINE_COLOR = (0, 0, 255)
cfg.BOX_COLOR = (0, 255, 0)
cfg.INSIDE_BOX_COLOR = (0, 200, 255)
cfg.COUNTED_BOX_COLOR = (0, 200, 255)
cfg.LINE_THICKNESS = 3
cfg.COUNTER_FONT_SCALE = 1.2
cfg.MIN_BOX_AREA = 500
sys.modules["config"] = cfg

from tracker import OccupancyCounter

# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------
PASS = "[PASS]"
FAIL = "[FAIL]"
errors = 0


def check(condition: bool, name: str) -> None:
    global errors
    status = PASS if condition else FAIL
    print("  %s  %s" % (status, name))
    if not condition:
        errors += 1


# ===========================================================================
# Helper: counter with "up" = entering (INSIDE is above the line)
#   Line at Y=500, buffer=15 px
#   OUTSIDE zone: cy > 515   (below line+buffer)
#   INSIDE  zone: cy < 485   (above line-buffer)
#   Buffer  zone: 485 <= cy <= 515
# ===========================================================================
LINE = 500
BUF = 15
INSIDE_Y  = 300   # clearly above the line -> INSIDE
OUTSIDE_Y = 700   # clearly below the line -> OUTSIDE
BUFFER_Y  = 500   # exactly on the line    -> buffer zone


def make_counter(buffer: int = BUF) -> OccupancyCounter:
    return OccupancyCounter(
        line_position=LINE,
        line_axis="horizontal",
        inside_direction="up",
        crossing_buffer=buffer,
    )


# ===========================================================================
# Section 1: get_side()
# ===========================================================================
print("\n=== Section 1: get_side() ===\n")

c = make_counter()
check(c.get_side(320, OUTSIDE_Y) == "outside", "below line -> outside  (up mode)")
check(c.get_side(320, INSIDE_Y)  == "inside",  "above line -> inside   (up mode)")
check(c.get_side(320, BUFFER_Y)  is None,      "on line    -> None (buffer zone)")
check(c.get_side(320, LINE - BUF - 1) == "inside",  "just outside buffer (above) -> inside")
check(c.get_side(320, LINE + BUF + 1) == "outside", "just outside buffer (below) -> outside")


# ===========================================================================
# Section 2: Vertical line (inside_direction = "right")
# ===========================================================================
print("\n=== Section 2: Vertical line / right ===\n")

cv = OccupancyCounter(640, "vertical", "right", crossing_buffer=10)
check(cv.get_side(200, 0) == "outside", "left of v-line -> outside")
check(cv.get_side(900, 0) == "inside",  "right of v-line -> inside")
check(cv.get_side(640, 0) is None,      "on v-line -> buffer zone")

cv.update(5, 200, 100)   # starts outside
cv.update(5, 900, 100)   # crosses -> entry
check(cv.count == 1, "[vertical/right] left->right crossing counted")

# Wrong direction must count as exit (count: 1->0)
cv.update(6, 900, 200)   # starts inside
cv.update(6, 200, 200)   # crosses back -> exit
check(cv.count == 0, "[vertical/right] right->left crossing = exit, count=0")


# ===========================================================================
# Test 1: One person enters (OUTSIDE -> INSIDE)
# ===========================================================================
print("\n=== Test 1: Single entry ===\n")

t1 = make_counter()
check(t1.count == 0, "initial count = 0")

ev = t1.update(1, 320, OUTSIDE_Y)   # first seen outside
check(ev is None,   "first update: no event (first observation)")
check(t1.count == 0, "count still 0 after first observation")

ev = t1.update(1, 320, INSIDE_Y)    # crosses to inside
check(ev == "entry", "crossing event = 'entry'")
check(t1.count == 1, "Test 1: count = 1 after one entry  [0 -> 1]")


# ===========================================================================
# Test 2: Same person remains inside -- no additional count
# ===========================================================================
print("\n=== Test 2: Person stays inside (no double-count) ===\n")

extra_events = 0
for frame in range(20):
    ev = t1.update(1, 320 + frame, INSIDE_Y - frame)
    if ev is not None:
        extra_events += 1

check(extra_events == 0, "Test 2: no extra events while person stays inside")
check(t1.count == 1,     "Test 2: count remains 1  [1 -> 1]")


# ===========================================================================
# Test 3: Same person exits through the SAME gate (INSIDE -> OUTSIDE)
# ===========================================================================
print("\n=== Test 3: Same person exits via same gate ===\n")

ev = t1.update(1, 320, OUTSIDE_Y)
check(ev == "exit",  "crossing event = 'exit'")
check(t1.count == 0, "Test 3: count = 0 after exit  [1 -> 0]")


# ===========================================================================
# Test 4: 10 people enter
# ===========================================================================
print("\n=== Test 4: 10 people enter ===\n")

t4 = make_counter()
for tid in range(10, 20):
    t4.update(tid, tid * 10, OUTSIDE_Y)   # all start outside
entry_events = 0
for tid in range(10, 20):
    ev = t4.update(tid, tid * 10, INSIDE_Y)
    if ev == "entry":
        entry_events += 1

check(entry_events == 10, "Test 4: 10 entry events fired")
check(t4.count == 10,     "Test 4: count = 10  [0 -> 10]")


# ===========================================================================
# Test 5: 3 people leave -> count goes from 10 to 7
# ===========================================================================
print("\n=== Test 5: 3 people leave ===\n")

exit_events = 0
for tid in range(10, 13):
    ev = t4.update(tid, tid * 10, OUTSIDE_Y)
    if ev == "exit":
        exit_events += 1

check(exit_events == 3, "Test 5: 3 exit events fired")
check(t4.count == 7,    "Test 5: count = 7  [10 -> 7]")


# ===========================================================================
# Test 6: 2 enter, 1 leaves simultaneously -> net +1 -> count = 8
# ===========================================================================
print("\n=== Test 6: 2 enter + 1 exits simultaneously ===\n")

# Two new people start outside
for tid in (30, 31):
    t4.update(tid, tid * 5, OUTSIDE_Y)

# All three events happen in the same batch of frames
for tid in (30, 31):
    ev = t4.update(tid, tid * 5, INSIDE_Y)
    check(ev == "entry", "  ID=%d: entry event" % tid)

ev = t4.update(13, 130, OUTSIDE_Y)
check(ev == "exit", "  ID=13: exit event")

check(t4.count == 8, "Test 6: count = 8  (7 + 2 - 1)")


# ===========================================================================
# Test 7: Person walks near line without crossing -- counter unchanged
# ===========================================================================
print("\n=== Test 7: Jitter near line -- no false count ===\n")

t7 = make_counter()
t7.update(100, 320, OUTSIDE_Y)   # establish outside

before = t7.count
# Simulate tracking jitter: bounce around the buffer zone
for y in [LINE + 20, LINE + 5, LINE - 3, LINE + 8, LINE - 5, LINE + 12, LINE + 20]:
    t7.update(100, 320, y)

check(t7.count == before, "Test 7: jitter around line -> count unchanged")


# ===========================================================================
# Test 8: Person crosses once, stays on the other side -- exactly ONE count
# ===========================================================================
print("\n=== Test 8: Cross once, stay on other side ===\n")

t8 = make_counter()
t8.update(200, 320, OUTSIDE_Y)   # start outside

events_fired = 0
ev = t8.update(200, 320, INSIDE_Y)  # cross once
if ev == "entry":
    events_fired += 1

for _ in range(30):
    ev = t8.update(200, 320, INSIDE_Y - 5)  # stay inside, many frames
    if ev is not None:
        events_fired += 1

check(events_fired == 1, "Test 8: exactly one entry event fired")
check(t8.count == 1,     "Test 8: count = 1")


# ===========================================================================
# Test 9: Counter floor -- never goes negative
# ===========================================================================
print("\n=== Test 9: Counter floor (>= 0) ===\n")

t9 = make_counter()
# Person first appears inside (no prior "outside" observation)
t9.update(300, 320, INSIDE_Y)    # first seen inside -> established inside
t9.update(300, 320, OUTSIDE_Y)   # "exits" from count=0 -> guard prevents -1
check(t9.count >= 0, "Test 9: count never goes below 0")


# ===========================================================================
# Test 10: Bidirectional re-crossing -- enter, exit, re-enter via same gate
# ===========================================================================
print("\n=== Test 10: Enter -> exit -> re-enter via same gate ===\n")

t10 = make_counter()

t10.update(400, 320, OUTSIDE_Y)
ev1 = t10.update(400, 320, INSIDE_Y)
check(ev1 == "entry", "re-cross #1 -> entry")
check(t10.count == 1, "count = 1 after first entry")

ev2 = t10.update(400, 320, OUTSIDE_Y)
check(ev2 == "exit",  "re-cross #2 -> exit")
check(t10.count == 0, "count = 0 after exit")

ev3 = t10.update(400, 320, INSIDE_Y)
check(ev3 == "entry", "re-cross #3 -> entry again")
check(t10.count == 1, "count = 1 after re-entry")


# ===========================================================================
# Test 11: Full scenario from requirements
# ===========================================================================
print("\n=== Test 11: Full requirements scenario ===\n")

t11 = make_counter()

for tid in range(1, 6):
    t11.update(tid, tid * 30, OUTSIDE_Y)
for tid in range(1, 6):
    t11.update(tid, tid * 30, INSIDE_Y)
check(t11.count == 5, "5 people entered -> count = 5")

for tid in range(1, 3):
    t11.update(tid, tid * 30, OUTSIDE_Y)
check(t11.count == 3, "2 people left -> count = 3")

for tid in range(6, 10):
    t11.update(tid, tid * 30, OUTSIDE_Y)
for tid in range(6, 10):
    t11.update(tid, tid * 30, INSIDE_Y)
check(t11.count == 7, "4 more entered -> count = 7")

t11.update(6, 180, OUTSIDE_Y)
check(t11.count == 6, "one immediately left -> count = 6")


# ===========================================================================
# Test 12: reset()
# ===========================================================================
print("\n=== Test 12: reset() ===\n")

t11.reset()
check(t11.count == 0,             "reset() clears count")
check(not t11._confirmed_side,    "reset() clears _confirmed_side")


# ===========================================================================
# Summary
# ===========================================================================
print("\n" + "=" * 50)
if errors == 0:
    print("  All tests PASSED!  (OK)")
else:
    print("  %d test(s) FAILED" % errors)
print("=" * 50 + "\n")

sys.exit(errors)
