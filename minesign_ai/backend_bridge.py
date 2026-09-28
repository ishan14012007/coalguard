"""
MineSign AI — Backend Synchronization Bridge (Phase 2)
Dispatches confirmed MineSign events to CoalGuard backend Express API (POST /api/minesign/events).
"""

import json
import urllib.request
import urllib.error

DEFAULT_BACKEND_URL = "http://localhost:5001/api/minesign/events"


def dispatch_event_to_backend(event_payload, backend_url=DEFAULT_BACKEND_URL, timeout_sec=2.0):
    """
    Sends confirmed MineSign event payload to the CoalGuard backend API.
    Returns (success: bool, response_data: dict, status_code: int).
    """
    if not event_payload or event_payload.get("gesture") == "NO_GESTURE":
        return False, {"error": "NO_GESTURE events are never dispatched to backend."}, 400

    try:
        data_bytes = json.dumps(event_payload).encode("utf-8")
        req = urllib.request.Request(
            backend_url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            status_code = resp.getcode()
            resp_body = resp.read().decode("utf-8")
            return True, json.loads(resp_body), status_code
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else str(e)
        try:
            err_json = json.loads(err_body)
        except Exception:
            err_json = {"error": str(e), "details": err_body}
        return False, err_json, e.code
    except Exception as e:
        return False, {"error": str(e), "message": "Backend offline or unreachable"}, 0
