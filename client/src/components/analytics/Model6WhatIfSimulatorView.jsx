import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CloudRain, 
  Users, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Sliders, 
  RefreshCw,
  Wind,
  Layers,
  ArrowUpRight,
  Send,
  FileCheck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export default function Model6WhatIfSimulatorView({ token }) {
  // Simulator Input Parameters
  const [params, setParams] = useState({
    rainfall_anomaly_mm: 120, // 0 to 300 mm
    experience_ratio_pct: 65, // % >5 yrs
    gas_ppm: 420, // 0 to 1200 PPM
    shift: 'Night Shift (2200-0600)',
    equipment: 'Continuous miner',
    activity: 'Continuous Miner Operations',
    monsoon_factor: 1.2
  });

  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [sendingAssessment, setSendingAssessment] = useState(false);
  const [sentSuccessInfo, setSentSuccessInfo] = useState(null);

  const handleSendAssessment = async () => {
    setSendingAssessment(true);
    try {
      // 1. Capture ONLY current selected inputs (NO unselected dropdowns or slider bounds)
      const selectedInputsSnapshot = {
        'Monsoon Rainfall Inundation Anomaly': `${params.rainfall_anomaly_mm} mm`,
        'Return Airway Methane Telemetry': `${params.gas_ppm} PPM`,
        'Experienced Workforce Ratio (>5 Yrs)': `${params.experience_ratio_pct}%`,
        'Shift Timing': params.shift,
        'Extraction Technology': params.equipment === 'Continuous miner' ? 'Continuous Miner + Roof Bolter' : params.equipment === 'Belt conveyor' ? 'Conventional Extraction + Belt Conveyor' : 'Automated Longwall Shearer'
      };

      // 2. Capture actual simulation output
      const simulationOutputSnapshot = {
        simulated_risk_score: simulatedScore,
        baseline_risk: baselineScore,
        risk_delta: delta,
        risk_level: simResult?.risk_level || 'EVALUATED',
        mitigation_recommendations: simResult?.mitigation_recommendations || [],
        trajectory: simResult?.trajectory || []
      };

      const res = await fetch('/api/models/send-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          model_id: 'model_6_whatif',
          model_name: 'What-If Multi-Factor Risk Simulator',
          model_engine: 'Dynamic Multi-Factor Recalculation Engine',
          mine_id: 'mine-demo-01',
          mine_name: 'Demo Mine A',
          sector: 'Zone 4 (Underground Seam Block)',
          inputs: selectedInputsSnapshot,
          output: simulationOutputSnapshot
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
      console.error('Failed to send what-if simulation to Authority:', err);
    } finally {
      setSendingAssessment(false);
    }
  };

  const runSimulation = async (customParams) => {
    const p = customParams || params;
    setSimulating(true);
    try {
      const res = await fetch('/api/models/simulate-whatif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    runSimulation(params);
  }, []);

  const simulatedScore = simResult?.simulated_risk_score || 48.4;
  const baselineScore = simResult?.baseline_risk || 48.4;
  const delta = simResult?.risk_delta || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Activity className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              What-If Multi-Factor Risk Simulator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Dynamic Recalculation Engine
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Simulate the compounded risk impact of environmental rainfall surges, gas telemetry spikes, workforce experience variance, and shift fatigue.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Simulation Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Adjust Simulated Operational & Environmental Inputs
              </h3>
              <button
                onClick={() => runSimulation(params)}
                disabled={simulating}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${simulating ? 'animate-spin' : ''}`} />
                Recalculate
              </button>
            </div>

            {/* Slider 1: Rainfall Anomaly */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-blue-400" />
                  Monsoon Rainfall Inundation Anomaly (mm)
                </span>
                <span className="font-mono text-blue-400 font-bold">{params.rainfall_anomaly_mm} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={params.rainfall_anomaly_mm}
                onChange={(e) => {
                  const updated = { ...params, rainfall_anomaly_mm: Number(e.target.value) };
                  setParams(updated);
                  runSimulation(updated);
                }}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 mm (Dry Seam)</span>
                <span>150 mm (Statutory Watch)</span>
                <span>300 mm (Flood Inundation)</span>
              </div>
            </div>

            {/* Slider 2: Gas Concentration */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-amber-400" />
                  Return Airway Methane / Gas Telemetry (PPM)
                </span>
                <span className={`font-mono font-bold ${params.gas_ppm > 500 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {params.gas_ppm} PPM
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="1200"
                step="25"
                value={params.gas_ppm}
                onChange={(e) => {
                  const updated = { ...params, gas_ppm: Number(e.target.value) };
                  setParams(updated);
                  runSimulation(updated);
                }}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>100 PPM (Nominal)</span>
                <span>500 PPM (DGMS Warning)</span>
                <span>1200 PPM (Evacuate Face)</span>
              </div>
            </div>

            {/* Slider 3: Workforce Experience */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Experienced Workforce Ratio (&gt;5 Years Experience)
                </span>
                <span className="font-mono text-emerald-400 font-bold">{params.experience_ratio_pct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={params.experience_ratio_pct}
                onChange={(e) => {
                  const updated = { ...params, experience_ratio_pct: Number(e.target.value) };
                  setParams(updated);
                  runSimulation(updated);
                }}
                className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>10% (Novice Heavy)</span>
                <span>50% (Standard Mix)</span>
                <span>100% (Veteran Crew)</span>
              </div>
            </div>

            {/* Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Shift Timing
                </label>
                <select
                  value={params.shift}
                  onChange={(e) => {
                    const updated = { ...params, shift: e.target.value };
                    setParams(updated);
                    runSimulation(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Morning Shift (0600-1400)">Morning Shift (0600-1400)</option>
                  <option value="Afternoon Shift (1400-2200)">Afternoon Shift (1400-2200)</option>
                  <option value="Night Shift (2200-0600)">Night Shift (2200-0600)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Extraction Technology
                </label>
                <select
                  value={params.equipment}
                  onChange={(e) => {
                    const updated = { ...params, equipment: e.target.value };
                    setParams(updated);
                    runSimulation(updated);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Continuous miner">Continuous Miner + Roof Bolter</option>
                  <option value="Belt conveyor">Conventional Extraction + Belt Conveyor</option>
                  <option value="Longwall">Automated Longwall Shearer</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Recalculated Score & Trajectory */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Compounded Mine Risk Trajectory
            </h3>

            {/* Recalculated Score Card */}
            <div className="p-4 bg-slate-950/70 border border-emerald-500/30 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Simulated Risk Index</div>
                <div className="text-3xl font-bold text-white font-mono mt-1 flex items-baseline gap-2">
                  {simulatedScore}%
                  <span className={`text-xs font-bold ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {delta > 0 ? `+${delta}% vs baseline` : `${delta}% vs baseline`}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                simResult?.risk_level === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                simResult?.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                simResult?.risk_level === 'WATCH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {simResult?.risk_level || 'EVALUATED'}
              </span>
            </div>

            {/* Trajectory Area Chart */}
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simResult?.trajectory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Statutory DGMS Mitigation Recommendations */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Automated DGMS Mitigation Directives
              </div>
              <div className="space-y-2 text-xs">
                {(simResult?.mitigation_recommendations || []).map((rec, i) => (
                  <div key={i} className="p-2.5 bg-slate-800/60 rounded-xl text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CURRENT SIMULATION ASSESSMENT & AUTHORITY TRANSMISSION */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Current Simulation Assessment
                  </span>
                  <span className="text-emerald-400 font-bold">SNAPSHOT READY</span>
                </div>
                
                {/* Evaluated Parameters */}
                <div className="space-y-1 text-[11px]">
                  <div className="text-[10px] uppercase font-bold text-slate-500 font-sans tracking-wider">Simulated Parameter Values</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 text-slate-300">
                    <div><span className="text-slate-500">Rainfall:</span> <span className="text-white font-semibold">{params.rainfall_anomaly_mm} mm</span></div>
                    <div><span className="text-slate-500">Methane:</span> <span className="text-white font-semibold">{params.gas_ppm} PPM</span></div>
                    <div><span className="text-slate-500">Experience:</span> <span className="text-white font-semibold">{params.experience_ratio_pct}%</span></div>
                    <div><span className="text-slate-500">Shift:</span> <span className="text-white font-semibold">{params.shift.split(' ')[0]}</span></div>
                    <div className="sm:col-span-2 truncate"><span className="text-slate-500">Tech:</span> <span className="text-white font-semibold">{params.equipment === 'Continuous miner' ? 'Continuous Miner + Bolter' : params.equipment === 'Belt conveyor' ? 'Conventional + Belt' : 'Automated Longwall'}</span></div>
                  </div>
                </div>
              </div>

              {/* Action Button: Send to Authority */}
              <button
                onClick={handleSendAssessment}
                disabled={sendingAssessment}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${sendingAssessment ? 'animate-bounce' : ''}`} />
                <span>{sendingAssessment ? 'Transmitting Simulation...' : 'Send Assessment to Authority'}</span>
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
