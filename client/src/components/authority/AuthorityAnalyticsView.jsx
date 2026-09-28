import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Layers, 
  Cpu, 
  Flame, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  FileDown, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Info, 
  Sliders, 
  Users, 
  Scale, 
  RefreshCw, 
  Zap,
  Camera,
  CheckSquare,
  BarChart3,
  PieChart as PieIcon,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

// ============================================================================
// DEMONSTRATION DATASETS (Internally Consistent & Verified)
// ============================================================================

// 12-Month Coal Production vs Statutory Targets (Million Tonnes)
const MONTHLY_PRODUCTION_DATA = [
  { month: 'Apr 2025', target_tonnes: 48.0, actual_tonnes: 46.8, variance: -1.2, achievement_pct: 97.5, status: 'Below Target' },
  { month: 'May 2025', target_tonnes: 50.0, actual_tonnes: 49.2, variance: -0.8, achievement_pct: 98.4, status: 'Below Target' },
  { month: 'Jun 2025', target_tonnes: 52.0, actual_tonnes: 53.1, variance: 1.1, achievement_pct: 102.1, status: 'Above Target' },
  { month: 'Jul 2025', target_tonnes: 45.0, actual_tonnes: 44.1, variance: -0.9, achievement_pct: 98.0, status: 'Monsoon Monitored' },
  { month: 'Aug 2025', target_tonnes: 44.0, actual_tonnes: 42.8, variance: -1.2, achievement_pct: 97.3, status: 'Monsoon Monitored' },
  { month: 'Sep 2025', target_tonnes: 48.0, actual_tonnes: 49.5, variance: 1.5, achievement_pct: 103.1, status: 'Above Target' },
  { month: 'Oct 2025', target_tonnes: 54.0, actual_tonnes: 55.6, variance: 1.6, achievement_pct: 103.0, status: 'Above Target' },
  { month: 'Nov 2025', target_tonnes: 56.0, actual_tonnes: 54.8, variance: -1.2, achievement_pct: 97.9, status: 'Below Target' },
  { month: 'Dec 2025', target_tonnes: 58.0, actual_tonnes: 59.4, variance: 1.4, achievement_pct: 102.4, status: 'Above Target' },
  { month: 'Jan 2026', target_tonnes: 60.0, actual_tonnes: 61.2, variance: 1.2, achievement_pct: 102.0, status: 'Above Target' },
  { month: 'Feb 2026', target_tonnes: 58.0, actual_tonnes: 56.9, variance: -1.1, achievement_pct: 98.1, status: 'Below Target' },
  { month: 'Mar 2026', target_tonnes: 62.0, actual_tonnes: 63.8, variance: 1.8, achievement_pct: 102.9, status: 'Above Target' }
];

// Production Summary Computed Metrics
const TOTAL_ACTUAL_PRODUCTION = MONTHLY_PRODUCTION_DATA.reduce((acc, curr) => acc + curr.actual_tonnes, 0); // 637.2 MT
const TOTAL_TARGET_PRODUCTION = MONTHLY_PRODUCTION_DATA.reduce((acc, curr) => acc + curr.target_tonnes, 0); // 635.0 MT
const AVG_MONTHLY_PRODUCTION = (TOTAL_ACTUAL_PRODUCTION / MONTHLY_PRODUCTION_DATA.length).toFixed(1); // 53.1 MT
const OVERALL_ACHIEVEMENT_PCT = ((TOTAL_ACTUAL_PRODUCTION / TOTAL_TARGET_PRODUCTION) * 100).toFixed(1); // 100.4%
const TOTAL_VARIANCE = (TOTAL_ACTUAL_PRODUCTION - TOTAL_TARGET_PRODUCTION).toFixed(1); // +2.2 MT

// Cross-Mine Operational Performance (8 realistic demonstration collieries)
const CROSS_MINE_DATA = [
  {
    id: 'mine-demo-01',
    name: 'Demo Mine A (Zone 1 - Zone 5)',
    colliery: 'Jharia Colliery (Block-IV)',
    subsidiary: 'BCCL',
    production: 14.2,
    target: 15.0,
    achievement: 94.7,
    compliance: 84.0,
    riskScore: 38.3,
    riskTier: 'High Risk',
    openViolations: 4,
    status: 'Critical Oversight',
    statusColor: 'text-[#A13D2F] bg-[#F5E2DE] border-[#A13D2F]/30'
  },
  {
    id: 'mine-kusmunda-02',
    name: 'Demo Mine B (Underground Colliery)',
    colliery: 'Kusmunda Underground Seam',
    subsidiary: 'SECL',
    production: 28.5,
    target: 27.0,
    achievement: 105.6,
    compliance: 91.5,
    riskScore: 22.5,
    riskTier: 'Watch',
    openViolations: 1,
    status: 'Active Operations',
    statusColor: 'text-[#1F6B45] bg-[#E3EFE8] border-[#1F6B45]/30'
  },
  {
    id: 'mine-raniganj-03',
    name: 'Demo Mine C (Open Cast Pit)',
    colliery: 'Raniganj Deep Seam No. 7',
    subsidiary: 'ECL',
    production: 8.6,
    target: 9.0,
    achievement: 95.6,
    compliance: 96.2,
    riskScore: 12.4,
    riskTier: 'Low Risk',
    openViolations: 0,
    status: 'Compliant',
    statusColor: 'text-[#1F6B45] bg-[#E3EFE8] border-[#1F6B45]/30'
  },
  {
    id: 'mine-piparwar-04',
    name: 'Demo Mine D (Surface Operations)',
    colliery: 'Piparwar Open Cast Project',
    subsidiary: 'CCL',
    production: 18.4,
    target: 18.0,
    achievement: 102.2,
    compliance: 95.8,
    riskScore: 14.8,
    riskTier: 'Low Risk',
    openViolations: 1,
    status: 'Compliant',
    statusColor: 'text-[#1F6B45] bg-[#E3EFE8] border-[#1F6B45]/30'
  },
  {
    id: 'mine-singrauli-05',
    name: 'Jayant Open Cast Pit No. 3',
    colliery: 'Singrauli Colliery Field',
    subsidiary: 'NCL',
    production: 22.1,
    target: 21.5,
    achievement: 102.8,
    compliance: 88.5,
    riskScore: 27.2,
    riskTier: 'Watch',
    openViolations: 2,
    status: 'Monitored',
    statusColor: 'text-[#B8860B] bg-[#F5EDD6] border-[#B8860B]/30'
  },
  {
    id: 'mine-talcher-06',
    name: 'Talcher Kaniha Colliery',
    colliery: 'Talcher Coalfield Pit-4',
    subsidiary: 'MCL',
    production: 31.0,
    target: 30.0,
    achievement: 103.3,
    compliance: 97.0,
    riskScore: 9.1,
    riskTier: 'Low Risk',
    openViolations: 0,
    status: 'Compliant',
    statusColor: 'text-[#1F6B45] bg-[#E3EFE8] border-[#1F6B45]/30'
  },
  {
    id: 'mine-wardha-07',
    name: 'Wardha Valley Pit-2',
    colliery: 'Chandrapur Incline Mine',
    subsidiary: 'WCL',
    production: 11.2,
    target: 12.0,
    achievement: 93.3,
    compliance: 79.4,
    riskScore: 44.5,
    riskTier: 'High Risk',
    openViolations: 5,
    status: 'Rectification Notice',
    statusColor: 'text-[#A13D2F] bg-[#F5E2DE] border-[#A13D2F]/30'
  },
  {
    id: 'mine-godavari-08',
    name: 'Godavari Valley Incline No. 5',
    colliery: 'Kothagudem Underground',
    subsidiary: 'SCCL',
    production: 9.8,
    target: 10.0,
    achievement: 98.0,
    compliance: 93.2,
    riskScore: 16.0,
    riskTier: 'Low Risk',
    openViolations: 1,
    status: 'Satisfactory',
    statusColor: 'text-[#1F6B45] bg-[#E3EFE8] border-[#1F6B45]/30'
  }
];

// Percentage-Wise Risk Distribution (Must sum to exactly 100%)
const RISK_DISTRIBUTION_DATA = [
  { name: 'Low Risk (< 20)', value: 38, count: '12 Mines', color: '#1F6B45', description: 'Statutory parameters well within safe thresholds' },
  { name: 'Watch (20–35)', value: 34, count: '11 Mines', color: '#B8860B', description: 'Minor operational deviations under surveillance' },
  { name: 'High Risk (35–50)', value: 18, count: '6 Mines', color: '#D97706', description: 'Immediate corrective notices served by DGMS' },
  { name: 'Critical (> 50)', value: 10, count: '3 Mines', color: '#A13D2F', description: 'Escalated regulatory sweep & audit mandated' }
];

// Percentage-Wise Compliance Distribution (Must sum to exactly 100%)
const COMPLIANCE_DISTRIBUTION_DATA = [
  { name: 'Compliant (≥ 95%)', value: 42, color: '#1F6B45', label: 'Fully Compliant' },
  { name: 'Minor Gaps (85–94%)', value: 36, color: '#B8860B', label: 'Minor Gaps' },
  { name: 'Major Gaps (75–84%)', value: 16, color: '#D97706', label: 'Major Gaps' },
  { name: 'Critical Non-Compliance (< 75%)', value: 6, color: '#A13D2F', label: 'Critical Gap' }
];

// Recurring Violation Hotspots (Demonstration Analytics)
const VIOLATION_HOTSPOTS_DATA = [
  {
    category: 'PPE / Helmet Compliance',
    regulation: 'CMR 2017 Reg 168',
    count: 42,
    share: 29.6,
    severity: 'Medium',
    severityBadge: 'bg-[#F5EDD6] text-[#B8860B] border-[#B8860B]/30',
    trend: '-14% MoM',
    trendDirection: 'down',
    mitigation: 'YOLOv8 automated camera checkpoint audio alarm deployed'
  },
  {
    category: 'Ventilation & Gas Standards',
    regulation: 'CMR 2017 Reg 142',
    count: 34,
    share: 23.9,
    severity: 'Critical',
    severityBadge: 'bg-[#F5E2DE] text-[#A13D2F] border-[#A13D2F]/30',
    trend: '+8% MoM',
    trendDirection: 'up',
    mitigation: 'Mandate auxiliary fan inspection & secondary flame safety lamp logs'
  },
  {
    category: 'Electrical Safety & Machinery',
    regulation: 'CMR 2017 Reg 185',
    count: 26,
    share: 18.3,
    severity: 'High',
    severityBadge: 'bg-[#F5EDD6] text-[#D97706] border-[#D97706]/30',
    trend: '0% (Steady)',
    trendDirection: 'neutral',
    mitigation: 'Conduct quarterly earth-leakage circuit breaker (ELCB) testing'
  },
  {
    category: 'Ground Control & Slope Stability',
    regulation: 'CMR 2017 Reg 112',
    count: 19,
    share: 13.4,
    severity: 'Critical',
    severityBadge: 'bg-[#F5E2DE] text-[#A13D2F] border-[#A13D2F]/30',
    trend: '-4% MoM',
    trendDirection: 'down',
    mitigation: 'Deploy laser scanning & slope stability radar along highwall benches'
  },
  {
    category: 'Emergency Preparedness & Egress',
    regulation: 'CMR 2017 Reg 137',
    count: 12,
    share: 8.5,
    severity: 'Medium',
    severityBadge: 'bg-[#F5EDD6] text-[#B8860B] border-[#B8860B]/30',
    trend: '-22% MoM',
    trendDirection: 'down',
    mitigation: 'Mandate bi-monthly refuge chamber & self-rescuer drill log verification'
  },
  {
    category: 'Fire / Spontaneous Combustion',
    regulation: 'CMR 2017 Reg 126',
    count: 9,
    share: 6.3,
    severity: 'High',
    severityBadge: 'bg-[#F5EDD6] text-[#D97706] border-[#D97706]/30',
    trend: '0% (Steady)',
    trendDirection: 'neutral',
    mitigation: 'Thermal drone profiling & nitrogen flushing in sealed goaf zones'
  }
];

// Safety Incident Trend (12-Month Multi-Category Time-Series)
const SAFETY_INCIDENT_TREND_DATA = [
  { month: 'Apr 25', hazardReports: 28, emergencyIncidents: 4, ppeViolations: 42, aiDetectedEvents: 58 },
  { month: 'May 25', hazardReports: 25, emergencyIncidents: 3, ppeViolations: 39, aiDetectedEvents: 54 },
  { month: 'Jun 25', hazardReports: 23, emergencyIncidents: 3, ppeViolations: 35, aiDetectedEvents: 49 },
  { month: 'Jul 25', hazardReports: 20, emergencyIncidents: 2, ppeViolations: 31, aiDetectedEvents: 45 },
  { month: 'Aug 25', hazardReports: 19, emergencyIncidents: 2, ppeViolations: 28, aiDetectedEvents: 41 },
  { month: 'Sep 25', hazardReports: 18, emergencyIncidents: 2, ppeViolations: 26, aiDetectedEvents: 38 },
  { month: 'Oct 25', hazardReports: 16, emergencyIncidents: 1, ppeViolations: 23, aiDetectedEvents: 34 },
  { month: 'Nov 25', hazardReports: 15, emergencyIncidents: 1, ppeViolations: 20, aiDetectedEvents: 31 },
  { month: 'Dec 25', hazardReports: 14, emergencyIncidents: 1, ppeViolations: 18, aiDetectedEvents: 28 },
  { month: 'Jan 26', hazardReports: 12, emergencyIncidents: 1, ppeViolations: 16, aiDetectedEvents: 26 },
  { month: 'Feb 26', hazardReports: 11, emergencyIncidents: 0, ppeViolations: 15, aiDetectedEvents: 25 },
  { month: 'Mar 26', hazardReports: 10, emergencyIncidents: 1, ppeViolations: 14, aiDetectedEvents: 24 }
];

// AI Detection & Verification Funnel Constants
const AI_DETECTION_METRICS = {
  peopleCounterEvents: 14820,
  helmetViolationsDetected: 342,
  smokeFireEvents: 18,
  mineSignGestureAlerts: 56,
  totalAlertsGenerated: 416,
  supervisorVerified: 389,
  verificationRatePct: 93.5,
  confirmedIncidents: 344,
  confirmationPrecisionPct: 88.4,
  dismissedFalsePositives: 45,
  dismissalPct: 11.6
};

// ============================================================================
// MAIN COMPONENT: AuthorityAnalyticsView
// ============================================================================

export default function AuthorityAnalyticsView({
  token,
  selectedMineId = 'all',
  onExportPdf,
  pdfDownloading = false
}) {
  // UI Interactive States
  const [tableSearch, setTableSearch] = useState('');
  const [tableSortField, setTableSortField] = useState('riskScore');
  const [tableSortAsc, setTableSortAsc] = useState(false);
  const [tableSubsidiaryFilter, setTableSubsidiaryFilter] = useState('ALL');
  const [productionViewMode, setProductionViewMode] = useState('chart'); // 'chart' | 'table'

  // Predictive What-If Simulator Interactive State
  const [simOverdueAudits, setSimOverdueAudits] = useState(3);
  const [simUnrectifiedViolations, setSimUnrectifiedViolations] = useState(2);
  const [simGasAnomaly, setSimGasAnomaly] = useState(false);
  const [simAbsenteeism, setSimAbsenteeism] = useState(14); // in %
  const [simFeedbackMsg, setSimFeedbackMsg] = useState('');

  // Calculate dynamic projected risk for the What-If simulator
  const calculatedProjectedRisk = useMemo(() => {
    const baseRisk = 32.4;
    const auditImpact = simOverdueAudits * 8.5;
    const violImpact = simUnrectifiedViolations * 4.2;
    const gasImpact = simGasAnomaly ? 16.0 : 0;
    const absentImpact = Math.max(0, (simAbsenteeism - 10) * 0.8);
    const total = Math.min(99.5, Math.max(5.0, baseRisk + auditImpact + violImpact + gasImpact + absentImpact));
    return parseFloat(total.toFixed(1));
  }, [simOverdueAudits, simUnrectifiedViolations, simGasAnomaly, simAbsenteeism]);

  // Filter and sort cross-mine operational performance table
  const filteredMineList = useMemo(() => {
    let list = [...CROSS_MINE_DATA];

    // Scope awareness: If specific mine is selected, we prioritize or filter it
    if (selectedMineId !== 'all') {
      const match = list.find(m => m.id === selectedMineId);
      if (match) {
        list = [match, ...list.filter(m => m.id !== selectedMineId)];
      }
    }

    if (tableSubsidiaryFilter !== 'ALL') {
      list = list.filter(m => m.subsidiary === tableSubsidiaryFilter);
    }

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(m => 
        m.name.toLowerCase().includes(q) ||
        m.colliery.toLowerCase().includes(q) ||
        m.subsidiary.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let aVal = a[tableSortField];
      let bVal = b[tableSortField];
      if (typeof aVal === 'string') {
        return tableSortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return tableSortAsc ? aVal - bVal : bVal - aVal;
    });

    return list;
  }, [selectedMineId, tableSubsidiaryFilter, tableSearch, tableSortField, tableSortAsc]);

  const handleSort = (field) => {
    if (tableSortField === field) {
      setTableSortAsc(prev => !prev);
    } else {
      setTableSortField(field);
      setTableSortAsc(false);
    }
  };

  const handleExportDossier = () => {
    if (onExportPdf) {
      onExportPdf();
    } else {
      setSimFeedbackMsg('Generating DGMS Statutory Risk Dossier...');
      setTimeout(() => setSimFeedbackMsg(''), 4000);
    }
  };

  // Selected mine display helper
  const activeMineObj = CROSS_MINE_DATA.find(m => m.id === selectedMineId);

  return (
    <div className="space-y-6">
      
      {/* ==================================================================== */}
      {/* TOP HEADER & DEMONSTRATION DATASET ADVISORY BANNER */}
      {/* ==================================================================== */}
      <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl p-4 lg:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1B3A5C] text-white text-[11px] font-bold font-mono uppercase tracking-wider">
              DGMS Regulatory Intelligence
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F5EDD6] text-[#6B5A2B] border border-[#DDD6C7] text-[10px] font-bold font-mono">
              Demonstration dataset for prototype evaluation
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-black text-[#1E1B16] font-heading uppercase tracking-tight">
            Cross-Sector Risk & Production Analytics Dashboard
          </h2>
          <p className="text-xs text-[#6B6558] mt-0.5">
            {selectedMineId === 'all' 
              ? 'Aggregated multi-mine oversight across 8 national coalfields under Coal Mines Regulations 2017'
              : `Filtered operational view: ${activeMineObj?.name || 'Selected Demonstration Colliery'} (${activeMineObj?.subsidiary || 'CIL'})`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportDossier}
            disabled={pdfDownloading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B3A5C] hover:bg-[#12273F] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <FileDown className={`w-3.5 h-3.5 ${pdfDownloading ? 'animate-bounce' : ''}`} />
            <span>{pdfDownloading ? 'Exporting PDF...' : 'Statutory Analytics Report'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXECUTIVE ANALYTICS SUMMARY KPI STRIP */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7] shadow-2xs">
          <div className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">National Production</div>
          <div className="text-xl font-black text-[#1F6B45] font-heading mt-1">637.2 <span className="text-xs font-bold text-[#6B6558]">MT</span></div>
          <div className="text-[10px] text-[#1F6B45] font-semibold mt-0.5 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +100.4% of Statutory Target
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7] shadow-2xs">
          <div className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">Statutory Compliance</div>
          <div className="text-xl font-black text-[#1B3A5C] font-heading mt-1">94.2%</div>
          <div className="text-[10px] text-[#6B6558] font-semibold mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#1F6B45]" /> 78% of mines ≥ 85% score
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7] shadow-2xs">
          <div className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">Composite Risk Index</div>
          <div className="text-xl font-black text-[#B8860B] font-heading mt-1">24.6 <span className="text-xs font-bold text-[#6B6558]">/ 100</span></div>
          <div className="text-[10px] text-[#B8860B] font-semibold mt-0.5 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Tier 2 (Watch / Controlled)
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7] shadow-2xs">
          <div className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">AI Alert Verification</div>
          <div className="text-xl font-black text-[#1F6B45] font-heading mt-1">93.5%</div>
          <div className="text-[10px] text-[#6B6558] font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#1F6B45]" /> 389 of 416 reviewed
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7] shadow-2xs col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">Open Violations</div>
          <div className="text-xl font-black text-[#A13D2F] font-heading mt-1">14 <span className="text-xs font-bold text-[#6B6558]">active</span></div>
          <div className="text-[10px] text-[#A13D2F] font-semibold mt-0.5 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" /> 2 escalated to DGMS sweep
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ROW 1: MONTHLY COAL PRODUCTION VS TARGETS & RISK DISTRIBUTION */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 Cols): Monthly Coal Production Graph & Summary */}
        <div className="lg:col-span-2 bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#1F6B45]" />
                  <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                    Monthly Coal Production vs Statutory Targets (Million Tonnes)
                  </h3>
                </div>
                <p className="text-xs text-[#6B6558] mt-0.5">
                  12-Month statutory extraction quota vs actual weighbridge dispatches (Apr 2025 – Mar 2026)
                </p>
              </div>

              <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#DDD6C7]">
                <button
                  onClick={() => setProductionViewMode('chart')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    productionViewMode === 'chart' ? 'bg-[#1B3A5C] text-white' : 'text-[#6B6558] hover:text-[#1E1B16]'
                  }`}
                >
                  Bar Chart
                </button>
                <button
                  onClick={() => setProductionViewMode('table')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    productionViewMode === 'table' ? 'bg-[#1B3A5C] text-white' : 'text-[#6B6558] hover:text-[#1E1B16]'
                  }`}
                >
                  Data Table
                </button>
              </div>
            </div>

            {/* Production Performance Summary Box (Requirement #2) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7] mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Total Extraction</span>
                <div className="text-sm font-black text-[#1E1B16] font-mono mt-0.5">
                  {TOTAL_ACTUAL_PRODUCTION.toFixed(1)} MT
                </div>
                <span className="text-[10px] text-[#6B6558]">Quota: {TOTAL_TARGET_PRODUCTION.toFixed(1)} MT</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Monthly Average</span>
                <div className="text-sm font-black text-[#1E1B16] font-mono mt-0.5">
                  {AVG_MONTHLY_PRODUCTION} MT/mo
                </div>
                <span className="text-[10px] text-[#6B6558]">12-mo run rate</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Target Achievement</span>
                <div className="text-sm font-black text-[#1F6B45] font-mono mt-0.5">
                  {OVERALL_ACHIEVEMENT_PCT}%
                </div>
                <span className="text-[10px] text-[#1F6B45]">Statutory compliant</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Net Variance</span>
                <div className="text-sm font-black text-[#1F6B45] font-mono mt-0.5">
                  +{TOTAL_VARIANCE} MT
                </div>
                <span className="text-[10px] text-[#1F6B45]">+0.35% surplus</span>
              </div>
            </div>

            {/* Chart or Table view */}
            {productionViewMode === 'chart' ? (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_PRODUCTION_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE2" vertical={false} />
                    <XAxis dataKey="month" stroke="#6B6558" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6B6558" fontSize={10} domain={[35, 70]} tickLine={false} unit=" MT" />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const isSurplus = data.variance >= 0;
                          return (
                            <div className="bg-[#FFFFFF] p-3 rounded-xl border border-[#DDD6C7] shadow-md text-xs space-y-1">
                              <div className="font-bold text-[#1E1B16] border-b border-[#DDD6C7] pb-1 font-heading">{label}</div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#6B6558]">Statutory Target:</span>
                                <span className="font-mono font-bold text-[#6B6558]">{data.target_tonnes} MT</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-[#1F6B45] font-semibold">Actual Production:</span>
                                <span className="font-mono font-bold text-[#1F6B45]">{data.actual_tonnes} MT</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t border-[#EFEBE2]">
                                <span className="text-[#1E1B16] font-semibold">Achievement:</span>
                                <span className={`font-mono font-bold ${isSurplus ? 'text-[#1F6B45]' : 'text-[#D97706]'}`}>
                                  {data.achievement_pct}% ({isSurplus ? `+${data.variance}` : data.variance} MT)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="target_tonnes" fill="#C8C2B7" name="Statutory Target (MT)" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="actual_tonnes" fill="#1F6B45" name="Actual Production (MT)" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-[#DDD6C7] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#6B6558] font-mono uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">Actual (MT)</th>
                      <th className="py-2 px-3">Target (MT)</th>
                      <th className="py-2 px-3">Achievement %</th>
                      <th className="py-2 px-3">Variance</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE2]">
                    {MONTHLY_PRODUCTION_DATA.map((row) => (
                      <tr key={row.month} className="hover:bg-[#FAF9F5]">
                        <td className="py-2 px-3 font-semibold text-[#1E1B16]">{row.month}</td>
                        <td className="py-2 px-3 font-mono font-bold text-[#1F6B45]">{row.actual_tonnes}</td>
                        <td className="py-2 px-3 font-mono text-[#6B6558]">{row.target_tonnes}</td>
                        <td className="py-2 px-3 font-mono font-bold">
                          <span className={row.achievement_pct >= 100 ? 'text-[#1F6B45]' : 'text-[#D97706]'}>
                            {row.achievement_pct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs">
                          {row.variance >= 0 ? `+${row.variance}` : row.variance} MT
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.achievement_pct >= 100 ? 'bg-[#E3EFE8] text-[#1F6B45]' : 'bg-[#F5EDD6] text-[#6B5A2B]'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="mt-3 text-[11px] text-[#6B6558] flex items-center justify-between border-t border-[#EFEBE2] pt-2">
            <span>Source: CIL Weighbridge Telemetry & DGMS Return Form V</span>
            <span className="font-mono font-bold text-[#1F6B45]">6 / 12 Months Exceeded Statutory Quota</span>
          </div>
        </div>

        {/* Right (1 Col): Percentage-Wise Risk Distribution (Requirement #4) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-[#B8860B]" />
              <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                Risk Distribution Across Mines
              </h3>
            </div>
            <p className="text-xs text-[#6B6558] mb-3">
              National coal mine classification under DGMS Composite Safety Index (Total = 100%)
            </p>

            {/* Donut Chart */}
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={RISK_DISTRIBUTION_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {RISK_DISTRIBUTION_DATA.map((entry, index) => (
                      <Cell key={`risk-cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#FFFFFF] p-2.5 rounded-xl border border-[#DDD6C7] shadow-md text-xs">
                            <div className="font-bold text-[#1E1B16]">{data.name}</div>
                            <div className="text-xs font-mono font-bold text-[#1B3A5C]">{data.value}% ({data.count})</div>
                            <div className="text-[10px] text-[#6B6558] mt-0.5">{data.description}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-[#1E1B16] font-heading">32</span>
                <span className="text-[9px] uppercase font-bold text-[#6B6558] font-mono">Total Mines</span>
              </div>
            </div>

            {/* Risk Legend Breakdown */}
            <div className="space-y-2 mt-2">
              {RISK_DISTRIBUTION_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-[#F7F5F0] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-[#1E1B16]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#6B6558] text-[11px]">({item.count})</span>
                    <span className="font-bold text-[#1E1B16]">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] font-mono text-[#6B6558]">
            <span>Mathematical Total:</span>
            <span className="font-bold text-[#1F6B45]">38% + 34% + 18% + 10% = 100%</span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* ROW 2: CROSS-MINE OPERATIONAL PERFORMANCE TABLE (Requirement #3) */}
      {/* ==================================================================== */}
      <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1B3A5C]" />
              <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                Cross-Mine Operational Performance
              </h3>
            </div>
            <p className="text-xs text-[#6B6558]">
              Comparative statutory production, risk tiering, and compliance audit tracking across 8 demonstration collieries
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B6558] absolute left-3 top-2.5" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search colliery, subsidiary..."
                className="pl-8 pr-3 py-1.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs text-[#1E1B16] placeholder-[#6B6558] focus:outline-none focus:border-[#1B3A5C] w-48 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#6B6558]" />
              <select
                value={tableSubsidiaryFilter}
                onChange={(e) => setTableSubsidiaryFilter(e.target.value)}
                className="bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1E1B16] focus:outline-none focus:border-[#1B3A5C] cursor-pointer"
              >
                <option value="ALL">All Subsidiaries (8)</option>
                <option value="BCCL">BCCL</option>
                <option value="SECL">SECL</option>
                <option value="ECL">ECL</option>
                <option value="CCL">CCL</option>
                <option value="NCL">NCL</option>
                <option value="MCL">MCL</option>
                <option value="WCL">WCL</option>
                <option value="SCCL">SCCL</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Sortable Table */}
        <div className="overflow-x-auto border border-[#DDD6C7] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5F0] text-[#6B6558] font-mono uppercase text-[10px] border-b border-[#DDD6C7]">
              <tr>
                <th 
                  onClick={() => handleSort('name')} 
                  className="py-3 px-3.5 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Mine / Demarcated Colliery</span>
                    {tableSortField === 'name' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('subsidiary')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Subsidiary</span>
                    {tableSortField === 'subsidiary' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('production')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Production (MT)</span>
                    {tableSortField === 'production' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('achievement')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Target Ach. %</span>
                    {tableSortField === 'achievement' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('compliance')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Compliance %</span>
                    {tableSortField === 'compliance' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('riskScore')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Risk Score</span>
                    {tableSortField === 'riskScore' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('openViolations')} 
                  className="py-3 px-3 cursor-pointer hover:text-[#1E1B16] transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Open Violations</span>
                    {tableSortField === 'openViolations' && (tableSortAsc ? '↑' : '↓')}
                  </div>
                </th>
                <th className="py-3 px-3.5 text-right">Regulatory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEBE2]">
              {filteredMineList.map((mine) => {
                const isSelected = selectedMineId === mine.id;
                return (
                  <tr 
                    key={mine.id} 
                    className={`transition ${isSelected ? 'bg-[#EBF2F7] font-medium' : 'hover:bg-[#FAF9F5]'}`}
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1B3A5C]" title="Currently Active Scope" />}
                        <div>
                          <div className="font-bold text-[#1E1B16] font-heading">{mine.name}</div>
                          <div className="text-[11px] text-[#6B6558] font-mono">{mine.colliery}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-[#EFEBE2] text-[#1E1B16] font-bold font-mono text-[11px]">
                        {mine.subsidiary}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1E1B16]">
                      {mine.production} <span className="text-[10px] text-[#6B6558]">/ {mine.target} MT</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={mine.achievement >= 100 ? 'text-[#1F6B45]' : 'text-[#D97706]'}>
                        {mine.achievement}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-[#EFEBE2] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${mine.compliance >= 90 ? 'bg-[#1F6B45]' : mine.compliance >= 80 ? 'bg-[#B8860B]' : 'bg-[#A13D2F]'}`}
                            style={{ width: `${mine.compliance}%` }}
                          />
                        </div>
                        <span className={mine.compliance >= 90 ? 'text-[#1F6B45]' : mine.compliance >= 80 ? 'text-[#B8860B]' : 'text-[#A13D2F]'}>
                          {mine.compliance}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        mine.riskScore > 35 ? 'bg-[#F5E2DE] text-[#A13D2F]' : mine.riskScore > 20 ? 'bg-[#F5EDD6] text-[#6B5A2B]' : 'bg-[#E3EFE8] text-[#1F6B45]'
                      }`}>
                        {mine.riskScore}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={mine.openViolations > 2 ? 'text-[#A13D2F]' : mine.openViolations > 0 ? 'text-[#D97706]' : 'text-[#1F6B45]'}>
                        {mine.openViolations} active
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${mine.statusColor}`}>
                        {mine.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B6558] pt-1">
          <span>Showing {filteredMineList.length} of {CROSS_MINE_DATA.length} demonstration collieries</span>
          <span className="font-mono">Sorted by: {tableSortField} ({tableSortAsc ? 'Ascending' : 'Descending'})</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ROW 3: COMPLIANCE DISTRIBUTION & RECURRING VIOLATION HOTSPOTS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Statutory Compliance Distribution (Requirement #5) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#1F6B45]" />
              <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                Statutory Compliance Distribution
              </h3>
            </div>
            <p className="text-xs text-[#6B6558] mb-4">
              Colliery compliance scoring against DGMS safety rules (Total = 100%)
            </p>

            {/* Stacked Percentage Bar */}
            <div className="h-5 w-full bg-[#EFEBE2] rounded-full overflow-hidden flex shadow-inner mb-4">
              {COMPLIANCE_DISTRIBUTION_DATA.map((item) => (
                <div 
                  key={item.name}
                  style={{ width: `${item.value}%`, backgroundColor: item.color }}
                  title={`${item.name}: ${item.value}%`}
                  className="h-full transition hover:opacity-90"
                />
              ))}
            </div>

            {/* Compliance Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {COMPLIANCE_DISTRIBUTION_DATA.map((item) => (
                <div key={item.name} className="p-3 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1E1B16]">{item.label}</span>
                    <span className="text-sm font-black font-mono" style={{ color: item.color }}>
                      {item.value}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6B6558] mt-1 font-mono">{item.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] font-mono text-[#6B6558]">
            <span>Regulatory Tier Breakdown:</span>
            <span className="font-bold text-[#1F6B45]">42% + 36% + 16% + 6% = 100%</span>
          </div>
        </div>

        {/* Right: Recurring Violation Hotspots (Requirement #6 - Replaces Loading...) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                  Recurring Violation Hotspots
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#F5EDD6] text-[#6B5A2B] text-[10px] font-mono font-bold">
                142 Logged Events
              </span>
            </div>
            <p className="text-xs text-[#6B6558] mb-3">
              AI-identified violation categories ranked by recurrence across national coalfields
            </p>

            {/* Violation List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {VIOLATION_HOTSPOTS_DATA.map((item) => (
                <div key={item.category} className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7] text-xs hover:border-[#B8860B] transition">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E1B16] font-heading">{item.category}</span>
                      <span className="text-[10px] font-mono text-[#6B6558] px-1.5 py-0.5 rounded-sm bg-[#EFEBE2]">
                        {item.regulation}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-black text-[#A13D2F]">{item.count}</span>
                      <span className="text-[10px] text-[#6B6558]">({item.share}%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6B6558] pt-1 border-t border-[#EFEBE2]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded-xs font-bold text-[9px] border ${item.severityBadge}`}>
                        {item.severity} Severity
                      </span>
                      <span className="text-[10px] text-[#1E1B16] truncate max-w-[200px]" title={item.mitigation}>
                        {item.mitigation}
                      </span>
                    </div>
                    <span className={`font-mono text-[10px] font-bold ${
                      item.trendDirection === 'down' ? 'text-[#1F6B45]' : item.trendDirection === 'up' ? 'text-[#A13D2F]' : 'text-[#6B6558]'
                    }`}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] text-[#6B6558]">
            <span>Continuous monitoring via YOLOv8 Vision & IoT Stream</span>
            <span className="font-mono font-bold text-[#1B3A5C]">Top 2 Categories: 53.5% of all flags</span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* ROW 4: SAFETY INCIDENT TREND & AI DETECTION ANALYTICS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left (2 Cols): Safety Incident Trend (Requirement #7) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1B3A5C]" />
                <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                  Safety Incident Trend (12-Month Multi-Category Chronology)
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#1F6B45]">
                ↓ 58.6% Overall Incident Reduction
              </span>
            </div>
            <p className="text-xs text-[#6B6558] mb-3">
              Chronological trajectory of hazard reports, emergency alerts, PPE infractions, and AI-flagged safety events
            </p>

            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SAFETY_INCIDENT_TREND_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAiEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3A5C" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPpe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8860B" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#B8860B" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorHazard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F6B45" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1F6B45" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEBE2" vertical={false} />
                  <XAxis dataKey="month" stroke="#6B6558" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6B6558" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #DDD6C7', fontSize: '11px' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Area type="monotone" dataKey="aiDetectedEvents" name="AI Detected Events" stroke="#1B3A5C" strokeWidth={2} fillOpacity={1} fill="url(#colorAiEvents)" />
                  <Area type="monotone" dataKey="ppeViolations" name="PPE Violations" stroke="#B8860B" strokeWidth={2} fillOpacity={1} fill="url(#colorPpe)" />
                  <Area type="monotone" dataKey="hazardReports" name="Hazard Reports" stroke="#1F6B45" strokeWidth={2} fillOpacity={1} fill="url(#colorHazard)" />
                  <Line type="monotone" dataKey="emergencyIncidents" name="Colliery Emergencies" stroke="#A13D2F" strokeWidth={3} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] text-[#6B6558]">
            <span>Demonstration trend reflects proactive AI-based early intervention</span>
            <span className="font-mono font-bold text-[#1F6B45]">Emergency Incidents: 4/mo → 1/mo</span>
          </div>
        </div>

        {/* Right (1 Col): AI Safety Detection & Verification Funnel (Requirements #8 & #9) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#B8860B]" />
              <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                AI Safety Detection & Verification
              </h3>
            </div>
            <p className="text-xs text-[#6B6558] mb-3">
              CoalGuard Camera & Gesture AI (AI Detection → Supervisor Verification Funnel)
            </p>

            {/* Detection Summary Counters */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
                <div className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">People Counter</div>
                <div className="text-base font-black text-[#1B3A5C] font-mono mt-0.5">14,820</div>
                <div className="text-[9px] text-[#6B6558]">Restricted zone crossings</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
                <div className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Helmet Flags</div>
                <div className="text-base font-black text-[#D97706] font-mono mt-0.5">342</div>
                <div className="text-[9px] text-[#6B6558]">YOLOv8 vision detections</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
                <div className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Thermal Fire / Smoke</div>
                <div className="text-base font-black text-[#A13D2F] font-mono mt-0.5">18</div>
                <div className="text-[9px] text-[#6B6558]">Thermal anomaly alerts</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
                <div className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">MineSign Gestures</div>
                <div className="text-base font-black text-[#1F6B45] font-mono mt-0.5">56</div>
                <div className="text-[9px] text-[#6B6558]">SOS hand signals verified</div>
              </div>
            </div>

            {/* Verification Rate Funnel (Requirement #9) */}
            <div className="p-3 rounded-xl bg-[#E4EAF0]/60 border border-[#1B3A5C]/20 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[#1B3A5C]">
                <span>1. Total AI Alerts Generated:</span>
                <strong className="font-bold">{AI_DETECTION_METRICS.totalAlertsGenerated} alerts</strong>
              </div>
              <div className="flex items-center justify-between text-[#1B3A5C] pl-2 border-l-2 border-[#1B3A5C]">
                <span>2. Supervisor Verified:</span>
                <strong className="font-bold text-[#1F6B45]">
                  {AI_DETECTION_METRICS.supervisorVerified} ({AI_DETECTION_METRICS.verificationRatePct}%)
                </strong>
              </div>
              <div className="flex items-center justify-between text-[#1B3A5C] pl-4 border-l-2 border-[#1F6B45]">
                <span>3. Confirmed Real Hazards:</span>
                <strong className="font-bold text-[#1B3A5C]">
                  {AI_DETECTION_METRICS.confirmedIncidents} ({AI_DETECTION_METRICS.confirmationPrecisionPct}%)
                </strong>
              </div>
              <div className="text-[10px] text-[#6B6558] pt-1 border-t border-[#DDD6C7]">
                Human-in-the-loop: 45 false alerts ({AI_DETECTION_METRICS.dismissalPct}%) safely dismissed by shift supervisors.
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] font-mono text-[#6B6558]">
            <span>Verification Precision:</span>
            <span className="font-bold text-[#1F6B45]">88.4% True Hazard Accuracy</span>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* ROW 5: RISK / COMPLIANCE COMPARISON MATRIX (Requirement #10) */}
      {/* ==================================================================== */}
      <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#1B3A5C]" />
              <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                Risk & Statutory Compliance Quadrant Comparison
              </h3>
            </div>
            <p className="text-xs text-[#6B6558]">
              Cross-mine regulatory quadrant: identifies mines requiring physical intervention vs operational benchmark mines
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Quadrant 1: High Risk + Low Compliance */}
          <div className="p-3.5 rounded-xl bg-[#F5E2DE]/50 border border-[#A13D2F]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#A13D2F] uppercase font-mono">High Risk + Low Compliance</span>
              <AlertOctagon className="w-4 h-4 text-[#A13D2F]" />
            </div>
            <div className="text-xs text-[#1E1B16] font-semibold">Priority Intervention Queue</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-1.5 rounded-lg bg-white border border-[#A13D2F]/20 flex justify-between">
                <span>Wardha Valley Pit-2</span>
                <span className="font-bold text-[#A13D2F]">Risk: 44.5 | 79.4%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-[#A13D2F]/20 flex justify-between">
                <span>Jharia Block-IV</span>
                <span className="font-bold text-[#A13D2F]">Risk: 38.3 | 84.0%</span>
              </div>
            </div>
            <div className="text-[10px] text-[#A13D2F] font-bold">Mandate physical DGMS audit sweep</div>
          </div>

          {/* Quadrant 2: High Risk + High Compliance */}
          <div className="p-3.5 rounded-xl bg-[#F5EDD6]/50 border border-[#B8860B]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6B5A2B] uppercase font-mono">High Danger + High Compliance</span>
              <AlertTriangle className="w-4 h-4 text-[#B8860B]" />
            </div>
            <div className="text-xs text-[#1E1B16] font-semibold">Geological Hazards Monitored</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-1.5 rounded-lg bg-white border border-[#B8860B]/20 flex justify-between">
                <span>Raniganj Deep Seam</span>
                <span className="font-bold text-[#6B5A2B]">Risk: 12.4 | 96.2%</span>
              </div>
            </div>
            <div className="text-[10px] text-[#6B5A2B] font-bold">Sensors active, safety drills compliant</div>
          </div>

          {/* Quadrant 3: Low Risk + High Compliance */}
          <div className="p-3.5 rounded-xl bg-[#E3EFE8]/50 border border-[#1F6B45]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1F6B45] uppercase font-mono">Low Risk + High Compliance</span>
              <ShieldCheck className="w-4 h-4 text-[#1F6B45]" />
            </div>
            <div className="text-xs text-[#1E1B16] font-semibold">National Benchmark Collieries</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-1.5 rounded-lg bg-white border border-[#1F6B45]/20 flex justify-between">
                <span>Talcher Kaniha Colliery</span>
                <span className="font-bold text-[#1F6B45]">Risk: 9.1 | 97.0%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-[#1F6B45]/20 flex justify-between">
                <span>Piparwar Open Cast</span>
                <span className="font-bold text-[#1F6B45]">Risk: 14.8 | 95.8%</span>
              </div>
            </div>
            <div className="text-[10px] text-[#1F6B45] font-bold">Exemplary statutory standards maintained</div>
          </div>

          {/* Quadrant 4: Low Risk + Moderate Compliance */}
          <div className="p-3.5 rounded-xl bg-[#EFEBE2]/60 border border-[#DDD6C7] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6B6558] uppercase font-mono">Controlled Risk + Mod Compliance</span>
              <Activity className="w-4 h-4 text-[#6B6558]" />
            </div>
            <div className="text-xs text-[#1E1B16] font-semibold">Standard Operational Oversight</div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-1.5 rounded-lg bg-white border border-[#DDD6C7] flex justify-between">
                <span>Jayant Singrauli Pit</span>
                <span className="font-bold text-[#1E1B16]">Risk: 27.2 | 88.5%</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-[#DDD6C7] flex justify-between">
                <span>Kusmunda Underground</span>
                <span className="font-bold text-[#1E1B16]">Risk: 22.5 | 91.5%</span>
              </div>
            </div>
            <div className="text-[10px] text-[#6B6558] font-bold">Routine periodic inspection scheduled</div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ROW 6: PREDICTIVE WHAT-IF SIMULATOR & GAS LEAK MODEL PLACEHOLDER */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Existing & Enhanced Predictive What-If Risk Simulator (Requirement #11) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1B3A5C]" />
                <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                  Predictive What-If Risk Simulator
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#E4EAF0] text-[#1B3A5C] text-[10px] font-mono font-bold">
                Model #06 Simulator
              </span>
            </div>
            <p className="text-xs text-[#6B6558] mb-3">
              Simulate impact of delayed statutory audits, unresolved infractions, and atmospheric shifts on aggregate colliery safety index
            </p>

            {/* Interactive Simulation Controls */}
            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7] space-y-3 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6558] font-medium">Overdue DGMS Safety Audits:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="6"
                    value={simOverdueAudits}
                    onChange={(e) => setSimOverdueAudits(parseInt(e.target.value))}
                    className="w-24 accent-[#1B3A5C] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#1E1B16] w-6 text-right">{simOverdueAudits}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6558] font-medium">Unrectified High-Severity Violations:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="8"
                    value={simUnrectifiedViolations}
                    onChange={(e) => setSimUnrectifiedViolations(parseInt(e.target.value))}
                    className="w-24 accent-[#1B3A5C] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#1E1B16] w-6 text-right">{simUnrectifiedViolations}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6558] font-medium">Underground CH4 Gas Sensor Spike:</span>
                <button
                  onClick={() => setSimGasAnomaly(prev => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                    simGasAnomaly 
                      ? 'bg-[#F5E2DE] text-[#A13D2F] border border-[#A13D2F]/40' 
                      : 'bg-[#EFEBE2] text-[#6B6558] border border-[#DDD6C7]'
                  }`}
                >
                  {simGasAnomaly ? '⚠️ 15% CH4 Spike Active' : 'Normal Telemetry'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B6558] font-medium">Workforce Absenteeism Rate:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={simAbsenteeism}
                    onChange={(e) => setSimAbsenteeism(parseInt(e.target.value))}
                    className="w-24 accent-[#1B3A5C] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#1E1B16] w-8 text-right">{simAbsenteeism}%</span>
                </div>
              </div>
            </div>

            {/* Projected Simulation Output Box (Preserves existing baseline & projected metrics) */}
            <div className="p-3.5 bg-[#E4EAF0]/60 border border-[#1B3A5C]/20 rounded-xl text-xs text-[#1B3A5C] space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Baseline Multi-Mine Risk:</span>
                <strong>32.4 / 100</strong>
              </div>
              <div className="flex justify-between">
                <span>Projected Risk ({simOverdueAudits} Audits, {simUnrectifiedViolations} Violations):</span>
                <strong className={calculatedProjectedRisk > 50 ? 'text-[#A13D2F] font-bold' : calculatedProjectedRisk > 35 ? 'text-[#D97706] font-bold' : 'text-[#1F6B45] font-bold'}>
                  {calculatedProjectedRisk} / 100 {calculatedProjectedRisk > 50 ? '⚠️ (CRITICAL)' : calculatedProjectedRisk > 35 ? '⚡ (HIGH)' : '✅ (MODERATE)'}
                </strong>
              </div>
              <div className="pt-1 border-t border-[#1B3A5C]/20 text-[11px]">
                Recommended Action: <strong>
                  {calculatedProjectedRisk > 50 
                    ? 'Trigger immediate DGMS physical sweep & issue Section 22 notice' 
                    : calculatedProjectedRisk > 35 
                    ? 'Mandate secondary flame safety lamp checks & dispatch warning' 
                    : 'Maintain regular biometric verification & shift briefings'}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={handleExportDossier}
              disabled={pdfDownloading}
              className="w-full py-2.5 rounded-xl bg-[#1B3A5C] hover:bg-[#12273F] text-white text-xs font-bold transition font-heading flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Risk Summary Dossier (Statutory PDF)</span>
            </button>
            {simFeedbackMsg && (
              <p className="text-[11px] text-[#1F6B45] font-mono mt-1.5 text-center">{simFeedbackMsg}</p>
            )}
          </div>
        </div>

        {/* Existing Gas Leak Model Placeholder Card (Requirement #12 - Kept Intact) */}
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col justify-between border-l-4 border-l-[#0284c7]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#e0f2fe] text-[#0284c7] rounded-md font-bold text-xs uppercase font-mono">
                  GAS LEAK RISK MODEL
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#EFEBE2] text-[#6B6558] text-[10px] font-bold font-mono border border-[#DDD6C7]">
                  Integration Pending
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#6B6558]">Reserved Protocol Slot #07</span>
            </div>

            <h4 className="text-sm font-bold text-[#1E1B16] font-heading mt-2">
              Statutory Atmospheric Telemetry & Gas Dispersion Forecast
            </h4>
            
            <p className="text-xs text-[#4b5563] mt-2 leading-relaxed">
              Statutory atmospheric CH4 (Methane), CO (Carbon Monoxide), and O2 sensor telemetry and dispersion prediction model placeholder reserved for future DGMS IoT pipeline integration.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] text-xs space-y-2">
              <div className="flex items-center justify-between text-[#0369A1] font-mono text-[11px]">
                <span>Sensor Protocol Interface:</span>
                <strong className="font-bold">MQTT / OPC-UA (CMR Reg 142)</strong>
              </div>
              <div className="flex items-center justify-between text-[#0369A1] font-mono text-[11px]">
                <span>Telemetry Ingestion Pipeline:</span>
                <strong className="font-bold">Under Statutory Verification</strong>
              </div>
              <div className="text-[10px] text-[#0284c7]">
                Live optical methanometer and multi-gas tube bundle telemetry will stream dynamically upon hardware commission.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EFEBE2] flex items-center justify-between text-[11px] text-[#6B6558]">
            <span>DGMS Electronic Safety Guideline (Circular No. 3 of 2024)</span>
            <span className="font-mono text-[#0284c7] font-bold">Slot Ready for Webhook</span>
          </div>
        </div>

      </div>

    </div>
  );
}
