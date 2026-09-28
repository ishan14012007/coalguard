import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/compliance - List all compliance items with optional filter
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, category, status } = req.query;
  let items = [...mockStore.compliance_items];

  // If role is supervisor or miner, default filter to user's mine
  if ((req.user.role === 'supervisor' || req.user.role === 'miner') && req.user.mine_id) {
    items = items.filter(item => item.mine_id === req.user.mine_id);
  } else if (mine_id) {
    items = items.filter(item => item.mine_id === mine_id);
  }

  if (category) items = items.filter(item => item.category === category);
  if (status) items = items.filter(item => item.status === status);

  // Attach mine details
  const enriched = items.map(item => {
    const mine = mockStore.mines.find(m => m.id === item.mine_id);
    const sub = mine ? mockStore.subsidiaries.find(s => s.id === mine.subsidiary_id) : null;
    return {
      ...item,
      mine_name: mine?.name || 'Unknown Mine',
      mine_code: mine?.code || 'N/A',
      subsidiary_code: sub?.code || 'CIL'
    };
  });

  res.json(enriched);
});

// POST /api/compliance - Create new statutory item
router.post('/', authenticateToken, (req, res) => {
  const { title, category, act_reference, description, due_date, mine_id, target_production_tonnes } = req.body;

  if (!title || !category || !due_date) {
    return res.status(400).json({ error: 'Title, category, and due date are required.' });
  }

  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const newItem = {
    id: `comp-${Date.now()}`,
    mine_id: targetMineId,
    title,
    category,
    act_reference: act_reference || 'Mines Act 1952',
    description: description || '',
    due_date,
    responsible_officer_id: req.user.id,
    responsible_officer_name: req.user.full_name,
    status: 'pending',
    escalation_level: 0,
    target_production_tonnes: target_production_tonnes ? Number(target_production_tonnes) : null,
    actual_production_tonnes: null,
    created_at: new Date().toISOString()
  };

  mockStore.compliance_items.unshift(newItem);

  // Blockchain-lite Audit Trail
  appendAuditLog({
    entityType: 'compliance_item',
    entityId: newItem.id,
    action: 'CREATED',
    actor: req.user,
    mineId: targetMineId,
    payload: { title, category, due_date }
  });

  res.status(201).json(newItem);
});

// PATCH /api/compliance/:id/status - Update compliance item status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  const item = mockStore.compliance_items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Compliance item not found' });
  }

  const prevStatus = item.status;
  item.status = status;
  if (remarks) item.remarks = remarks;
  item.updated_at = new Date().toISOString();

  // Blockchain-lite Audit Trail
  appendAuditLog({
    entityType: 'compliance_item',
    entityId: item.id,
    action: 'STATUS_CHANGE',
    actor: req.user,
    mineId: item.mine_id,
    payload: { from: prevStatus, to: status, remarks }
  });

  res.json(item);
});

// GET /api/compliance/production-overview
router.get('/production-overview', authenticateToken, (req, res) => {
  const productionData = mockStore.mines.map(m => {
    const sub = mockStore.subsidiaries.find(s => s.id === m.subsidiary_id);
    const target = m.monthly_target_tonnes || 100000;
    const actual = m.actual_production_tonnes || 90000;
    const deviationPct = Math.round(((target - actual) / target) * 1000) / 10;
    return {
      mine_id: m.id,
      mine_name: m.name,
      mine_code: m.code,
      subsidiary_code: sub?.code || 'CIL',
      target_tonnes: target,
      actual_tonnes: actual,
      deviation_pct: deviationPct,
      is_flagged: deviationPct > 15
    };
  });

  res.json(productionData);
});

export default router;
