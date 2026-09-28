"""
tracker.py — Bidirectional occupancy counting logic.

Responsibilities:
  - Store the last confirmed "side" (OUTSIDE / INSIDE) of the virtual gate
    line for every tracked person.
  - Detect genuine crossings and update a live occupancy counter:
        OUTSIDE → INSIDE  →  count += 1
        INSIDE  → OUTSIDE →  count -= 1  (floor at 0)
  - Use a configurable crossing-buffer zone around the line to suppress
    false toggles caused by tracker jitter.
  - Allow the same tracker ID to cross many times (entry then exit then
    re-entry through the same gate).
"""

from __future__ import annotations

import config


# Sentinel used before a tracker ID's side has been determined.
_UNKNOWN = "unknown"


class OccupancyCounter:
    """
    Live occupancy counter for a single virtual gate line.

    Parameters
    ----------
    line_position : int
        Pixel coordinate of the gate line (Y for horizontal, X for vertical).
    line_axis : str
        ``"horizontal"`` or ``"vertical"``.
    inside_direction : str
        Direction a person travels **to enter** the space.
        One of ``"down"``, ``"up"``, ``"right"``, ``"left"``.
        This determines which side of the line is INSIDE vs OUTSIDE.
    crossing_buffer : int
        Half-width (px) of the dead-zone around the line.
        While a person's reference point is within this band,
        their last confirmed side is preserved — no event fires.
    """

    def __init__(
        self,
        line_position: int,
        line_axis: str,
        inside_direction: str,
        crossing_buffer: int = 15,
    ):
        self.line_position = line_position
        self.line_axis = line_axis.lower()
        self.inside_direction = inside_direction.lower()
        self.crossing_buffer = max(0, crossing_buffer)

        # Maps tracker_id → last *confirmed* side: "inside" | "outside"
        self._confirmed_side: dict[int, str] = {}

        # Live occupancy count — always >= 0.
        self.count: int = 0

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_side(self, cx: int, cy: int) -> str | None:
        """
        Return which side of the line the reference point is on, or
        ``None`` if it is inside the crossing-buffer dead-zone.

        Convention (controlled by ``inside_direction``):

        * ``inside_direction = "down"`` → person moves **downward** to enter.
          - OUTSIDE = above the line  (cy < line_pos − buffer)
          - INSIDE  = below the line  (cy > line_pos + buffer)

        * ``inside_direction = "up"``   → person moves **upward** to enter.
          - OUTSIDE = below the line  (cy > line_pos + buffer)
          - INSIDE  = above the line  (cy < line_pos − buffer)

        * ``inside_direction = "right"`` → person moves rightward to enter.
          - OUTSIDE = left of line  (cx < line_pos − buffer)
          - INSIDE  = right of line (cx > line_pos + buffer)

        * ``inside_direction = "left"``  → person moves leftward to enter.
          - OUTSIDE = right of line (cx > line_pos + buffer)
          - INSIDE  = left of line  (cx < line_pos − buffer)
        """
        lp = self.line_position
        buf = self.crossing_buffer

        if self.line_axis == "horizontal":
            coord = cy
            if self.inside_direction == "down":
                # Entering = moving downward (top→bottom)
                if coord < lp - buf:
                    return "outside"
                if coord > lp + buf:
                    return "inside"
            else:  # "up" — entering = moving upward (bottom→top)
                if coord > lp + buf:
                    return "outside"
                if coord < lp - buf:
                    return "inside"
        else:  # vertical
            coord = cx
            if self.inside_direction == "right":
                if coord < lp - buf:
                    return "outside"
                if coord > lp + buf:
                    return "inside"
            else:  # "left"
                if coord > lp + buf:
                    return "outside"
                if coord < lp - buf:
                    return "inside"

        # Within the buffer zone — ambiguous, keep last confirmed side.
        return None

    def update(self, tracker_id: int, cx: int, cy: int) -> str | None:
        """
        Update the position of a tracked person and fire a crossing event
        if a genuine side-change is detected.

        Parameters
        ----------
        tracker_id : int
            Unique tracker ID for this person.
        cx, cy : int
            Reference point (typically centre-bottom of bounding box).

        Returns
        -------
        str | None
            ``"entry"``  if count was incremented  (OUTSIDE → INSIDE).
            ``"exit"``   if count was decremented  (INSIDE  → OUTSIDE).
            ``None``     if no crossing occurred.
        """
        new_side = self.get_side(cx, cy)

        # Person is in the buffer zone — preserve last confirmed state.
        if new_side is None:
            return None

        last_side = self._confirmed_side.get(tracker_id, _UNKNOWN)

        # First time we see this ID — just record its side, no event.
        if last_side == _UNKNOWN:
            self._confirmed_side[tracker_id] = new_side
            return None

        # No genuine side change.
        if new_side == last_side:
            return None

        # --- Genuine crossing detected ------------------------------------
        event: str | None = None

        if last_side == "outside" and new_side == "inside":
            self.count += 1
            event = "entry"

        elif last_side == "inside" and new_side == "outside":
            if self.count > 0:
                self.count -= 1
            event = "exit"

        # Update confirmed side for next frame.
        self._confirmed_side[tracker_id] = new_side
        return event

    def is_inside(self, tracker_id: int) -> bool:
        """Return True if this tracker ID is currently confirmed INSIDE."""
        return self._confirmed_side.get(tracker_id) == "inside"

    def reset(self) -> None:
        """Reset all state (useful for testing)."""
        self._confirmed_side.clear()
        self.count = 0


# ---------------------------------------------------------------------------
# Backward-compatibility shim
# ---------------------------------------------------------------------------
# main.py previously imported ExitLineCounter.  We keep the old name as an
# alias so the import line in main.py continues to work without a code change
# until we update it.  The class itself is now OccupancyCounter.
ExitLineCounter = OccupancyCounter
