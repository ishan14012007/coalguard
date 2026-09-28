import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to compute portable score dynamically
function calculatePortableComplianceScore(contractor) {
  let score = 100;

  // Penalize for violations
  score -= (contractor.violationsCount || 0) * 8;

  // Penalize for poor training compliance
  if (contractor.training_compliance_pct < 80) {
    score -= (80 - contractor.training_compliance_pct) * 0.5;
  }

  // Penalize for license expiring in < 15 days
  const daysToLicenseExpiry = Math.round((new Date(contractor.license_expiry_date) - Date.now()) / 86400000);
  if (daysToLicenseExpiry < 0) {
    score -= 30; // Expired!
  } else if (daysToLicenseExpiry < 15) {
    score -= 10;
  }

  return Math.max(10, Math.min(100, Math.round(score * 10) / 10));
}

// GET /api/contractors
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, status } = req.query;
  let list = [...mockStore.contractors];

  if ((req.user.role === 'supervisor' || req.user.role === 'miner') && req.user.mine_id) {
    list = list.filter(c => c.mine_id === req.user.mine_id);
  } else if (mine_id) {
    list = list.filter(c => c.mine_id === mine_id);
  }

  if (status) {
    list = list.filter(c => c.status === status);
  }

  const enriched = list.map(c => {
    const mine = mockStore.mines.find(m => m.id === c.mine_id);
    const sub = mockStore.subsidiaries.find(s => s.id === c.subsidiary_id);
    const daysToExpiry = Math.round((new Date(c.license_expiry_date) - Date.now()) / 86400000);
    const computedScore = calculatePortableComplianceScore(c);

    return {
      ...c,
      mine_name: mine?.name || 'All Sites',
      subsidiary_code: sub?.code || 'CIL',
      days_to_license_expiry: daysToExpiry,
      is_expiring_soon: daysToExpiry >= 0 && daysToExpiry <= 15,
      is_license_expired: daysToExpiry < 0,
      portable_compliance_score: computedScore
    };
  });

  res.json(enriched);
});

// POST /api/contractors - Onboard contractor
router.post('/', authenticateToken, (req, res) => {
  const {
    name,
    company_reg_no,
    service_type,
    active_workers_count,
    license_number,
    license_expiry_date,
    insurance_expiry_date,
    mine_id
  } = req.body;

  if (!name || !company_reg_no || !license_expiry_date) {
    return res.status(400).json({ error: 'Name, registration number, and license expiry date are required.' });
  }

  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const newContractor = {
    id: `cont-${Date.now()}`,
    name,
    company_reg_no,
    subsidiary_id: req.user.subsidiary_id || 'sub-bccl-01',
    mine_id: targetMineId,
    service_type: service_type || 'General Mining Services',
    active_workers_count: Number(active_workers_count) || 10,
    safety_rating: 5.0,
    training_compliance_pct: 100.0,
    license_number: license_number || 'PESO/CONT/2026/01',
    license_expiry_date,
    insurance_expiry_date: insurance_expiry_date || license_expiry_date,
    portable_compliance_score: 98.0,
    status: 'compliant',
    violationsCount: 0,
    created_at: new Date().toISOString()
  };

  mockStore.contractors.unshift(newContractor);

  appendAuditLog({
    entityType: 'contractor',
    entityId: newContractor.id,
    action: 'CREATED',
    actor: req.user,
    mineId: targetMineId,
    payload: { name, company_reg_no, license_expiry_date }
  });

  res.status(201).json(newContractor);
});

export default router;
