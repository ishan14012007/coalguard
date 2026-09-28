import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/inspections
router.get('/', authenticateToken, (req, res) => {
  const { mine_id } = req.query;
  let list = [...mockStore.inspections];

  if ((req.user.role === 'supervisor' || req.user.role === 'miner') && req.user.mine_id) {
    list = list.filter(i => i.mine_id === req.user.mine_id);
  } else if (mine_id) {
    list = list.filter(i => i.mine_id === mine_id);
  }

  const enriched = list.map(item => {
    const mine = mockStore.mines.find(m => m.id === item.mine_id);
    return {
      ...item,
      mine_name: mine?.name || 'Unknown Mine',
      mine_code: mine?.code || 'N/A'
    };
  });

  res.json(enriched);
});

// POST /api/inspections - Schedule or record inspection
router.post('/', authenticateToken, (req, res) => {
  const { mine_id, inspection_type, scheduled_date, notes, checklist_data } = req.body;

  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const newInspection = {
    id: `insp-${Date.now()}`,
    mine_id: targetMineId,
    inspector_id: req.user.id,
    inspector_name: req.user.full_name,
    scheduled_date: scheduled_date || new Date().toISOString().split('T')[0],
    completed_date: null,
    inspection_type: inspection_type || 'routine_internal',
    status: 'scheduled',
    score: null,
    checklist_data: checklist_data || {},
    notes: notes || '',
    created_at: new Date().toISOString()
  };

  mockStore.inspections.unshift(newInspection);

  appendAuditLog({
    entityType: 'inspection',
    entityId: newInspection.id,
    action: 'SCHEDULED',
    actor: req.user,
    mineId: targetMineId,
    payload: { inspection_type, scheduled_date }
  });

  res.status(201).json(newInspection);
});

// POST /api/inspections/:id/submit-checklist - Complete inspection with checklist
router.post('/:id/submit-checklist', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { checklist_data, score, notes } = req.body;

  const inspection = mockStore.inspections.find(i => i.id === id);
  if (!inspection) {
    return res.status(404).json({ error: 'Inspection not found' });
  }

  inspection.checklist_data = checklist_data || inspection.checklist_data;
  inspection.score = score !== undefined ? Number(score) : 85;
  inspection.notes = notes || inspection.notes;
  inspection.completed_date = new Date().toISOString();
  inspection.status = 'completed';

  appendAuditLog({
    entityType: 'inspection',
    entityId: inspection.id,
    action: 'COMPLETED',
    actor: req.user,
    mineId: inspection.mine_id,
    payload: { score: inspection.score, checklist_items_count: Object.keys(checklist_data || {}).length }
  });

  res.json(inspection);
});

export default router;
