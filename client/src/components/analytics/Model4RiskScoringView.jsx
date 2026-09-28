import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Sparkles, 
  Scale, 
  ChevronDown, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Sliders,
  Layers,
  Award,
  Send,
  FileCheck
} from 'lucide-react';

export default function Model4RiskScoringView({ token }) {
  const [optionsData, setOptionsData] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [sentSuccessInfo, setSentSuccessInfo] = useState(null);
  
  // Selected Situational Parameters for Model 4
  const [situationalForm, setSituationalForm] = useState({
    AI_ACTY_DESC: 'Continuous miner',
    MINING_EQUIP: 'Continuous miner',
    UG_LOCATION: 'FACE',
    COAL_METAL_IND: 'C',
    EXPER_TOT_CALC: '<1 Year',
    ACCIDENT_TIME: 'Night Shift (2200-0600)',
    UG_MINING_METHOD: 'Continuous Mining',
    AI_CLASS_DESC: 'FALL OF FACE/RIB/PILLAR/HIGHWALL'
  });

  const [riskResult, setRiskResult] = useState(null);
  const [rankedMines, setRankedMines] = useState([]);

  // Fetch encoders and pre-calculated rankings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const optRes = await fetch('/api/models/risk-options', { headers });
        if (optRes.ok) {
          const data = await optRes.json();
          setOptionsData(data);
        }

        const rankRes = await fetch('/api/models/mine-rankings', { headers });
        if (rankRes.ok) {
          const rData = await rankRes.json();
          setRankedMines(rData.rankings || []);
        }
      } catch (err) {
        console.error('Failed to load risk data:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchData();
  }, [token]);

  // Handle Calculate Risk
  const handleCalculateRisk = async (e) => {
    if (e) e.preventDefault();
    setCalculating(true);
    try {
      const res = await fetch('/api/models/predict-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(situationalForm)
      });
      if (res.ok) {
        const data = await res.json();
        setRiskResult(data);
      }
    } catch (err) {
      console.error('Risk calculate error:', err);
    } finally {
      setCalculating(false);
    }
  };

  // Handle Send Assessment to Authority (Immutable Snapshot)
  const handleSendAssessment = async () => {
    setSendingAssessment(true);
    try {
      // 1. Capture ONLY the current selected inputs (NO unselected dropdown options)
      const currentInputsSnapshot = {
        'Mining Activity': situationalForm.AI_ACTY_DESC,
        'Mining Equipment Used': situationalForm.MINING_EQUIP,
        'Underground Work Location': situationalForm.UG_LOCATION,
        'Miner Experience Level': situationalForm.EXPER_TOT_CALC,
        'Shift Timing': situationalForm.ACCIDENT_TIME,
        'Mining Method': situationalForm.UG_MINING_METHOD
      };

      // 2. Capture actual model output
      const modelOutputSnapshot = {
        predicted_risk_pct: currentRisk,
        risk_level: riskResult?.risk_level || 'EVALUATED',
        global_baseline: baselineRisk,
        delta_pct: delta,
        explanation: riskResult?.explanation || 'Statistical probability calculated from multi-variable decision trees.',
        risk_drivers: [
          { driver: 'Workforce Experience Factor', value: situationalForm.EXPER_TOT_CALC, severity: situationalForm.EXPER_TOT_CALC === '<1 Year' ? 'HIGH' : 'NORMAL' },
          { driver: 'Shift Fatigue & Circadian Index', value: situationalForm.ACCIDENT_TIME.split(' ')[0], severity: situationalForm.ACCIDENT_TIME.includes('Night') ? 'HIGH' : 'NORMAL' }
        ]
      };

      const res = await fetch('/api/models/send-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model_id: 'model_4_risk',
          model_name: 'Mine Risk Scoring',
          model_engine: 'RandomForest ML Engine (MSHA Dataset)',
          mine_id: 'mine-demo-01',
          mine_name: 'Demo Mine A',
          sector: 'Zone 4 (Underground Seam Block)',
          inputs: currentInputsSnapshot,
          output: modelOutputSnapshot
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSentSuccessInfo({
          id: data.assessment_id,
          message: `Assessment ${data.assessment_id} successfully sent to Authority.`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        setTimeout(() => setSentSuccessInfo(null), 9000);
      }
    } catch (err) {
      console.error('Failed to dispatch assessment to Authority:', err);
    } finally {
      setSendingAssessment(false);
    }
  };

  // Run calculation on initial load
  useEffect(() => {
    if (optionsData) {
      handleCalculateRisk();
    }
  }, [optionsData]);

  const baselineRisk = optionsData?.baseline_risk || 48.4;
  const currentRisk = riskResult?.predicted_risk_pct ?? baselineRisk;
  const delta = riskResult?.delta_pct ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Scale className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Explainable Situational Mine Risk Scoring
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                RandomForest ML Engine
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Trained on MSHA statutory injury & accident records to predict incident severity probability from exact operational conditions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Situational Form Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  Configure Operational & Situational Factors
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select live site conditions to calculate machine-learned risk index.
                </p>
              </div>
              <button
                onClick={handleCalculateRisk}
                disabled={calculating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Computing...' : 'Recalculate Risk'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Activity */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mining Activity (AI_ACTY_DESC)
                </label>
                <select
                  value={situationalForm.AI_ACTY_DESC}
                  onChange={(e) => setSituationalForm({ ...situationalForm, AI_ACTY_DESC: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.AI_ACTY_DESC || ['Continuous miner', 'Accident recovery', 'Advance roof support-longwall', 'Haulage']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Equipment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mining Equipment Used (MINING_EQUIP)
                </label>
                <select
                  value={situationalForm.MINING_EQUIP}
                  onChange={(e) => setSituationalForm({ ...situationalForm, MINING_EQUIP: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.MINING_EQUIP || ['Continuous miner', 'Belt conveyor', 'Haul truck / Dumper', 'Shuttle car']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Underground Work Location (UG_LOCATION)
                </label>
                <select
                  value={situationalForm.UG_LOCATION}
                  onChange={(e) => setSituationalForm({ ...situationalForm, UG_LOCATION: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.UG_LOCATION || ['FACE', 'INTERSECTION', 'LAST OPEN CROSSCUT', 'HAULAGE ROAD']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Miner Experience Level (EXPER_TOT_CALC)
                </label>
                <select
                  value={situationalForm.EXPER_TOT_CALC}
                  onChange={(e) => setSituationalForm({ ...situationalForm, EXPER_TOT_CALC: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.EXPER_TOT_CALC || ['<1 Year', '1-5 Years', '5-10 Years', '>10 Years']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Shift Time */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Shift Timing (ACCIDENT_TIME)
                </label>
                <select
                  value={situationalForm.ACCIDENT_TIME}
                  onChange={(e) => setSituationalForm({ ...situationalForm, ACCIDENT_TIME: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.ACCIDENT_TIME || ['Morning Shift (0600-1400)', 'Afternoon Shift (1400-2200)', 'Night Shift (2200-0600)']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Mining Method */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mining Method (UG_MINING_METHOD)
                </label>
                <select
                  value={situationalForm.UG_MINING_METHOD}
                  onChange={(e) => setSituationalForm({ ...situationalForm, UG_MINING_METHOD: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(optionsData?.options?.UG_MINING_METHOD || ['Continuous Mining', 'Conventional Stoping', 'Longwall', 'Caving']).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* National Mine Risk Ranking Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-400" />
              National Ranked Mine Safety Benchmark Leaderboard
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">Mine / Operator</th>
                    <th className="py-2.5 px-3 text-center">Fatal</th>
                    <th className="py-2.5 px-3 text-center">Severe</th>
                    <th className="py-2.5 px-3 text-center">Risk Score</th>
                    <th className="py-2.5 px-3 text-center">Risk Level</th>
                    <th className="py-2.5 px-3">Primary Risk Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {rankedMines.slice(0, 5).map((m, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{m.operator_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {m.mine_id}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-red-400">{m.fatal_accidents}</td>
                      <td className="py-3 px-3 text-center font-mono text-amber-400">{m.severe_accidents}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white text-sm">{m.risk_score}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          m.risk_level === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          m.risk_level === 'HIGH RISK' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {m.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400 max-w-xs truncate">{m.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Prediction Result Gauge & Natural Language Breakdown */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Predicted Situational Risk Index
            </h3>

            {/* Metrics Dual Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">Global Baseline</div>
                <div className="text-2xl font-bold text-slate-300 font-mono mt-1">{baselineRisk}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">MSHA Industry Avg</div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-indigo-500/30 rounded-xl">
                <div className="text-[11px] text-indigo-300 uppercase tracking-wider font-mono">Situational Risk</div>
                <div className="text-2xl font-bold text-white font-mono mt-1 flex items-center gap-1.5">
                  {currentRisk}%
                  <span className={`text-xs font-semibold ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Calculated by Model 4</div>
              </div>
            </div>

            {/* Risk Status Chip */}
            <div className={`p-4 rounded-xl border ${
              riskResult?.risk_level === 'CRITICAL' ? 'bg-red-950/40 border-red-500/50 text-red-200' :
              riskResult?.risk_level === 'WATCH' ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' :
              'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                RISK STATUS: {riskResult?.risk_level || 'EVALUATED'}
              </div>
              <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
                {riskResult?.explanation || 'Statistical probability calculated from multi-variable decision trees.'}
              </p>
            </div>

            {/* Explainable Factors Breakdown */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Key Situational Impact Drivers
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Workforce Experience Factor</span>
                  <span className="font-mono text-indigo-300 font-bold">{situationalForm.EXPER_TOT_CALC}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: situationalForm.EXPER_TOT_CALC === '<1 Year' ? '85%' : '35%' }}></div>
                </div>

                <div className="flex items-center justify-between text-slate-300 pt-2">
                  <span>Shift Fatigue & Circadian Index</span>
                  <span className="font-mono text-amber-300 font-bold">{situationalForm.ACCIDENT_TIME.split(' ')[0]}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: situationalForm.ACCIDENT_TIME.includes('Night') ? '80%' : '40%' }}></div>
                </div>
              </div>
            </div>

            {/* CURRENT SITUATION ASSESSMENT & AUTHORITY DISPATCH */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Current Situation Assessment
                  </span>
                  <span className="text-indigo-400 font-bold">SNAPSHOT READY</span>
                </div>
                
                {/* Selected Inputs Summary */}
                <div className="space-y-1 text-[11px]">
                  <div className="text-[10px] uppercase font-bold text-slate-500 font-sans tracking-wider">Selected Input Parameters</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
                    <div><span className="text-slate-500">Activity:</span> <span className="text-white font-semibold">{situationalForm.AI_ACTY_DESC}</span></div>
                    <div><span className="text-slate-500">Equipment:</span> <span className="text-white font-semibold">{situationalForm.MINING_EQUIP}</span></div>
                    <div><span className="text-slate-500">Location:</span> <span className="text-white font-semibold">{situationalForm.UG_LOCATION}</span></div>
                    <div><span className="text-slate-500">Experience:</span> <span className="text-white font-semibold">{situationalForm.EXPER_TOT_CALC}</span></div>
                    <div><span className="text-slate-500">Shift:</span> <span className="text-white font-semibold">{situationalForm.ACCIDENT_TIME.split(' ')[0]}</span></div>
                    <div><span className="text-slate-500">Method:</span> <span className="text-white font-semibold">{situationalForm.UG_MINING_METHOD}</span></div>
                  </div>
                </div>
              </div>

              {/* Action Button: Send to Authority */}
              <button
                onClick={handleSendAssessment}
                disabled={sendingAssessment}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${sendingAssessment ? 'animate-bounce' : ''}`} />
                <span>{sendingAssessment ? 'Transmitting Assessment...' : 'Send Assessment to Authority'}</span>
              </button>

              {/* Confirmation Alert */}
              {sentSuccessInfo && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white">Assessment {sentSuccessInfo.id}:</span> Successfully sent to Authority.
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">{sentSuccessInfo.timestamp}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
