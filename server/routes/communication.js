import express from 'express';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

if (!mockStore.communication_requests) mockStore.communication_requests = [];
if (!mockStore.communication_messages) mockStore.communication_messages = [];
if (!mockStore.miner_queries) mockStore.miner_queries = [];

/**
 * GET /api/communication/requests
 * Lists communication requests. Supervisors see their own/mine; Authorities see all.
 */
router.get('/requests', authenticateToken, (req, res) => {
  let list = [...mockStore.communication_requests];

  if (req.user.role === 'supervisor') {
    list = list.filter(r => r.requested_by === req.user.id || r.mine_id === req.user.mine_id);
  }

  res.json(list);
});

/**
 * POST /api/communication/requests
 * Supervisor submits a formal communication request to Authority.
 */
router.post('/requests', authenticateToken, (req, res) => {
  const { topic, description, urgency = 'MEDIUM', zone = 'Zone 4' } = req.body;

  if (!topic || !description) {
    return res.status(400).json({ error: 'Topic and description are mandatory.' });
  }

  const newReq = {
    id: `comm-req-${Date.now()}`,
    topic,
    description,
    urgency: urgency.toUpperCase(),
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    requested_by: req.user.id,
    supervisor_name: req.user.full_name,
    mine_id: req.user.mine_id || 'mine-demo-01',
    zone,
    created_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    review_notes: null
  };

  mockStore.communication_requests.unshift(newReq);

  // Notify Authority
  mockStore.notifications.unshift({
    id: `notif-comm-${Date.now()}`,
    user_id: 'usr-auth-01',
    mine_id: newReq.mine_id,
    title: `📩 Supervisor Communication Request: [${newReq.urgency}] ${newReq.topic}`,
    message: `${req.user.full_name} submitted a formal communication request for ${newReq.zone}. Requires Authority review.`,
    type: 'alert',
    is_read: false,
    created_at: newReq.created_at
  });

  appendAuditLog({
    entityType: 'communication_request',
    entityId: newReq.id,
    action: 'COMMUNICATION_REQUESTED',
    actor: req.user,
    mineId: newReq.mine_id,
    payload: { topic, urgency, zone }
  });

  res.status(201).json({
    message: 'Communication request submitted for Authority approval.',
    request: newReq
  });
});

/**
 * PATCH /api/communication/requests/:id/decision
 * Authority approves or rejects a communication request.
 */
router.patch('/requests/:id/decision', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { decision, review_notes } = req.body; // decision: 'approved' | 'rejected'

  if (req.user.role !== 'authority' && req.user.role !== 'corporate' && req.user.role !== 'regulator') {
    return res.status(403).json({ error: 'Only Authority can approve or reject communication requests.' });
  }

  const request = mockStore.communication_requests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Communication request not found.' });
  }

  const finalDecision = (decision || '').toLowerCase() === 'approved' ? 'approved' : 'rejected';
  request.status = finalDecision;
  request.reviewed_by = req.user.full_name;
  request.reviewed_at = new Date().toISOString();
  request.review_notes = review_notes || (finalDecision === 'approved' ? 'Communication channel approved for this case.' : 'Communication request declined.');

  // Notify Supervisor
  mockStore.notifications.unshift({
    id: `notif-comm-dec-${Date.now()}`,
    user_id: request.requested_by,
    mine_id: request.mine_id,
    title: finalDecision === 'approved' ? `✅ Communication Channel Approved: ${request.topic}` : `❌ Communication Request Rejected: ${request.topic}`,
    message: `Authority ${req.user.full_name} has ${finalDecision.toUpperCase()} your request. Remarks: "${request.review_notes}"`,
    type: finalDecision === 'approved' ? 'alert' : 'warning',
    is_read: false,
    created_at: request.reviewed_at
  });

  appendAuditLog({
    entityType: 'communication_request',
    entityId: request.id,
    action: finalDecision === 'approved' ? 'COMMUNICATION_APPROVED' : 'COMMUNICATION_REJECTED',
    actor: req.user,
    mineId: request.mine_id,
    payload: { topic: request.topic, decision: finalDecision, review_notes: request.review_notes }
  });

  res.json({
    message: `Communication request ${finalDecision}.`,
    request
  });
});

/**
 * GET /api/communication/messages/:requestId
 * Retrieves messages for an approved communication case.
 */
router.get('/messages/:requestId', authenticateToken, (req, res) => {
  const { requestId } = req.params;
  const messages = mockStore.communication_messages.filter(m => m.request_id === requestId);
  res.json(messages);
});

/**
 * POST /api/communication/messages
 * Sends message within approved case or direct thread.
 */
router.post('/messages', authenticateToken, (req, res) => {
  const { request_id, message } = req.body;

  if (!request_id || !message || !message.trim()) {
    return res.status(400).json({ error: 'Request ID and message content are required.' });
  }

  // If sender is supervisor, check that request is approved
  if (req.user.role === 'supervisor') {
    const reqRecord = mockStore.communication_requests.find(r => r.id === request_id);
    if (!reqRecord || reqRecord.status !== 'approved') {
      return res.status(403).json({
        error: 'Channel Not Approved',
        message: 'Supervisors can only post messages to Authority-approved communication cases.'
      });
    }
  }

  const newMsg = {
    id: `msg-${Date.now()}`,
    request_id,
    sender_id: req.user.id,
    sender_name: req.user.full_name,
    sender_role: req.user.role,
    message: message.trim(),
    timestamp: new Date().toISOString()
  };

  mockStore.communication_messages.push(newMsg);

  appendAuditLog({
    entityType: 'communication_message',
    entityId: newMsg.id,
    action: 'MESSAGE_SENT',
    actor: req.user,
    mineId: req.user.mine_id || 'mine-demo-01',
    payload: { request_id, sender_role: req.user.role }
  });

  res.status(201).json(newMsg);
});

/**
 * GET /api/communication/miner-queries
 * Lists miner questions / requests.
 */
router.get('/miner-queries', authenticateToken, (req, res) => {
  let list = [...mockStore.miner_queries];

  if (req.user.role === 'miner') {
    list = list.filter(q => q.miner_id === req.user.id);
  }

  res.json(list);
});

/**
 * POST /api/communication/miner-queries
 * Miner submits question/issue to Supervisor.
 */
router.post('/miner-queries', authenticateToken, (req, res) => {
  const { subject, message, urgency = 'MEDIUM', zone = 'Zone 4' } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  const newQuery = {
    id: `query-${Date.now()}`,
    miner_id: req.user.id,
    miner_name: req.user.full_name,
    zone,
    subject,
    message,
    urgency: urgency.toUpperCase(),
    status: 'open',
    response: null,
    responded_by: null,
    created_at: new Date().toISOString(),
    responded_at: null
  };

  mockStore.miner_queries.unshift(newQuery);

  // Notify Supervisor
  mockStore.notifications.unshift({
    id: `notif-mq-${Date.now()}`,
    user_id: 'usr-super-01',
    mine_id: req.user.mine_id || 'mine-demo-01',
    title: `👷 Miner Question: ${subject}`,
    message: `${req.user.full_name} asked: "${message.slice(0, 80)}..."`,
    type: 'alert',
    is_read: false,
    created_at: newQuery.created_at
  });

  appendAuditLog({
    entityType: 'miner_query',
    entityId: newQuery.id,
    action: 'QUERY_SUBMITTED',
    actor: req.user,
    mineId: req.user.mine_id || 'mine-demo-01',
    payload: { subject, urgency, zone }
  });

  res.status(201).json(newQuery);
});

/**
 * PATCH /api/communication/miner-queries/:id/respond
 * Supervisor responds to Miner question.
 */
router.patch('/miner-queries/:id/respond', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  const query = mockStore.miner_queries.find(q => q.id === id);
  if (!query) {
    return res.status(404).json({ error: 'Query not found' });
  }

  query.status = 'answered';
  query.response = response || 'Supervisor acknowledged and reviewed inquiry.';
  query.responded_by = req.user.full_name;
  query.responded_at = new Date().toISOString();

  // Notify Miner
  mockStore.notifications.unshift({
    id: `notif-mq-resp-${Date.now()}`,
    user_id: query.miner_id,
    mine_id: req.user.mine_id || 'mine-demo-01',
    title: `💬 Supervisor Response to: "${query.subject}"`,
    message: `${req.user.full_name} replied: "${query.response}"`,
    type: 'alert',
    is_read: false,
    created_at: query.responded_at
  });

  appendAuditLog({
    entityType: 'miner_query',
    entityId: query.id,
    action: 'QUERY_ANSWERED',
    actor: req.user,
    mineId: req.user.mine_id || 'mine-demo-01',
    payload: { query_id: query.id, response: query.response }
  });

  res.json(query);
});

export default router;
