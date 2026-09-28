import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GovHeader from '../../components/common/GovHeader';
import GovNoticeTicker from '../../components/common/GovNoticeTicker';
import GovBreadcrumbs from '../../components/common/GovBreadcrumbs';
import VoiceHazardModal from '../../components/common/VoiceHazardModal';
import OCRScanModal from '../../components/common/OCRScanModal';
import MinerCameraModal from '../../components/minesign/MinerCameraModal';
import FloatingAssistant from '../../components/assistant/FloatingAssistant';
import { MiningHelmetIcon } from '../../components/common/MiningIcons';
import { 
  Mic, 
  AlertTriangle, 
  CalendarCheck, 
  HelpCircle, 
  PhoneCall, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles,
  MapPin,
  Camera,
  ShieldAlert,
  Eye,
  Hand,
  Send,
  Building2,
  ShieldCheck,
  UserCheck,
  Bell,
  MessageSquare
} from 'lucide-react';

export default function MinerDashboard() {
  const { user, token, t, lang, notifications } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [navHistory, setNavHistory] = useState([]);
  const [seenSections, setSeenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('coalguard_miner_seen_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isMineSignModalOpen, setIsMineSignModalOpen] = useState(false);
  
  const [attendance, setAttendance] = useState(null);
  const [grievances, setGrievances] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [isGrievanceFormOpen, setIsGrievanceFormOpen] = useState(false);
  const [grievanceForm, setGrievanceForm] = useState({ category: 'safety_equipment', subject: '', description: '', priority: 'medium' });
  const [activeSOSEvent, setActiveSOSEvent] = useState(null);
  const [ocrExtractedText, setOcrExtractedText] = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');

  const [isManualReportOpen, setIsManualReportOpen] = useState(false);
  const [manualReportForm, setManualReportForm] = useState({
    category: 'Strata / Roof Control (CMR Reg 106)',
    description: '',
    severity: 'medium',
    zone: 'Zone 4'
  });

  const [gestureTransmittedMsg, setGestureTransmittedMsg] = useState('');

  // Track tab changes and update navigation history stack
  const handleSelectTab = (tabId) => {
    if (tabId === activeTab) return;
    setNavHistory(prev => [...prev, activeTab]);
    setActiveTab(tabId);
    
    // Clear notification for visited section
    setSeenSections(prev => {
      const updated = { ...prev, [tabId]: Date.now() };
      localStorage.setItem('coalguard_miner_seen_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoBack = () => {
    if (isGrievanceFormOpen) {
      setIsGrievanceFormOpen(false);
      return;
    }
    if (isManualReportOpen) {
      setIsManualReportOpen(false);
      return;
    }
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else {
      setActiveTab('home');
    }
  };

  const handleGoHome = () => {
    setIsGrievanceFormOpen(false);
    setIsManualReportOpen(false);
    setNavHistory([]);
    setActiveTab('home');
  };

  const getItemTime = (item) => {
    if (!item) return 0;
    const raw = item.updated_at || item.created_at || item.timestamp || item.date;
    return raw ? new Date(raw).getTime() : 0;
  };

  // Section-specific notification indicators (Red Dots)
  const sectionNotifications = {
    my_reports: activeTab !== 'my_reports' && (myReports || []).some(r => r.supervisor_ack && getItemTime(r) > (seenSections.my_reports || 0)),
    ask_supervisor: activeTab !== 'ask_supervisor' && (grievances || []).some(g => (g.status === 'answered' || g.status === 'resolved' || g.response) && getItemTime(g) > (seenSections.ask_supervisor || 0)),
    notifications: activeTab !== 'notifications' && (notifications || []).some(n => !n.is_read && getItemTime(n) > (seenSections.notifications || 0)),
    sos: activeTab !== 'sos' && !!activeSOSEvent && getItemTime(activeSOSEvent) > (seenSections.sos || 0),
    safety: false
  };

  const fetchMinerData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const attRes = await fetch('/api/attendance/my-record', { headers });
      if (attRes.ok) setAttendance(await attRes.json());

      const grvRes = await fetch('/api/communication/miner-queries', { headers });
      if (grvRes.ok) {
        const queries = await grvRes.json();
        setGrievances(queries);
      }

      const repRes = await fetch('/api/field-reports', { headers });
      if (repRes.ok) setMyReports(await repRes.json());

      const sosRes = await fetch('/api/emergency/sos', { headers });
      if (sosRes.ok) {
        const list = await sosRes.json();
        const active = list.find(s => s.status === 'active' || s.status === 'acknowledged');
        setActiveSOSEvent(active || null);
      }
    } catch (err) {
      console.error('Error fetching miner data:', err);
    }
  };

  useEffect(() => {
    fetchMinerData();
    const interval = setInterval(fetchMinerData, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleBiometricCheckIn = async () => {
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setCheckInMsg(data.message || 'Shift biometric attendance confirmed!');
      fetchMinerData();
      setTimeout(() => setCheckInMsg(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateManualReport = async (e) => {
    e.preventDefault();
    const desc = manualReportForm.description?.trim();
    if (!desc) return;

    try {
      const res = await fetch('/api/field-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          suggested_category: manualReportForm.category,
          category: manualReportForm.category,
          description: desc,
          audio_transcript: desc,
          severity: manualReportForm.severity,
          mine_id: user?.mine_id || 'mine-demo-01',
          zone: manualReportForm.zone || 'Zone 4 (Underground Face 3)',
          source: 'MINER'
        })
      });
      if (res.ok) {
        setIsManualReportOpen(false);
        setManualReportForm({ category: 'Strata / Roof Control (CMR Reg 106)', description: '', severity: 'medium', zone: 'Zone 4' });
        fetchMinerData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGrievance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/communication/miner-queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: grievanceForm.subject,
          message: grievanceForm.description,
          urgency: grievanceForm.priority || 'MEDIUM',
          zone: 'Zone 4'
        })
      });
      if (res.ok) {
        setIsGrievanceFormOpen(false);
        setGrievanceForm({ category: 'safety_equipment', subject: '', description: '', priority: 'medium' });
        fetchMinerData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectGestureSignal = async (gestureKey) => {
    try {
      const res = await fetch('/api/minesign/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          gesture: gestureKey,
          confidence: +(0.96 + Math.random() * 0.035).toFixed(3),
          worker_id: user?.employee_id || user?.id || 'MIN-84729',
          worker_name: user?.full_name || 'Ramesh Kumar Mahato',
          mine_id: user?.mine_id || 'mine-demo-01',
          mine_name: 'Demo Mine A (Zone 4)',
          zone: 'Zone 4 (Underground Face 3)',
          camera_id: 'CAM-MINESIGN-DEMO'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGestureTransmittedMsg(`✅ Signal for '${gestureKey}' transmitted! (Candidate ID: ${data.event_id}) — Awaiting Supervisor Confirmation.`);
        setTimeout(() => setGestureTransmittedMsg(''), 5000);
      } else {
        const err = await res.json();
        setGestureTransmittedMsg(`⚠️ Signal issue: ${err.message || 'Suppressed or rejected'}`);
        setTimeout(() => setGestureTransmittedMsg(''), 5000);
      }
    } catch (err) {
      console.error('Direct gesture transmit error:', err);
      setGestureTransmittedMsg('❌ Failed to connect with MineSign API.');
      setTimeout(() => setGestureTransmittedMsg(''), 5000);
    }
  };

  const triggerSOS = async () => {
    setSosLoading(true);
    let coords = { lat: 23.7508, lng: 86.4192 };

    if (navigator.geolocation) {
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      } catch (e) {
        console.warn('Geolocation fallback used');
      }
    }

    try {
      const res = await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng,
          emergency_type: 'Colliery Life-Safety Distress Beacon'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSOSEvent(data);
        fetchMinerData();
      }
    } catch (err) {
      console.error('SOS Trigger Error:', err);
    } finally {
      setSosLoading(false);
    }
  };

  const getBreadcrumbs = () => {
    const titles = {
      home: 'Overview & Shift Check-In',
      gestures: 'MineSign Camera Gesture Reporting',
      my_reports: 'My Submitted Hazard Reports',
      ask_supervisor: 'Direct Inquiries to Supervisor',
      safety: 'Statutory Safety Circulars',
      notifications: 'Official Notifications Feed',
      profile: 'Worker Profile & DGMS Competency',
      sos: 'Colliery Life-Safety Distress Beacon'
    };
    return ['Miner Portal', titles[activeTab] || 'Section'];
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1f2937] flex flex-col">
      {/* 1. GOVERNMENT HEADER */}
      <GovHeader 
        activeTab={activeTab} 
        onSelectTab={handleSelectTab} 
        sectionNotifications={sectionNotifications}
      />
      
      {/* 2. OFFICIAL STATUTORY NOTICE TICKER */}
      <GovNoticeTicker />

      {/* 3. BREADCRUMBS WITH BACK & HOME NAVIGATION */}
      <GovBreadcrumbs 
        items={getBreadcrumbs()} 
        onBack={handleGoBack}
        onHome={handleGoHome}
        showNavControls={activeTab !== 'home' || isGrievanceFormOpen || isManualReportOpen}
      />

      {/* 4. MAIN CONTENT */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 lg:p-6 space-y-6">
        
        {/* Worker Summary Strip */}
        <div className="gov-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#213d77] text-white rounded-xs">
              <MiningHelmetIcon className="w-6 h-6" color="#ffffff" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#0f2942]">{user?.full_name}</span>
                <span className="badge-gov badge-gov-neutral">{user?.employee_id || 'MIN-84729'}</span>
              </div>
              <p className="text-xs text-[#4b5563]">
                Mine: <strong>Demo Mine A</strong> • Section: <strong>Zone 4 (Underground Face 3)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs text-[#166534] bg-[#dcfce7] border border-[#86efac] px-2.5 py-1 rounded-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              <span>ACTIVE SHIFT A</span>
            </div>
          </div>
        </div>

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* EMERGENCY SOS BANNER (Routes to Supervisor) */}
            <div className="gov-panel border-l-4 border-l-[#dc2626] p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#dc2626] font-bold text-sm">
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  <span>EMERGENCY LIFE-SAFETY DISTRESS BEACON</span>
                </div>
                <p className="text-xs text-[#4b5563]">
                  Instantly transmits your GPS coordinate beacon and distress alarm to the Shift Supervisor Control Room.
                </p>
                {activeSOSEvent && (
                  <div className="text-xs text-[#dc2626] font-bold">
                    ACTIVE SOS # {activeSOSEvent.id} — Status: {activeSOSEvent.status?.toUpperCase()} (Supervisor Alerted)
                  </div>
                )}
              </div>

              <button
                disabled={sosLoading}
                onClick={triggerSOS}
                className="btn-gov-danger py-2.5 px-5 text-xs shrink-0 whitespace-nowrap uppercase tracking-wider font-bold"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{activeSOSEvent ? 'SOS BROADCAST ACTIVE' : 'TRIGGER EMERGENCY SOS'}</span>
              </button>
            </div>

            {/* Quick Actions Grid - 4 Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Action 1: Voice Hazard */}
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="gov-panel p-4 text-left hover:border-[#213d77] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#e0f2fe] text-[#0284c7] rounded-xs">
                    <Mic className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#0284c7] font-mono">CMR REG 106</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0f2942] uppercase group-hover:text-[#213d77]">
                    1. Voice Hazard Report
                  </h3>
                  <p className="text-[11px] text-[#4b5563] mt-1">
                    Record voice observations in Hindi/English with automatic AI NLP categorization.
                  </p>
                </div>
              </button>

              {/* Action 2: Camera Gestures */}
              <button
                onClick={() => setIsMineSignModalOpen(true)}
                className="gov-panel p-4 text-left hover:border-[#1F6B45] transition-all flex flex-col justify-between group cursor-pointer bg-gradient-to-br from-white to-[#F0FDF4]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#dcfce7] text-[#16a34a] rounded-xs">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#16a34a] font-mono">CAMERA AI</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0f2942] uppercase group-hover:text-[#1F6B45] flex items-center gap-1">
                    <span>2. Camera Gestures</span>
                    <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-ping" />
                  </h3>
                  <p className="text-[11px] text-[#4b5563] mt-1">
                    Transmit silent safety signals (Gas leak, PPE defect, Roof crack) via laptop camera to Supervisor.
                  </p>
                </div>
              </button>

              {/* Action 3: Ask Supervisor */}
              <button
                onClick={() => handleSelectTab('ask_supervisor')}
                className="gov-panel p-4 text-left hover:border-[#213d77] transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#fef3c7] text-[#d97706] rounded-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#d97706] font-mono">SUPERVISOR</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0f2942] uppercase group-hover:text-[#213d77]">
                    3. Ask Supervisor
                  </h3>
                  <p className="text-[11px] text-[#4b5563] mt-1">
                    Submit questions, equipment requirements, or safety inquiries directly to Shift In-Charge.
                  </p>
                </div>
              </button>

              {/* Action 4: Biometric Check-In */}
              <div className="gov-panel p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-[#f3e8ff] text-[#9333ea] rounded-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#9333ea] font-mono">FORM B MUSTER</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#0f2942] uppercase">
                    4. Biometric Attendance
                  </h3>
                  <p className="text-[11px] text-[#4b5563] mt-1 mb-2">
                    DGMS Form B shift muster roll biometric verification.
                  </p>
                  <button
                    onClick={handleBiometricCheckIn}
                    className="btn-gov-primary w-full py-1.5 text-xs cursor-pointer"
                  >
                    <span>{checkInMsg || 'Confirm Attendance'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Shift Summary Table */}
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>MY RECENT FIELD SUBMISSIONS</span>
                <button onClick={() => handleSelectTab('my_reports')} className="text-white hover:underline text-[11px] cursor-pointer">
                  View All &gt;
                </button>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Zone</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myReports.length > 0 ? (
                      myReports.slice(0, 4).map((r) => (
                        <tr key={r.id}>
                          <td className="font-mono font-bold text-[#0f2942]">{r.id}</td>
                          <td className="font-medium text-xs">{r.suggested_category || r.category || 'Hazard Observation'}</td>
                          <td className="max-w-xs text-xs text-slate-700 truncate">
                            {r.description || r.audio_transcript || <span className="text-slate-400 italic">No notes provided</span>}
                          </td>
                          <td>{r.zone || 'Zone 4'}</td>
                          <td>
                            <span className={`badge-gov ${r.severity === 'high' || r.severity === 'critical' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td>
                            <span className="badge-gov badge-gov-info">
                              {r.supervisor_ack ? 'ACKNOWLEDGED' : 'PENDING SUPERVISOR'}
                            </span>
                          </td>
                          <td className="text-slate-500 font-mono text-[11px]">
                            {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-500">
                          No recent hazard reports filed for this shift.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CAMERA GESTURES (MINESIGN AI) */}
        {activeTab === 'gestures' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-[#DDD6C7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-[#E3EFE8] text-[#1F6B45] border border-[#1F6B45]/20">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1E1B16] font-heading">
                      MineSign — Visual AI Gesture Station
                    </h2>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                      LIVE CHANNEL
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6558] mt-0.5 font-mono">
                    Perform safety hand gestures in front of the camera to instantly alert the Shift Supervisor Control Room.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMineSignModalOpen(true)}
                className="btn-gov-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Open Live Webcam AI Camera</span>
              </button>
            </div>

            {gestureTransmittedMsg && (
              <div className="p-4 rounded-xl bg-[#E3EFE8] border border-[#1F6B45]/30 text-[#1F6B45] text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{gestureTransmittedMsg}</span>
              </div>
            )}

            {/* Gesture Catalog with Quick Transmit Triggers */}
            <div className="gov-panel p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs uppercase text-[#0f2942]">Statutory Visual Gesture Actions (CMR 2017)</h3>
                  <p className="text-[11px] text-[#4b5563]">You can perform these gestures on your camera, or click to trigger a test signal directly to Supervisor:</p>
                </div>
                <span className="text-[10px] font-mono text-[#1F6B45] font-bold">Connected to CAM-MINESIGN-DEMO</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* 1. Gas Leak */}
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-900">Suspected Gas Leak</span>
                      <span className="badge-gov badge-gov-danger text-[9px]">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-red-800 mt-1">
                      Hold open palm covering nose & mouth continuously for at least 4 seconds.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDirectGestureSignal('SUSPECTED_GAS_LEAK')}
                    className="w-full py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Transmit Gas Leak Signal
                  </button>
                </div>

                {/* 2. PPE Damage */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900">PPE / Helmet Damage</span>
                      <span className="badge-gov badge-gov-warning text-[9px]">HIGH</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Tap top/side of helmet twice with one hand (TAP → TAP → STOP).
                    </p>
                  </div>
                  <button
                    onClick={() => handleDirectGestureSignal('PPE_DAMAGE')}
                    className="w-full py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Transmit PPE Defect Signal
                  </button>
                </div>

                {/* 3. Crack Worsening */}
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-900">Crack Separation Worsening</span>
                      <span className="badge-gov badge-gov-danger text-[9px]">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-red-800 mt-1">
                      Both index fingers moving close → apart repeatedly.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDirectGestureSignal('CRACK_WORSENING')}
                    className="w-full py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Transmit Strata Crack Signal
                  </button>
                </div>

                {/* 4. Rescue Required */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900">Rescue Required</span>
                      <span className="badge-gov badge-gov-danger text-[9px]">CRITICAL</span>
                    </div>
                    <p className="text-[11px] text-rose-800 mt-1">
                      Both arms raised above head with continuous overhead waving.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDirectGestureSignal('RESCUE_REQUIRED')}
                    className="w-full py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Transmit Rescue Signal
                  </button>
                </div>

                {/* 5. Hazard Here */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900">Physical Hazard Here</span>
                      <span className="badge-gov badge-gov-warning text-[9px]">HIGH</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Forearms crossed into a clear 'X' shape in front of chest.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDirectGestureSignal('HAZARD_HERE')}
                    className="w-full py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    Transmit Hazard Here Signal
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MY REPORTS (RULE 1: MINER -> SUPERVISOR WORKFLOW) */}
        {activeTab === 'my_reports' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase text-[#0f2942]">My Submitted Field Reports</h2>
                <p className="text-[11px] text-slate-500">Reports submitted here are routed directly to Shift Supervisor control room with full descriptions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsManualReportOpen(true)}
                  className="btn-gov-primary text-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Safety Report</span>
                </button>
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="btn-gov-secondary text-xs cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Record Report</span>
                </button>
                <button
                  onClick={() => setIsMineSignModalOpen(true)}
                  className="btn-gov-outline text-xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Camera Gesture</span>
                </button>
              </div>
            </div>

            <div className="gov-panel overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Category</th>
                    <th>Miner Description</th>
                    <th>Zone</th>
                    <th>Severity</th>
                    <th>Supervisor Review</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {myReports.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-[#0f2942]">{r.id}</td>
                      <td className="font-medium text-xs">{r.suggested_category || r.category || 'Hazard Report'}</td>
                      <td className="max-w-xs text-xs text-slate-700">
                        <div className="font-medium text-slate-800 line-clamp-2">
                          {r.description || r.audio_transcript || <span className="text-slate-400 italic">No notes provided</span>}
                        </div>
                      </td>
                      <td>{r.zone || 'Zone 4'}</td>
                      <td>
                        <span className={`badge-gov ${r.severity === 'high' || r.severity === 'critical' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-gov ${r.status === 'CLOSED' ? 'badge-gov-neutral' : r.status === 'RESOLVED' ? 'badge-gov-success' : r.supervisor_ack ? 'badge-gov-success' : 'badge-gov-warning'}`}>
                          {r.status || (r.supervisor_ack ? 'ACKNOWLEDGED' : 'OPEN / PENDING')}
                        </span>
                      </td>
                      <td className="text-slate-500 font-mono text-[11px]">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {myReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                        No field reports filed yet. Click 'Create Safety Report' or 'Voice Record Report' to report an observation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Manual Safety Report Modal */}
            {isManualReportOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white border border-[#213d77] rounded-xs max-w-md w-full p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs uppercase text-[#0f2942]">Create Field Safety Report (Zone 4)</span>
                    <button onClick={() => setIsManualReportOpen(false)} className="text-slate-400 hover:text-black">&times;</button>
                  </div>
                  <form onSubmit={handleCreateManualReport} className="space-y-3 text-xs">
                    <div>
                      <label className="gov-label">HAZARD CATEGORY</label>
                      <select
                        value={manualReportForm.category}
                        onChange={(e) => setManualReportForm({ ...manualReportForm, category: e.target.value })}
                        className="gov-input"
                      >
                        <option value="Strata / Roof Control (CMR Reg 106)">Strata / Roof Control (CMR Reg 106)</option>
                        <option value="Ventilation & Gas Analysis (CMR Reg 153)">Ventilation & Gas Analysis (CMR Reg 153)</option>
                        <option value="Heavy Machinery & Haulage (DGMS Circular 02)">Heavy Machinery & Haulage (DGMS Circular 02)</option>
                        <option value="Dust Suppression & Environment (Sec 22)">Dust Suppression & Environment (Sec 22)</option>
                        <option value="PPE / Safety Equipment Defect">PPE / Safety Equipment Defect</option>
                      </select>
                    </div>
                    <div>
                      <label className="gov-label">SEVERITY LEVEL</label>
                      <select
                        value={manualReportForm.severity}
                        onChange={(e) => setManualReportForm({ ...manualReportForm, severity: e.target.value })}
                        className="gov-input"
                      >
                        <option value="low">LOW — Minor Observation</option>
                        <option value="medium">MEDIUM — Maintenance Required</option>
                        <option value="high">HIGH — Urgent Physical Hazard</option>
                        <option value="critical">CRITICAL — Imminent Life-Safety Danger</option>
                      </select>
                    </div>
                    <div>
                      <label className="gov-label">DETAILED DESCRIPTION</label>
                      <textarea
                        rows={3}
                        value={manualReportForm.description}
                        onChange={(e) => setManualReportForm({ ...manualReportForm, description: e.target.value })}
                        placeholder="Describe observations, physical defect, and precise location..."
                        className="gov-input"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsManualReportOpen(false)} className="btn-gov-outline text-xs">Cancel</button>
                      <button type="submit" className="btn-gov-primary text-xs font-bold">SUBMIT TO SUPERVISOR</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASK SUPERVISOR */}
        {activeTab === 'ask_supervisor' && (
          <div className="space-y-6">
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>SUBMIT INQUIRY / REQUEST TO SHIFT SUPERVISOR</span>
                <span className="text-[11px] font-mono opacity-80">MINER ↔ SUPERVISOR CHANNEL</span>
              </div>
              <div className="p-5">
                <form onSubmit={handleCreateGrievance} className="space-y-4 max-w-xl">
                  <div>
                    <label className="gov-label">CATEGORY</label>
                    <select
                      value={grievanceForm.category}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                      className="gov-input"
                    >
                      <option value="safety_equipment">Safety Equipment / PPE Request</option>
                      <option value="ventilation_air">Ventilation / Air Quality Query</option>
                      <option value="machinery_repair">Machinery / Dumper Maintenance Request</option>
                      <option value="shift_welfare">Shift Handover & Welfare</option>
                    </select>
                  </div>

                  <div>
                    <label className="gov-label">SUBJECT / TOPIC</label>
                    <input
                      type="text"
                      value={grievanceForm.subject}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                      placeholder="e.g. Helmet strap defective at Face 3"
                      className="gov-input"
                      required
                    />
                  </div>

                  <div>
                    <label className="gov-label">DETAILED DESCRIPTION</label>
                    <textarea
                      rows={4}
                      value={grievanceForm.description}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                      placeholder="Describe the issue or assistance required from shift supervisor..."
                      className="gov-input"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="submit" className="btn-gov-primary text-xs">
                      <Send className="w-3.5 h-3.5" />
                      <span>SUBMIT TO SUPERVISOR</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Submitted Inquiries List */}
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>MY SUBMITTED QUESTIONS & INQUIRIES</span>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Ticket #</th>
                      <th>Category</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Supervisor Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grievances.map((g) => (
                      <tr key={g.id}>
                        <td className="font-mono font-bold text-[#0f2942]">{g.ticket_number || g.id}</td>
                        <td>{g.category}</td>
                        <td className="font-medium">{g.subject}</td>
                        <td>
                          <span className="badge-gov badge-gov-neutral">{g.priority}</span>
                        </td>
                        <td>
                          <span className={`badge-gov ${g.status === 'resolved' ? 'badge-gov-success' : 'badge-gov-warning'}`}>
                            {g.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-xs text-slate-700">
                          {g.resolution_notes || 'Pending supervisor review.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SAFETY NOTICES */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-[#0f2942]">Statutory DGMS Safety Bulletins</h2>
            <div className="space-y-3">
              <div className="gov-panel p-4 border-l-4 border-l-[#213d77]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0f2942]">DGMS CIRCULAR 04/2026: MANDATORY HARD HAT & PPE INSPECTION</span>
                  <span className="badge-gov badge-gov-info">CIRCULAR</span>
                </div>
                <p className="text-xs text-[#4b5563]">
                  All underground personnel entering Zone 4 must ensure chin-straps are fastened and reflective vests are fully visible under cap lamp illumination.
                </p>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">Issued by: Directorate General of Mines Safety</div>
              </div>

              <div className="gov-panel p-4 border-l-4 border-l-[#d97706]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0f2942]">MINE ADVISORY: BENCH 4 SLOPE STABILITY PROTOCOL</span>
                  <span className="badge-gov badge-gov-warning">ADVISORY</span>
                </div>
                <p className="text-xs text-[#4b5563]">
                  Heavy rainfall detected in surrounding strata. Maintain minimum 15m berm clearance when operating near highwall bench.
                </p>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">Issued by: Colliery Safety Officer</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-[#0f2942]">Worker Notifications</h2>
            <div className="gov-panel divide-y divide-slate-200">
              {notifications && notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="p-3.5 text-xs flex items-start gap-3">
                    <Bell className="w-4 h-4 text-[#213d77] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-[#0f2942]">{n.title}</div>
                      <div className="text-[#4b5563] mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No notifications recorded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE */}
        {activeTab === 'profile' && (
          <div className="gov-panel max-w-2xl">
            <div className="gov-panel-header">
              <span>WORKER STATUTORY PROFILE</span>
              <span className="text-[11px] font-mono">DGMS COMPLIANT</span>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-slate-500 block">Full Name</span>
                  <strong className="text-[#0f2942] text-sm">{user?.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Employee ID</span>
                  <strong className="text-[#0f2942] text-sm font-mono">{user?.employee_id || 'MIN-84729'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Designation</span>
                  <span className="text-slate-800">{user?.designation || 'Underground Dumper & Shovel Operator'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Assigned Mine</span>
                  <span className="text-slate-800">Demo Mine A (Zone 4)</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block font-bold mb-1">DGMS STATUTORY CERTIFICATIONS:</span>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>DGMS Gas Testing & Flame Safety Certificate (Valid till 2028)</li>
                  <li>First Aid & Underground Mine Rescue Certified (Level 2)</li>
                  <li>Vocational Training Rules (VTR) 1966 Refresher Compliant</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SOS / DISTRESS (RULE 1: MINER -> SUPERVISOR WORKFLOW) */}
        {activeTab === 'sos' && (
          <div className="space-y-6">
            <div className="bg-[#dc2626] text-white p-4 rounded-xs flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  <span>COLLIERY LIFE-SAFETY SOS DISTRESS BEACON</span>
                </div>
                <p className="text-xs opacity-90">
                  Transmits GPS emergency coordinates directly to Shift Supervisor Control Room for emergency dispatch.
                </p>
              </div>
              <span className="badge-gov bg-white text-[#dc2626] font-mono text-xs font-bold uppercase">
                {activeSOSEvent ? `STATUS: ${activeSOSEvent.status?.toUpperCase()}` : 'BEACON STANDBY'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left: Trigger / Status Panel */}
              <div className="gov-panel p-5 space-y-4">
                <h3 className="font-bold text-xs uppercase text-[#0f2942]">Distress Beacon Control</h3>
                <p className="text-xs text-[#4b5563]">
                  In the event of roof fall, trapped equipment, toxic gas egress, or medical trauma, activate this beacon immediately.
                </p>

                {activeSOSEvent ? (
                  <div className="p-4 bg-[#fef2f2] border border-[#fca5a5] rounded-xs space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#dc2626] font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] animate-ping" />
                      <span>BEACON ACTIVE: Incident #{activeSOSEvent.id}</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[11px]">
                      <div>Mine: Demo Mine A (Zone 4)</div>
                      <div>GPS: (23.7508° N, 86.4192° E)</div>
                      <div>Supervisor Status: <strong>{activeSOSEvent.status === 'acknowledged' ? '✅ Rescue Dispatched' : '⏳ Awaiting Supervisor Ack'}</strong></div>
                      {activeSOSEvent.action_notes && (
                        <div className="text-[#16a34a] font-medium mt-1">Note: {activeSOSEvent.action_notes}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#f8fafc] border border-slate-200 rounded-xs text-xs text-slate-500">
                    Beacon is currently on standby. No active emergency transmitted.
                  </div>
                )}

                <button
                  disabled={sosLoading}
                  onClick={triggerSOS}
                  className="btn-gov-danger w-full py-3 text-xs uppercase font-bold flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{activeSOSEvent ? 'TRANSMIT REPEAT SOS BEACON' : 'TRIGGER LIFE-SAFETY SOS NOW'}</span>
                </button>
              </div>

              {/* Right: Statutory Emergency Protocol Checklist */}
              <div className="gov-panel p-5 space-y-3 text-xs">
                <h3 className="font-bold uppercase text-[#0f2942]">Statutory Mine Emergency Protocols (CMR 2017)</h3>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#213d77]">1.</span>
                    <span>Remain at fresh-air base or intake airway if toxic gas or smoke is suspected.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#213d77]">2.</span>
                    <span>Don self-contained self-rescuer (SCSR) immediately if CO/methane alarm sounds.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#213d77]">3.</span>
                    <span>Do not attempt unauthorized re-entry into unventilated goaf or unsupported highwall areas.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#213d77]">4.</span>
                    <span>Shift Supervisor and Colliery Rescue Station will respond to GPS coordinates upon acknowledgment.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      {isVoiceModalOpen && (
        <VoiceHazardModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onSuccess={fetchMinerData}
          token={token}
        />
      )}

      {isOcrModalOpen && (
        <OCRScanModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          onTextExtracted={(txt) => setOcrExtractedText(txt)}
        />
      )}

      {isMineSignModalOpen && (
        <MinerCameraModal
          isOpen={isMineSignModalOpen}
          onClose={() => setIsMineSignModalOpen(false)}
          token={token}
        />
      )}

      {/* Floating Assistant */}
      <FloatingAssistant />

    </div>
  );
}
