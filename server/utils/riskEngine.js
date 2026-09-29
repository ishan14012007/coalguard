/**
 * Explainable Weighted Risk Scoring, Situational AI Models & Anomaly Detection Engine
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FOREST_PATH = path.join(__dirname, 'model4_forest.json');

let cachedForest = null;
function getForest() {
  if (!cachedForest) {
    if (fs.existsSync(FOREST_PATH)) {
      cachedForest = JSON.parse(fs.readFileSync(FOREST_PATH, 'utf8'));
    } else {
      throw new Error(`Model 4 decision forest artifact not found at ${FOREST_PATH}`);
    }
  }
  return cachedForest;
}

/**
 * Fuzzy / token matching for categorical classes
 */
function findClassIndex(classes, val) {
  if (!val || typeof val !== 'string') {
    const unkIdx = classes.indexOf('<UNKNOWN>');
    return unkIdx !== -1 ? unkIdx : 0;
  }
  // 1. Exact match
  let idx = classes.indexOf(val);
  if (idx !== -1) return idx;

  // 2. Case-insensitive exact match
  const lowerVal = val.toLowerCase().trim();
  idx = classes.findIndex(c => c.toLowerCase() === lowerVal);
  if (idx !== -1) return idx;

  // 3. Prefix match
  idx = classes.findIndex(c => c.toLowerCase().startsWith(lowerVal) || lowerVal.startsWith(c.toLowerCase()));
  if (idx !== -1) return idx;

  // 4. Substring containment
  idx = classes.findIndex(c => c.toLowerCase().includes(lowerVal) || lowerVal.includes(c.toLowerCase()));
  if (idx !== -1) return idx;

  // 5. Keyword token overlap
  const valTokens = lowerVal.split(/[\s/,-]+/).filter(t => t.length > 2);
  let bestIdx = -1;
  let maxOverlap = 0;
  classes.forEach((c, i) => {
    if (c === '<UNKNOWN>' || c === 'UNKNOWN') return;
    const cTokens = c.toLowerCase().split(/[\s/,-]+/).filter(t => t.length > 2);
    let overlap = 0;
    for (const vt of valTokens) {
      if (cTokens.includes(vt)) overlap++;
    }
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestIdx = i;
    }
  });
  if (bestIdx !== -1 && maxOverlap >= 2) return bestIdx;

  const unkIdx = classes.indexOf('<UNKNOWN>');
  return unkIdx !== -1 ? unkIdx : 0;
}

/**
 * Evaluate Model 4 Random Forest across all decision trees in pure JS (<0.1ms)
 */
function evaluateForest(forest, featVals) {
  let sumProb = 0;
  const numTrees = forest.trees.length;
  for (let i = 0; i < numTrees; i++) {
    const t = forest.trees[i];
    let node = 0;
    while (t.feature[node] !== -2) {
      const featIdx = t.feature[node];
      const val = featVals[featIdx];
      if (val <= t.threshold[node]) {
        node = t.left[node];
      } else {
        node = t.right[node];
      }
    }
    sumProb += t.prob1[node];
  }
  return sumProb / numTrees;
}

/**
 * Get Model 4 categorical options for UI dropdowns (In-Process)
 */
export function getModel4Options() {
  const forest = getForest();
  const options = {};
  for (const [k, v] of Object.entries(forest.encoders)) {
    const opts = v.filter(x => x !== '<UNKNOWN>' && x !== 'UNKNOWN');
    opts.sort();
    options[k] = opts;
  }
  return {
    options,
    baseline_risk: Math.round(forest.baseline * 10000) / 100
  };
}

/**
 * Predict situational risk probability using Model 4 Random Forest (In-Process)
 */
export function predictSituationalRisk(inputs = {}) {
  const forest = getForest();
  const featOrder = forest.features;
  const encodedVals = [];

  for (const feat of featOrder) {
    const classes = forest.encoders[feat] || [];
    const rawVal = inputs[feat];
    encodedVals.push(findClassIndex(classes, rawVal));
  }

  const prob = evaluateForest(forest, encodedVals);
  const baseline = forest.baseline;
  const baselinePct = baseline * 100;
  const probPct = prob * 100;
  const delta = probPct - baselinePct;

  let level = 'MODERATE';
  let color = 'blue';
  let explanation = 'AVERAGE RISK: Risk levels consistent with typical underground coal operations baseline.';

  if (prob > baseline * 1.5) {
    level = 'CRITICAL';
    color = 'red';
    explanation = 'HIGH RISK: This specific combination of operational activity, equipment, time of shift, and worker experience presents significantly elevated probability of severe incidents.';
  } else if (prob > baseline * 1.1) {
    level = 'WATCH';
    color = 'orange';
    explanation = 'ELEVATED RISK: Higher than baseline risk. Requires heightened supervisor oversight and equipment pre-checks.';
  } else if (prob < baseline * 0.7) {
    level = 'SAFE';
    color = 'emerald';
    explanation = 'LOW RISK: Statistical situational risk is comfortably below industry baseline. Standard safety protocols apply.';
  }

  return {
    baseline_risk_pct: Math.round(baselinePct * 10) / 10,
    predicted_risk_pct: Math.round(probPct * 10) / 10,
    delta_pct: Math.round(delta * 10) / 10,
    risk_level: level,
    risk_color: color,
    explanation,
    inputs
  };
}

/**
 * Run Model 6 What-If Risk Simulator (In-Process)
 */
export function simulateWhatIfRisk(params = {}) {
  const baseActivity = params.activity || 'Continuous Miner Operations';
  const rainfallAnomalyMm = Number(params.rainfall_anomaly_mm) || 0;
  const experienceRatio = params.experience_ratio_pct !== undefined ? Number(params.experience_ratio_pct) : 70;
  const equipmentType = params.equipment || 'Continuous miner';
  const shiftTime = params.shift || 'Morning Shift (0600-1400)';
  const gasPpm = params.gas_ppm !== undefined ? Number(params.gas_ppm) : 350;
  const monsoonFactor = Number(params.monsoon_factor) || 1.0;

  // Calculate base risk from Model 4 situational engine
  const m4Input = {
    AI_ACTY_DESC: baseActivity.includes('Continuous') ? 'Continuous miner' : 'Handling supplies or material',
    MINING_EQUIP: equipmentType.includes('Continuous') ? 'Continuous miner, Tunnel borer, Road header' : 'Conveyor, Belt feeder, Stage loader, Hopper shaker, Belt structure',
    UG_LOCATION: baseActivity.includes('Continuous') ? 'FACE' : 'INTERSECTION',
    COAL_METAL_IND: 'C',
    EXPER_TOT_CALC: experienceRatio > 75 ? '>10 Years' : (experienceRatio > 40 ? '1-5 Years' : '<1 Year'),
    ACCIDENT_TIME: shiftTime,
    UG_MINING_METHOD: 'Continuous Mining',
    AI_CLASS_DESC: 'FALL OF FACE/RIB/PILLAR/SIDE/HIGHWALL'
  };

  const baseRes = predictSituationalRisk(m4Input);
  const simulatedScore = baseRes.predicted_risk_pct;

  // Environmental Rainfall Inundation modifier (Model 6 rainfall dataset equations)
  let rainfallPenalty = 0.0;
  if (rainfallAnomalyMm > 150) {
    rainfallPenalty = (rainfallAnomalyMm - 150) * 0.08 * monsoonFactor;
  } else if (rainfallAnomalyMm > 50) {
    rainfallPenalty = (rainfallAnomalyMm - 50) * 0.04 * monsoonFactor;
  }

  // Experience buffer
  const expModifier = (70.0 - experienceRatio) * 0.15;

  // Gas PPM modifier (DGMS threshold: >500 PPM warning, >800 PPM danger)
  let gasPenalty = 0.0;
  if (gasPpm > 800) {
    gasPenalty = (gasPpm - 800) * 0.05 + 12.0;
  } else if (gasPpm > 500) {
    gasPenalty = (gasPpm - 500) * 0.02;
  }

  const finalSimulatedRisk = Math.max(5.0, Math.min(98.5, simulatedScore + rainfallPenalty + expModifier + gasPenalty));
  const riskDelta = finalSimulatedRisk - baseRes.baseline_risk_pct;

  // Statutory & Operational Mitigation Directives
  const recommendations = [];
  if (rainfallAnomalyMm > 100) {
    recommendations.push('Deploy auxiliary sump pumping units and double drainage inspection frequency (DGMS Reg 148).');
  }
  if (experienceRatio < 50) {
    recommendations.push('Pair novice miners (<1 yr) with Level-III certified sirdars on high-wall extraction faces.');
  }
  if (gasPpm > 500) {
    recommendations.push('Increase main ventilation intake fan airflow to >2,500 m³/min and activate continuous telemetry.');
  }
  if (shiftTime.includes('Night')) {
    recommendations.push('Implement mandatory 15-min alertness intervals and supplemental LED face lighting.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Current operational parameters maintain standard safety threshold. Continue scheduled monitoring.');
  }

  const level = finalSimulatedRisk > 70 ? 'CRITICAL' : (finalSimulatedRisk > 50 ? 'HIGH' : (finalSimulatedRisk > 30 ? 'WATCH' : 'SAFE'));

  return {
    simulated_risk_score: Math.round(finalSimulatedRisk * 10) / 10,
    baseline_risk: baseRes.baseline_risk_pct,
    risk_delta: Math.round(riskDelta * 10) / 10,
    risk_level: level,
    rainfall_impact_pts: Math.round(rainfallPenalty * 10) / 10,
    experience_impact_pts: Math.round(expModifier * 10) / 10,
    gas_impact_pts: Math.round(gasPenalty * 10) / 10,
    mitigation_recommendations: recommendations,
    trajectory: [
      { hour: 'T-0h (Current)', score: Math.round(baseRes.predicted_risk_pct * 10) / 10 },
      { hour: 'T+2h (Projected)', score: Math.round((baseRes.predicted_risk_pct + (riskDelta * 0.4)) * 10) / 10 },
      { hour: 'T+4h (Peak Load)', score: Math.round(finalSimulatedRisk * 10) / 10 },
      { hour: 'T+6h (Post-Mitigation)', score: Math.round(Math.max(15.0, finalSimulatedRisk - 18.5) * 10) / 10 }
    ]
  };
}

export function calculateMineRiskScore({
  overdueComplianceCount = 0,
  recurringViolationCount = 0,
  daysSinceLastInspection = 0,
  recentIncidentCount = 0,
  environmentalBreachCount = 0
}) {
  const complianceScore = Math.min(30, overdueComplianceCount * 7.5);
  const violationScore = Math.min(25, recurringViolationCount * 6.25);
  
  let inspectionScore = 0;
  if (daysSinceLastInspection > 60) inspectionScore = 20;
  else if (daysSinceLastInspection > 30) inspectionScore = 12;
  else if (daysSinceLastInspection > 15) inspectionScore = 5;
  else inspectionScore = 2;

  const incidentScore = Math.min(15, recentIncidentCount * 5.0);
  const environmentalScore = Math.min(10, environmentalBreachCount * 3.33);

  const totalScore = Math.min(100, Math.round((complianceScore + violationScore + inspectionScore + incidentScore + environmentalScore) * 10) / 10);

  let riskTier = 'LOW';
  let badgeColor = 'emerald';
  if (totalScore >= 70) {
    riskTier = 'CRITICAL';
    badgeColor = 'rose';
  } else if (totalScore >= 45) {
    riskTier = 'ELEVATED';
    badgeColor = 'amber';
  } else if (totalScore >= 25) {
    riskTier = 'MODERATE';
    badgeColor = 'blue';
  }

  return {
    totalScore,
    riskTier,
    badgeColor,
    breakdown: [
      {
        factor: 'Overdue Compliance Items',
        weight: '30%',
        contribution: Math.round(complianceScore * 10) / 10,
        count: overdueComplianceCount,
        detail: `${overdueComplianceCount} statutory actions overdue past deadline`
      },
      {
        factor: 'Recurring Safety Violations',
        weight: '25%',
        contribution: Math.round(violationScore * 10) / 10,
        count: recurringViolationCount,
        detail: `${recurringViolationCount} repeated violations in same section within 90 days`
      },
      {
        factor: 'DGMS Inspection Recency',
        weight: '20%',
        contribution: Math.round(inspectionScore * 10) / 10,
        days: daysSinceLastInspection,
        detail: `${daysSinceLastInspection} days since last statutory inspection`
      },
      {
        factor: 'Field Incidents & Hazards',
        weight: '15%',
        contribution: Math.round(incidentScore * 10) / 10,
        count: recentIncidentCount,
        detail: `${recentIncidentCount} recent worker hazard/near-miss reports`
      },
      {
        factor: 'Environmental & Gas Breaches',
        weight: '10%',
        contribution: Math.round(environmentalScore * 10) / 10,
        count: environmentalBreachCount,
        detail: `${environmentalBreachCount} sensor telemetry spikes beyond statutory threshold`
      }
    ],
    predictiveAlert: totalScore >= 65 ? {
      triggered: true,
      title: 'High Cumulative Risk Warning',
      recommendation: 'Immediate DGMS internal audit and ventilation/machinery review recommended within 48 hours.'
    } : {
      triggered: false,
      title: 'Operating within safety parameters',
      recommendation: 'Maintain standard inspection cadence and resolve open tickets.'
    }
  };
}

/**
 * Anomaly Detection across 3 Statutory Domains
 */
export function detectAnomalies(mineData) {
  const anomalies = [];

  // 1. Production Deviation Anomaly
  if (mineData.monthly_target_tonnes > 0 && mineData.actual_production_tonnes !== undefined) {
    const deviationPct = ((mineData.monthly_target_tonnes - mineData.actual_production_tonnes) / mineData.monthly_target_tonnes) * 100;
    if (deviationPct > 15) {
      anomalies.push({
        type: 'PRODUCTION_SHORTFALL',
        severity: deviationPct > 30 ? 'critical' : 'warning',
        metric: `${Math.round(deviationPct)}% Deficit`,
        title: 'Significant Output Deviation Detected',
        description: `Actual output (${mineData.actual_production_tonnes.toLocaleString()} T) is ${Math.round(deviationPct)}% below targeted (${mineData.monthly_target_tonnes.toLocaleString()} T). Likely caused by conveyor failure or unapproved stoppage.`,
        suggestedAction: 'Review haulage logs and verify heavy earth-moving machinery (HEMM) uptime.'
      });
    }
  }

  // 2. Attendance & Absenteeism Anomaly
  if (mineData.absenteeismRate && mineData.absenteeismRate > 18) {
    anomalies.push({
      type: 'ATTENDANCE_SPIKE',
      severity: mineData.absenteeismRate > 25 ? 'critical' : 'warning',
      metric: `${mineData.absenteeismRate}% Absenteeism`,
      title: 'Underground Workforce Deficit Anomaly',
      description: `Shift absenteeism is at ${mineData.absenteeismRate}% (statutory normal is <8%). Under-crewed shifts elevate blast-hole and ventilation risks.`,
      suggestedAction: 'Verify mandatory statutory mining sirdar and overman coverage per DGMS Reg 27.'
    });
  }

  // 3. Environmental / Gas Sensor Telemetry Breaches (Mock Realtime Telemetry)
  const sensors = mineData.sensors || [
    { type: 'CH4 (Methane)', value: 0.85, unit: '%', limit: 1.25, status: 'normal' },
    { type: 'CO (Carbon Monoxide)', value: 38, unit: 'ppm', limit: 50, status: 'normal' },
    { type: 'SPM Dust Level', value: 245, unit: 'µg/m³', limit: 300, status: 'normal' }
  ];

  sensors.forEach(sensor => {
    if (sensor.value >= sensor.limit) {
      anomalies.push({
        type: 'ENVIRONMENTAL_BREACH',
        severity: 'critical',
        metric: `${sensor.value} ${sensor.unit}`,
        title: `${sensor.type} Hazardous Threshold Breach`,
        description: `Live telemetry reads ${sensor.value} ${sensor.unit}, exceeding statutory DGMS limit of ${sensor.limit} ${sensor.unit}.`,
        suggestedAction: 'Initiate auxiliary ventilation fan booster and issue evacuation alarm if persistence > 5 mins.'
      });
    }
  });

  return anomalies;
}

