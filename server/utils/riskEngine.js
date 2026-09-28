/**
 * Explainable Weighted Risk Scoring & Anomaly Detection Engine
 */

export function calculateMineRiskScore({
  overdueComplianceCount = 0,
  recurringViolationCount = 0,
  daysSinceLastInspection = 0,
  recentIncidentCount = 0,
  environmentalBreachCount = 0
}) {
  // Weights (Total = 100 max theoretical points before normalization)
  // 1. Overdue Statutory Compliance: 30%
  // 2. Recurring Violations: 25%
  // 3. Days Since Last DGMS Inspection: 20% (penalty kicks in after 30 days)
  // 4. Incident & Hazard Count: 15%
  // 5. Environmental Breaches: 10%

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
