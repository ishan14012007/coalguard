import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ensure mockStore.incidents exists
if (!mockStore.incidents) {
  mockStore.incidents = [];
}

// GET /api/incidents - List all incidents (filtered by mine_id or status if requested)
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, status, type } = req.query;
  let list = [...mockStore.incidents];

  if (mine_id && mine_id !== 'all') {
    list = list.filter(i => i.mine_id === mine_id);
  }
  if (status && status !== 'all') {
    list = list.filter(i => i.status === status);
  }
  if (type && type !== 'all') {
    list = list.filter(i => i.incident_type === type);
  }

  res.json(list);
});

// GET /api/incidents/:id - Get specific incident
router.get('/:id', authenticateToken, (req, res) => {
  const item = mockStore.incidents.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(item);
});

// POST /api/incidents - Create a new location-aware incident
router.post('/', authenticateToken, (req, res) => {
  const {
    incident_type = 'OTHER',
    title,
    description,
    mine_id = 'mine-demo-01',
    zone = 'Zone 4',
    latitude,
    longitude,
    severity = 'HIGH',
    source = 'Supervisor Manual Report'
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Incident title is required.' });
  }

  const mine = mockStore.mines.find(m => m.id === mine_id) || mockStore.mines[0];
  const incidentLat = typeof latitude === 'number' ? latitude : (mine.latitude || 23.7508);
  const incidentLng = typeof longitude === 'number' ? longitude : (mine.longitude || 86.4192);

  const newIncident = {
    id: `INC-${incident_type.toUpperCase()}-${Date.now().toString().slice(-4)}`,
    incident_type: incident_type.toUpperCase(),
    title,
    description: description || `Safety incident logged for ${zone}.`,
    mine_id: mine.id,
    mine_name: mine.name,
    zone,
    latitude: incidentLat,
    longitude: incidentLng,
    severity: severity.toUpperCase(),
    status: 'ACTIVE',
    source,
    created_at: new Date().toISOString(),
    acknowledged_at: null,
    acknowledged_by: null,
    resolved_at: null,
    resolved_by: null
  };

  mockStore.incidents.unshift(newIncident);

  // Create linked notification for supervisor
  const notifId = `notif-inc-${Date.now()}`;
  mockStore.notifications.unshift({
    id: notifId,
    user_id: 'usr-super-01',
    mine_id: mine.id,
    title: `🚨 ${title} — ${zone}`,
    message: description || `Safety incident reported in ${zone}. Immediate supervisor inspection and verification required.`,
    type: 'incident',
    is_read: false,
    created_at: newIncident.created_at,
    has_location: true,
    location: {
      incident_id: newIncident.id,
      incident_type: newIncident.incident_type,
      title: newIncident.title,
      latitude: incidentLat,
      longitude: incidentLng,
      zone: newIncident.zone,
      severity: newIncident.severity
    }
  });

  newIncident.notification_id = notifId;

  // Append to Cryptographic SHA-256 Audit Trail
  appendAuditLog({
    entityType: 'safety_incident',
    entityId: newIncident.id,
    action: 'INCIDENT_LOGGED_LOCATION_AWARE',
    actor: req.user,
    mineId: mine.id,
    payload: {
      title: newIncident.title,
      incident_type: newIncident.incident_type,
      zone: newIncident.zone,
      geo_lat: incidentLat,
      geo_lng: incidentLng,
      severity: newIncident.severity,
      source: newIncident.source
    }
  });

  res.status(201).json(newIncident);
});

// PATCH /api/incidents/:id/acknowledge - Supervisor Acknowledge Incident
router.patch('/:id/acknowledge', authenticateToken, (req, res) => {
  const incident = mockStore.incidents.find(i => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  incident.status = 'ACKNOWLEDGED';
  incident.acknowledged_at = new Date().toISOString();
  incident.acknowledged_by = req.user.full_name || 'Shift Supervisor';

  // Audit log
  appendAuditLog({
    entityType: 'safety_incident',
    entityId: incident.id,
    action: 'INCIDENT_ACKNOWLEDGED_ON_MAP',
    actor: req.user,
    mineId: incident.mine_id,
    payload: {
      incident_id: incident.id,
      acknowledged_by: incident.acknowledged_by,
      zone: incident.zone,
      timestamp: incident.acknowledged_at
    }
  });

  res.json({
    message: `Incident ${incident.id} acknowledged. Shift response underway.`,
    incident
  });
});

// PATCH /api/incidents/:id/resolve - Supervisor Resolve Incident
router.patch('/:id/resolve', authenticateToken, (req, res) => {
  const { resolution_notes } = req.body;
  const incident = mockStore.incidents.find(i => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  incident.status = 'RESOLVED';
  incident.resolved_at = new Date().toISOString();
  incident.resolved_by = req.user.full_name || 'Shift Supervisor';
  incident.resolution_notes = resolution_notes || 'Hazard neutralized and verified safe by shift supervisor.';

  // Audit log
  appendAuditLog({
    entityType: 'safety_incident',
    entityId: incident.id,
    action: 'INCIDENT_RESOLVED_ON_MAP',
    actor: req.user,
    mineId: incident.mine_id,
    payload: {
      incident_id: incident.id,
      resolved_by: incident.resolved_by,
      resolution_notes: incident.resolution_notes,
      zone: incident.zone,
      timestamp: incident.resolved_at
    }
  });

  res.json({
    message: `Incident ${incident.id} resolved and recorded in audit ledger.`,
    incident
  });
});

export default router;
