import express from 'express';
import { mockStore } from '../db/mockStore.js';
import { verifyAuditChain, calculateAuditHash } from '../utils/hashChain.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit/logs - Get all audit blocks
router.get('/logs', authenticateToken, (req, res) => {
  const { mine_id, entity_type } = req.query;
  let logs = [...mockStore.audit_log];

  if (mine_id) {
    logs = logs.filter(l => l.mine_id === mine_id || !l.mine_id);
  }
  if (entity_type) {
    logs = logs.filter(l => l.entity_type === entity_type);
  }

  res.json(logs);
});

// POST or GET /api/audit/verify-integrity - Walk and verify entire SHA-256 blockchain-lite ledger
router.all(['/verify-integrity', '/verify'], authenticateToken, (req, res) => {
  const result = verifyAuditChain(mockStore.audit_log);
  res.json(result);
});

// POST /api/audit/simulate-tampering - Demo helper for judges to prove cryptographic tamper detection
router.post('/simulate-tampering', authenticateToken, (req, res) => {
  if (mockStore.audit_log.length > 2) {
    // Tamper with payload of block #2
    mockStore.audit_log[1].payload = {
      ...mockStore.audit_log[1].payload,
      TAMPERED_FLAG: 'Illegally modified violation severity from high to low by malicious actor'
    };
    res.json({
      message: 'Simulated unauthorized direct modification in Block #2 payload.',
      tamperedBlockId: mockStore.audit_log[1].id
    });
  } else {
    res.status(400).json({ error: 'Not enough audit blocks to tamper.' });
  }
});

// POST /api/audit/restore-integrity - Demo helper to restore pristine state
router.post('/restore-integrity', authenticateToken, (req, res) => {
  // Re-hash chain from genesis
  let prevHash = 'GENESIS_BLOCK_COALGUARD_2026';
  mockStore.audit_log.forEach(block => {
    delete block.payload?.TAMPERED_FLAG;
    block.previous_hash = prevHash;
    block.current_hash = calculateAuditHash({
      previousHash: prevHash,
      timestamp: block.timestamp,
      entityType: block.entity_type,
      entityId: block.entity_id,
      action: block.action,
      payload: block.payload
    });
    prevHash = block.current_hash;
  });

  res.json({ message: 'Ledger cryptographically restored to valid state.' });
});

export default router;
