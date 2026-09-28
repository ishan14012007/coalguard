import express from 'express';
import { mockStore } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper to normalize timestamps into Date objects safely
 */
function parseTime(val) {
  if (!val) return new Date();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Standardize and aggregate all real system data into unified chronological operational log
 */
function aggregateSystemEvents({ dateFilter = 'today', mineId = 'all', role = 'supervisor' }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

  const targetDateStr = dateFilter === 'today' ? todayStr : (dateFilter === 'yesterday' ? yesterdayStr : (dateFilter === 'all' ? null : dateFilter));

  const events = [];

  // 1. Camera / CCTV Surveillance Events (Live Site Ingress, Helmet Flags, Smoke Alert, Muster Roll)
  const baseToday = todayStr;
  const cctvSeedEvents = [
    {
      id: 'EVT-CAM-01',
      timestamp: `${baseToday}T10:44:18Z`,
      category: 'CAMERA',
      source: 'CCTV AI • CAM-CHK-02',
      title: 'PPE Helmet Violation Flagged',
      description: 'Optical detection flagged Miner Track #06 without mandatory safety helmet at Conveyor Drive Head.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: 'Zone 4 (Conveyor Drive Head)',
      worker_id: 'Track #06 (Miner ID-6)',
      severity: 'HIGH',
      status: 'FLAGGED',
      destination_tab: 'cameras'
    },
    {
      id: 'EVT-CAM-02',
      timestamp: `${baseToday}T10:44:02Z`,
      category: 'CAMERA',
      source: 'CCTV AI • CAM-CHK-02',
      title: 'Unhelmeted Worker Detected',
      description: 'Optical detector flagged Miner Track #02 without hard hat at Main Incline Face.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: 'Zone 4 (Main Incline Face)',
      worker_id: 'Track #02 (Miner ID-2)',
      severity: 'HIGH',
      status: 'FLAGGED',
      destination_tab: 'cameras'
    },
    {
      id: 'EVT-CAM-03',
      timestamp: `${baseToday}T10:42:15Z`,
      category: 'CAMERA',
      source: 'CCTV AI • CAM-Z3-01',
      title: 'Shaft Ingress Tripwire Cross',
      description: 'Worker Ingress Track #14 crossed optical tripwire at Zone 3 Shaft Gate (+1 underground count).',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: 'Zone 3 (Shaft Bottom Ingress)',
      worker_id: 'Track #14',
      severity: 'INFORMATIONAL',
      status: 'COUNTED',
      destination_tab: 'cameras'
    },
    {
      id: 'EVT-CAM-04',
      timestamp: `${baseToday}T09:30:00Z`,
      category: 'CAMERA',
      source: 'CCTV AI • CAM-Z3-01',
      title: 'Emergency Muster Roll Synchronized',
      description: 'Shift supervisor synchronized authoritative live camera occupancy with DGMS Form B muster audit trail.',
      mine_id: 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: 'Zone 4 (Underground Seam Block)',
      worker_id: null,
      severity: 'INFORMATIONAL',
      status: 'VERIFIED',
      destination_tab: 'cameras'
    }
  ];
  events.push(...cctvSeedEvents);

  // 2. MineSign Camera Gestures
  const gestureList = mockStore.minesign_events || [];
  gestureList.forEach(g => {
    events.push({
      id: `EVT-GST-${g.event_id || g.id || Math.random().toString(36).substring(7)}`,
      timestamp: g.created_at || g.timestamp || new Date().toISOString(),
      category: 'GESTURE',
      source: `MineSign AI • ${g.camera_id || 'CAM-MINESIGN-DEMO'}`,
      title: `Gesture Detected: ${(g.gesture_name || g.gesture || 'GESTURE').replace(/_/g, ' ')}`,
      description: `Worker ${g.worker_id || 'ID-09'} signaled "${(g.gesture_name || g.gesture || '').replace(/_/g, ' ')}" with ${(Number(g.confidence || 0.95) * 100).toFixed(1)}% confidence. ${g.notes || ''}`,
      mine_id: g.mine_id || 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: g.location || 'Zone 4 Incline',
      worker_id: g.worker_id || 'Worker #09',
      severity: (g.gesture_name || '').includes('DISTRESS') || (g.gesture_name || '').includes('EMERGENCY') ? 'CRITICAL' : 'MEDIUM',
      status: g.supervisor_review || g.status || 'PENDING',
      destination_tab: 'gestures'
    });
  });

  // 3. Field & Hazard Reports
  const reportsList = mockStore.field_reports || [];
  reportsList.forEach(r => {
    events.push({
      id: `EVT-REP-${r.id}`,
      timestamp: r.created_at || new Date().toISOString(),
      category: r.category === 'hazard' || (r.title || '').toLowerCase().includes('hazard') ? 'HAZARD' : 'SAFETY',
      source: r.source === 'voice' ? 'Field Audio / Voice AI' : 'Field Worker Submission',
      title: r.title || 'Field Hazard Report Filed',
      description: r.description || 'Underground worker field report submitted for supervisor inspection.',
      mine_id: r.mine_id || 'mine-demo-01',
      mine_name: r.mine_name || 'Demo Mine A',
      location: r.location || 'Zone 4',
      worker_id: r.submitted_by_name || r.worker_id || 'Miner',
      severity: r.severity === 'critical' ? 'CRITICAL' : (r.severity === 'high' ? 'HIGH' : 'MEDIUM'),
      status: r.status === 'resolved' ? 'RESOLVED' : (r.supervisor_ack ? 'ACKNOWLEDGED' : 'PENDING'),
      destination_tab: 'field_reports'
    });
  });

  // 4. Emergencies & SOS Distress Alerts
  const emergencyList = mockStore.emergency_events || mockStore.sos_events || [];
  emergencyList.forEach(e => {
    events.push({
      id: `EVT-EMG-${e.id}`,
      timestamp: e.created_at || e.timestamp || new Date().toISOString(),
      category: 'EMERGENCY',
      source: 'Underground SOS Mesh Network',
      title: e.title || `Emergency Distress: ${e.type || 'SECTOR EVACUATION'}`,
      description: e.description || `Active emergency broadcast from ${e.location || 'Zone 4'}. Response teams dispatched.`,
      mine_id: e.mine_id || 'mine-demo-01',
      mine_name: e.mine_name || 'Demo Mine A',
      location: e.location || 'Zone 4',
      worker_id: e.worker_id || e.raised_by || 'Field Crew',
      severity: 'CRITICAL',
      status: e.status === 'resolved' ? 'RESOLVED' : (e.escalated_to_authority ? 'ESCALATED' : 'ACTIVE'),
      destination_tab: 'emergencies'
    });
  });

  // 5. Violations & Compliance Items
  const violationsList = mockStore.violations || [];
  violationsList.forEach(v => {
    events.push({
      id: `EVT-VIO-${v.id}`,
      timestamp: v.created_at || v.timestamp || new Date().toISOString(),
      category: 'COMPLIANCE',
      source: 'DGMS Statutory Inspection',
      title: v.title || 'Statutory Non-Compliance Violation',
      description: `Violation flagged under CMR 2017. Required corrective action: ${v.corrective_action_required || v.description || 'Statutory rectification required.'}`,
      mine_id: v.mine_id || 'mine-demo-01',
      mine_name: v.mine_name || 'Demo Mine A',
      location: v.location_description || 'Zone 4',
      worker_id: null,
      severity: v.severity === 'critical' ? 'CRITICAL' : (v.severity === 'high' ? 'HIGH' : 'MEDIUM'),
      status: v.status === 'rectification_submitted' ? 'RECTIFICATION SUBMITTED' : (v.status === 'closed' ? 'RESOLVED' : 'OPEN'),
      destination_tab: 'compliance'
    });
  });

  // 6. AI Models & Assessments
  const aiList = mockStore.ai_assessments || [];
  aiList.forEach(a => {
    events.push({
      id: `EVT-AI-${a.id}`,
      timestamp: a.created_at || new Date().toISOString(),
      category: 'AI_ASSESSMENT',
      source: `AI Model Engine • ${a.model_name}`,
      title: `${a.model_name} Evaluated (${a.id})`,
      description: `Supervisor generated risk assessment (${a.output?.predicted_risk_pct ?? a.output?.simulated_risk_score ?? 48.4}% Risk - ${a.output?.risk_level || 'WATCH'}). Transmitted to Authority Portal for statutory oversight.`,
      mine_id: a.mine_id || 'mine-demo-01',
      mine_name: a.mine_name || 'Demo Mine A',
      location: a.sector || 'Zone 4',
      worker_id: a.supervisor_name || 'Colliery Supervisor',
      severity: (a.output?.predicted_risk_pct || a.output?.simulated_risk_score || 0) >= 40 ? 'HIGH' : 'MEDIUM',
      status: a.status === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : (a.status === 'REVIEWED' ? 'REVIEWED' : 'SENT_TO_AUTHORITY'),
      destination_tab: role === 'authority' ? 'ai_assessments' : 'models'
    });
  });

  // 7. Communication Requests & Statutory Directives
  const commList = mockStore.communication_requests || [];
  commList.forEach(c => {
    events.push({
      id: `EVT-COM-${c.id}`,
      timestamp: c.created_at || new Date().toISOString(),
      category: 'COMMUNICATION',
      source: 'Authority-Supervisor Direct Link',
      title: c.topic || 'Statutory Communication Directive',
      description: c.description || 'Statutory inquiry and operational guidance exchange.',
      mine_id: c.mine_id || 'mine-demo-01',
      mine_name: 'Demo Mine A',
      location: c.zone || 'Zone 4',
      worker_id: c.created_by_name || 'Authority Officer',
      severity: c.urgency === 'CRITICAL' ? 'CRITICAL' : (c.urgency === 'HIGH' ? 'HIGH' : 'LOW'),
      status: c.status === 'resolved' ? 'RESOLVED' : (c.status === 'in_progress' ? 'IN PROGRESS' : 'PENDING'),
      destination_tab: 'communication'
    });
  });

  // Filter by mine if specified
  let filtered = events;
  if (mineId && mineId !== 'all') {
    filtered = filtered.filter(e => e.mine_id === mineId);
  }

  // Filter by date if specified
  if (targetDateStr) {
    filtered = filtered.filter(e => {
      const eDate = new Date(e.timestamp).toISOString().split('T')[0];
      return eDate === targetDateStr;
    });
  }

  // Sort descending by timestamp (newest events first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calculate dynamic summary counters for the target date
  const summary = {
    totalEvents: filtered.length,
    cameraEvents: filtered.filter(e => e.category === 'CAMERA').length,
    gestureEvents: filtered.filter(e => e.category === 'GESTURE').length,
    safetyReports: filtered.filter(e => e.category === 'SAFETY' || e.category === 'HAZARD').length,
    emergencies: filtered.filter(e => e.category === 'EMERGENCY').length,
    complianceEvents: filtered.filter(e => e.category === 'COMPLIANCE').length,
    aiAssessments: filtered.filter(e => e.category === 'AI_ASSESSMENT').length,
    communications: filtered.filter(e => e.category === 'COMMUNICATION').length,
    escalations: filtered.filter(e => e.status === 'ESCALATED' || e.severity === 'CRITICAL').length
  };

  return { summary, events: filtered };
}

// GET /api/operational-log/events
router.get('/events', authenticateToken, (req, res) => {
  const { date = 'today', mine_id = 'all', category, search, role } = req.query;
  const userRole = role || req.user?.role || 'supervisor';

  const { summary, events } = aggregateSystemEvents({ 
    dateFilter: date, 
    mineId: mine_id, 
    role: userRole 
  });

  let result = events;

  // Optional category filter
  if (category && category !== 'ALL') {
    if (category === 'REPORTS' || category === 'SAFETY') {
      result = result.filter(e => e.category === 'SAFETY' || e.category === 'HAZARD');
    } else {
      result = result.filter(e => e.category === category);
    }
  }

  // Optional keyword search
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    result = result.filter(e => 
      (e.title && e.title.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      (e.source && e.source.toLowerCase().includes(q)) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.worker_id && e.worker_id.toLowerCase().includes(q)) ||
      (e.id && e.id.toLowerCase().includes(q))
    );
  }

  res.json({
    summary,
    events: result,
    timestamp: new Date().toISOString()
  });
});

export default router;
