import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Video, 
  Camera, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  FileSpreadsheet, 
  Sparkles, 
  MessageSquare, 
  Search, 
  Filter, 
  Calendar, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Building2,
  Users,
  Activity,
  History,
  HardHat
} from 'lucide-react';

export default function SupervisorDailyLogView({ token, onNavigate }) {
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
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogData = async () => {
    try {
      const dateParam = dateFilter === 'custom' && customDate ? customDate : dateFilter;
      const catParam = activeCategory !== 'ALL' ? `&category=${activeCategory}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      
      const res = await fetch(`/api/operational-log/events?date=${dateParam}${catParam}${searchParam}&role=supervisor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
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
      console.error('Failed to load daily operational log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogData();
    const interval = setInterval(fetchLogData, 8000);
    return () => clearInterval(interval);
  }, [token, activeCategory, dateFilter, customDate, searchQuery]);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'CAMERA': return <Video className="w-4 h-4 text-sky-600" />;
      case 'GESTURE': return <Camera className="w-4 h-4 text-purple-600" />;
      case 'EMERGENCY': return <Flame className="w-4 h-4 text-red-600" />;
      case 'SAFETY':
      case 'HAZARD': return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
      case 'COMPLIANCE': return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'AI_ASSESSMENT': return <Sparkles className="w-4 h-4 text-indigo-600" />;
      case 'COMMUNICATION': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'INFORMATIONAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700">INFO</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700">NOMINAL</span>;
    }
  };

  const formatEventTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const categories = [
    { id: 'ALL', label: 'All Events' },
    { id: 'CAMERA', label: 'Camera AI' },
    { id: 'GESTURE', label: 'MineSign Gestures' },
    { id: 'REPORTS', label: 'Safety & Hazards' },
    { id: 'EMERGENCY', label: 'Emergencies' },
    { id: 'COMPLIANCE', label: 'Compliance' },
    { id: 'AI_ASSESSMENT', label: 'AI Models' },
    { id: 'COMMUNICATION', label: 'Directives' }
  ];

  return (
    <div className="gov-panel space-y-4">
      {/* 1. Header Bar */}
      <div className="gov-panel-header flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-300" />
          <span className="uppercase font-bold tracking-wide">
            TODAY'S OPERATIONAL ACTIVITY & EVENT LOG
          </span>
          <span className="badge-gov badge-gov-neutral font-mono text-[10px]">
            CHRONOLOGICAL MEMORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogData()}
            className="text-white hover:text-amber-200 text-xs flex items-center gap-1 font-mono transition"
            title="Refresh event stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Live Sync</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* 2. Compact Daily Summary Counters (Calculated Dynamically) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
            <div className="text-[10px] uppercase text-slate-500 font-sans">Total Events</div>
            <div className="text-base font-black text-[#0f2942] mt-0.5">{summary.totalEvents}</div>
          </div>
          <div className="p-2.5 bg-sky-50/70 border border-sky-200 rounded text-center">
            <div className="text-[10px] uppercase text-sky-800 font-sans">Camera Events</div>
            <div className="text-base font-bold text-sky-900 mt-0.5">{summary.cameraEvents}</div>
          </div>
          <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded text-center">
            <div className="text-[10px] uppercase text-purple-800 font-sans">Gestures</div>
            <div className="text-base font-bold text-purple-900 mt-0.5">{summary.gestureEvents}</div>
          </div>
          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded text-center">
            <div className="text-[10px] uppercase text-amber-800 font-sans">Safety / Hazards</div>
            <div className="text-base font-bold text-amber-900 mt-0.5">{summary.safetyReports}</div>
          </div>
          <div className="p-2.5 bg-red-50/70 border border-red-200 rounded text-center">
            <div className="text-[10px] uppercase text-red-800 font-sans">Emergencies</div>
            <div className="text-base font-bold text-red-900 mt-0.5">{summary.emergencies}</div>
          </div>
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded text-center">
            <div className="text-[10px] uppercase text-indigo-800 font-sans">AI Assessments</div>
            <div className="text-base font-bold text-indigo-900 mt-0.5">{summary.aiAssessments}</div>
          </div>
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded text-center">
            <div className="text-[10px] uppercase text-emerald-800 font-sans">Compliance</div>
            <div className="text-base font-bold text-emerald-900 mt-0.5">{summary.complianceEvents}</div>
          </div>
        </div>

        {/* 3. Filter Controls: Category Tabs + Date Switcher + Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-200">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                  activeCategory === c.id
                    ? 'bg-[#213d77] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Date Selector & Search Box */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-300">
              <button
                onClick={() => { setDateFilter('today'); setCustomDate(''); }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-[#0f2942] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => { setDateFilter('yesterday'); setCustomDate(''); }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                  dateFilter === 'yesterday' ? 'bg-white text-[#0f2942] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-[#0f2942] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Days
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search event, ID, worker, zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 pl-7 w-48 sm:w-56 focus:outline-none focus:border-[#213d77]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* 4. Chronological Event Feed */}
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded">
              <History className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-slate-700">No events recorded for this selection</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real operational events from Camera AI, MineSign, Field Reports, and AI Models will populate here chronologically.
              </p>
            </div>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onNavigate && evt.destination_tab && onNavigate(evt.destination_tab)}
                className="p-3 bg-white border border-slate-200 rounded hover:border-[#213d77] hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs group"
              >
                {/* Left Side: Time, Icon, Title, Description, Location */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  
                  {/* Time Badge */}
                  <div className="shrink-0 text-center font-mono w-16 pt-0.5">
                    <span className="text-xs font-bold text-slate-900 block">
                      {formatEventTime(evt.timestamp)}
                    </span>
                    <span className="text-[9px] text-slate-400 block uppercase">
                      {new Date(evt.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className="p-2 rounded bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {getCategoryIcon(evt.category)}
                  </div>

                  {/* Body */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                        [{evt.category}]
                      </span>
                      <strong className="text-slate-900 text-xs font-sans group-hover:text-[#213d77] transition">
                        {evt.title}
                      </strong>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                      {evt.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono text-slate-500 pt-0.5">
                      <span>Source: <strong className="text-slate-700">{evt.source}</strong></span>
                      <span>Location: <strong className="text-slate-700">{evt.location}</strong></span>
                      {evt.worker_id && (
                        <span>Worker: <strong className="text-[#0f2942]">{evt.worker_id}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Severity, Status & Direct Navigation Indicator */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-1 sm:pt-0">
                  <div className="flex items-center gap-1.5">
                    {getSeverityBadge(evt.severity)}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 uppercase">
                      {evt.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#213d77] font-bold flex items-center gap-1 group-hover:translate-x-1 transition font-mono">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
