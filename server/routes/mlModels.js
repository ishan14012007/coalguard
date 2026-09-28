import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  classifyHazardReport,
  getModel4Options,
  predictSituationalRisk,
  simulateWhatIfRisk
} from '../utils/mlRunner.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.join(__dirname, '../..');

/**
 * Helper to load mine risk score ranking dataset
 */
let cachedMineRankings = null;
function getMineRiskRankings() {
  if (cachedMineRankings) return cachedMineRankings;
  const csvPath = path.join(BASE_DIR, 'model 4/data/processed/mine_risk_scores.csv');
  try {
    if (fs.existsSync(csvPath)) {
      const data = fs.readFileSync(csvPath, 'utf8');
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',');
      const rows = [];
      for (let i = 1; i < Math.min(lines.length, 50); i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 17) {
          rows.push({
            mine_id: parts[0],
            operator_name: (parts[6] || '').replace(/"/g, ''),
            total_accidents: Number(parts[1]),
            fatal_accidents: Number(parts[9]),
            severe_accidents: Number(parts[10]),
            risk_score: Number(parts[16]),
            risk_level: parts[17] || 'WATCH',
            explanation: parts.slice(18).join(',').replace(/"/g, '') || 'Risk score computed from historical incident frequency and severity.'
          });
        }
      }
      rows.sort((a, b) => b.risk_score - a.risk_score);
      cachedMineRankings = rows;
      return rows;
    }
  } catch (err) {
    console.warn('⚠️ Error parsing mine risk scores CSV:', err.message);
  }
  return [
    { mine_id: '100027', operator_name: 'National Cement Co. of AL., Inc.', total_accidents: 412, fatal_accidents: 1, severe_accidents: 243, risk_score: 75.05, risk_level: 'CRITICAL', explanation: 'Primary risk driver is Severe Accidents (30.0 pts) and Fatalities (20.0 pts).' },
    { mine_id: '100011', operator_name: 'Imerys Carbonates USA, Inc.', total_accidents: 496, fatal_accidents: 1, severe_accidents: 111, risk_score: 64.47, risk_level: 'HIGH RISK', explanation: 'Primary risk driver is Fatalities (20.0 pts) and Severe Accidents (16.6 pts).' },
    { mine_id: '100003', operator_name: 'Lhoist North America of Alabama, LLC', total_accidents: 191, fatal_accidents: 1, severe_accidents: 47, risk_score: 37.54, risk_level: 'WATCH', explanation: 'Primary risk driver is Fatalities (20.0 pts).' },
    { mine_id: '100006', operator_name: 'Dravo Basic Materials Company Inc', total_accidents: 79, fatal_accidents: 1, severe_accidents: 34, risk_score: 29.47, risk_level: 'WATCH', explanation: 'Primary risk driver is Fatalities (20.0 pts) and Severe Accidents (5.1 pts).' },
    { mine_id: '100016', operator_name: 'Medusa-Citadel Inc', total_accidents: 282, fatal_accidents: 0, severe_accidents: 66, risk_score: 26.15, risk_level: 'WATCH', explanation: 'Primary risk driver is Severe Accidents (9.9 pts).' }
  ];
}

// --------------------------------------------------------------------------
// 1. MODEL STATUS
// --------------------------------------------------------------------------
router.get('/status', (req, res) => {
  res.json({
    models: [
      { id: 'people_counter', name: 'People Occupancy & Ingress Counter', type: 'CCTV Vision', framework: 'YOLOv8n + ByteTrack', status: 'READY', demo_feed: 'Zone 3 Shaft Entrance' },
      { id: 'helmet_detection', name: 'PPE / Safety Helmet Detector', type: 'CCTV Vision', framework: 'YOLOWorld (ViT-B-32)', status: 'READY', demo_feed: 'Main Incline Checkpoint Camera' },
      { id: 'smoke_detection', name: 'Fire & Smoke Surveillance Vision', type: 'CCTV Vision', framework: 'HSV Chromatic + MOG2 Motion', status: 'READY', demo_feed: 'Haulage Road 3 Return' },
      { id: 'model_4_risk', name: 'Explainable Situational Mine Risk', type: 'Predictive Tabular', framework: 'Random Forest / MSHA Classifier', status: 'READY', baseline_risk: '48.4%' },
      { id: 'model_5_nlp', name: 'Statutory Hazard Auto-Classifier', type: 'NLP NLP / Text', framework: 'TF-IDF + Logistic Regression', status: 'READY', accuracy: '91.8%' },
      { id: 'model_6_whatif', name: 'What-If Risk Trajectory Simulator', type: 'Simulation Engine', framework: 'Situational-Environmental Engine', status: 'READY', parameters: 'Rainfall, Experience, Equipment, Shift' }
    ],
    engine_online: true,
    cctv_nodes_configured: 3
  });
});

// --------------------------------------------------------------------------
// 2. MODEL 5: HAZARD REPORT AUTO-CLASSIFICATION (NLP)
// --------------------------------------------------------------------------
router.post('/classify-hazard', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text description is required for classification.' });
  }
  try {
    const result = await classifyHazardReport(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Classification failed', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 3. MODEL 4: SITUATIONAL RISK PREDICTION & ENCODERS
// --------------------------------------------------------------------------
router.get('/risk-options', authenticateToken, async (req, res) => {
  try {
    const options = await getModel4Options();
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load options', details: err.message });
  }
});

router.post('/predict-risk', authenticateToken, async (req, res) => {
  const inputs = req.body || {};
  try {
    const result = await predictSituationalRisk(inputs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Risk calculation failed', details: err.message });
  }
});

router.get('/mine-rankings', authenticateToken, (req, res) => {
  const rankings = getMineRiskRankings();
  res.json({
    total_mines: rankings.length,
    rankings
  });
});

// --------------------------------------------------------------------------
// 4. MODEL 6: WHAT-IF RISK SIMULATOR
// --------------------------------------------------------------------------
router.post('/simulate-whatif', authenticateToken, async (req, res) => {
  const params = req.body || {};
  try {
    const result = await simulateWhatIfRisk(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed', details: err.message });
  }
});

// --------------------------------------------------------------------------
// 5. CAMERA SURVEILLANCE & CCTV STREAMS (Models 1, 2, 3)
// --------------------------------------------------------------------------
router.get('/cctv/feeds', authenticateToken, (req, res) => {
  res.json({
    feeds: [
      {
        id: 'CAM-Z3-01',
        name: 'Zone 3 Shaft Entrance & Incline',
        model_type: 'people_counter',
        model_title: 'People Counter / Ingress-Egress Monitor',
        video_url: '/videos/people_counter_demo.mp4',
        location: 'Shaft 3 Bottom Station, Moonidih Mine',
        resolution: '1920x1080 @ 30 FPS',
        ai_model: 'YOLOv8n + ByteTrack (Line crossing at Y=350)',
        current_stats: {
          total_entered: 14,
          total_exited: 8,
          current_inside: 6,
          max_capacity: 45,
          shift_status: 'Shift A Operations'
        },
        recent_events: [
          { id: 'ev-1', time: '10:42:15', event: 'Worker Ingress (Track #12)', delta: '+1', count: 6 },
          { id: 'ev-2', time: '10:41:50', event: 'Worker Ingress (Track #11)', delta: '+1', count: 5 },
          { id: 'ev-3', time: '10:40:12', event: 'Worker Egress (Track #8)', delta: '-1', count: 4 },
          { id: 'ev-4', time: '10:38:45', event: 'Worker Ingress (Track #7)', delta: '+1', count: 5 },
          { id: 'ev-5', time: '10:37:20', event: 'Worker Ingress (Track #6)', delta: '+1', count: 4 }
        ]
      },
      {
        id: 'CAM-CHK-02',
        name: 'Main Incline Safety Checkpoint',
        model_type: 'helmet_detection',
        model_title: 'PPE & Safety Helmet Detection',
        video_url: '/videos/helmet_detection_demo.mp4',
        location: 'Incline Gallery Level 2, Demo Mine A (Zone 2)',
        resolution: '1920x1080 @ 25 FPS',
        ai_model: 'YOLOWorld v2 (Confidence threshold 0.15 + Spatial Memory)',
        current_stats: {
          compliance_rate_pct: 87.5,
          total_scanned: 24,
          compliant_count: 21,
          violations_detected: 3,
          active_tracked_workers: 4
        },
        recent_detections: [
          { track_id: 2, status: 'NO HELMET', confidence: '94.2%', severity: 'high', frame: 185, timestamp: '10:44:02' },
          { track_id: 3, status: 'NO HELMET', confidence: '91.8%', severity: 'high', frame: 192, timestamp: '10:44:05' },
          { track_id: 6, status: 'DAMAGED HELMET', confidence: '88.5%', severity: 'medium', frame: 220, timestamp: '10:44:18' },
          { track_id: 7, status: 'HELMET COMPLIANT', confidence: '98.6%', severity: 'safe', frame: 240, timestamp: '10:44:30' }
        ]
      },
      {
        id: 'CAM-HAUL-03',
        name: 'Haulage Road 3 & Return Airway',
        model_type: 'smoke_detection',
        model_title: 'Fire & Smoke Hazard Vision',
        video_url: '/videos/smoke_detection_demo.mp4',
        location: 'Haulage Crosscut 4 / Return Ventilation Fan 2',
        resolution: '1280x720 @ 30 FPS',
        ai_model: 'Adaptive MOG2 Background Subtractor + HSV Flame Chroma',
        current_stats: {
          ambient_air_quality: 'WARNING',
          thermal_anomaly_detected: true,
          smoke_dispersion_ratio: '1.8%',
          trigger_threshold: '0.1%',
          auto_suppression_status: 'STANDBY READY'
        },
        incident_event: {
          trigger_frame: 45,
          trigger_time: '10:45:12',
          type: 'FIRE + SMOKE DETECTED',
          area_coords: { x: '45%', y: '30%', width: '35%', height: '40%' }
        }
      }
    ]
  });
});

// POST /api/models/cctv/helmet-action - Supervisor decides: Raise Field Issue or Dismiss
router.post('/cctv/helmet-action', authenticateToken, (req, res) => {
  const { track_id = 2, status = 'NO HELMET', camera_id = 'CAM-CHK-02', action = 'RAISE_FIELD_ISSUE', frame_number = 185, notes } = req.body;
  const mine_id = req.user.mine_id || mockStore.mines[0].id;

  if (action === 'DISMISS') {
    appendAuditLog({
      entityType: 'cctv_helmet_detection',
      entityId: `dismiss-${Date.now()}`,
      action: 'HELMET_DETECTION_DISMISSED',
      actor: req.user,
      mineId: mine_id,
      payload: { track_id, status, camera_id, dismissed_by: req.user.full_name }
    });

    return res.json({
      message: `Detection for Track #${track_id} (${status}) dismissed by supervisor.`,
      dismissed: true
    });
  }

  // Create Field Report (DOES NOT automatically send to Authority!)
  const reportId = `rep-cctv-${Date.now()}`;
  const newReport = {
    id: reportId,
    mine_id,
    worker_id: `Track-${track_id}`,
    worker_name: `Unhelmeted Worker (Track #${track_id})`,
    source: 'HELMET_DETECTION',
    report_type: 'cctv_ppe_violation',
    suggested_category: status === 'DAMAGED HELMET' ? 'Damaged Safety Helmet (PPE Defect)' : 'Missing Safety Helmet at Checkpoint',
    description: notes || `Camera ${camera_id} detected Track #${track_id} [${status}] at frame #${frame_number}. Supervisor verified and raised field ticket.`,
    severity: status === 'DAMAGED HELMET' ? 'medium' : 'high',
    status: 'OPEN', // OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
    supervisor_ack: true,
    ack_by_name: req.user.full_name,
    ack_by_role: req.user.role,
    ack_at: new Date().toISOString(),
    assigned_to: 'Shift Safety Sirdar',
    assigned_to_name: 'Field Safety Patrol',
    created_at: new Date().toISOString()
  };

  mockStore.field_reports.unshift(newReport);

  appendAuditLog({
    entityType: 'field_report',
    entityId: newReport.id,
    action: 'HELMET_ISSUE_RAISED_TO_FIELD_REPORT',
    actor: req.user,
    mineId: mine_id,
    payload: { track_id, status, camera_id, report_id: newReport.id, routed_by: req.user.full_name }
  });

  res.status(201).json({
    message: `Field Report #${newReport.id} successfully created for ${status}. Assigned to shift safety team.`,
    report: newReport
  });
});

// POST /api/models/cctv/smoke-action - Supervisor decides: FIELD REPORT, AUTHORITY, or BOTH
router.post('/cctv/smoke-action', authenticateToken, (req, res) => {
  const { camera_id = 'CAM-HAUL-03', incident_type = 'FIRE', location = 'Haulage Road 3 (Zone 4)', action = 'BOTH', notes } = req.body;
  const mine_id = req.user.mine_id || mockStore.mines[0].id;
  const timestamp = new Date().toISOString();
  const createdItems = {};
  const incidentId = 'INC-FIRE-Z4-001';

  // Ensure incident exists in mockStore.incidents with exact GIS coordinates
  let existingInc = (mockStore.incidents || []).find(inc => inc.id === incidentId || (inc.incident_type === 'FIRE' && inc.zone === 'Zone 4'));
  if (!existingInc) {
    existingInc = {
      id: incidentId,
      incident_type: 'FIRE',
      title: 'Fire Detected — Zone 4',
      description: notes || `Potential fire detected by CCTV AI in Zone 4 [${camera_id}]. Supervisor verification required.`,
      mine_id,
      mine_name: 'Demo Mine A (Zone 1 - Zone 5)',
      zone: 'Zone 4',
      latitude: 23.7508,
      longitude: 86.4192,
      severity: 'HIGH',
      status: action === 'AUTHORITY' ? 'ESCALATED' : 'PENDING_VERIFICATION',
      source: 'CCTV_AI',
      camera_id,
      created_at: timestamp,
      acknowledged_at: null,
      acknowledged_by: null,
      resolved_at: null,
      resolved_by: null
    };
    if (!mockStore.incidents) mockStore.incidents = [];
    mockStore.incidents.unshift(existingInc);
  } else {
    existingInc.status = (action === 'AUTHORITY' || action === 'BOTH') ? 'ESCALATED' : existingInc.status;
    existingInc.source = 'CCTV_AI';
    existingInc.camera_id = camera_id;
    if (notes) existingInc.description = notes;
  }
  createdItems.incident = existingInc;

  const reportId = `rep-smoke-${Date.now()}`;

  // 1. If FIELD REPORT or BOTH -> Create Operational Field Report with location & persistent incidentId
  if (action === 'FIELD_REPORT' || action === 'BOTH') {
    const newReport = {
      id: reportId,
      incident_id: existingInc.id,
      mine_id,
      worker_id: 'cctv-thermal-vision',
      worker_name: `CCTV AI Vision (${camera_id})`,
      source: 'CCTV_AI',
      camera_id,
      zone: 'Zone 4',
      latitude: 23.7508,
      longitude: 86.4192,
      report_type: 'thermal_smoke_incident',
      suggested_category: 'Fire & Smoke Detection in Sector',
      description: notes || `Potential fire detected by CCTV AI in Zone 4 [${camera_id}]. Immediate supervisor verification required.`,
      severity: 'high',
      status: action === 'AUTHORITY' ? 'ESCALATED' : 'PENDING_VERIFICATION',
      supervisor_ack: action === 'AUTHORITY',
      ack_by_name: req.user.full_name,
      ack_by_role: req.user.role,
      ack_at: action === 'AUTHORITY' ? timestamp : null,
      assigned_to: 'Mine Fire Brigade & Ventilation Officer',
      assigned_to_name: 'Colliery Emergency Fire Team',
      created_at: timestamp
    };
    mockStore.field_reports.unshift(newReport);
    createdItems.field_report = newReport;
    existingInc.field_report_id = reportId;

    // Send location-aware Supervisor Notification
    mockStore.notifications.unshift({
      id: `notif-cctv-fire-${Date.now()}`,
      user_id: 'usr-super-01',
      mine_id,
      title: 'Fire Detected — Zone 4',
      message: 'Potential fire detected by CCTV AI in Zone 4. Supervisor verification required.',
      type: 'incident',
      severity: 'HIGH',
      is_read: false,
      has_location: true,
      location: {
        incident_id: existingInc.id,
        incident_type: 'FIRE',
        title: 'Fire Detected — Zone 4',
        zone: 'Zone 4',
        camera_id,
        latitude: 23.7508,
        longitude: 86.4192,
        severity: 'HIGH'
      },
      created_at: timestamp
    });
  }

  // 2. If AUTHORITY or BOTH -> Escalate to Authority Emergency Queue with location & persistent incidentId
  if (action === 'AUTHORITY' || action === 'BOTH') {
    const alertId = `sos-fire-${Date.now()}`;
    const newAlert = {
      id: alertId,
      incident_id: existingInc.id,
      mine_id,
      miner_id: req.user.id,
      miner_name: `Supervisor ${req.user.full_name}`,
      miner_employee_id: req.user.employee_id || 'SUP-41029',
      source: 'CCTV_AI',
      camera_id,
      zone: 'Zone 4',
      latitude: 23.7508,
      longitude: 86.4192,
      emergency_type: 'FIRE (CCTV AI Thermal Vision Alarm)',
      remarks: notes || `Camera ${camera_id} detected active flame/smoke outbreak at ${location}. Escalated by supervisor.`,
      status: 'escalated',
      escalated_to_authority: true,
      supervisor_ack: true,
      acknowledged_by: req.user.full_name,
      acknowledged_at: timestamp,
      escalated_by: req.user.full_name,
      escalated_at: timestamp,
      supervisor_notes: notes || 'Critical smoke/fire situation escalated to Authority for emergency response coordination.',
      created_at: timestamp
    };
    if (!mockStore.sos_events) mockStore.sos_events = [];
    mockStore.sos_events.unshift(newAlert);
    createdItems.authority_emergency = newAlert;

    // Notify Authority with Location-Aware action payload
    mockStore.notifications.unshift({
      id: `notif-fire-auth-${Date.now()}`,
      user_id: 'usr-auth-01',
      mine_id,
      title: 'Fire Incident Escalated — Zone 4',
      message: `Supervisor ${req.user.full_name} escalated CCTV-detected Fire incident at Zone 4 [${camera_id}]. Immediate emergency response coordination required.`,
      type: 'emergency',
      severity: 'HIGH',
      is_read: false,
      has_location: true,
      location: {
        incident_id: existingInc.id,
        incident_type: 'FIRE',
        title: 'Fire Incident Escalated — Zone 4',
        zone: 'Zone 4',
        camera_id,
        latitude: 23.7508,
        longitude: 86.4192,
        severity: 'HIGH'
      },
      created_at: timestamp
    });
  }

  appendAuditLog({
    entityType: 'cctv_smoke_incident',
    entityId: existingInc.id,
    action: `SMOKE_FIRE_ROUTED_TO_${action}`,
    actor: req.user,
    mineId: mine_id,
    payload: { incident_id: existingInc.id, camera_id, incident_type: 'FIRE', destination: action, zone: 'Zone 4', coordinates: [23.7508, 86.4192], notes }
  });

  res.status(201).json({
    message: `CCTV fire detection successfully processed and routed to: ${action}`,
    ...createdItems
  });
});

// POST /api/models/cctv/people-counter-sync - Non-resetting cumulative counter
router.post('/cctv/people-counter-sync', authenticateToken, (req, res) => {
  const { camera_id = 'CAM-Z3-01', delta = 1, segment_count = 6, total_cumulative } = req.body;
  
  if (!mockStore.cctv_counters) mockStore.cctv_counters = {};
  if (!mockStore.cctv_counters[camera_id]) {
    mockStore.cctv_counters[camera_id] = { base_cumulative: 28, today_total: 28, last_segment_count: 6 };
  }

  if (total_cumulative !== undefined) {
    mockStore.cctv_counters[camera_id].today_total = total_cumulative;
  } else if (delta > 0) {
    mockStore.cctv_counters[camera_id].today_total += delta;
  }
  mockStore.cctv_counters[camera_id].last_segment_count = segment_count;

  res.json({
    camera_id,
    today_cumulative: mockStore.cctv_counters[camera_id].today_total,
    current_segment: segment_count
  });
});

// POST /api/models/cctv/people-headcount - Trigger muster headcount broadcast
router.post('/cctv/people-headcount', authenticateToken, (req, res) => {
  const { current_inside = 6, camera_id = 'CAM-Z3-01' } = req.body;
  const mine_id = req.user.mine_id || mockStore.mines[0].id;

  appendAuditLog({
    entityType: 'occupancy_headcount',
    entityId: `muster-${Date.now()}`,
    action: 'EMERGENCY_HEADCOUNT_VERIFIED',
    actor: req.user,
    mineId: mine_id,
    payload: { camera_id, verified_headcount_inside: current_inside, timestamp: new Date().toISOString() }
  });

  res.json({
    message: `Emergency muster roll synchronized! Verified ${current_inside} personnel underground at Zone 4 Incline.`,
    headcount: current_inside,
    safe_muster_status: 'VERIFIED_ACTIVE',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// 7. SUPERVISOR AI ASSESSMENTS → AUTHORITY GOVERNANCE DISPATCH
// --------------------------------------------------------------------------

// POST /api/models/send-assessment - Snapshot & dispatch assessment to Authority
router.post('/send-assessment', authenticateToken, (req, res) => {
  const {
    assessment_id,
    model_id = 'model_4_risk',
    model_name = 'Mine Risk Scoring',
    model_engine,
    mine_id = 'mine-demo-01',
    mine_name = 'Demo Mine A',
    sector = 'Zone 4 (Underground Seam Block)',
    inputs = {},
    output = {},
    notes = ''
  } = req.body;

  const id = assessment_id || (model_id === 'model_6_whatif' 
    ? `WIA-${Math.floor(1000 + Math.random() * 9000)}`
    : `RSA-${Math.floor(1000 + Math.random() * 9000)}`);

  const supervisor_name = req.user?.full_name || req.user?.name || 'Er. Rajesh Kumar (Colliery Supervisor)';
  const supervisor_id = req.user?.id || 'usr-super-01';
  const timestamp = new Date().toISOString();

  // Create immutable snapshot of selected inputs and model output
  const assessmentRecord = {
    id,
    model_id,
    model_name,
    model_engine: model_engine || (model_id === 'model_6_whatif' ? 'Dynamic Multi-Factor Recalculation Engine' : 'RandomForest ML Engine (MSHA Dataset)'),
    mine_id,
    mine_name,
    sector,
    supervisor_id,
    supervisor_name,
    created_at: timestamp,
    status: 'NEW',
    inputs: JSON.parse(JSON.stringify(inputs)), // Deep clone snapshot
    output: JSON.parse(JSON.stringify(output)), // Deep clone snapshot
    notes
  };

  if (!mockStore.ai_assessments) mockStore.ai_assessments = [];
  mockStore.ai_assessments.unshift(assessmentRecord);

  // Cryptographic audit log ledger entry
  appendAuditLog({
    entityType: 'ai_situational_assessment',
    entityId: id,
    action: 'SUPERVISOR_ASSESSMENT_TRANSMITTED_TO_AUTHORITY',
    actor: req.user,
    mineId: mine_id,
    payload: {
      assessment_id: id,
      model_name,
      inputs_snapshot: inputs,
      output_snapshot: output
    }
  });

  // Authority Notification
  if (!mockStore.notifications) mockStore.notifications = [];
  mockStore.notifications.unshift({
    id: `notif-ai-${Date.now()}`,
    user_id: 'usr-auth-01',
    mine_id,
    title: `🤖 AI Assessment Received (${id})`,
    message: `${model_name} assessment dispatched from ${mine_name} (${sector}) by ${supervisor_name}.`,
    type: 'ai_assessment',
    is_read: false,
    created_at: timestamp
  });

  res.status(201).json({
    success: true,
    message: `Assessment ${id} successfully sent to Authority.`,
    assessment_id: id,
    assessment: assessmentRecord
  });
});

// GET /api/models/assessments - Fetch all submitted assessments for Authority
router.get('/assessments', authenticateToken, (req, res) => {
  const { mine_id } = req.query;
  let assessments = mockStore.ai_assessments || [];
  if (mine_id && mine_id !== 'all') {
    assessments = assessments.filter(a => a.mine_id === mine_id);
  }
  res.json(assessments);
});

// PATCH /api/models/assessments/:id/status - Update review status (NEW -> REVIEWED / ACKNOWLEDGED)
router.patch('/assessments/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status = 'REVIEWED' } = req.body;
  const item = (mockStore.ai_assessments || []).find(a => a.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Assessment record not found' });
  }
  item.status = status;
  item.updated_at = new Date().toISOString();
  res.json({ success: true, assessment: item });
});

export default router;
