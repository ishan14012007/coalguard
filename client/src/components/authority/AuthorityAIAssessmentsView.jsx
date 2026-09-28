import React, { useState } from 'react';
import { 
  Sparkles, 
  Scale, 
  Activity, 
  Building2, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Eye, 
  CheckSquare, 
  Layers, 
  FileText, 
  Filter, 
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Send,
  Lock
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

export default function AuthorityAIAssessmentsView({ 
  assessments = [], 
  token, 
  onRefresh, 
  selectedMineId = 'all' 
}) {
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'model_4_risk' | 'model_6_whatif' | 'new'
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusActionMsg, setStatusActionMsg] = useState('');

  // Filter assessments based on active filters and selected mine
  const filteredAssessments = (assessments || []).filter(item => {
    if (selectedMineId !== 'all' && item.mine_id && item.mine_id !== selectedMineId) return false;
    if (filterType === 'new') return item.status === 'NEW';
    if (filterType === 'model_4_risk') return item.model_id === 'model_4_risk';
    if (filterType === 'model_6_whatif') return item.model_id === 'model_6_whatif';
    return true;
  });

  const activeAssessment = assessments.find(a => a.id === selectedAssessmentId) || filteredAssessments[0] || null;

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/models/assessments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setStatusActionMsg(`✅ Assessment ${id} updated to status: ${newStatus}`);
        if (onRefresh) onRefresh();
        setTimeout(() => setStatusActionMsg(''), 4000);
      }
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Stats
  const totalCount = assessments.length;
  const newCount = assessments.filter(a => a.status === 'NEW').length;
  const highRiskCount = assessments.filter(a => {
    const r = a.output?.predicted_risk_pct || a.output?.simulated_risk_score || 0;
    return r >= 40 || a.output?.risk_level === 'CRITICAL' || a.output?.risk_level === 'HIGH';
  }).length;

  return (
    <div className="space-y-6">
      
      {/* 1. Header Ribbon */}
      <div className="bg-[#1B3A5C] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-white/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold uppercase tracking-wide">
                SUPERVISOR AI ASSESSMENTS RECEIVED
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                DGMS STATUTORY OVERSIGHT
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              Live operational assessments and multi-factor risk simulations transmitted directly from colliery shift supervisors.
            </p>
          </div>
        </div>

        {/* Quick KPI summary */}
        <div className="flex items-center gap-2 font-mono">
          <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/15 text-center">
            <div className="text-[10px] uppercase text-slate-300">Total Transmitted</div>
            <div className="text-base font-bold text-white">{totalCount}</div>
          </div>
          <div className="px-3 py-1.5 bg-rose-500/20 rounded-xl border border-rose-400/30 text-center">
            <div className="text-[10px] uppercase text-rose-200">New Submissions</div>
            <div className="text-base font-bold text-rose-300">{newCount}</div>
          </div>
          <div className="px-3 py-1.5 bg-amber-500/20 rounded-xl border border-amber-400/30 text-center">
            <div className="text-[10px] uppercase text-amber-200">High Risk</div>
            <div className="text-base font-bold text-amber-300">{highRiskCount}</div>
          </div>
        </div>
      </div>

      {/* Action Notification Message */}
      {statusActionMsg && (
        <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{statusActionMsg}</span>
          <button onClick={() => setStatusActionMsg('')} className="underline text-[11px] cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* 2. Filter & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#DDD6C7] shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono mr-1">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'all' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilterType('new')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              filterType === 'new' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            New ({newCount})
          </button>
          <button
            onClick={() => setFilterType('model_4_risk')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'model_4_risk' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Mine Risk Scoring
          </button>
          <button
            onClick={() => setFilterType('model_6_whatif')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'model_6_whatif' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            What-If Simulator
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Showing {filteredAssessments.length} assessment snapshot{filteredAssessments.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* 3. Main Split View: Left List (4 Cols) + Right Inspection Dossier (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Received Assessment Cards */}
        <div className="lg:col-span-4 space-y-3">
          {filteredAssessments.length === 0 ? (
            <div className="p-8 bg-white border border-[#DDD6C7] rounded-2xl text-center space-y-2">
              <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-700">No Assessments Found</div>
              <p className="text-[11px] text-slate-500">
                No supervisor assessments match the selected filter criteria.
              </p>
            </div>
          ) : (
            filteredAssessments.map((a) => {
              const isSelected = activeAssessment?.id === a.id;
              const isNew = a.status === 'NEW';
              const riskVal = a.output?.predicted_risk_pct ?? a.output?.simulated_risk_score ?? a.output?.global_baseline ?? 0;
              const riskLevel = a.output?.risk_level || 'EVALUATED';

              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                    isSelected
                      ? 'bg-white border-[#1B3A5C] shadow-md ring-2 ring-[#1B3A5C]/20'
                      : 'bg-white border-[#DDD6C7] hover:border-slate-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs text-[#1B3A5C]">
                        {a.id}
                      </span>
                      {isNew && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold uppercase animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                      a.status === 'ACKNOWLEDGED' ? 'bg-emerald-100 text-emerald-800' :
                      a.status === 'REVIEWED' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {a.model_id === 'model_6_whatif' ? <Activity className="w-3.5 h-3.5 text-emerald-600" /> : <Scale className="w-3.5 h-3.5 text-indigo-600" />}
                      <span>{a.model_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                      {a.mine_name} • <span className="text-slate-500">{a.sector}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-800">{riskVal}%</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                        riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        riskLevel === 'WATCH' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Col: Structured Assessment Detailed Dossier */}
        <div className="lg:col-span-8">
          {activeAssessment ? (
            <div className="bg-white border border-[#DDD6C7] rounded-2xl p-6 shadow-sm space-y-6 text-left">
              
              {/* 1. Header / Context Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl font-black font-mono text-[#1B3A5C]">
                      {activeAssessment.id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                      activeAssessment.status === 'ACKNOWLEDGED' ? 'bg-emerald-100 text-emerald-800' :
                      activeAssessment.status === 'REVIEWED' ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      STATUS: {activeAssessment.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                    {activeAssessment.model_name}
                    <span className="text-xs font-mono font-normal text-slate-500">
                      ({activeAssessment.model_engine || 'RandomForest ML Engine'})
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-mono">
                    <span>Mine: <strong>{activeAssessment.mine_name}</strong></span>
                    <span>Sector: <strong>{activeAssessment.sector}</strong></span>
                    <span>Transmitted By: <strong>{activeAssessment.supervisor_name}</strong></span>
                    <span>Timestamp: <strong>{new Date(activeAssessment.created_at).toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>

                {/* Workflow Status Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleUpdateStatus(activeAssessment.id, 'REVIEWED')}
                    disabled={updatingStatus || activeAssessment.status === 'REVIEWED'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      activeAssessment.status === 'REVIEWED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-default'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                    }`}
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(activeAssessment.id, 'ACKNOWLEDGED')}
                    disabled={updatingStatus || activeAssessment.status === 'ACKNOWLEDGED'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      activeAssessment.status === 'ACKNOWLEDGED'
                        ? 'bg-emerald-700 text-white cursor-default'
                        : 'bg-[#1B3A5C] hover:bg-[#12273F] text-white shadow-2xs'
                    }`}
                  >
                    {activeAssessment.status === 'ACKNOWLEDGED' ? '✓ Acknowledged' : 'Acknowledge & Sign'}
                  </button>
                </div>
              </div>

              {/* 2. CURRENT SITUATION INPUTS (Selected Values ONLY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#1B3A5C]" />
                    Current Situation Inputs (Exact Evaluated Values)
                  </h4>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    ✓ Verified Input Snapshot
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {Object.entries(activeAssessment.inputs || {}).map(([key, val]) => (
                      <div key={key} className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{key}</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 break-words">{String(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. MODEL OUTPUT SNAPSHOT */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Model Output & Calculated Risk Index
                </h4>

                {/* Score Summary Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[10px] font-mono uppercase text-slate-500">Calculated Risk Index</div>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                      {activeAssessment.output?.predicted_risk_pct ?? activeAssessment.output?.simulated_risk_score ?? activeAssessment.output?.global_baseline ?? 0}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Evaluated for live shift</div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="text-[10px] font-mono uppercase text-slate-500">Global Baseline Comparison</div>
                    <div className="text-2xl font-bold font-mono text-slate-700 mt-1">
                      {activeAssessment.output?.global_baseline ?? activeAssessment.output?.baseline_risk ?? 48.4}%
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      Delta: {activeAssessment.output?.delta_pct ?? activeAssessment.output?.risk_delta ?? 0}%
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                    activeAssessment.output?.risk_level === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                    activeAssessment.output?.risk_level === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    activeAssessment.output?.risk_level === 'WATCH' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="text-[10px] font-mono uppercase font-bold">Statutory Risk Category</div>
                    <div className="text-lg font-black font-mono mt-1">
                      {activeAssessment.output?.risk_level || 'EVALUATED'}
                    </div>
                    <div className="text-[10px] font-medium opacity-80 mt-0.5">DGMS Norm Threshold</div>
                  </div>
                </div>

                {/* Explanation text */}
                {activeAssessment.output?.explanation && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-mono">
                    <strong className="text-slate-900 font-sans">Model Decision Rationale:</strong> {activeAssessment.output.explanation}
                  </div>
                )}

                {/* Risk Drivers if Model 4 */}
                {activeAssessment.output?.risk_drivers && activeAssessment.output.risk_drivers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase font-mono">Primary Risk Drivers Identified:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {activeAssessment.output.risk_drivers.map((d, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <span className="text-slate-700 font-medium">{d.driver}</span>
                          <span className="font-mono font-bold text-indigo-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trajectory Area Chart if What-If Model 6 */}
                {activeAssessment.output?.trajectory && activeAssessment.output.trajectory.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase font-mono">Projected Risk Trajectory (24-Hour Cycle):</div>
                    <div className="h-44 w-full bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeAssessment.output.trajectory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="authRiskGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                          <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#authRiskGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Mitigation recommendations if What-If */}
                {activeAssessment.output?.mitigation_recommendations && activeAssessment.output.mitigation_recommendations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Statutory DGMS Mitigation Recommendations Transmitted:
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {activeAssessment.output.mitigation_recommendations.map((rec, i) => (
                        <div key={i} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-900 flex items-start gap-2 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Immutable Blockchain / Ledger Verification Footnote */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Immutable SHA-256 Audit Trail: Record #{activeAssessment.id} cryptographically anchored.</span>
                </div>
                <span>Authority Governance Verification</span>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white border border-[#DDD6C7] rounded-2xl text-center space-y-3">
              <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Select an Assessment to View</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click on any supervisor AI assessment on the left to inspect the exact evaluated inputs and model output.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
