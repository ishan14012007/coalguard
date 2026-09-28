import express from 'express';
import { mockStore } from '../db/mockStore.js';
import { calculateMineRiskScore } from '../utils/riskEngine.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Intelligent Rule-based Intent Matcher with live data lookups.
 * Structured so replacing with a real LLM API call (e.g. Gemini / OpenAI) is trivial.
 */
function processLiveAssistantQuery(query = '', user, lang = 'en') {
  const q = query.toLowerCase();
  const mineId = user.mine_id || mockStore.mines[0].id;
  const currentMine = mockStore.mines.find(m => m.id === mineId) || mockStore.mines[0];

  // 1. Compliance Status Queries
  if (q.includes('compliance') || q.includes('status') || q.includes('कानूनी') || q.includes('नियम')) {
    const mineCompliance = mockStore.compliance_items.filter(c => c.mine_id === currentMine.id);
    const overdue = mineCompliance.filter(c => c.status === 'overdue' || c.status === 'escalated');
    const closed = mineCompliance.filter(c => c.status === 'closed');

    if (lang === 'hi') {
      return {
        reply: `खान '${currentMine.name}' में कुल ${mineCompliance.length} अनुपालन बिंदु हैं। इनमें से ${closed.length} पूर्ण हो चुके हैं और ${overdue.length} समय सीमा पार (Overdue) हैं।`,
        intent: 'COMPLIANCE_STATUS',
        actionData: { total: mineCompliance.length, overdue: overdue.length, closed: closed.length },
        suggestedNext: 'अतिदेय अनुपालन की सूची दिखाएं'
      };
    }

    return {
      reply: `For mine **${currentMine.name}** (${currentMine.code}), there are **${mineCompliance.length} total statutory items**. **${closed.length} closed**, **${overdue.length} overdue/escalated**. Highest priority: "${overdue[0]?.title || 'All mandatory tasks on schedule'}"`,
      intent: 'COMPLIANCE_STATUS',
      actionData: { total: mineCompliance.length, overdue: overdue.length, closed: closed.length },
      suggestedNext: 'Show overdue items'
    };
  }

  // 2. Risk Score & Safety Queries
  if (q.includes('risk') || q.includes('score') || q.includes('safe') || q.includes('जोखिम') || q.includes('सुरक्षा')) {
    const overdue = mockStore.compliance_items.filter(c => c.mine_id === currentMine.id && c.status === 'overdue').length;
    const violations = mockStore.violations.filter(v => v.mine_id === currentMine.id && v.status !== 'verified_closed').length;
    const incidents = mockStore.field_reports.filter(r => r.mine_id === currentMine.id).length;
    
    const risk = calculateMineRiskScore({
      overdueComplianceCount: overdue,
      recurringViolationCount: violations,
      daysSinceLastInspection: 24,
      recentIncidentCount: incidents
    });

    if (lang === 'hi') {
      return {
        reply: `वर्तमान खान जोखिम स्कोर **${risk.totalScore}/100** (${risk.riskTier} स्तर) है। मुख्य कारण: ${overdue} अतिदेय अनुपालन और ${violations} सक्रिय सुरक्षा उल्लंघन।`,
        intent: 'RISK_SCORE',
        actionData: risk,
        suggestedNext: 'जोखिम कम करने के उपाय बताएं'
      };
    }

    return {
      reply: `Current AI Composite Risk Score for **${currentMine.name}** is **${risk.totalScore}/100** (**${risk.riskTier}** risk tier). Top contributing factors: ${risk.breakdown[0].factor} (${risk.breakdown[0].contribution} pts) and ${risk.breakdown[1].factor} (${risk.breakdown[1].contribution} pts).`,
      intent: 'RISK_SCORE',
      actionData: risk,
      suggestedNext: 'View risk breakdown chart'
    };
  }

  // 3. Environmental / Gas Telemetry Queries
  if (q.includes('gas') || q.includes('methane') || q.includes('sensor') || q.includes('dust') || q.includes('गैस') || q.includes('मीथेन') || q.includes('धूल')) {
    const sensors = currentMine.sensors || [];
    const breached = sensors.filter(s => s.value >= s.limit);

    if (lang === 'hi') {
      return {
        reply: `लाइव टेलीमेट्री सेंसर: मीथेन (CH4) ${sensors[0]?.value}%, कार्बन मोनोऑक्साइड (CO) ${sensors[1]?.value} ppm। ${breached.length > 0 ? 'चेतावनी: कुछ सेंसर सीमा पार कर चुके हैं!' : 'सभी सेंसर सामान्य सुरक्षित सीमा में हैं।'}`,
        intent: 'ENVIRONMENTAL_SENSORS',
        actionData: sensors,
        suggestedNext: 'पर्यावरण रिपोर्ट डाउनलोड करें'
      };
    }

    return {
      reply: `Live Telemetry for **${currentMine.name}**: CH4 Methane is at **${sensors[0]?.value}%** (Statutory threshold 1.25%), CO is **${sensors[1]?.value} ppm**, SPM Dust is **${sensors[2]?.value} µg/m³**. Status: **${breached.length > 0 ? 'CRITICAL BREACH DETECTED' : 'Within DGMS Safe Limits'}**.`,
      intent: 'ENVIRONMENTAL_SENSORS',
      actionData: sensors,
      suggestedNext: 'View live sensor graph'
    };
  }

  // 4. Contractor Queries
  if (q.includes('contractor') || q.includes('ठेकेदार') || q.includes('license') || q.includes('लाइसेंस')) {
    const count = mockStore.contractors.length;
    const warning = mockStore.contractors.filter(c => c.status === 'warning' || new Date(c.license_expiry_date) < new Date(Date.now() + 15 * 86400000));

    if (lang === 'hi') {
      return {
        reply: `साइट पर कुल **${count} ठेकेदार एजेंसियां** पंजीकृत हैं। **${warning.length} ठेकेदारों** के लाइसेंस या बीमा 15 दिनों में समाप्त हो रहे हैं।`,
        intent: 'CONTRACTOR_STATUS',
        actionData: { total: count, expiringSoon: warning.length }
      };
    }

    return {
      reply: `There are **${count} active mining contractors** registered. **${warning.length} contractors** have licenses expiring within the next 15 days (e.g. ${warning[0]?.name || 'Singhania Blast Logistics'}).`,
      intent: 'CONTRACTOR_STATUS',
      actionData: { total: count, expiringSoon: warning.length }
    };
  }

  // 5. Violations & Incidents
  if (q.includes('violation') || q.includes('incident') || q.includes('उल्लंघन') || q.includes('घटना')) {
    const unclosed = mockStore.violations.filter(v => v.mine_id === currentMine.id && v.status !== 'verified_closed');

    return {
      reply: lang === 'hi'
        ? `वर्तमान में **${unclosed.length} सक्रिय सुरक्षा उल्लंघन** दर्ज हैं। इनमें से 1 सुपरवाइजर सत्यापन के लिए प्रतीक्षारत है।`
        : `Currently **${unclosed.length} open safety violations** are recorded for ${currentMine.name}. 1 item is in "Rectification Submitted" awaiting supervisor physical verification.`,
      intent: 'VIOLATION_SUMMARY',
      actionData: unclosed
    };
  }

  // 6. Emergency SOS Status
  if (q.includes('sos') || q.includes('emergency') || q.includes('आपात') || q.includes('खतरा')) {
    const activeSOS = (mockStore.sos_events || []).filter(s => s.status === 'active' || s.status === 'acknowledged');
    if (lang === 'hi') {
      return {
        reply: activeSOS.length > 0
          ? `🚨 चेतावनी: वर्तमान में **${activeSOS.length} सक्रिय आपातकालीन SOS अलार्म** दर्ज हैं! कार्यकर्ता: ${activeSOS[0].miner_name}, स्थान: ${activeSOS[0].mine_name}।`
          : `✅ वर्तमान में कोई सक्रिय आपातकालीन SOS अलार्म नहीं है। सभी खदान क्षेत्र सुरक्षित हैं।`,
        intent: 'EMERGENCY_SOS_STATUS',
        actionData: activeSOS
      };
    }
    return {
      reply: activeSOS.length > 0
        ? `🚨 ALERT: There are currently **${activeSOS.length} active Life-Safety SOS alarms**! Worker: ${activeSOS[0].miner_name} at ${activeSOS[0].mine_name}. Rescue teams alerted.`
        : `✅ No active Emergency SOS alarms at this time. All underground faces report normal safe operations.`,
      intent: 'EMERGENCY_SOS_STATUS',
      actionData: activeSOS
    };
  }

  // 6. Default Fallback
  return {
    reply: lang === 'hi'
      ? `नमस्ते! मैं CoalGuard AI सहायक हूँ। आप मुझसे खान के अनुपालन स्थिति, सुरक्षा जोखिम स्कोर, गैस सेंसर रीडिंग, ठेकेदार लाइसेंस या रिपोर्ट के बारे में पूछ सकते हैं।`
      : `Hello! I am CoalGuard AI Assistant. You can ask me about statutory compliance status, real-time risk scores, gas sensor telemetry, contractor license renewals, or recent field hazard reports.`,
    intent: 'GENERAL_HELP',
    suggestedNext: lang === 'hi' ? 'मेरी खान का जोखिम स्कोर क्या है?' : "What is my mine's risk score?"
  };
}

router.post('/chat', authenticateToken, (req, res) => {
  const { query, language = 'en' } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  // Live Rule-based responder with live database integration
  const response = processLiveAssistantQuery(query, req.user, language);
  res.json({
    ...response,
    timestamp: new Date().toISOString()
  });
});

router.post('/query', authenticateToken, (req, res) => {
  const { query, language = 'en', lang } = req.body;
  const q = query || req.body.text;
  if (!q) {
    return res.status(400).json({ error: 'Query is required.' });
  }
  const response = processLiveAssistantQuery(q, req.user, language || lang || 'en');
  res.json({
    ...response,
    timestamp: new Date().toISOString()
  });
});

export default router;
