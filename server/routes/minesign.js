import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { mockStore, appendAuditLog } from '../db/mockStore.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localVenv = path.join(__dirname, '../../minesign_ai/.venv/bin/python3');
const PYTHON_PATH = process.env.PYTHON_BIN || (fs.existsSync(localVenv) ? localVenv : 'python3');
const INFERENCE_SCRIPT = path.join(__dirname, '../../minesign_ai/inference_server.py');

let pythonInferenceProcess = null;

export function ensureInferenceServer() {
  fetch('http://127.0.0.1:5005/health')
    .then(r => r.json())
    .catch(() => {
      try {
        console.log('🚀 Spawning MineSign AI Python Inference Service on port 5005...');
        pythonInferenceProcess = spawn(PYTHON_PATH, [INFERENCE_SCRIPT], {
          cwd: path.join(__dirname, '../../minesign_ai'),
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });
        pythonInferenceProcess.stdout?.on('data', d => console.log(`[MineSign AI] ${d.toString().trim()}`));
        pythonInferenceProcess.stderr?.on('data', d => console.error(`[MineSign AI] ${d.toString().trim()}`));
      } catch (e) {
        console.warn('Could not spawn Python inference server:', e);
      }
    });
}

// Initial start attempt
ensureInferenceServer();

// Initialize isolated MineSign store if not present
if (!mockStore.minesign_events) {
  mockStore.minesign_events = [];
}

// Allowed MineSign Actionable Gestures (NO_GESTURE is strictly excluded)
export const VALID_MINESIGN_GESTURES = [
  'PPE_DAMAGE',
  'SUSPECTED_GAS_LEAK',
  'CRACK_WORSENING',
  'RESCUE_REQUIRED',
  'HAZARD_HERE'
];

// Priority Mapping
export const GESTURE_PRIORITY_MAP = {
  PPE_DAMAGE: 'HIGH',
  SUSPECTED_GAS_LEAK: 'CRITICAL',
  CRACK_WORSENING: 'CRITICAL',
  RESCUE_REQUIRED: 'CRITICAL',
  HAZARD_HERE: 'HIGH'
};

// Gesture Descriptions / Meanings
export const GESTURE_MEANING_MAP = {
  PPE_DAMAGE: 'Worker reports damaged helmet/PPE requiring attention',
  SUSPECTED_GAS_LEAK: 'Visual report: Worker suspects gas leak in sector (NOT physical gas sensor)',
  CRACK_WORSENING: 'Worker reports ground strata crack separation worsening',
  RESCUE_REQUIRED: 'Immediate rescue / emergency assistance required',
  HAZARD_HERE: 'Specific physical hazard present at this location'
};

// Configurable Duplicate Prevention Window (5 seconds)
const DUPLICATE_COOLDOWN_MS = 5000;
const recentSubmissions = new Map();

/**
 * POST /api/minesign/events
 * Ingests pre-validated MineSign gesture events from isolated MineSign AI pipeline.
 */
router.post('/events', (req, res) => {
  const {
    gesture,
    confidence,
    worker_id,
    mine_id = 'demo-mine',
    mine_name = 'Demo Coal Mine',
    zone = 'Conveyor Zone 4',
    camera_id = 'CAM-MINESIGN-DEMO',
    metadata = {}
  } = req.body;

  // 1. Validate Required Fields
  if (!gesture || !worker_id) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Missing required fields: gesture and worker_id are mandatory.'
    });
  }

  // 2. Strict Rejection of NO_GESTURE and Unknown Gestures
  if (gesture === 'NO_GESTURE') {
    return res.status(400).json({
      error: 'Rejected',
      message: 'NO_GESTURE is an ambient safety baseline and must never create a backend safety event.'
    });
  }

  if (!VALID_MINESIGN_GESTURES.includes(gesture)) {
    return res.status(400).json({
      error: 'Invalid Gesture',
      message: `Gesture '${gesture}' is not a recognized MineSign action. Allowed: ${VALID_MINESIGN_GESTURES.join(', ')}`
    });
  }

  // 3. Validate Confidence (Numeric between 0 and 1)
  const numConfidence = parseFloat(confidence);
  if (isNaN(numConfidence) || numConfidence < 0.0 || numConfidence > 1.0) {
    return res.status(400).json({
      error: 'Invalid Confidence',
      message: 'Confidence must be a numeric value between 0.0 and 1.0.'
    });
  }

  // 4. Duplicate Suppression (5.0s Cooldown)
  const now = Date.now();
  const dedupKey = `${worker_id}|${gesture}|${camera_id}|${zone}`;
  const lastTime = recentSubmissions.get(dedupKey) || 0;

  if (now - lastTime < DUPLICATE_COOLDOWN_MS) {
    const remainingSec = ((DUPLICATE_COOLDOWN_MS - (now - lastTime)) / 1000).toFixed(1);
    return res.status(409).json({
      error: 'Duplicate Suppressed',
      message: `Identical event from ${worker_id} at ${zone} suppressed within ${DUPLICATE_COOLDOWN_MS / 1000}s cooldown (${remainingSec}s remaining).`,
      cooldown_remaining_sec: parseFloat(remainingSec)
    });
  }
  recentSubmissions.set(dedupKey, now);

  // 5. Create Candidate Event Record (PENDING_CONFIRMATION)
  const timestamp = new Date().toISOString();
  const eventId = `event-minesig-${now}-${Math.floor(Math.random() * 1000)}`;
  const priority = GESTURE_PRIORITY_MAP[gesture];
  const meaning = GESTURE_MEANING_MAP[gesture] || 'MineSign Gestural Report';

  const newEvent = {
    event_id: eventId,
    gesture,
    worker_id,
    mine_id,
    mine_name,
    zone,
    camera_id,
    confidence: parseFloat(numConfidence.toFixed(4)),
    priority,
    meaning,
    status: 'PENDING_CONFIRMATION', // PENDING_CONFIRMATION -> OPEN (confirmed) -> ACKNOWLEDGED -> RESOLVED or REJECTED
    source: 'MineSign AI',
    simulation_mode: true,
    timestamp,
    confirmed_by: null,
    confirmed_at: null,
    confirmation_notes: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    acknowledged_by: null,
    acknowledged_at: null,
    resolved_by: null,
    resolved_at: null,
    resolution_notes: null,
    metadata: {
      ...metadata,
      simulation_mode: true
    }
  };

  mockStore.minesign_events.unshift(newEvent);

  // IMPORTANT: PENDING_CONFIRMATION candidate events do NOT create official notifications
  // or official confirmed safety audit blocks until explicitly confirmed by the supervisor.

  return res.status(201).json(newEvent);
});

/**
 * PATCH /api/minesign/events/:id/confirm
 * Supervisor confirms a PENDING_CONFIRMATION gesture candidate, transitioning it to OPEN.
 * Only at this point are the official safety notification and audit entry generated.
 */
router.patch('/events/:id/confirm', (req, res) => {
  const { id } = req.params;
  const { confirmed_by = 'Colliery Shift Supervisor', confirmation_notes = 'Visual gesture verified and confirmed by supervisor.' } = req.body;

  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);
  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  if (event.status !== 'PENDING_CONFIRMATION') {
    return res.status(400).json({
      error: 'Invalid State Transition',
      message: `Event '${id}' is already in status '${event.status}' and cannot be confirmed.`
    });
  }

  const now = new Date().toISOString();
  event.status = 'OPEN';
  event.confirmed_by = confirmed_by;
  event.confirmed_at = now;
  event.confirmation_notes = confirmation_notes;

  // 1. Create Official Notification in mockStore.notifications
  const notifId = `notif-minesig-${Date.now()}`;
  const notifTitle = event.priority === 'CRITICAL'
    ? `🚨 CRITICAL MineSign Alert: ${event.gesture}`
    : `⚠️ MineSign Safety Alert: ${event.gesture}`;
  const notifMsg = `MineSign: ${event.gesture} confirmed by ${confirmed_by} for ${event.worker_id} at ${event.zone} [Camera: ${event.camera_id}]. Priority: ${event.priority}.`;

  mockStore.notifications.unshift({
    id: notifId,
    user_id: null, // Broadcast to supervisors & safety officers
    mine_id: event.mine_id,
    title: notifTitle,
    message: notifMsg,
    type: event.priority === 'CRITICAL' ? 'escalation' : 'alert',
    is_read: false,
    created_at: now
  });

  // 2. Append Official Cryptographic SHA-256 Blockchain-Lite Audit Trail Entry
  appendAuditLog({
    entityType: 'minesign_event',
    entityId: event.event_id,
    action: 'GESTURE_EVENT_CONFIRMED',
    actor: {
      id: 'usr-supervisor-conf',
      full_name: confirmed_by,
      role: 'supervisor'
    },
    mineId: event.mine_id,
    payload: {
      source: 'MineSign AI (Simulation Mode)',
      gesture: event.gesture,
      worker_id: event.worker_id,
      camera_id: event.camera_id,
      zone: event.zone,
      confidence: event.confidence,
      priority: event.priority,
      status: 'OPEN',
      ai_detection_time: event.timestamp,
      confirmed_by,
      confirmed_at: now,
      confirmation_notes,
      timestamp: now
    }
  });

  return res.json({
    message: 'MineSign candidate confirmed and official safety event created.',
    event
  });
});

/**
 * PATCH /api/minesign/events/:id/reject
 * Supervisor rejects a PENDING_CONFIRMATION candidate gesture.
 * Transitions state to REJECTED. No official safety notification or open event is created.
 */
router.patch('/events/:id/reject', (req, res) => {
  const { id } = req.params;
  const { rejected_by = 'Colliery Shift Supervisor', rejection_reason = 'Non-actionable or false gesture candidate rejected by supervisor.' } = req.body;

  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);
  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  if (event.status !== 'PENDING_CONFIRMATION') {
    return res.status(400).json({
      error: 'Invalid State Transition',
      message: `Event '${id}' is in status '${event.status}' and cannot be rejected.`
    });
  }

  const now = new Date().toISOString();
  event.status = 'REJECTED';
  event.rejected_by = rejected_by;
  event.rejected_at = now;
  event.rejection_reason = rejection_reason;

  // Append Rejection Audit Log Entry (Strictly isolated from confirmed events)
  appendAuditLog({
    entityType: 'minesign_event',
    entityId: event.event_id,
    action: 'GESTURE_EVENT_REJECTED',
    actor: {
      id: 'usr-supervisor-reject',
      full_name: rejected_by,
      role: 'supervisor'
    },
    mineId: event.mine_id,
    payload: {
      source: 'MineSign AI (Simulation Mode)',
      gesture: event.gesture,
      worker_id: event.worker_id,
      camera_id: event.camera_id,
      zone: event.zone,
      confidence: event.confidence,
      status: 'REJECTED',
      rejected_by,
      rejected_at: now,
      rejection_reason,
      timestamp: now
    }
  });

  return res.json({
    message: 'Gesture rejected — no official safety event created.',
    event
  });
});

/**
 * GET /api/minesign/events
 * Lists all recorded MineSign events with optional filtering.
 */
router.get('/events', (req, res) => {
  const { mine_id, status, worker_id, priority } = req.query;
  let list = [...(mockStore.minesign_events || [])];

  if (mine_id) {
    list = list.filter(e => e.mine_id === mine_id);
  }
  if (status) {
    list = list.filter(e => e.status.toUpperCase() === status.toUpperCase());
  }
  if (worker_id) {
    list = list.filter(e => e.worker_id.toUpperCase() === worker_id.toUpperCase());
  }
  if (priority) {
    list = list.filter(e => e.priority.toUpperCase() === priority.toUpperCase());
  }

  res.json({
    total: list.length,
    events: list
  });
});

/**
 * GET /api/minesign/events/:id
 * Fetches a single MineSign event by ID.
 */
router.get('/events/:id', (req, res) => {
  const { id } = req.params;
  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);

  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  res.json(event);
});

/**
 * PATCH /api/minesign/events/:id/acknowledge
 * Acknowledges an OPEN MineSign event.
 */
router.patch('/events/:id/acknowledge', (req, res) => {
  const { id } = req.params;
  const { acknowledged_by = 'Colliery Supervisor', action_notes = 'Safety team dispatched to investigate.' } = req.body;

  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);
  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  const now = new Date().toISOString();
  event.status = 'ACKNOWLEDGED';
  event.acknowledged_by = acknowledged_by;
  event.acknowledged_at = now;
  event.action_notes = action_notes;

  // Append to Audit Trail
  appendAuditLog({
    entityType: 'minesign_event',
    entityId: event.event_id,
    action: 'GESTURE_EVENT_ACKNOWLEDGED',
    actor: {
      id: 'usr-supervisor-ack',
      full_name: acknowledged_by,
      role: 'supervisor'
    },
    mineId: event.mine_id,
    payload: {
      event_id: event.event_id,
      gesture: event.gesture,
      status: 'ACKNOWLEDGED',
      acknowledged_by,
      action_notes,
      timestamp: now
    }
  });

  res.json({
    message: 'Event acknowledged successfully.',
    event
  });
});

/**
 * PATCH /api/minesign/events/:id/route
 * Supervisor routes a confirmed MineSign event to FIELD_REPORT, AUTHORITY, or BOTH.
 */
router.patch('/events/:id/route', (req, res) => {
  const { id } = req.params;
  const { destination = 'FIELD_REPORT', action_notes = 'Supervisor routed gestural event.' } = req.body;

  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);
  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  const now = new Date().toISOString();
  event.routed_to = destination;
  event.route_notes = action_notes;
  event.routed_at = now;

  // 1. If FIELD_REPORT or BOTH -> create Field Report
  if (destination === 'FIELD_REPORT' || destination === 'BOTH') {
    const reportId = `rep-ms-${Date.now()}`;
    mockStore.field_reports.unshift({
      id: reportId,
      mine_id: event.mine_id,
      worker_id: event.worker_id,
      worker_name: `Worker ${event.worker_id}`,
      source: 'MINESIGN',
      report_type: 'minesign_gestural_report',
      suggested_category: `MineSign: ${event.gesture} (${event.meaning || 'Gestural Hazard'})`,
      description: `${action_notes} | Detected gesture: ${event.gesture} with ${(event.confidence * 100).toFixed(1)}% confidence at ${event.zone}.`,
      severity: event.priority === 'CRITICAL' ? 'critical' : 'high',
      status: 'OPEN',
      supervisor_ack: true,
      ack_by_name: 'Shift Supervisor',
      ack_by_role: 'supervisor',
      ack_at: now,
      created_at: now
    });
  }

  // 2. If AUTHORITY or BOTH -> escalate to Authority Emergency Queue
  if (destination === 'AUTHORITY' || destination === 'BOTH') {
    event.escalated_to_authority = true;
    const alertId = `sos-ms-${Date.now()}`;
    mockStore.sos_events.unshift({
      id: alertId,
      mine_id: event.mine_id,
      miner_id: event.worker_id,
      miner_name: `Worker ${event.worker_id} (MineSign Gesture)`,
      miner_employee_id: event.worker_id,
      source: 'MINESIGN',
      zone: event.zone || 'Zone 4',
      latitude: 23.7508,
      longitude: 86.4192,
      emergency_type: `MineSign Critical: ${event.gesture}`,
      remarks: `${action_notes} | Gesture ${event.gesture} verified by supervisor and escalated to Authority.`,
      status: 'escalated',
      escalated_to_authority: true,
      supervisor_ack: true,
      acknowledged_by: 'Shift Supervisor',
      acknowledged_at: now,
      escalated_by: 'Shift Supervisor',
      escalated_at: now,
      supervisor_notes: action_notes,
      created_at: now
    });

    // Authority notification
    mockStore.notifications.unshift({
      id: `notif-ms-esc-${Date.now()}`,
      user_id: 'usr-auth-01',
      mine_id: event.mine_id,
      title: `🚨 MINESIGN CRITICAL GESTURE ESCALATED: ${event.gesture}`,
      message: `Supervisor escalated MineSign ${event.gesture} from ${event.worker_id} at ${event.zone} to Authority.`,
      type: 'escalation',
      is_read: false,
      created_at: now
    });
  }

  appendAuditLog({
    entityType: 'minesign_event',
    entityId: event.event_id,
    action: `MINESIGN_ROUTED_TO_${destination}`,
    actor: { id: 'usr-supervisor', full_name: 'Shift Supervisor', role: 'supervisor' },
    mineId: event.mine_id,
    payload: { event_id: event.event_id, gesture: event.gesture, destination, action_notes }
  });

  return res.json({
    message: `MineSign event routed to ${destination} successfully.`,
    event
  });
});

/**
 * PATCH /api/minesign/events/:id/resolve
 * Resolves an ACKNOWLEDGED or OPEN MineSign event.
 */
router.patch('/events/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolved_by = 'Safety In-Charge', resolution_notes = 'Hazard neutralized, worker assistance rendered.' } = req.body;

  const event = (mockStore.minesign_events || []).find(e => e.event_id === id);
  if (!event) {
    return res.status(404).json({
      error: 'Not Found',
      message: `MineSign event '${id}' not found.`
    });
  }

  const now = new Date().toISOString();
  event.status = 'RESOLVED';
  event.resolved_by = resolved_by;
  event.resolved_at = now;
  event.resolution_notes = resolution_notes;

  // Append to Audit Trail
  appendAuditLog({
    entityType: 'minesign_event',
    entityId: event.event_id,
    action: 'GESTURE_EVENT_RESOLVED',
    actor: {
      id: 'usr-safety-resolve',
      full_name: resolved_by,
      role: 'supervisor'
    },
    mineId: event.mine_id,
    payload: {
      event_id: event.event_id,
      gesture: event.gesture,
      status: 'RESOLVED',
      resolved_by,
      resolution_notes,
      timestamp: now
    }
  });

  res.json({
    message: 'Event resolved successfully.',
    event
  });
});

/**
 * POST /api/minesign/process-frame
 * Passes live webcam frame to the real MineSign AI inference pipeline.
 */
router.post('/process-frame', async (req, res) => {
  const { image, worker_id = 'W001' } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image in request body' });
  }

  try {
    const pyRes = await fetch('http://127.0.0.1:5005/process_frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, worker_id })
    });

    if (!pyRes.ok) {
      const err = await pyRes.json().catch(() => ({ error: 'Inference error' }));
      return res.status(pyRes.status).json(err);
    }

    const telemetry = await pyRes.json();
    return res.json(telemetry);
  } catch (err) {
    ensureInferenceServer();
    return res.status(503).json({
      error: 'MineSign AI Starting',
      message: 'Inference service is starting up on port 5005. Please retry.',
      details: err.message
    });
  }
});

/**
 * POST /api/minesign/reset-inference
 * Resets the temporal sliding window buffer and state machine.
 */
router.post('/reset-inference', async (req, res) => {
  try {
    const pyRes = await fetch('http://127.0.0.1:5005/reset', { method: 'POST' });
    if (pyRes.ok) {
      return res.json({ message: 'Inference engine reset successfully' });
    }
  } catch (e) {}
  return res.json({ message: 'Reset signal sent' });
});

export default router;
