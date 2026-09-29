import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

if (!mockStore.sos_events) {
  mockStore.sos_events = [];
}

// GET /api/emergency/sos - List SOS broadcasts
router.get('/sos', authenticateToken, (req, res) => {
  const { mine_id, status } = req.query;
  let list = [...(mockStore.sos_events || [])];

  if (req.user.role === 'miner') {
    list = list.filter(e => e.miner_id === req.user.id);
  } else if (req.user.role === 'supervisor' && req.user.mine_id) {
    list = list.filter(e => e.mine_id === req.user.mine_id || !e.mine_id);
  } else if (req.user.role === 'authority' || req.user.role === 'corporate' || req.user.role === 'regulator') {
    // Authority ONLY sees escalated emergencies or system-wide critical alerts
    list = list.filter(e => e.escalated_to_authority === true || e.severity === 'CRITICAL');
  } else if (mine_id) {
    list = list.filter(e => e.mine_id === mine_id);
  }

  if (status) {
    list = list.filter(e => e.status === status);
  }

  const enriched = list.map(item => {
    const mine = mockStore.mines.find(m => m.id === item.mine_id);
    return {
      ...item,
      mine_name: mine?.name || 'Demo Mine A (Zone 1 - Zone 5)',
      mine_code: mine?.code || 'DEMO-MINE-A'
    };
  });

  res.json(enriched);
});

// POST /api/emergency/sos - Trigger emergency SOS broadcast (Miner -> Supervisor)
router.post('/sos', authenticateToken, (req, res) => {
  const { latitude, longitude, emergency_type, remarks } = req.body;

  // 1. Idempotency Check: ONE ACTIVE SOS PER MINER
  const existingActiveSOS = (mockStore.sos_events || []).find(
    e => e.miner_id === req.user.id && (e.status === 'active' || e.status === 'acknowledged' || e.status === 'escalated')
  );

  if (existingActiveSOS) {
    const mine = mockStore.mines.find(m => m.id === existingActiveSOS.mine_id) || mockStore.mines[0];
    return res.status(200).json({
      ...existingActiveSOS,
      mine_name: mine?.name || 'Demo Mine A (Zone 1 - Zone 5)',
      mine_code: mine?.code || 'DEMO-MINE-A',
      already_active: true
    });
  }

  const targetMineId = req.user.mine_id || mockStore.mines[0].id;
  const mine = mockStore.mines.find(m => m.id === targetMineId) || mockStore.mines[0];

  const newSOSEvent = {
    id: `sos-${Date.now()}`,
    miner_id: req.user.id,
    miner_name: req.user.full_name,
    miner_employee_id: req.user.employee_id || 'EMP-MN-4091',
    mine_id: targetMineId,
    mine_name: mine.name,
    mine_code: mine.code,
    zone: 'Zone 4',
    latitude: latitude ? Number(latitude) : 23.7508,
    longitude: longitude ? Number(longitude) : 86.4192,
    emergency_type: emergency_type || 'Colliery Worker Life-Safety Distress Beacon',
    remarks: remarks || 'Emergency SOS triggered via Miner Terminal beacon.',
    status: 'active', // 'active' | 'acknowledged' | 'escalated' | 'resolved'
    escalated_to_authority: false,
    supervisor_ack: false,
    acknowledged_by: null,
    acknowledged_by_role: null,
    acknowledged_at: null,
    escalated_by: null,
    escalated_at: null,
    supervisor_notes: null,
    created_at: new Date().toISOString()
  };

  mockStore.sos_events.unshift(newSOSEvent);

  // Notify Supervisor first (RULE 1: Miner -> Supervisor)
  mockStore.notifications.unshift({
    id: `notif-sos-${Date.now()}`,
    user_id: 'usr-super-01',
    mine_id: targetMineId,
    title: `🚨 EMERGENCY DISTRESS BEACON: ${req.user.full_name}`,
    message: `Worker ${req.user.full_name} (${req.user.employee_id || 'Miner'}) activated SOS Beacon at ${mine.name} [Zone 4]. Shift Supervisor action required.`,
    type: 'escalation',
    is_read: false,
    created_at: newSOSEvent.created_at
  });

  // Blockchain-lite cryptographic audit block
  appendAuditLog({
    entityType: 'emergency_sos',
    entityId: newSOSEvent.id,
    action: 'SOS_TRIGGERED_TO_SUPERVISOR',
    actor: req.user,
    mineId: targetMineId,
    payload: {
      miner_name: req.user.full_name,
      geo_lat: newSOSEvent.latitude,
      geo_lng: newSOSEvent.longitude,
      emergency_type: newSOSEvent.emergency_type,
      routed_to: 'SUPERVISOR'
    }
  });

  res.status(201).json(newSOSEvent);
});

// Supervisor / Authority Acknowledge SOS
const handleAckSOS = (req, res) => {
  const { id } = req.params;
  const { action_notes } = req.body;

  const event = (mockStore.sos_events || []).find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: 'SOS Event not found' });
  }

  event.status = 'acknowledged';
  event.supervisor_ack = true;
  event.acknowledged_by = req.user.full_name;
  event.acknowledged_by_role = req.user.role;
  event.acknowledged_at = new Date().toISOString();
  event.action_notes = action_notes || 'Colliery Rescue Team & Shift In-Charge Dispatched immediately to GPS coordinates.';

  // Notify Miner that rescue is on the way
  mockStore.notifications.unshift({
    id: `notif-sos-ack-${Date.now()}`,
    user_id: event.miner_id,
    mine_id: event.mine_id,
    title: '✅ SOS Rescue Response Dispatched',
    message: `${req.user.full_name} (${req.user.role.toUpperCase()}) acknowledged your emergency alarm. Rescue team is en route to your position.`,
    type: 'alert',
    is_read: false,
    created_at: event.acknowledged_at
  });

  appendAuditLog({
    entityType: 'emergency_sos',
    entityId: event.id,
    action: 'SOS_ACKNOWLEDGED',
    actor: req.user,
    mineId: event.mine_id,
    payload: {
      acknowledged_by: req.user.full_name,
      role: req.user.role,
      action_notes: event.action_notes
    }
  });

  res.json({
    message: 'SOS Acknowledged & Rescue Team Logged.',
    event
  });
};

// Supervisor Escalates Emergency to Authority (RULE 1 & RULE 6: Supervisor -> Authority)
const handleEscalateSOS = (req, res) => {
  const { id } = req.params;
  const { supervisor_notes, escalation_reason } = req.body;

  const event = (mockStore.sos_events || []).find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: 'SOS Event not found' });
  }

  const isFire = (event.emergency_type || '').toUpperCase().includes('FIRE');
  const isGas = (event.emergency_type || '').toUpperCase().includes('GAS');
  const isCollapse = (event.emergency_type || '').toUpperCase().includes('COLLAPSE');
  const isFlood = (event.emergency_type || '').toUpperCase().includes('FLOOD');
  const incType = isFire ? 'FIRE' : isGas ? 'GAS_LEAK' : isCollapse ? 'MINE_COLLAPSE' : isFlood ? 'FLOODING' : 'OTHER';

  const incidentId = event.incident_id || (isFire ? 'INC-FIRE-Z4-001' : isGas ? 'INC-GAS-Z2-002' : isCollapse ? 'INC-COLLAPSE-Z5-003' : `INC-${Date.now()}`);
  event.incident_id = incidentId;
  event.escalated_to_authority = true;
  event.status = 'escalated';
  event.escalated_by = req.user.full_name;
  event.escalated_by_role = req.user.role;
  event.escalated_at = new Date().toISOString();
  event.supervisor_notes = supervisor_notes || escalation_reason || 'Critical situation escalated to DGMS / Corporate Authority for statutory intervention.';

  // Update matching incident in mockStore.incidents
  let existingInc = (mockStore.incidents || []).find(inc => inc.id === incidentId);
  if (existingInc) {
    existingInc.status = 'ESCALATED';
    existingInc.escalated_to_authority = true;
    existingInc.escalated_by = req.user.full_name;
    existingInc.escalated_at = event.escalated_at;
  }

  const lat = Number(event.latitude) || (event.zone === 'Zone 2' ? 23.7485 : event.zone === 'Zone 5' ? 23.7465 : 23.7508);
  const lng = Number(event.longitude) || (event.zone === 'Zone 2' ? 86.4170 : event.zone === 'Zone 5' ? 86.4230 : 86.4192);

  // Notify Authority with Location-Aware Action payload
  mockStore.notifications.unshift({
    id: `notif-sos-esc-${Date.now()}`,
    user_id: 'usr-auth-01',
    mine_id: event.mine_id,
    title: `Fire Incident Escalated — ${event.zone || 'Zone 4'}`,
    message: `Supervisor ${req.user.full_name} escalated emergency #${event.id} (${event.emergency_type}) to Authority. Notes: "${event.supervisor_notes}"`,
    type: 'emergency',
    severity: 'HIGH',
    is_read: false,
    has_location: true,
    location: {
      incident_id: incidentId,
      incident_type: incType,
      title: `Fire Incident Escalated — ${event.zone || 'Zone 4'}`,
      zone: event.zone || 'Zone 4',
      camera_id: event.camera_id || 'CAM-HAUL-03',
      latitude: lat,
      longitude: lng,
      severity: 'HIGH'
    },
    created_at: event.escalated_at
  });

  appendAuditLog({
    entityType: 'emergency_sos',
    entityId: incidentId,
    action: 'SOS_ESCALATED_TO_AUTHORITY',
    actor: req.user,
    mineId: event.mine_id,
    payload: {
      incident_id: incidentId,
      escalated_by: req.user.full_name,
      supervisor_notes: event.supervisor_notes,
      event_type: event.emergency_type,
      zone: event.zone || 'Zone 4',
      coordinates: [lat, lng]
    }
  });

  res.json({
    message: 'Emergency incident successfully escalated to Authority.',
    event
  });
};

// Resolve SOS
const handleResolveSOS = (req, res) => {
  const { id } = req.params;
  const { resolution_summary } = req.body;

  const event = (mockStore.sos_events || []).find(e => e.id === id);
  if (!event) {
    return res.status(404).json({ error: 'SOS Event not found' });
  }

  event.status = 'resolved';
  event.resolved_by = req.user.full_name;
  event.resolved_at = new Date().toISOString();
  event.resolution_summary = resolution_summary || 'Incident area secured. All miners accounted for and safe.';

  appendAuditLog({
    entityType: 'emergency_sos',
    entityId: event.id,
    action: 'SOS_RESOLVED',
    actor: req.user,
    mineId: event.mine_id,
    payload: {
      resolved_by: req.user.full_name,
      resolution_summary: event.resolution_summary
    }
  });

  res.json({
    message: 'SOS Event successfully marked resolved.',
    event
  });
};

router.patch('/sos/:id/ack', authenticateToken, handleAckSOS);
router.post('/sos/:id/ack', authenticateToken, handleAckSOS);
router.patch('/sos/:id/escalate', authenticateToken, handleEscalateSOS);
router.post('/sos/:id/escalate', authenticateToken, handleEscalateSOS);
router.patch('/sos/:id/resolve', authenticateToken, handleResolveSOS);
router.post('/sos/:id/resolve', authenticateToken, handleResolveSOS);

export default router;
