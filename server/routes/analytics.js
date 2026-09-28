import express from 'express';
import { mockStore } from '../db/mockStore.js';
import { calculateMineRiskScore, detectAnomalies } from '../utils/riskEngine.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/mine/:mine_id/risk-score & /api/analytics/risk-score/:mine_id
const getRiskScoreHandler = (req, res) => {
  const mine_id = req.params.mine_id || req.query.mine_id || 'mine-demo-01';
  const mine = mockStore.mines.find(m => m.id === mine_id) || mockStore.mines[0];

  if (!mine) {
    return res.status(404).json({ error: 'Mine not found' });
  }

  // Calculate live factor inputs
  const overdueComplianceCount = mockStore.compliance_items.filter(
    c => c.mine_id === mine_id && (c.status === 'overdue' || c.status === 'escalated')
  ).length;

  const recurringViolationCount = mockStore.violations.filter(
    v => v.mine_id === mine_id && v.status !== 'verified_closed'
  ).length;

  const recentIncidentCount = mockStore.field_reports.filter(
    r => r.mine_id === mine_id
  ).length;

  const environmentalBreachCount = (mine.sensors || []).filter(
    s => s.value >= s.limit
  ).length;

  // Estimate days since last completed inspection
  const lastInspection = mockStore.inspections
    .filter(i => i.mine_id === mine_id && i.status === 'completed')
    .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];

  const daysSinceLastInspection = lastInspection?.completed_date
    ? Math.max(1, Math.round((Date.now() - new Date(lastInspection.completed_date).getTime()) / 86400000))
    : 34;

  const riskResult = calculateMineRiskScore({
    overdueComplianceCount,
    recurringViolationCount,
    daysSinceLastInspection,
    recentIncidentCount,
    environmentalBreachCount
  });

  const anomalies = detectAnomalies(mine);

  res.json({
    mine_id: mine.id,
    mine_name: mine.name,
    mine_code: mine.code,
    ...riskResult,
    anomalies
  });
};

router.get('/mine/:mine_id/risk-score', authenticateToken, getRiskScoreHandler);
router.get('/risk-score/:mine_id', authenticateToken, getRiskScoreHandler);
router.get('/risk-score', authenticateToken, getRiskScoreHandler);

// GET /api/analytics/cross-mine-risk - Ranked list of all mines by computed risk
router.get('/cross-mine-risk', authenticateToken, (req, res) => {
  const rankedMines = mockStore.mines.map(mine => {
    const sub = mockStore.subsidiaries.find(s => s.id === mine.subsidiary_id);
    const overdueCount = mockStore.compliance_items.filter(
      c => c.mine_id === mine.id && (c.status === 'overdue' || c.status === 'escalated')
    ).length;
    const activeViolations = mockStore.violations.filter(
      v => v.mine_id === mine.id && v.status !== 'verified_closed'
    ).length;
    const incidents = mockStore.field_reports.filter(r => r.mine_id === mine.id).length;
    const breaches = (mine.sensors || []).filter(s => s.value >= s.limit).length;

    const risk = calculateMineRiskScore({
      overdueComplianceCount: overdueCount,
      recurringViolationCount: activeViolations,
      daysSinceLastInspection: 28,
      recentIncidentCount: incidents,
      environmentalBreachCount: breaches
    });

    return {
      mine_id: mine.id,
      mine_name: mine.name,
      mine_code: mine.code,
      mine_type: mine.mine_type,
      subsidiary_code: sub?.code || 'CIL',
      state: mine.state,
      latitude: mine.latitude,
      longitude: mine.longitude,
      risk_score: risk.totalScore,
      risk_tier: risk.riskTier,
      badge_color: risk.badgeColor,
      overdue_compliance: overdueCount,
      active_violations: activeViolations,
      monthly_target_tonnes: mine.monthly_target_tonnes,
      actual_production_tonnes: mine.actual_production_tonnes,
      anomalies: detectAnomalies(mine)
    };
  }).sort((a, b) => b.risk_score - a.risk_score);

  res.json(rankedMines);
});

// GET /api/analytics/recurring-violations - Cross-subsidiary violation pattern analysis
router.get('/recurring-violations', authenticateToken, (req, res) => {
  const categoryCounts = {};
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

  mockStore.violations.forEach(v => {
    categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
    if (severityCounts[v.severity] !== undefined) {
      severityCounts[v.severity]++;
    }
  });

  const patterns = Object.keys(categoryCounts).map(cat => ({
    category: cat,
    label: cat.replace(/_/g, ' ').toUpperCase(),
    occurrences: categoryCounts[cat],
    riskLevel: categoryCounts[cat] > 2 ? 'HIGH_RECURRENCE' : 'MONITORED',
    recommendedMitigation: cat.includes('gas')
      ? 'Mandate secondary flame safety lamp checks before every shift change.'
      : cat.includes('safety')
      ? 'Deploy road grader and install concrete parapet blocks along haul ramps.'
      : 'Conduct mandatory toolbox refresher training.'
  }));

  res.json({
    patterns,
    categories: categoryCounts,
    severityBreakdown: severityCounts,
    totalViolationsLogged: mockStore.violations.length
  });
});

export default router;
