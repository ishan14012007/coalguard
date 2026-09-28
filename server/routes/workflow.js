import express from 'express';
import PDFDocument from 'pdfkit';
import { mockStore, appendAuditLog } from '../db/mockStore.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Runs the daily compliance & violation escalation routine.
 * Can be called by node-cron or triggered manually via API.
 */
export function runDailyEscalationJob() {
  const now = new Date();
  const escalationsTriggered = [];

  mockStore.compliance_items.forEach(item => {
    if (item.status !== 'closed') {
      const dueDate = new Date(item.due_date);
      const daysOverdue = Math.floor((now - dueDate) / 86400000);

      // Overdue threshold: if overdue by > 0 days, escalate to Level 1 (Area/Super)
      // If overdue by > 7 days, escalate to Level 2 (Corporate HQ)
      // If overdue by > 14 days, escalate to Level 3 (DGMS / Regulatory)
      let newLevel = item.escalation_level || 0;
      if (daysOverdue > 14) newLevel = 3;
      else if (daysOverdue > 7) newLevel = 2;
      else if (daysOverdue > 0) newLevel = 1;

      if (newLevel > (item.escalation_level || 0)) {
        item.escalation_level = newLevel;
        item.status = 'escalated';
        item.last_escalated_at = now.toISOString();

        const notifTitle = `🚨 Escalation Level ${newLevel}: Statutory Compliance Overdue`;
        const notifMsg = `Item "${item.title}" is ${daysOverdue} days overdue. Escalated to ${
          newLevel === 3 ? 'DGMS Regulator' : newLevel === 2 ? 'Corporate HQ GM' : 'Colliery Agent'
        }.`;

        mockStore.notifications.unshift({
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          user_id: 'usr-super-01',
          mine_id: item.mine_id,
          title: notifTitle,
          message: notifMsg,
          type: 'escalation',
          is_read: false,
          created_at: now.toISOString()
        });

        // Audit Trail Entry
        appendAuditLog({
          entityType: 'compliance_item',
          entityId: item.id,
          action: 'ESCALATED',
          actor: { id: null, full_name: 'Workflow Automation Bot', role: 'system' },
          mineId: item.mine_id,
          payload: {
            title: item.title,
            escalation_level: newLevel,
            days_overdue: daysOverdue,
            target_authority: newLevel === 3 ? 'DGMS' : newLevel === 2 ? 'Subsidiary GM' : 'Area Safety Officer'
          }
        });

        escalationsTriggered.push({
          itemId: item.id,
          title: item.title,
          newLevel,
          daysOverdue
        });
      }
    }
  });

  return escalationsTriggered;
}

// POST /api/workflow/trigger-escalation & /escalation-sweep
const handleTriggerEscalation = (req, res) => {
  const escalations = runDailyEscalationJob();
  res.json({
    message: `Escalation sweep check complete. ${escalations.length} statutory items reviewed/escalated.`,
    escalated_count: escalations.length,
    count: escalations.length,
    escalations
  });
};

router.post('/trigger-escalation', authenticateToken, handleTriggerEscalation);
router.post('/escalation-sweep', authenticateToken, handleTriggerEscalation);

// GET /api/workflow/notifications
router.get('/notifications', authenticateToken, (req, res) => {
  const notifs = mockStore.notifications.filter(
    n => !n.user_id || n.user_id === req.user.id || req.user.role === 'authority' || req.user.role === 'corporate' || req.user.role === 'regulator'
  );
  res.json(notifs);
});

// PATCH /api/workflow/notifications/:id/read
router.patch('/notifications/:id/read', authenticateToken, (req, res) => {
  const notif = mockStore.notifications.find(n => n.id === req.params.id);
  if (notif) notif.is_read = true;
  res.json({ success: true });
});

// Handler for generating compliance PDF report
const handleExportPdf = (req, res) => {
  const mine_id = req.params.mineId || req.query.mine_id;
  const targetMine = mockStore.mines.find(m => m.id === mine_id) || mockStore.mines[0];
  const items = mockStore.compliance_items.filter(c => c.mine_id === targetMine.id);
  const violations = mockStore.violations.filter(v => v.mine_id === targetMine.id);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="CoalGuard_Statutory_Report_${targetMine.code}.pdf"`);

  doc.pipe(res);

  // PDF Header Banner
  doc.rect(40, 40, 515, 60).fill('#0f172a');
  doc.fontSize(18).fillColor('#ffffff').text('COALGUARD | STATUTORY COMPLIANCE AUDIT REPORT', 55, 55);
  doc.fontSize(10).fillColor('#94a3b8').text('Ministry of Coal | Directorate General of Mines Safety (DGMS)', 55, 78);

  doc.moveDown(3);
  doc.fillColor('#0f172a').fontSize(14).text(`Mine Details: ${targetMine.name} (${targetMine.code})`, { underline: true });
  doc.fontSize(10).fillColor('#334155').text(`State: ${targetMine.state} | Type: ${targetMine.mine_type.toUpperCase()} | Current Risk Score: ${targetMine.current_risk_score}/100`);
  doc.text(`Generated On: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} by ${req.user.full_name} (${req.user.designation || req.user.role})`);
  doc.moveDown(1.5);

  // Section 1: Statutory Compliance Status
  doc.fontSize(12).fillColor('#1e293b').text('1. Statutory Compliance Items', { underline: true });
  doc.moveDown(0.5);

  items.forEach((item, idx) => {
    doc.fontSize(10).fillColor('#0f172a').text(`${idx + 1}. [${item.category.toUpperCase()}] ${item.title}`);
    doc.fontSize(9).fillColor('#64748b').text(`   Act Ref: ${item.act_reference || 'N/A'} | Due: ${item.due_date} | Status: ${item.status.toUpperCase()} | Escalation Level: ${item.escalation_level}`);
    doc.moveDown(0.4);
  });

  doc.moveDown(1.5);

  // Section 2: Violations & Corrective Actions
  doc.fontSize(12).fillColor('#1e293b').text('2. Violations & Two-Step Rectification Records', { underline: true });
  doc.moveDown(0.5);

  violations.forEach((v, idx) => {
    doc.fontSize(10).fillColor('#0f172a').text(`${idx + 1}. [${v.severity.toUpperCase()}] ${v.title}`);
    doc.fontSize(9).fillColor('#64748b').text(`   Status: ${v.status} | Location: ${v.location_description}`);
    doc.fontSize(8).fillColor('#475569').text(`   Action Required: ${v.corrective_action_required}`);
    if (v.verified_at) {
      doc.fillColor('#15803d').text(`   Verified & Closed by: ${v.verified_by_supervisor_name || 'Supervisor'} at ${v.verified_at}`);
    }
    doc.moveDown(0.5);
  });

  doc.moveDown(2);
  // Cryptographic Signature / Watermark
  doc.rect(40, doc.y, 515, 45).fill('#f8fafc').stroke('#cbd5e1');
  doc.fontSize(8).fillColor('#475569').text('Cryptographic Verification Hash (Blockchain-Lite SHA-256):', 50, doc.y - 35);
  doc.fontSize(7).fillColor('#0284c7').text(mockStore.audit_log[mockStore.audit_log.length - 1]?.current_hash || 'GENESIS_BLOCK_COALGUARD_2026', 50, doc.y + 2);

  doc.end();
};

router.get('/export-pdf', authenticateToken, handleExportPdf);
router.get('/generate-statutory-report/:mineId', authenticateToken, handleExportPdf);

export default router;
