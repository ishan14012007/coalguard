import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Video, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Flame, 
  Radio, 
  Zap, 
  Sparkles, 
  UserCheck, 
  HardHat, 
  RefreshCw, 
  Send, 
  CheckSquare, 
  FileText, 
  Activity,
  ShieldCheck,
  Lock,
  ExternalLink,
  Info,
  AlertCircle,
  X
} from 'lucide-react';

// Human-readable Gesture Dictionary
export const GESTURE_DISPLAY_CONFIG = {
  PPE_DAMAGE: {
    label: 'PPE / Helmet Damage',
    shortName: 'PPE Damage',
    priority: 'HIGH',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    cardBorder: 'border-amber-400 bg-amber-50/50',
    iconColor: 'text-amber-600',
    description: 'Worker reports cracked/damaged helmet or compromised PPE gear.',
    pattern: 'Tap top/side of helmet twice with one hand (TAP -> TAP -> STOP)'
  },
  SUSPECTED_GAS_LEAK: {
    label: 'Suspected Gas Leak',
    shortName: 'Gas Leak',
    priority: 'CRITICAL',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    cardBorder: 'border-red-500 bg-red-50/60',
    iconColor: 'text-red-600',
    description: 'Visual report: Worker suspects gas leak in sector (NOT physical gas sensor).',
    pattern: 'Open palm covering nose and mouth continuously for at least 4.0 seconds'
  },
  CRACK_WORSENING: {
    label: 'Crack Worsening',
    shortName: 'Crack Separation',
    priority: 'CRITICAL',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    cardBorder: 'border-red-500 bg-red-50/60',
    iconColor: 'text-red-600',
    description: 'Worker reports ground strata crack separation widening.',
    pattern: 'Both index fingers repeatedly moving close -> apart -> close -> apart'
  },
  RESCUE_REQUIRED: {
    label: 'Rescue Required',
    shortName: 'Emergency Rescue',
    priority: 'CRITICAL',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-400',
    cardBorder: 'border-rose-600 bg-rose-50/70',
    iconColor: 'text-rose-700',
    description: 'Immediate emergency rescue / life-safety assistance required.',
    pattern: 'Both arms raised above head with continuous overhead waving for >= 2.0s'
  },
  HAZARD_HERE: {
    label: 'Hazard Here',
    shortName: 'Physical Hazard',
    priority: 'HIGH',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    cardBorder: 'border-amber-400 bg-amber-50/50',
    iconColor: 'text-amber-600',
    description: 'Specific physical strata or machinery hazard present at this location.',
    pattern: 'Both forearms crossed into a clear X in front of chest and held for >= 1.0s'
  }
};

export default function MineSignView({ token }) {
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTED');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING_CONFIRMATION' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [auditModalEvent, setAuditModalEvent] = useState(null);
  
  // Action Modals State
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Supervisor Candidate Confirmation & Rejection State
  const [confirmLoadingId, setConfirmLoadingId] = useState(null);
  const [rejectLoadingId, setRejectLoadingId] = useState(null);
  const [confirmationFeedback, setConfirmationFeedback] = useState('');
  
  // Simulator State
  const [simulatingGesture, setSimulatingGesture] = useState(false);
  const [simWorker, setSimWorker] = useState('W001');
  const [testSignalMsg, setTestSignalMsg] = useState('');

  // Fetch MineSign Events from Backend API
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/minesign/events', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out any potential NO_GESTURE (defense-in-depth)
        const validEvents = (data.events || []).filter(e => e.gesture !== 'NO_GESTURE');
        setEventsData(validEvents);
        setConnectionStatus('CONNECTED');
        setErrorMsg('');
      } else {
        setConnectionStatus('DISCONNECTED');
        setErrorMsg(`Backend returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch MineSign events:', err);
      setConnectionStatus('DISCONNECTED');
      setErrorMsg('Cannot reach backend server. Ensure Express API is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [token]);

  // Supervisor Confirms Candidate Event (PENDING_CONFIRMATION -> OPEN)
  const handleConfirmCandidate = async (candidateId) => {
    setConfirmLoadingId(candidateId);
    try {
      const res = await fetch(`/api/minesign/events/${candidateId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          confirmed_by: 'Er. Rajeshwar Verma (Colliery Shift Supervisor)',
          confirmation_notes: 'Visual gesture verified via live camera stream and confirmed.'
        })
      });
      if (res.ok) {
        setConfirmationFeedback('✅ MineSign candidate confirmed! Official safety alert generated and logged to audit trail.');
        fetchEvents();
        setTimeout(() => setConfirmationFeedback(''), 4500);
      } else {
        const err = await res.json();
        setConfirmationFeedback(`⚠️ Confirmation failed: ${err.message || 'Unknown error'}`);
        setTimeout(() => setConfirmationFeedback(''), 4500);
      }
    } catch (err) {
      console.error('Candidate confirmation error:', err);
      setConfirmationFeedback('❌ Network error confirming candidate.');
    } finally {
      setConfirmLoadingId(null);
    }
  };

  // Supervisor Rejects Candidate Event (PENDING_CONFIRMATION -> REJECTED)
  const handleRejectCandidate = async (candidateId) => {
    setRejectLoadingId(candidateId);
    try {
      const res = await fetch(`/api/minesign/events/${candidateId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rejected_by: 'Er. Rajeshwar Verma (Colliery Shift Supervisor)',
          rejection_reason: 'Non-actionable or false candidate gesture rejected by supervisor.'
        })
      });
      if (res.ok) {
        setConfirmationFeedback('ℹ️ Gesture rejected — no official safety event created.');
        fetchEvents();
        setTimeout(() => setConfirmationFeedback(''), 4500);
      } else {
        const err = await res.json();
        setConfirmationFeedback(`⚠️ Rejection failed: ${err.message || 'Unknown error'}`);
        setTimeout(() => setConfirmationFeedback(''), 4500);
      }
    } catch (err) {
      console.error('Candidate rejection error:', err);
      setConfirmationFeedback('❌ Network error rejecting candidate.');
    } finally {
      setRejectLoadingId(null);
    }
  };

  // Quick Simulation Trigger for Evaluators
  const handleSimulateSignal = async (gestureName) => {
    setSimulatingGesture(true);
    try {
      const res = await fetch('/api/minesign/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          gesture: gestureName,
          confidence: 0.975,
          camera_id: 'CAM-MINESIGN-DEMO',
          mine_id: 'demo-mine',
          mine_name: 'Demo Coal Mine',
          zone: 'Conveyor Zone 4',
          worker_id: simWorker
        })
      });

      if (res.ok) {
        const created = await res.json();
        setTestSignalMsg(`✅ Candidate '${GESTURE_DISPLAY_CONFIG[gestureName]?.label || gestureName}' signal ingested (Awaiting Confirmation, ID: ${created.event_id})`);
        fetchEvents();
        setTimeout(() => setTestSignalMsg(''), 4000);
      } else {
        const err = await res.json();
        setTestSignalMsg(`⚠️ ${err.message || 'Signal rejected'}`);
        setTimeout(() => setTestSignalMsg(''), 4000);
      }
    } catch (err) {
      console.error('Simulation trigger failed:', err);
      setTestSignalMsg('❌ Network error communicating with backend API.');
    } finally {
      setSimulatingGesture(false);
    }
  };

  // Acknowledge Event Action
  const handleAcknowledge = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/minesign/events/${selectedEvent.event_id}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          acknowledged_by: 'Colliery Safety Officer (Command Desk)',
          action_notes: actionNotes || 'Safety team dispatched to investigate visual alert.'
        })
      });
      if (res.ok) {
        setIsAckModalOpen(false);
        setActionNotes('');
        setSelectedEvent(null);
        fetchEvents();
      }
    } catch (err) {
      console.error('Acknowledge failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve Event Action
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/minesign/events/${selectedEvent.event_id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          resolved_by: 'Colliery Safety Officer',
          resolution_notes: resolutionSummary || 'Condition inspected, rectified, and cleared on site.'
        })
      });
      if (res.ok) {
        setIsResolveModalOpen(false);
        setResolutionSummary('');
        setSelectedEvent(null);
        fetchEvents();
      }
    } catch (err) {
      console.error('Resolve failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter and Partition Events
  const pendingCandidates = eventsData.filter(e => e.status === 'PENDING_CONFIRMATION');
  const openEvents = eventsData.filter(e => e.status === 'OPEN');
  const ackEvents = eventsData.filter(e => e.status === 'ACKNOWLEDGED');
  const resolvedEvents = eventsData.filter(e => e.status === 'RESOLVED');
  const rejectedEvents = eventsData.filter(e => e.status === 'REJECTED');

  const filteredEvents = eventsData.filter(e => {
    if (activeFilter === 'ALL') return true;
    return e.status === activeFilter;
  });

  const latestActiveEvent = openEvents.length > 0 ? openEvents[0] : (ackEvents.length > 0 ? ackEvents[0] : null);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Channel Status */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#E3EFE8] text-[#1F6B45] border border-[#1F6B45]/20">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-[#1E1B16] font-heading">
                  MineSign
                </h1>
                <span className="text-xs font-semibold text-[#6B6558]">
                  — Visual Worker-to-Governance Safety Channel
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/30">
                  SIMULATION MODE
                </span>
              </div>
              <p className="text-xs text-[#6B6558] mt-1 font-mono">
                Mine: <span className="font-bold text-[#1E1B16]">Demo Coal Mine</span> | Zone: <span className="font-bold text-[#1E1B16]">Conveyor Zone 4</span> | Camera: <span className="font-bold text-[#1E1B16]">CAM-MINESIGN-DEMO</span>
              </p>
            </div>
          </div>
        </div>

        {/* Live Channel Status Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-[#DDD6C7] text-xs font-mono">
            <span className="text-[#6B6558]">Connection:</span>
            <span className={`inline-flex items-center gap-1.5 font-bold ${connectionStatus === 'CONNECTED' ? 'text-[#1F6B45]' : 'text-[#DC2626]'}`}>
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-[#1F6B45]' : 'bg-[#DC2626] animate-ping'}`} />
              {connectionStatus}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-[#DDD6C7] text-xs font-mono">
            <span className="text-[#6B6558]">Channel Status:</span>
            {openEvents.length > 0 ? (
              <span className="font-bold text-[#DC2626] flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                ACTIVE EVENT ({openEvents.length})
              </span>
            ) : (
              <span className="font-bold text-[#1F6B45] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                NO ACTIVE EVENT
              </span>
            )}
          </div>

          <button 
            onClick={fetchEvents}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#EFEBE2] text-[#1E1B16] border border-[#DDD6C7] hover:bg-[#DDD6C7]/60 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Confirmation / Action Feedback Alert */}
      {confirmationFeedback && (
        <div className="p-4 rounded-xl bg-[#E3EFE8] border border-[#1F6B45]/30 text-[#1F6B45] text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{confirmationFeedback}</span>
        </div>
      )}

      {/* 2A. PROMINENT CONFIRMATION REQUIRED CARDS (When PENDING_CONFIRMATION exists) */}
      {pendingCandidates.length > 0 && (
        <div className="space-y-4">
          {pendingCandidates.map((cand) => {
            const candConfig = GESTURE_DISPLAY_CONFIG[cand.gesture] || {};
            return (
              <div 
                key={cand.event_id}
                className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/20 border-2 border-amber-500 shadow-md animate-in fade-in slide-in-from-top-3 duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 rounded-2xl bg-amber-500 text-white shadow-lg animate-pulse shrink-0">
                      <AlertTriangle className="w-8 h-8" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-amber-500 text-black uppercase tracking-wider">
                          ⚠ MINE SIGN SIGNAL AWAITING CONFIRMATION
                        </span>
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white text-amber-900 border border-amber-300">
                          PENDING CONFIRMATION
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-black/10 text-gray-700">
                          Simulation Mode
                        </span>
                      </div>

                      <h2 className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">
                        {candConfig.label || cand.gesture}
                      </h2>

                      <p className="text-xs text-[#443E33] font-medium mt-1">
                        {cand.meaning || candConfig.description}
                      </p>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3.5 pt-3 border-t border-amber-500/20 text-xs font-mono">
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">Worker</span>
                          <span className="font-bold text-[#1E1B16]">{cand.worker_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">Location</span>
                          <span className="font-bold text-[#1E1B16]">{cand.zone}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">Camera</span>
                          <span className="font-bold text-[#1E1B16]">{cand.camera_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">AI Confidence</span>
                          <span className="font-bold text-[#1F6B45]">{(cand.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">Time</span>
                          <span className="font-bold text-[#1E1B16]">{new Date(cand.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase block">Source</span>
                          <span className="font-bold text-[#1E1B16]">MineSign AI — Simulation Mode</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Confirmation Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 self-end lg:self-center">
                    <button
                      disabled={confirmLoadingId === cand.event_id || rejectLoadingId === cand.event_id}
                      onClick={() => handleConfirmCandidate(cand.event_id)}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1F6B45] hover:bg-[#185336] text-white font-extrabold text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{confirmLoadingId === cand.event_id ? 'CONFIRMING...' : 'CONFIRM EVENT'}</span>
                    </button>

                    <button
                      disabled={confirmLoadingId === cand.event_id || rejectLoadingId === cand.event_id}
                      onClick={() => handleRejectCandidate(cand.event_id)}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#A13D2F] hover:bg-[#8B3428] text-white font-extrabold text-xs tracking-wider transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <X className="w-4 h-4" />
                      <span>{rejectLoadingId === cand.event_id ? 'REJECTING...' : 'REJECT'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2B. PROMINENT ACTIVE ALERT CARD (When Confirmed Open/Acknowledged Event Exists) */}
      {latestActiveEvent && (
        <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
          latestActiveEvent.priority === 'CRITICAL' 
            ? 'bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-red-400' 
            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl border shrink-0 ${
                latestActiveEvent.priority === 'CRITICAL'
                  ? 'bg-red-500 text-white shadow-md animate-bounce'
                  : 'bg-amber-500 text-white shadow-md'
              }`}>
                <ShieldAlert className="w-7 h-7" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black text-white">
                    {latestActiveEvent.priority === 'CRITICAL' ? '🚨 CRITICAL SAFETY EVENT' : '⚠️ HIGH PRIORITY EVENT'}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white text-black border border-black/20">
                    {latestActiveEvent.status}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/70 text-gray-700 border border-gray-300">
                    SIMULATION MODE
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold text-[#1E1B16] mt-1.5 font-heading">
                  {GESTURE_DISPLAY_CONFIG[latestActiveEvent.gesture]?.label || latestActiveEvent.gesture}
                </h2>

                <p className="text-xs text-[#443E33] font-medium mt-1">
                  {latestActiveEvent.meaning || GESTURE_DISPLAY_CONFIG[latestActiveEvent.gesture]?.description}
                </p>

                {/* Event Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3.5 pt-3 border-t border-black/10 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Worker</span>
                    <span className="font-bold text-[#1E1B16]">{latestActiveEvent.worker_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Location</span>
                    <span className="font-bold text-[#1E1B16]">{latestActiveEvent.zone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Camera</span>
                    <span className="font-bold text-[#1E1B16]">{latestActiveEvent.camera_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Confidence</span>
                    <span className="font-bold text-[#1F6B45]">{(latestActiveEvent.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Time</span>
                    <span className="font-bold text-[#1E1B16]">{new Date(latestActiveEvent.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase block">Source</span>
                    <span className="font-bold text-[#1E1B16]">MineSign AI</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
              {latestActiveEvent.status === 'OPEN' && (
                <button
                  onClick={() => {
                    setSelectedEvent(latestActiveEvent);
                    setIsAckModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>ACKNOWLEDGE</span>
                </button>
              )}

              {latestActiveEvent.status === 'ACKNOWLEDGED' && (
                <button
                  onClick={() => {
                    setSelectedEvent(latestActiveEvent);
                    setIsResolveModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#1F6B45] hover:bg-[#185336] text-white text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>RESOLVE EVENT</span>
                </button>
              )}

              <button
                onClick={() => setAuditModalEvent(latestActiveEvent)}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-[#1E1B16] border border-gray-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#1F6B45]" />
                <span>View Audit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SIH Demo Signal Dispatcher */}
      <div className="p-5 rounded-2xl bg-[#FBF9F5] border border-[#DDD6C7] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#1F6B45]" />
            <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wide font-heading">
              SIH Evaluator Bench — Dispatch Validated MineSign Signal
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#6B6558]">Worker Identity:</span>
            <select 
              value={simWorker} 
              onChange={(e) => setSimWorker(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#DDD6C7] bg-white font-bold text-[#1E1B16] focus:outline-none"
            >
              <option value="W001">Worker W001</option>
              <option value="W002">Worker W002</option>
            </select>
          </div>
        </div>

        {testSignalMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#E3EFE8] text-[#1F6B45] text-xs font-bold border border-[#1F6B45]/20 animate-pulse">
            {testSignalMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {Object.entries(GESTURE_DISPLAY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              disabled={simulatingGesture}
              onClick={() => handleSimulateSignal(key)}
              className="flex flex-col p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] hover:border-[#1F6B45] hover:shadow-xs transition text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-bold text-xs text-[#1E1B16] group-hover:text-[#1F6B45] transition">
                  {config.label}
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
                  {config.priority}
                </span>
              </div>
              <p className="text-[11px] text-[#6B6558] line-clamp-2 leading-relaxed">
                {config.pattern}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Event History Table */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#DDD6C7]">
          <div>
            <h3 className="text-base font-bold text-[#1E1B16] font-heading">
              MineSign Safety Event History
            </h3>
            <p className="text-xs text-[#6B6558]">
              Verified gestural safety events received from Conveyor Zone 4 camera pipeline
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-[#EFEBE2] p-1 rounded-xl border border-[#DDD6C7] text-xs font-mono">
            {[
              { key: 'ALL', label: 'All Events', count: eventsData.length },
              { key: 'PENDING_CONFIRMATION', label: 'Pending', count: pendingCandidates.length },
              { key: 'OPEN', label: 'Open', count: openEvents.length },
              { key: 'ACKNOWLEDGED', label: 'Acknowledged', count: ackEvents.length },
              { key: 'RESOLVED', label: 'Resolved', count: resolvedEvents.length }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                  activeFilter === f.key
                    ? 'bg-[#1B3A5C] text-white font-bold shadow-xs'
                    : 'text-[#6B6558] hover:text-[#1E1B16]'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-4 overflow-x-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#6B6558]">
              No {activeFilter === 'ALL' ? '' : activeFilter.toLowerCase()} MineSign events recorded.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F5F0] border-y border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Time</th>
                  <th className="py-3 px-3.5">Worker</th>
                  <th className="py-3 px-3.5">Event</th>
                  <th className="py-3 px-3.5">Zone</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Confidence</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD6C7]/60">
                {filteredEvents.map((evt) => {
                  const conf = GESTURE_DISPLAY_CONFIG[evt.gesture] || {};
                  const isPending = evt.status === 'PENDING_CONFIRMATION';
                  const isRejected = evt.status === 'REJECTED';
                  return (
                    <tr key={evt.event_id} className={`hover:bg-[#FBF9F5] transition ${isPending ? 'bg-amber-50/40' : ''}`}>
                      <td className="py-3 px-3.5 font-mono text-[#1E1B16]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-[#1E1B16]">
                        {evt.worker_id}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#1E1B16]">
                          {conf.label || evt.gesture}
                        </div>
                        <div className="text-[10px] text-[#6B6558] line-clamp-1">
                          {evt.meaning || conf.description}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[#443E33]">
                        {evt.zone}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${conf.badgeClass || 'bg-gray-100 text-gray-800'}`}>
                          {evt.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-semibold text-[#1F6B45]">
                        {(evt.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          evt.status === 'PENDING_CONFIRMATION'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse'
                            : evt.status === 'OPEN'
                            ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                            : evt.status === 'ACKNOWLEDGED'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : evt.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {evt.status === 'PENDING_CONFIRMATION' ? 'Awaiting Confirmation' : evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                disabled={confirmLoadingId === evt.event_id || rejectLoadingId === evt.event_id}
                                onClick={() => handleConfirmCandidate(evt.event_id)}
                                className="px-2.5 py-1 rounded-lg bg-[#1F6B45] hover:bg-[#185336] text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                disabled={confirmLoadingId === evt.event_id || rejectLoadingId === evt.event_id}
                                onClick={() => handleRejectCandidate(evt.event_id)}
                                className="px-2 py-1 rounded-lg bg-[#A13D2F] hover:bg-[#8B3428] text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {evt.status === 'OPEN' && (
                            <button
                              onClick={() => {
                                setSelectedEvent(evt);
                                setIsAckModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          )}

                          {evt.status === 'ACKNOWLEDGED' && (
                            <button
                              onClick={() => {
                                setSelectedEvent(evt);
                                setIsResolveModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#1F6B45] hover:bg-[#185336] text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}

                          <button
                            onClick={() => setAuditModalEvent(evt)}
                            className="px-2.5 py-1 rounded-lg bg-[#EFEBE2] hover:bg-[#DDD6C7] text-[#1E1B16] font-semibold text-[11px] transition cursor-pointer"
                          >
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 5. Statutory Gesture Vocabulary Protocol */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <HardHat className="w-4 h-4 text-[#1F6B45]" />
          <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wide font-heading">
            MineSign Visual Gesture Reference & Temporal Patterns
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {Object.entries(GESTURE_DISPLAY_CONFIG).map(([key, config]) => (
            <div key={key} className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#DDD6C7]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#1E1B16]">{config.label}</span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${config.badgeClass}`}>
                  {config.priority}
                </span>
              </div>
              <div className="mt-2 text-xs">
                <p className="font-semibold text-[#1F6B45]">Required Pattern:</p>
                <p className="text-[11px] text-[#443E33] font-mono">{config.pattern}</p>
              </div>
              <div className="mt-1.5 text-[11px] text-[#6B6558]">
                <strong>Governance Meaning:</strong> {config.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acknowledge Modal */}
      {isAckModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C7]">
              <h3 className="text-base font-bold text-[#1E1B16] font-heading">
                Acknowledge MineSign Event
              </h3>
              <button onClick={() => setIsAckModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block">
                {GESTURE_DISPLAY_CONFIG[selectedEvent.gesture]?.label || selectedEvent.gesture}
              </span>
              <span className="text-amber-800 text-[11px] font-mono mt-0.5 block">
                Worker: {selectedEvent.worker_id} | Zone: {selectedEvent.zone} | Camera: {selectedEvent.camera_id}
              </span>
            </div>

            <form onSubmit={handleAcknowledge} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B16] mb-1">
                  Supervisor Action Notes:
                </label>
                <textarea
                  required
                  rows="3"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Dispatched shift incharge & safety rescue team to inspect conveyor zone..."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#DDD6C7] bg-[#FBF9F5] focus:outline-none focus:border-[#1F6B45]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD6C7]">
                <button
                  type="button"
                  onClick={() => setIsAckModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6B6558] hover:bg-[#EFEBE2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                >
                  {actionLoading ? 'Acknowledging...' : 'Confirm Acknowledgement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {isResolveModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C7]">
              <h3 className="text-base font-bold text-[#1E1B16] font-heading">
                Resolve & Clear MineSign Event
              </h3>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-900 block">
                {GESTURE_DISPLAY_CONFIG[selectedEvent.gesture]?.label || selectedEvent.gesture}
              </span>
              <span className="text-emerald-800 text-[11px] font-mono mt-0.5 block">
                Worker: {selectedEvent.worker_id} | Zone: {selectedEvent.zone}
              </span>
            </div>

            <form onSubmit={handleResolve} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1E1B16] mb-1">
                  Safety Clearance & Resolution Note:
                </label>
                <textarea
                  required
                  rows="3"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="e.g. Helmet replaced with certified BIS Type IV unit. Worker cleared for duty."
                  className="w-full text-xs p-2.5 rounded-xl border border-[#DDD6C7] bg-[#FBF9F5] focus:outline-none focus:border-[#1F6B45]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD6C7]">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6B6558] hover:bg-[#EFEBE2] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1F6B45] hover:bg-[#185336] text-white shadow-xs cursor-pointer"
                >
                  {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Audit Modal */}
      {auditModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD6C7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1F6B45]" />
                <h3 className="text-base font-bold text-[#1E1B16] font-heading">
                  MineSign Audit Trail Record
                </h3>
              </div>
              <button onClick={() => setAuditModalEvent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#FBF9F5] rounded-xl border border-[#DDD6C7] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Event ID:</span>
                  <span className="font-bold text-[#1E1B16]">{auditModalEvent.event_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gesture Action:</span>
                  <span className="font-bold text-[#1E1B16]">{auditModalEvent.gesture}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Worker Identity:</span>
                  <span className="font-bold text-[#1E1B16]">{auditModalEvent.worker_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location / Zone:</span>
                  <span className="text-[#1E1B16]">{auditModalEvent.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Camera Source:</span>
                  <span className="text-[#1E1B16]">{auditModalEvent.camera_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ML Confidence:</span>
                  <span className="font-bold text-[#1F6B45]">{(auditModalEvent.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Priority Level:</span>
                  <span className="font-bold text-[#A13D2F]">{auditModalEvent.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="text-[#1E1B16]">{new Date(auditModalEvent.timestamp).toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lifecycle Status:</span>
                  <span className="font-bold text-[#1B3A5C]">{auditModalEvent.status}</span>
                </div>
              </div>

              {auditModalEvent.confirmed_at && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">Supervisor Confirmation Record:</span>
                  <span className="text-gray-600 block text-[11px] mt-0.5">Confirmed By: {auditModalEvent.confirmed_by} at {new Date(auditModalEvent.confirmed_at).toLocaleTimeString()}</span>
                  <span className="text-gray-700 block text-[11px] mt-1 font-sans">Notes: {auditModalEvent.confirmation_notes || 'Confirmed via video verification'}</span>
                </div>
              )}

              {auditModalEvent.rejected_at && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="font-bold text-rose-900 block">Supervisor Rejection Record:</span>
                  <span className="text-gray-600 block text-[11px] mt-0.5">Rejected By: {auditModalEvent.rejected_by} at {new Date(auditModalEvent.rejected_at).toLocaleTimeString()}</span>
                  <span className="text-gray-700 block text-[11px] mt-1 font-sans">Reason: {auditModalEvent.rejection_reason}</span>
                </div>
              )}

              {auditModalEvent.acknowledged_at && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900 block">Acknowledgement Record:</span>
                  <span className="text-gray-600 block text-[11px] mt-0.5">By: {auditModalEvent.acknowledged_by} at {new Date(auditModalEvent.acknowledged_at).toLocaleTimeString()}</span>
                  <span className="text-gray-700 block text-[11px] mt-1 font-sans">Notes: {auditModalEvent.action_notes || 'Dispatched response team'}</span>
                </div>
              )}

              {auditModalEvent.resolved_at && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">Resolution Clearance:</span>
                  <span className="text-gray-600 block text-[11px] mt-0.5">By: {auditModalEvent.resolved_by} at {new Date(auditModalEvent.resolved_at).toLocaleTimeString()}</span>
                  <span className="text-gray-700 block text-[11px] mt-1 font-sans">Clearance: {auditModalEvent.resolution_notes}</span>
                </div>
              )}

              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] flex items-center gap-1.5 border border-emerald-200">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cryptographically secured on CoalGuard SHA-256 Blockchain-Lite Ledger</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setAuditModalEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-[#1B3A5C] text-white text-xs font-bold hover:bg-[#12273F] cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
