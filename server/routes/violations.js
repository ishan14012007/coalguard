import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// GET /api/violations
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, status, severity, category } = req.query;
  let list = [...mockStore.violations];

  if ((req.user.role === 'supervisor' || req.user.role === 'miner') && req.user.mine_id) {
    list = list.filter(v => v.mine_id === req.user.mine_id);
  } else if (mine_id) {
    list = list.filter(v => v.mine_id === mine_id);
  }

  if (status) list = list.filter(v => v.status === status);
  if (severity) list = list.filter(v => v.severity === severity);
  if (category) list = list.filter(v => v.category === category);

  const enriched = list.map(v => {
    const mine = mockStore.mines.find(m => m.id === v.mine_id);
    return {
      ...v,
      mine_name: mine?.name || 'Unknown Mine',
      mine_code: mine?.code || 'N/A'
    };
  });

  res.json(enriched);
});

// POST /api/violations - Report a violation
router.post('/', authenticateToken, (req, res) => {
  const {
    title,
    category,
    severity,
    location_description,
    latitude,
    longitude,
    photo_url,
    corrective_action_required,
    deadline,
    mine_id
  } = req.body;

  if (!title || !category || !severity) {
    return res.status(400).json({ error: 'Missing required violation parameters: title, category, and severity are required.' });
  }

  const targetDeadline = deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const targetCorrective = corrective_action_required || 'Immediate physical rectification and safety compliance review required.';
  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const newViolation = {
    id: `viol-${Date.now()}`,
    mine_id: targetMineId,
    inspection_id: req.body.inspection_id || null,
    reported_by: req.user.id,
    reported_by_name: req.user.full_name,
    title,
    category,
    severity,
    location_description: location_description || 'Operational Face Section',
    latitude: latitude ? Number(latitude) : 23.7508,
    longitude: longitude ? Number(longitude) : 86.4192,
    photo_url: photo_url || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
    status: 'action_assigned',
    corrective_action_required,
    assigned_to: req.user.id,
    assigned_to_name: req.user.full_name,
    deadline,
    rectification_proof_photo_url: null,
    rectification_submitted_at: null,
    rectification_latitude: null,
    rectification_longitude: null,
    verified_by_supervisor_id: null,
    verified_at: null,
    closure_remarks: null,
    created_at: new Date().toISOString()
  };

  mockStore.violations.unshift(newViolation);

  // Blockchain-lite Audit Trail
  appendAuditLog({
    entityType: 'violation',
    entityId: newViolation.id,
    action: 'CREATED',
    actor: req.user,
    mineId: targetMineId,
    payload: { title, severity, category, deadline }
  });

  res.status(201).json(newViolation);
});

// STEP 1: Submit Rectification Proof (Photo + Geo-location)
router.post('/:id/submit-rectification', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { proof_photo_url, latitude, longitude, action_notes } = req.body;

  const violation = mockStore.violations.find(v => v.id === id);
  if (!violation) {
    return res.status(404).json({ error: 'Violation record not found' });
  }

  if (violation.status === 'verified_closed') {
    return res.status(400).json({ error: 'Violation is already verified and closed.' });
  }

  violation.status = 'rectification_submitted';
  violation.rectification_proof_photo_url = proof_photo_url || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80';
  violation.rectification_submitted_at = new Date().toISOString();
  violation.rectification_latitude = latitude ? Number(latitude) : 23.7508;
  violation.rectification_longitude = longitude ? Number(longitude) : 86.4192;
  violation.rectification_notes = action_notes || 'Physical corrective measures completed on-site.';

  // Blockchain-lite Audit Trail
  appendAuditLog({
    entityType: 'violation',
    entityId: violation.id,
    action: 'RECTIFICATION_SUBMITTED',
    actor: req.user,
    mineId: violation.mine_id,
    payload: {
      proof_photo_url: violation.rectification_proof_photo_url,
      geo_lat: violation.rectification_latitude,
      geo_lng: violation.rectification_longitude
    }
  });

  res.json({
    message: 'Rectification proof uploaded successfully. Awaiting Supervisor verification.',
    violation
  });
});

// STEP 2: Supervisor 2nd-step Verification & Final Closure
router.post('/:id/verify-closure', authenticateToken, authorizeRoles('supervisor', 'corporate', 'regulator'), (req, res) => {
  const { id } = req.params;
  const { remarks, is_approved = true } = req.body;

  const violation = mockStore.violations.find(v => v.id === id);
  if (!violation) {
    return res.status(404).json({ error: 'Violation record not found' });
  }

  if (violation.status !== 'rectification_submitted' && !violation.rectification_proof_photo_url) {
    return res.status(400).json({
      error: 'Cannot verify closure: Geo-tagged rectification photo proof must be submitted in Step 1 first.'
    });
  }

  if (is_approved) {
    violation.status = 'verified_closed';
    violation.verified_by_supervisor_id = req.user.id;
    violation.verified_by_supervisor_name = req.user.full_name;
    violation.verified_at = new Date().toISOString();
    violation.closure_remarks = remarks || 'Physical site inspection verified. Complies with statutory DGMS norms.';

    // Blockchain-lite Audit Trail
    appendAuditLog({
      entityType: 'violation',
      entityId: violation.id,
      action: 'VERIFIED_CLOSED',
      actor: req.user,
      mineId: violation.mine_id,
      payload: {
        verified_by: req.user.full_name,
        closure_remarks: violation.closure_remarks
      }
    });

    res.json({
      message: 'Violation verified and marked officially CLOSED in the audit log.',
      violation
    });
  } else {
    violation.status = 'action_assigned';
    violation.closure_remarks = `Rectification rejected: ${remarks || 'Proof inadequate, re-inspection required'}`;
    
    appendAuditLog({
      entityType: 'violation',
      entityId: violation.id,
      action: 'RECTIFICATION_REJECTED',
      actor: req.user,
      mineId: violation.mine_id,
      payload: { reason: remarks }
    });

    res.json({
      message: 'Rectification rejected. Returned to action assigned stage.',
      violation
    });
  }
});

export default router;
