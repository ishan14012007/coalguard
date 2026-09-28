import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';
import { classifyHazardReport } from '../utils/mlRunner.js';

const router = express.Router();

/**
 * Intelligent Keyword matcher to auto-suggest statutory compliance/hazard category
 * Supports both English and Hindi transliterations
 */
function suggestCategoryFromTranscript(text = '') {
  const lower = text.toLowerCase();

  if (lower.includes('gas') || lower.includes('methane') || lower.includes('ch4') || lower.includes('गैस') || lower.includes('धुआं') || lower.includes('हवा')) {
    return 'Gas Ingress & Ventilation Hazard (CMR Reg 153)';
  }
  if (lower.includes('crack') || lower.includes('slope') || lower.includes('bench') || lower.includes('पत्थर') || lower.includes('दरार') || lower.includes('मिट्टी')) {
    return 'Pit Slope Instability & Highwall Danger (CMR Reg 106)';
  }
  if (lower.includes('truck') || lower.includes('dumper') || lower.includes('tipper') || lower.includes('brake') || lower.includes('गाड़ी') || lower.includes('डंपर')) {
    return 'Heavy Earthmoving Machinery (HEMM) Safety (DGMS Circular 02)';
  }
  if (lower.includes('water') || lower.includes('dust') || lower.includes('sprinkler') || lower.includes('धूल') || lower.includes('पानी')) {
    return 'Dust Suppression & Environmental Compliance (Mines Act Sec 22)';
  }
  if (lower.includes('helmet') || lower.includes('boot') || lower.includes('glove') || lower.includes('ppe') || lower.includes('हेलमेट') || lower.includes('जूता')) {
    return 'Personal Protective Equipment (PPE) Defect';
  }
  return 'General Mining Safety Observation';
}

// GET /api/field-reports
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, worker_id } = req.query;
  let list = [...mockStore.field_reports];

  if (req.user.role === 'miner') {
    list = list.filter(r => r.worker_id === req.user.id);
  } else if (req.user.role === 'supervisor' && req.user.mine_id) {
    list = list.filter(r => r.mine_id === req.user.mine_id || r.mine_id === 'demo-mine' || !r.mine_id);
  } else if (mine_id) {
    list = list.filter(r => r.mine_id === mine_id);
  }

  if (worker_id) {
    list = list.filter(r => r.worker_id === worker_id);
  }

  res.json(list);
});

// POST /api/field-reports/suggest-category - Auto categorize voice transcript or text using Model 5
router.post('/suggest-category', authenticateToken, async (req, res) => {
  const { text } = req.body;
  try {
    const mlResult = await classifyHazardReport(text);
    const suggestedCategory = mlResult.category || suggestCategoryFromTranscript(text);
    res.json({ suggestedCategory, mlClassification: mlResult });
  } catch (err) {
    const suggestedCategory = suggestCategoryFromTranscript(text);
    res.json({ suggestedCategory });
  }
});

// POST /api/field-reports - Submit a single report
router.post('/', authenticateToken, async (req, res) => {
  const {
    report_type,
    description,
    audio_transcript,
    photo_url,
    latitude,
    longitude,
    severity,
    mine_id,
    zone,
    source,
    is_offline_synced = false
  } = req.body;

  const rawDescription = (description !== undefined && description !== null) ? String(description).trim() : '';
  const rawTranscript = (audio_transcript !== undefined && audio_transcript !== null) ? String(audio_transcript).trim() : '';

  if (!rawDescription && !rawTranscript) {
    return res.status(400).json({ error: 'Description or audio transcript is required.' });
  }

  const finalDescription = rawDescription || rawTranscript;
  const textToAnalyze = `${rawDescription} ${rawTranscript}`.trim();
  let mlClassification = null;
  let suggested_category = req.body.suggested_category || req.body.category;
  let finalSeverity = severity || 'medium';

  try {
    mlClassification = await classifyHazardReport(textToAnalyze);
    if (!suggested_category && mlClassification?.category) {
      suggested_category = mlClassification.category;
    }
    if (!severity && mlClassification?.severity) {
      const sevMap = { 'I': 'critical', 'II': 'high', 'III': 'medium', 'IV': 'low', 'V': 'low' };
      finalSeverity = sevMap[mlClassification.severity] || 'medium';
    }
  } catch (e) {
    // Fallback
    if (!suggested_category) {
      suggested_category = suggestCategoryFromTranscript(textToAnalyze);
    }
  }

  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const newReport = {
    id: `rep-${Date.now()}`,
    mine_id: targetMineId,
    worker_id: req.user.id || 'usr-miner-01',
    worker_name: req.user.full_name || 'Ramesh Kumar Mahato',
    source: source || (req.user.role === 'miner' ? 'MINER' : 'MANUAL'),
    zone: zone || req.body.zone || 'Zone 4 (Underground Face 3)',
    report_type: report_type || 'hazard_observation',
    suggested_category: suggested_category || 'General Mining Safety Observation',
    category: suggested_category || 'General Mining Safety Observation',
    description: finalDescription,
    audio_transcript: rawTranscript || null,
    photo_url: photo_url || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
    latitude: latitude ? Number(latitude) : 23.7508,
    longitude: longitude ? Number(longitude) : 86.4192,
    is_offline_synced: Boolean(is_offline_synced),
    severity: finalSeverity,
    ai_model_metrics: mlClassification ? {
      category_confidence: mlClassification.category_confidence,
      severity_confidence: mlClassification.severity_confidence,
      top_contributing_terms: mlClassification.top_contributing_terms
    } : null,
    supervisor_ack: false,
    created_at: new Date().toISOString()
  };

  mockStore.field_reports.unshift(newReport);

  // If critical/high severity, create supervisor notification
  if (newReport.severity === 'high' || newReport.severity === 'critical') {
    mockStore.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: 'usr-super-01',
      mine_id: targetMineId,
      title: `⚠️ Urgent Field Hazard Reported: ${newReport.suggested_category}`,
      message: `${req.user.full_name || 'Miner'} logged a high-severity observation: "${finalDescription.slice(0, 80)}..."`,
      type: 'alert',
      is_read: false,
      created_at: new Date().toISOString()
    });
  }

  appendAuditLog({
    entityType: 'field_report',
    entityId: newReport.id,
    action: 'CREATED',
    actor: req.user,
    mineId: targetMineId,
    payload: { category: newReport.suggested_category, severity: newReport.severity, is_offline_synced, description: finalDescription }
  });

  res.status(201).json(newReport);
});

// POST /api/field-reports/sync-offline - Batch offline reports synchronization
router.post('/sync-offline', authenticateToken, (req, res) => {
  const { reports = [] } = req.body;
  const synced = [];

  for (const item of reports) {
    const textToAnalyze = `${item.description || ''} ${item.audio_transcript || ''}`;
    const suggested_category = item.suggested_category || suggestCategoryFromTranscript(textToAnalyze);

    const report = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      mine_id: item.mine_id || req.user.mine_id || mockStore.mines[0].id,
      worker_id: req.user.id,
      worker_name: req.user.full_name,
      report_type: item.report_type || 'hazard_observation',
      suggested_category,
      description: item.description || item.audio_transcript,
      audio_transcript: item.audio_transcript || null,
      photo_url: item.photo_url || null,
      latitude: item.latitude || 23.7508,
      longitude: item.longitude || 86.4192,
      is_offline_synced: true,
      severity: item.severity || 'medium',
      supervisor_ack: false,
      created_at: item.timestamp || new Date().toISOString()
    };

    mockStore.field_reports.unshift(report);
    synced.push(report);
  }

  res.json({
    message: `Successfully synchronized ${synced.length} offline field reports.`,
    syncedCount: synced.length,
    synced
  });
});

// Acknowledge field report (supports PATCH /:id/ack, POST /:id/ack, POST /:id/acknowledge)
const handleAcknowledgeReport = (req, res) => {
  const { id } = req.params;
  const { action_taken, remarks } = req.body;
  const report = mockStore.field_reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.supervisor_ack = true;
  report.ack_by_name = req.user.full_name;
  report.ack_by_role = req.user.role;
  report.ack_at = new Date().toISOString();
  report.action_taken = action_taken || remarks || 'Acknowledged and verified on-site by supervisor.';

  // Sync with matching incident in mockStore.incidents
  if (report.incident_id) {
    const inc = (mockStore.incidents || []).find(i => i.id === report.incident_id);
    if (inc) {
      inc.status = 'ACKNOWLEDGED';
      inc.acknowledged_by = req.user.full_name;
      inc.acknowledged_at = report.ack_at;
    }
  }

  // Notify miner that authority acknowledged observation
  mockStore.notifications.unshift({
    id: `notif-rep-ack-${Date.now()}`,
    user_id: report.worker_id,
    mine_id: report.mine_id,
    title: '✅ Safety Observation Acknowledged',
    message: `${req.user.full_name} acknowledged your report: "${report.action_taken}"`,
    type: 'alert',
    is_read: false,
    created_at: report.ack_at
  });

  appendAuditLog({
    entityType: 'field_report',
    entityId: report.id,
    action: 'ACKNOWLEDGED',
    actor: req.user,
    mineId: report.mine_id,
    payload: { action_taken: report.action_taken, incident_id: report.incident_id }
  });

  res.json({ message: 'Field report acknowledged successfully', report });
};

// POST/PATCH /api/field-reports/:id/escalate - Escalate field report to Authority
const handleEscalateFieldReport = (req, res) => {
  const { id } = req.params;
  const { notes, escalation_reason } = req.body;
  const report = mockStore.field_reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.supervisor_ack = true;
  report.status = 'ESCALATED';
  report.escalated_to_authority = true;
  report.escalated_by = req.user.full_name;
  report.escalated_at = new Date().toISOString();
  report.action_taken = notes || escalation_reason || 'Critical condition escalated to DGMS / Authority for immediate intervention.';

  const incidentId = report.incident_id || 'INC-FIRE-Z4-001';
  let existingInc = (mockStore.incidents || []).find(inc => inc.id === incidentId);
  if (existingInc) {
    existingInc.status = 'ESCALATED';
    existingInc.escalated_to_authority = true;
    existingInc.escalated_by = req.user.full_name;
    existingInc.escalated_at = report.escalated_at;
  }

  const lat = Number(report.latitude) || 23.7508;
  const lng = Number(report.longitude) || 86.4192;
  const incType = report.report_type?.includes('thermal') || report.suggested_category?.includes('Fire') ? 'FIRE' : 'OTHER';

  // Notify Authority with Location-Aware Action payload
  mockStore.notifications.unshift({
    id: `notif-rep-esc-${Date.now()}`,
    user_id: 'usr-auth-01',
    mine_id: report.mine_id,
    title: `Fire Incident Escalated — ${report.zone || 'Zone 4'}`,
    message: `Supervisor ${req.user.full_name} escalated Field Report #${report.id} (${report.suggested_category}) to Authority. Action: "${report.action_taken}"`,
    type: 'emergency',
    severity: 'HIGH',
    is_read: false,
    has_location: true,
    location: {
      incident_id: incidentId,
      incident_type: incType,
      title: `Fire Incident Escalated — ${report.zone || 'Zone 4'}`,
      zone: report.zone || 'Zone 4',
      camera_id: report.camera_id || 'CAM-HAUL-03',
      latitude: lat,
      longitude: lng,
      severity: 'HIGH'
    },
    created_at: report.escalated_at
  });

  appendAuditLog({
    entityType: 'field_report',
    entityId: report.id,
    action: 'ESCALATED_TO_AUTHORITY',
    actor: req.user,
    mineId: report.mine_id,
    payload: { incident_id: incidentId, action_taken: report.action_taken, coordinates: [lat, lng] }
  });

  res.json({ message: 'Field report escalated to Authority successfully', report });
};

router.patch('/:id/ack', authenticateToken, handleAcknowledgeReport);
router.post('/:id/ack', authenticateToken, handleAcknowledgeReport);
router.post('/:id/acknowledge', authenticateToken, handleAcknowledgeReport);
router.patch('/:id/escalate', authenticateToken, handleEscalateFieldReport);
router.post('/:id/escalate', authenticateToken, handleEscalateFieldReport);

// POST /api/field-reports/:id/convert-to-violation - Promote hazard report to formal violation
router.post('/:id/convert-to-violation', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { severity, corrective_action_required, deadline } = req.body;
  const report = mockStore.field_reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.supervisor_ack = true;
  report.ack_by_name = req.user.full_name;
  report.converted_to_violation = true;

  const newViolation = {
    id: `viol-${Date.now()}`,
    mine_id: report.mine_id,
    title: `[Converted from Field Report] ${report.suggested_category}`,
    category: report.suggested_category,
    severity: severity || report.severity || 'high',
    location_description: `GPS: (${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}) - Reported by ${report.worker_name}`,
    corrective_action_required: corrective_action_required || report.description,
    deadline: deadline || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    status: 'open',
    reported_by_id: report.worker_id,
    reported_by_name: report.worker_name,
    proof_photo_before_url: report.photo_url,
    rectification_proof_photo_url: null,
    act_regulation_reference: 'Coal Mines Regulations 2017',
    created_at: new Date().toISOString()
  };

  mockStore.violations.unshift(newViolation);

  appendAuditLog({
    entityType: 'violation',
    entityId: newViolation.id,
    action: 'CREATED_FROM_FIELD_REPORT',
    actor: req.user,
    mineId: report.mine_id,
    payload: { source_report_id: report.id, title: newViolation.title, severity: newViolation.severity }
  });

  res.status(201).json({
    message: 'Field hazard report successfully converted into formal statutory violation!',
    violation: newViolation
  });
});

// Status update handler for field reports
const handleUpdateReportStatus = (req, res) => {
  const { id } = req.params;
  const { status, assigned_to, resolution_notes, action_taken } = req.body;
  const report = mockStore.field_reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Field Report not found.' });
  }

  const prevStatus = report.status || 'open';

  if (status) {
    report.status = status;
  }
  if (assigned_to) {
    report.assigned_to = assigned_to;
  }
  if (resolution_notes) {
    report.resolution_notes = resolution_notes;
  }
  if (action_taken) {
    report.action_taken = action_taken;
  }

  report.updated_at = new Date().toISOString();
  report.updated_by = req.user.full_name;

  if (status === 'closed' || status === 'resolved') {
    report.resolved_at = new Date().toISOString();
    report.resolved_by = req.user.full_name;
  }

  appendAuditLog({
    entityType: 'field_report',
    entityId: report.id,
    action: `STATUS_UPDATED_${(status || 'UPDATED').toUpperCase()}`,
    actor: req.user,
    mineId: report.mine_id,
    payload: { prevStatus, newStatus: report.status, resolution_notes }
  });

  res.json({ message: 'Field report updated successfully', report });
};

router.patch('/:id', authenticateToken, handleUpdateReportStatus);
router.patch('/:id/status', authenticateToken, handleUpdateReportStatus);
router.put('/:id', authenticateToken, handleUpdateReportStatus);

export default router;
