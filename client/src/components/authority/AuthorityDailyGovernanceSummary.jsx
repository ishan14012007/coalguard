import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  History, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Flame, 
  FileSpreadsheet, 
  MessageSquare, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  Building2, 
  Scale, 
  Activity,
  Lock,
  Eye,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';

export default function AuthorityDailyGovernanceSummary({ 
  token, 
  selectedMineId = 'all', 
  onNavigate 
}) {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    cameraEvents: 0,
    gestureEvents: 0,
    safetyReports: 0,
    emergencies: 0,
    complianceEvents: 0,
    aiAssessments: 0,
    communications: 0,
    escalations: 0
  });
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGovernanceEvents = async () => {
    try {
      const mineParam = selectedMineId !== 'all' ? `&mine_id=${selectedMineId}` : '';
      const catParam = categoryFilter !== 'ALL' ? `&category=${categoryFilter}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      
      const res = await fetch(`/api/operational-log/events?date=${dateFilter}${mineParam}${catParam}${searchParam}&role=authority`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        let list = data.events || [];
        if (severityFilter !== 'ALL') {
          list = list.filter(e => e.severity === severityFilter);
        }
        setEvents(list);
        setSummary(data.summary || {
          totalEvents: 0,
          cameraEvents: 0,
          gestureEvents: 0,
          safetyReports: 0,
          emergencies: 0,
          complianceEvents: 0,
          aiAssessments: 0,
          communications: 0,
          escalations: 0
        });
      }
    } catch (err) {
      console.error('Failed to load governance event log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceEvents();
    const interval = setInterval(fetchGovernanceEvents, 10000);
    return () => clearInterval(interval);
  }, [token, selectedMineId, categoryFilter, severityFilter, dateFilter, searchQuery]);

  const formatEventTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F5E2DE] text-[#A13D2F] border border-[#A13D2F]/30">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F5EDD6] text-[#B8860B] border border-[#B8860B]/30">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EFEBE2] text-[#6B6558]">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#F7F5F0] text-[#6B6558]">INFO</span>;
    }
  };

  const getSourceBadge = (cat) => {
    switch (cat) {
      case 'CAMERA': return <span className="text-sky-700 font-bold">Camera AI</span>;
      case 'GESTURE': return <span className="text-purple-700 font-bold">MineSign Vision</span>;
      case 'EMERGENCY': return <span className="text-red-700 font-bold">SOS Network</span>;
      case 'SAFETY':
      case 'HAZARD': return <span className="text-amber-700 font-bold">Field Report</span>;
      case 'COMPLIANCE': return <span className="text-emerald-700 font-bold">DGMS Norms</span>;
      case 'AI_ASSESSMENT': return <span className="text-indigo-700 font-bold">AI Model</span>;
      case 'COMMUNICATION': return <span className="text-blue-700 font-bold">Directive</span>;
      default: return <span className="text-slate-700 font-bold">System Log</span>;
    }
  };

  const getDestinationSection = (evt) => {
    // Map event destination cleanly to existing Authority tabs
    switch (evt.category) {
      case 'EMERGENCY': return 'emergencies';
      case 'AI_ASSESSMENT': return 'ai_assessments';
      case 'COMPLIANCE': return 'compliance';
      case 'COMMUNICATION': return 'communication';
      case 'SAFETY':
      case 'HAZARD': return 'updates';
      case 'GESTURE':
      case 'CAMERA': return 'ai_assessments';
      default: return 'overview';
    }
  };

  return (
    <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs space-y-5 text-left">
      
      {/* 1. Header & Counter Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1B3A5C]" />
            <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
              Today's Governance Activity & Operational Event Stream
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#EFEBE2] text-[#1B3A5C] text-[10px] font-mono font-bold">
              AUDITED LOG
            </span>
          </div>
          <p className="text-xs text-[#6B6558]">
            Consolidated statutory event stream across monitored collieries — no manual module navigation required.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGovernanceEvents()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#EFEBE2] border border-[#DDD6C7] text-xs font-bold text-[#1B3A5C] transition font-mono cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Live Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#F7F5F0] border border-[#DDD6C7]">
          <div className="text-[10px] uppercase text-[#6B6558] font-sans">Total Events</div>
          <div className="text-lg font-black text-[#1E1B16] mt-0.5">{summary.totalEvents}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#F5E2DE] border border-[#A13D2F]/30">
          <div className="text-[10px] uppercase text-[#A13D2F] font-sans">Emergencies</div>
          <div className="text-lg font-bold text-[#A13D2F] mt-0.5">{summary.emergencies}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#F5EDD6] border border-[#B8860B]/30">
          <div className="text-[10px] uppercase text-[#3A2E00] font-sans">AI Assessments</div>
          <div className="text-lg font-bold text-[#3A2E00] mt-0.5">{summary.aiAssessments}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#E4EAF0] border border-[#1B3A5C]/20">
          <div className="text-[10px] uppercase text-[#1B3A5C] font-sans">Field Reports</div>
          <div className="text-lg font-bold text-[#1B3A5C] mt-0.5">{summary.safetyReports}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#EFEBE2] border border-[#DDD6C7]">
          <div className="text-[10px] uppercase text-[#6B6558] font-sans">Compliance</div>
          <div className="text-lg font-bold text-[#1E1B16] mt-0.5">{summary.complianceEvents}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#F5E2DE] border border-[#A13D2F]/30">
          <div className="text-[10px] uppercase text-[#A13D2F] font-sans">Critical Cases</div>
          <div className="text-lg font-bold text-[#A13D2F] mt-0.5">{summary.escalations}</div>
        </div>
      </div>

      {/* 3. Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
        
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              categoryFilter === 'ALL' ? 'bg-[#1B3A5C] text-white shadow-2xs' : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategoryFilter('EMERGENCY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              categoryFilter === 'EMERGENCY' ? 'bg-[#A13D2F] text-white shadow-2xs' : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2]'
            }`}
          >
            Emergencies ({summary.emergencies})
          </button>
          <button
            onClick={() => setCategoryFilter('AI_ASSESSMENT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              categoryFilter === 'AI_ASSESSMENT' ? 'bg-[#1B3A5C] text-white shadow-2xs' : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2]'
            }`}
          >
            AI Assessments ({summary.aiAssessments})
          </button>
          <button
            onClick={() => setCategoryFilter('REPORTS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              categoryFilter === 'REPORTS' ? 'bg-[#1B3A5C] text-white shadow-2xs' : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2]'
            }`}
          >
            Field Reports ({summary.safetyReports})
          </button>
          <button
            onClick={() => setCategoryFilter('COMPLIANCE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              categoryFilter === 'COMPLIANCE' ? 'bg-[#1B3A5C] text-white shadow-2xs' : 'bg-[#F7F5F0] text-[#6B6558] hover:bg-[#EFEBE2]'
            }`}
          >
            Compliance ({summary.complianceEvents})
          </button>
        </div>

        {/* Date Filter & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#F7F5F0] rounded-xl p-0.5 border border-[#DDD6C7]">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                dateFilter === 'today' ? 'bg-white text-[#1B3A5C] shadow-2xs' : 'text-[#6B6558]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                dateFilter === 'yesterday' ? 'bg-white text-[#1B3A5C] shadow-2xs' : 'text-[#6B6558]'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer ${
                dateFilter === 'all' ? 'bg-white text-[#1B3A5C] shadow-2xs' : 'text-[#6B6558]'
              }`}
            >
              All
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search governance stream..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#DDD6C7] rounded-xl px-2.5 py-1 text-xs text-[#1E1B16] pl-7 w-44 sm:w-52 focus:outline-none focus:border-[#1B3A5C]"
            />
            <Search className="w-3.5 h-3.5 text-[#6B6558] absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 4. Professional Governance Table */}
      <div className="overflow-x-auto rounded-xl border border-[#DDD6C7]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F7F5F0] border-b border-[#DDD6C7] text-[#6B6558] font-mono uppercase text-[11px]">
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Source</th>
              <th className="py-2.5 px-3">Operational Event & Description</th>
              <th className="py-2.5 px-3">Mine / Location</th>
              <th className="py-2.5 px-3 text-center">Severity</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFEBE2] text-[#1E1B16]">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#6B6558]">
                  No operational events recorded matching the current filter.
                </td>
              </tr>
            ) : (
              events.map((evt) => {
                const targetSec = getDestinationSection(evt);
                return (
                  <tr key={evt.id} className="hover:bg-[#F7F5F0] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#1B3A5C] whitespace-nowrap">
                      {formatEventTime(evt.timestamp)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-xs">
                      {getSourceBadge(evt.category)}
                    </td>
                    <td className="py-3 px-3 max-w-md">
                      <div className="font-bold text-[#1E1B16]">{evt.title}</div>
                      <div className="text-[11px] text-[#6B6558] mt-0.5 line-clamp-1" title={evt.description}>
                        {evt.description}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#6B6558]">
                      <strong className="text-[#1E1B16] font-sans block">{evt.mine_name}</strong>
                      <span>{evt.location}</span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getSeverityBadge(evt.severity)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-[10px] uppercase text-[#6B6558]">
                      {evt.status}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onNavigate && onNavigate(targetSec)}
                        className="px-2.5 py-1 rounded-lg bg-[#EFEBE2] hover:bg-[#1B3A5C] text-[#1B3A5C] hover:text-white font-mono font-bold text-[11px] transition cursor-pointer"
                      >
                        Inspect &gt;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
