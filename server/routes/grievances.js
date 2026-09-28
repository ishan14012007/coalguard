import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/grievances
router.get('/', authenticateToken, (req, res) => {
  const { mine_id, status } = req.query;
  let list = [...mockStore.grievances];

  if (req.user.role === 'miner') {
    list = list.filter(g => g.worker_id === req.user.id);
  } else if (req.user.role === 'supervisor' && req.user.mine_id) {
    list = list.filter(g => g.mine_id === req.user.mine_id);
  } else if (mine_id) {
    list = list.filter(g => g.mine_id === mine_id);
  }

  if (status) list = list.filter(g => g.status === status);

  // Compute remaining SLA hours
  const enriched = list.map(g => {
    const elapsedHours = (Date.now() - new Date(g.created_at).getTime()) / 3600000;
    const remainingHours = Math.max(0, Math.round((g.sla_hours - elapsedHours) * 10) / 10);
    const isBreached = elapsedHours > g.sla_hours && g.status !== 'resolved' && g.status !== 'closed';

    return {
      ...g,
      remaining_sla_hours: remainingHours,
      is_sla_breached: isBreached
    };
  });

  res.json(enriched);
});

// POST /api/grievances - File new grievance
router.post('/', authenticateToken, (req, res) => {
  const { category, subject, description, priority = 'medium', mine_id } = req.body;

  if (!category || !subject || !description) {
    return res.status(400).json({ error: 'Category, subject, and description are required.' });
  }

  const targetMineId = mine_id || req.user.mine_id || mockStore.mines[0].id;
  const ticketNumber = `GRV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const newGrievance = {
    id: `griev-${Date.now()}`,
    ticket_number: ticketNumber,
    worker_id: req.user.id,
    worker_name: req.user.full_name,
    mine_id: targetMineId,
    category,
    subject,
    description,
    priority,
    status: 'open',
    sla_hours: priority === 'urgent' ? 24 : priority === 'high' ? 48 : 72,
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date().toISOString()
  };

  mockStore.grievances.unshift(newGrievance);

  appendAuditLog({
    entityType: 'grievance',
    entityId: newGrievance.id,
    action: 'CREATED',
    actor: req.user,
    mineId: targetMineId,
    payload: { ticketNumber, category, priority }
  });

  res.status(201).json(newGrievance);
});

// PATCH or POST /api/grievances/:id/resolve or /status
const handleResolveGrievance = (req, res) => {
  const { id } = req.params;
  const { resolution_notes, resolution_remarks, remarks, status = 'resolved' } = req.body;

  const grievance = mockStore.grievances.find(g => g.id === id);
  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found' });
  }

  const finalNotes = resolution_notes || resolution_remarks || remarks || 'Action completed by Colliery Welfare Officer.';
  grievance.status = status;
  grievance.resolution_notes = finalNotes;
  if (status === 'resolved' || status === 'closed') {
    grievance.resolved_at = new Date().toISOString();
  }

  // Worker notification
  mockStore.notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: grievance.worker_id,
    mine_id: grievance.mine_id,
    title: `Grievance #${grievance.ticket_number} Updated`,
    message: `Your grievance has been marked as ${status.toUpperCase()}: "${finalNotes}"`,
    type: 'grievance_update',
    is_read: false,
    created_at: new Date().toISOString()
  });

  appendAuditLog({
    entityType: 'grievance',
    entityId: grievance.id,
    action: status === 'resolved' ? 'RESOLVED' : 'STATUS_UPDATED',
    actor: req.user,
    mineId: grievance.mine_id,
    payload: { ticketNumber: grievance.ticket_number, status, notes: finalNotes }
  });

  res.json(grievance);
};

router.patch('/:id/resolve', authenticateToken, handleResolveGrievance);
router.post('/:id/resolve', authenticateToken, handleResolveGrievance);
router.patch('/:id/status', authenticateToken, handleResolveGrievance);
router.post('/:id/status', authenticateToken, handleResolveGrievance);

export default router;
