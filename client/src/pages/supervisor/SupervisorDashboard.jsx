import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GovHeader from '../../components/common/GovHeader';
import GovNoticeTicker from '../../components/common/GovNoticeTicker';
import GovBreadcrumbs from '../../components/common/GovBreadcrumbs';
import MineGISMap from '../../components/maps/MineGISMap';
import TwoStepViolationModal from '../../components/common/TwoStepViolationModal';
import FloatingAssistant from '../../components/assistant/FloatingAssistant';
import OCRScanModal from '../../components/common/OCRScanModal';
import CCTVSurveillanceView from '../../components/surveillance/CCTVSurveillanceView';
import MineSignView from '../../components/minesign/MineSignView';
import Model4RiskScoringView from '../../components/analytics/Model4RiskScoringView';
import Model6WhatIfSimulatorView from '../../components/analytics/Model6WhatIfSimulatorView';
import SupervisorDailyLogView from '../../components/common/SupervisorDailyLogView';
import EmergencySOSBanner from '../../components/common/EmergencySOSBanner';
import { MiningHelmetIcon } from '../../components/common/MiningIcons';
import { 
  Building2, 
  Users, 
  Video, 
  Camera, 
  Sparkles, 
  Flame, 
  FileSpreadsheet, 
  ShieldCheck, 
  Map as MapIcon, 
  MapPin,
  MessageSquare, 
  Bell, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  Eye, 
  ArrowUpRight, 
  Activity,
  Layers
} from 'lucide-react';

export default function SupervisorDashboard() {
  const { user, token, t } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [navHistory, setNavHistory] = useState([]);
  const [seenSections, setSeenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('coalguard_supervisor_seen_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [cameraSubTab, setCameraSubTab] = useState('counter'); // 'counter' | 'helmet' | 'smoke'
  const [aiModelSubTab, setAiModelSubTab] = useState('model4'); // 'model4' | 'model5' | 'model6'
  
  // Data States
  const [complianceItems, setComplianceItems] = useState([]);
  const [violations, setViolations] = useState([]);
  const [fieldReports, setFieldReports] = useState([]);
  const [minesignEvents, setMinesignEvents] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [sosEvents, setSosEvents] = useState([]);
  const [riskData, setRiskData] = useState(null);

  // Communication States
  const [minerQueries, setMinerQueries] = useState([]);
  const [commRequests, setCommRequests] = useState([]);
  const [selectedCommReq, setSelectedCommReq] = useState(null);
  const [commMessages, setCommMessages] = useState([]);
  const [newCommMsg, setNewCommMsg] = useState('');
  const [commRequestForm, setCommRequestForm] = useState({
    topic: '',
    description: '',
    urgency: 'MEDIUM',
    zone: 'Zone 4'
  });
  const [commFeedback, setCommFeedback] = useState('');

  // Modals & Sub-states
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [selectedFieldReport, setSelectedFieldReport] = useState(null);
  const [closeReportId, setCloseReportId] = useState(null);
  const [closeReportNotes, setCloseReportNotes] = useState('');
  const [escalateSosId, setEscalateSosId] = useState(null);
  const [escalateSosNotes, setEscalateSosNotes] = useState('');
  const [queryReplyId, setQueryReplyId] = useState(null);
  const [queryReplyText, setQueryReplyText] = useState('');
  const [focusIncident, setFocusIncident] = useState(null);

  // Navigation handlers
  const handleSelectTab = (tabId) => {
    if (tabId === activeTab) return;
    setNavHistory(prev => [...prev, activeTab]);
    setActiveTab(tabId);
    
    // Clear notification for visited section
    setSeenSections(prev => {
      const updated = { ...prev, [tabId]: Date.now() };
      localStorage.setItem('coalguard_supervisor_seen_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigateToIncidentMap = (incidentLocation) => {
    if (incidentLocation) {
      setFocusIncident(incidentLocation);
    }
    // Switch to map tab
    setNavHistory(prev => [...prev, activeTab]);
    setActiveTab('map');
    setSeenSections(prev => {
      const updated = { ...prev, map: Date.now() };
      localStorage.setItem('coalguard_supervisor_seen_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoBack = () => {
    if (selectedFieldReport) {
      setSelectedFieldReport(null);
      return;
    }
    if (isViolationModalOpen) {
      setIsViolationModalOpen(false);
      return;
    }
    if (isOcrOpen) {
      setIsOcrOpen(false);
      return;
    }
    if (selectedCommReq) {
      setSelectedCommReq(null);
      return;
    }
    if (closeReportId) {
      setCloseReportId(null);
      return;
    }
    if (escalateSosId) {
      setEscalateSosId(null);
      return;
    }
    if (queryReplyId) {
      setQueryReplyId(null);
      return;
    }
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else {
      setActiveTab('overview');
    }
  };

  const handleGoHome = () => {
    setSelectedFieldReport(null);
    setIsViolationModalOpen(false);
    setIsOcrOpen(false);
    setSelectedCommReq(null);
    setCloseReportId(null);
    setEscalateSosId(null);
    setQueryReplyId(null);
    setNavHistory([]);
    setActiveTab('overview');
  };

  const getItemTime = (item) => {
    if (!item) return 0;
    const raw = item.updated_at || item.created_at || item.timestamp || item.date;
    return raw ? new Date(raw).getTime() : 0;
  };

  // Section-specific notification indicators (Red Dots)
  const sectionNotifications = {
    emergencies: activeTab !== 'emergencies' && (sosEvents || []).some(s => s.status === 'active' && getItemTime(s) > (seenSections.emergencies || 0)),
    field_reports: activeTab !== 'field_reports' && (fieldReports || []).some(r => !r.supervisor_ack && r.status !== 'CLOSED' && getItemTime(r) > (seenSections.field_reports || 0)),
    compliance: activeTab !== 'compliance' && (violations || []).some(v => (v.status === 'rectification_submitted' || v.status === 'open') && getItemTime(v) > (seenSections.compliance || 0)),
    communication: activeTab !== 'communication' && ((minerQueries || []).some(q => q.status === 'pending' && getItemTime(q) > (seenSections.communication || 0)) || (commRequests || []).some(c => c.status === 'approved' && getItemTime(c) > (seenSections.communication || 0))),
    gestures: activeTab !== 'gestures' && (minesignEvents || []).some(e => (e.status === 'PENDING_CONFIRMATION' || e.status === 'OPEN') && getItemTime(e) > (seenSections.gestures || 0)),
    cameras: false,
    models: false,
    map: false,
    updates: false
  };

  const fetchSupervisorData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const mineId = user?.mine_id || 'mine-demo-01';

      const compRes = await fetch(`/api/compliance?mine_id=${mineId}`, { headers });
      if (compRes.ok) setComplianceItems(await compRes.json());

      const violRes = await fetch(`/api/violations?mine_id=${mineId}`, { headers });
      if (violRes.ok) setViolations(await violRes.json());

      const repRes = await fetch(`/api/field-reports?mine_id=${mineId}`, { headers });
      if (repRes.ok) setFieldReports(await repRes.json());

      const msRes = await fetch('/api/minesign/events', { headers });
      if (msRes.ok) {
        const msData = await msRes.json();
        setMinesignEvents(msData.events || []);
      }

      const grvRes = await fetch(`/api/grievances?mine_id=${mineId}`, { headers });
      if (grvRes.ok) setGrievances(await grvRes.json());

      const sosRes = await fetch(`/api/emergency/sos?mine_id=${mineId}`, { headers });
      if (sosRes.ok) setSosEvents(await sosRes.json());

      const riskRes = await fetch(`/api/analytics/mine/${mineId}/risk-score`, { headers });
      if (riskRes.ok) setRiskData(await riskRes.json());

      const mqRes = await fetch('/api/communication/miner-queries', { headers });
      if (mqRes.ok) setMinerQueries(await mqRes.json());

      const crRes = await fetch('/api/communication/requests', { headers });
      if (crRes.ok) setCommRequests(await crRes.json());
    } catch (err) {
      console.error('Supervisor data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchSupervisorData();
    const interval = setInterval(fetchSupervisorData, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAcknowledgeFieldReport = async (reportId) => {
    try {
      const res = await fetch(`/api/field-reports/${reportId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action_taken: 'Supervisor physically verified report on-site.' })
      });
      if (res.ok) fetchSupervisorData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEscalateFieldReport = async (reportId) => {
    try {
      const res = await fetch(`/api/field-reports/${reportId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: `Critical condition verified at Zone 4 by Supervisor ${user?.full_name}. Escalated to DGMS / Authority for immediate response.`
        })
      });
      if (res.ok) {
        setCommFeedback(`✅ Field Report #${reportId} successfully escalated to DGMS / Authority Emergency Queue!`);
        fetchSupervisorData();
        setSelectedFieldReport(null);
        setTimeout(() => setCommFeedback(''), 6000);
      }
    } catch (e) {
      console.error('Failed to escalate field report:', e);
    }
  };

  const handleCloseFieldReport = async (e) => {
    e.preventDefault();
    if (!closeReportId) return;
    try {
      const res = await fetch(`/api/field-reports/${closeReportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'CLOSED',
          resolution_notes: closeReportNotes || 'Issue addressed and closed by shift supervisor.'
        })
      });
      if (res.ok) {
        setCloseReportId(null);
        setCloseReportNotes('');
        fetchSupervisorData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledgeSOS = async (sosId) => {
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action_notes: 'Supervisor dispatched colliery rescue team.' })
      });
      if (res.ok) fetchSupervisorData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEscalateSOSToAuthority = async (e) => {
    e.preventDefault();
    if (!escalateSosId) return;
    try {
      const res = await fetch(`/api/emergency/sos/${escalateSosId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          supervisor_notes: escalateSosNotes || 'Critical hazard escalated to DGMS / Authority Intervention.'
        })
      });
      if (res.ok) {
        setEscalateSosId(null);
        setEscalateSosNotes('');
        setCommFeedback('🚨 Emergency Incident Escalated to Authority!');
        fetchSupervisorData();
        setTimeout(() => setCommFeedback(''), 4500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveSOS = async (sosId) => {
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolution_summary: 'All workers accounted for and area secured.' })
      });
      if (res.ok) fetchSupervisorData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveGrievance = async (grvId, notes) => {
    try {
      const res = await fetch(`/api/grievances/${grvId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolution_notes: notes || 'Resolved by shift supervisor.' })
      });
      if (res.ok) fetchSupervisorData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplyMinerQuery = async (e) => {
    e.preventDefault();
    if (!queryReplyId || !queryReplyText.trim()) return;
    try {
      const res = await fetch(`/api/communication/miner-queries/${queryReplyId}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ response: queryReplyText.trim() })
      });
      if (res.ok) {
        setQueryReplyId(null);
        setQueryReplyText('');
        fetchSupervisorData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestAuthorityComm = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/communication/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(commRequestForm)
      });
      if (res.ok) {
        setCommFeedback('✅ Communication Request Transmitted to Authority for approval.');
        setCommRequestForm({ topic: '', description: '', urgency: 'MEDIUM', zone: 'Zone 4' });
        fetchSupervisorData();
        setTimeout(() => setCommFeedback(''), 4500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetchCommMessages = async (requestId) => {
    try {
      const res = await fetch(`/api/communication/messages/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCommMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendCommMessage = async (requestId) => {
    if (!newCommMsg.trim()) return;
    try {
      const res = await fetch('/api/communication/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: requestId,
          message: newCommMsg.trim()
        })
      });
      if (res.ok) {
        setNewCommMsg('');
        handleFetchCommMessages(requestId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getBreadcrumbs = () => {
    const titles = {
      overview: 'Operational Control Center',
      cameras: `CCTV Surveillance (${cameraSubTab.toUpperCase()})`,
      gestures: 'MineSign Gestural Verification',
      models: `AI Predictive Models (${aiModelSubTab.toUpperCase()})`,
      emergencies: 'Active Emergency Incidents',
      field_reports: 'Field Reports & Defect Log',
      compliance: 'Statutory Compliance Register',
      map: 'Zone Geographic GIS Map',
      communication: 'Communication Channels',
      updates: 'Official Notices & Gazettes'
    };
    return ['Supervisor Panel', titles[activeTab] || 'Section'];
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1f2937] flex flex-col">
      {/* 1. GOVERNMENT HEADER */}
      <GovHeader 
        activeTab={activeTab} 
        onSelectTab={handleSelectTab} 
        sectionNotifications={sectionNotifications}
        onNavigateToMap={handleNavigateToIncidentMap}
      />
      
      {/* 1.1 CRITICAL LIFE SAFETY EMERGENCY BANNER */}
      <EmergencySOSBanner 
        onStatusChange={fetchSupervisorData} 
        onNavigateToMap={handleNavigateToIncidentMap} 
      />

      {/* 2. OFFICIAL STATUTORY NOTICE TICKER */}
      <GovNoticeTicker />

      {/* 3. BREADCRUMBS WITH BACK & HOME NAVIGATION */}
      <GovBreadcrumbs 
        items={getBreadcrumbs()} 
        onBack={handleGoBack}
        onHome={handleGoHome}
        showNavControls={activeTab !== 'overview' || isViolationModalOpen || isOcrOpen || !!selectedCommReq || !!closeReportId || !!escalateSosId || !!queryReplyId}
      />

      {/* 4. MAIN OPERATIONAL CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        
        {/* SUPERVISOR CONTROL STRIP */}
        <div className="gov-panel p-3.5 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#0f2942] uppercase font-sans">
                COALGUARD SUPERVISOR CONTROL PANEL
              </span>
              <span className="badge-gov badge-gov-info">OPERATIONAL HUB</span>
            </div>
            <p className="text-xs text-[#4b5563]">
              Mine: <strong>Demo Mine A</strong> • Sector: <strong>Zone 4 (Underground Seam Block)</strong> • Shift: <strong>Morning Shift A (06:00 - 14:00)</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">
              Assigned Node: <strong className="text-[#0f2942]">CAM-Z4-01</strong>
            </span>
          </div>
        </div>

        {/* COMPACT KPI SUMMARY STRIP (IRCTC / Government Density) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#213d77]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Open Issues</div>
            <div className="text-lg font-bold text-[#0f2942] font-mono mt-0.5">
              {fieldReports.filter(r => !r.supervisor_ack).length + violations.filter(v => v.status === 'action_assigned').length}
            </div>
            <div className="text-[10px] text-slate-400">Field & Violations</div>
          </div>

          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#fb792b]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Pending Verification</div>
            <div className="text-lg font-bold text-[#fb792b] font-mono mt-0.5">
              {violations.filter(v => v.status === 'rectification_submitted').length + fieldReports.filter(r => !r.supervisor_ack).length}
            </div>
            <div className="text-[10px] text-slate-400">Requires Inspection</div>
          </div>

          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#dc2626]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Active Emergencies</div>
            <div className="text-lg font-bold text-[#dc2626] font-mono mt-0.5">
              {sosEvents.filter(e => e.status === 'active').length}
            </div>
            <div className="text-[10px] text-slate-400">Distress & Alarms</div>
          </div>

          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#16a34a]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Compliance Items</div>
            <div className="text-lg font-bold text-[#16a34a] font-mono mt-0.5">
              {complianceItems.length}
            </div>
            <div className="text-[10px] text-slate-400">CMR 2017 Norms</div>
          </div>

          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#0284c7]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Worker Requests</div>
            <div className="text-lg font-bold text-[#0284c7] font-mono mt-0.5">
              {grievances.filter(g => g.status === 'open').length}
            </div>
            <div className="text-[10px] text-slate-400">Inquiries Pending</div>
          </div>

          <div className="gov-panel p-3 bg-white border-t-2 border-t-[#7c3aed]">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Escalated Cases</div>
            <div className="text-lg font-bold text-[#7c3aed] font-mono mt-0.5">
              {complianceItems.filter(c => c.status === 'escalated').length}
            </div>
            <div className="text-[10px] text-slate-400">Authority Level</div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* 2-Column Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left: Operational Field Reports & Issues */}
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <span>PENDING SUPERVISOR ACTION ITEMS</span>
                  <button onClick={() => handleSelectTab('field_reports')} className="text-white hover:underline text-[11px] cursor-pointer">
                    Manage All &gt;
                  </button>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Category & Description</th>
                        <th>Worker / Source</th>
                        <th>Severity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldReports.slice(0, 4).map((r) => (
                        <tr key={r.id}>
                          <td className="font-mono font-bold text-[#0f2942]">{r.id}</td>
                          <td>
                            <div className="font-bold text-[#0f2942]">{r.suggested_category || r.category || 'Hazard Report'}</div>
                            {r.description ? (
                              <div className="text-[11px] text-slate-600 truncate max-w-xs mt-0.5" title={r.description}>
                                "{r.description}"
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic">No notes</div>
                            )}
                          </td>
                          <td>{r.worker_name || 'Worker'}</td>
                          <td>
                            <span className={`badge-gov ${r.severity === 'high' || r.severity === 'critical' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                              {r.severity}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedFieldReport(r)}
                                className="btn-gov-outline text-[11px] py-1 px-2 cursor-pointer"
                              >
                                View
                              </button>
                              {!r.supervisor_ack ? (
                                <button
                                  onClick={() => handleAcknowledgeFieldReport(r.id)}
                                  className="btn-gov-primary text-[11px] py-1 px-2 cursor-pointer"
                                >
                                  Verify
                                </button>
                              ) : (
                                <span className="badge-gov badge-gov-success">VERIFIED</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Active SOS & Emergencies */}
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <span>ACTIVE EMERGENCY ALERTS (ZONE 4)</span>
                  <button onClick={() => handleSelectTab('emergencies')} className="text-white hover:underline text-[11px] cursor-pointer">
                    View Emergencies &gt;
                  </button>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Incident ID</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sosEvents.slice(0, 4).map((e) => (
                        <tr key={e.id}>
                          <td className="font-mono font-bold text-[#0f2942]">{e.id}</td>
                          <td>Zone 4 (Demo Mine A)</td>
                          <td className="font-medium text-[#dc2626]">{e.emergency_type}</td>
                          <td>
                            <span className={`badge-gov ${e.status === 'active' ? 'badge-gov-danger' : 'badge-gov-success'}`}>
                              {e.status}
                            </span>
                          </td>
                          <td>
                            {e.status === 'active' ? (
                              <button
                                onClick={() => handleAcknowledgeSOS(e.id)}
                                className="btn-gov-secondary text-[11px] py-1 px-2"
                              >
                                Ack & Dispatch
                              </button>
                            ) : (
                              <span className="badge-gov badge-gov-neutral">ACKED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {sosEvents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                            No active emergency alarms in Sector Zone 4.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Central Daily Operational Log & Event Memory */}
            <SupervisorDailyLogView token={token} onNavigate={handleSelectTab} />

            {/* Bottom: CCTV Simulation Quick Access Strip */}
            <div className="gov-panel p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase text-[#0f2942]">
                    CCTV Surveillance Room & Visual Intelligence
                  </h3>
                  <p className="text-[11px] text-[#64748b]">
                    Real-time video inference pipelines for ingress counter, PPE compliance, and smoke surveillance.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('cameras')}
                  className="btn-gov-primary text-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Open Full CCTV Surveillance Suite</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#f8fafc] border border-slate-200 rounded-xs">
                  <span className="font-bold text-[#0f2942] block">1. People Counter</span>
                  <span className="text-[11px] text-slate-500">Camera CAM-Z4-01 • Inside: 6 / 45 max</span>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-slate-200 rounded-xs">
                  <span className="font-bold text-[#0f2942] block">2. Helmet Detector</span>
                  <span className="text-[11px] text-slate-500">Camera CAM-CHK-02 • Compliance: 87.5%</span>
                </div>
                <div className="p-3 bg-[#f8fafc] border border-slate-200 rounded-xs">
                  <span className="font-bold text-[#0f2942] block">3. Smoke & Fire Vision</span>
                  <span className="text-[11px] text-slate-500">Camera CAM-HAUL-03 • Air Quality: NOMINAL</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: CAMERAS */}
        {activeTab === 'cameras' && (
          <div className="space-y-4">
            <div className="bg-[#213d77] text-white p-3 rounded-xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase">CCTV VIDEO SURVEILLANCE & AI PIPELINES</h2>
                <p className="text-[11px] opacity-80">Simulation Feed • Node CAM-Z4-01 (Zone 4)</p>
              </div>
            </div>
            
            {/* Embed Existing CCTVSurveillanceView */}
            <div className="gov-panel p-4">
              <CCTVSurveillanceView token={token} />
            </div>
          </div>
        )}

        {/* TAB 3: CAMERA GESTURES / MINESIGN */}
        {activeTab === 'gestures' && (
          <div className="space-y-4">
            <div className="bg-[#213d77] text-white p-3 rounded-xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase">MINESIGN — VISUAL WORKER GESTURE RECOGNITION</h2>
                <p className="text-[11px] opacity-80">Autonomous Gestural Safety Telemetry • Demo Camera CAM-MINESIGN-DEMO</p>
              </div>
              <span className="badge-gov badge-gov-warning text-black">SUPERVISOR VERIFIED WORKFLOW</span>
            </div>

            {/* Embed Existing MineSignView */}
            <div className="gov-panel p-4">
              <MineSignView />
            </div>
          </div>
        )}

        {/* TAB 4: AI MODELS */}
        {activeTab === 'models' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
              <button
                onClick={() => setAiModelSubTab('model4')}
                className={`btn-gov-outline text-xs ${aiModelSubTab === 'model4' ? 'bg-[#213d77] text-white border-[#213d77]' : ''}`}
              >
                1. Mine Risk Scoring
              </button>
              <button
                onClick={() => setAiModelSubTab('model6')}
                className={`btn-gov-outline text-xs ${aiModelSubTab === 'model6' ? 'bg-[#213d77] text-white border-[#213d77]' : ''}`}
              >
                2. What-If Simulator
              </button>
            </div>

            {aiModelSubTab === 'model4' && (
              <div className="gov-panel p-4">
                <Model4RiskScoringView token={token} />
              </div>
            )}
            {aiModelSubTab === 'model6' && (
              <div className="gov-panel p-4">
                <Model6WhatIfSimulatorView token={token} />
              </div>
            )}

            {/* FUTURE AI MODEL PLACEHOLDER CARD */}
            <div className="gov-panel p-4 border-l-4 border-l-[#0284c7] bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#e0f2fe] text-[#0284c7] font-bold text-[10px] uppercase font-mono rounded-xs">
                    FUTURE AI MODEL
                  </span>
                  <strong className="text-xs text-[#0f2942]">Gas Leak Risk Model</strong>
                </div>
                <span className="badge-gov badge-gov-neutral font-mono text-[10px]">INTEGRATION PENDING</span>
              </div>
              <p className="text-xs text-[#4b5563] mt-2">
                Atmospheric sensor telemetry, strata gas desorption, and CH4 / CO dispersion predictive model placeholder reserved for future DGMS IoT pipeline integration.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: EMERGENCIES (RULE 1 & RULE 6) */}
        {activeTab === 'emergencies' && (
          <div className="space-y-4">
            <div className="bg-[#213d77] text-white p-3 rounded-xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase">COLLIERY OPERATIONAL EMERGENCIES & DISTRESS INCIDENTS</h2>
                <p className="text-[11px] opacity-80">Shift In-Charge Operational Routing: Acknowledge, Resolve, or Escalate to Authority</p>
              </div>
            </div>

            {commFeedback && (
              <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xs flex items-center justify-between">
                <span>{commFeedback}</span>
                <button onClick={() => setCommFeedback('')} className="underline text-[11px]">Dismiss</button>
              </div>
            )}

            <div className="gov-panel overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Incident ID</th>
                    <th>Time</th>
                    <th>Zone</th>
                    <th>Reporter / Source</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="text-right">Supervisor Operational Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {sosEvents.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono font-bold text-[#0f2942]">{e.id}</td>
                      <td className="text-slate-500 font-mono text-[11px]">{new Date(e.created_at).toLocaleTimeString()}</td>
                      <td>{e.zone || 'Zone 4'} (Demo Mine A)</td>
                      <td className="font-medium">{e.miner_name || 'Field Worker'}</td>
                      <td className="text-[#dc2626] font-semibold">{e.emergency_type}</td>
                      <td>
                        <span className={`badge-gov ${e.status === 'escalated' ? 'badge-gov-danger' : e.status === 'active' ? 'badge-gov-warning' : 'badge-gov-success'}`}>
                          {e.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleNavigateToIncidentMap({
                              id: e.id,
                              latitude: Number(e.latitude) || (e.zone === 'Zone 2' ? 23.7540 : e.zone === 'Zone 5' ? 23.7480 : 23.7508),
                              longitude: Number(e.longitude) || (e.zone === 'Zone 2' ? 86.4250 : e.zone === 'Zone 5' ? 86.4150 : 86.4192),
                              incidentType: e.emergency_type || 'OTHER',
                              zone: e.zone || 'Zone 4',
                              title: `Emergency: ${e.miner_name || 'Field Worker'} (${e.emergency_type || 'Distress'})`,
                              severity: 'CRITICAL',
                              status: e.status || 'ACTIVE'
                            })}
                            className="btn-gov-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-[#213d77]"
                            title="Locate incident on GIS map"
                          >
                            <MapPin className="w-3 h-3 text-[#213d77]" />
                            <span>View on Map</span>
                          </button>
                          {e.status === 'active' && (
                            <button
                              onClick={() => handleAcknowledgeSOS(e.id)}
                              className="btn-gov-secondary text-[11px] py-1 px-2.5"
                            >
                              Acknowledge
                            </button>
                          )}
                          {e.status !== 'escalated' && e.status !== 'resolved' && (
                            <button
                              onClick={() => {
                                setEscalateSosId(e.id);
                                setEscalateSosNotes(`Critical condition verified at ${e.zone || 'Zone 4'}. Requesting DGMS emergency dispatch.`);
                              }}
                              className="btn-gov-primary text-[11px] py-1 px-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white border-0"
                            >
                              Escalate to Authority
                            </button>
                          )}
                          {e.status !== 'resolved' && (
                            <button
                              onClick={() => handleResolveSOS(e.id)}
                              className="btn-gov-primary text-[11px] py-1 px-2.5"
                            >
                              Resolve
                            </button>
                          )}
                          {e.status === 'resolved' && (
                            <span className="text-[11px] text-[#16a34a] font-bold">RESOLVED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sosEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                        No active emergencies logged. Sector status nominal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Escalate SOS Modal */}
            {escalateSosId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-white border border-[#213d77] rounded-xs max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs uppercase text-[#dc2626]">Escalate Incident #{escalateSosId} to Authority</span>
                    <button onClick={() => setEscalateSosId(null)} className="text-slate-400 hover:text-black">&times;</button>
                  </div>
                  <form onSubmit={handleEscalateSOSToAuthority} className="space-y-3 text-xs">
                    <div>
                      <label className="gov-label">SUPERVISOR REMARKS / ESCALATION REASON</label>
                      <textarea
                        rows={3}
                        value={escalateSosNotes}
                        onChange={(e) => setEscalateSosNotes(e.target.value)}
                        className="gov-input"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEscalateSosId(null)} className="btn-gov-outline text-xs">Cancel</button>
                      <button type="submit" className="btn-gov-danger text-xs font-bold">TRANSMIT ESCALATION</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FIELD REPORTS (COMPLETE LIFECYCLE: OPEN -> IN PROGRESS -> RESOLVED -> CLOSED) */}
        {activeTab === 'field_reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase text-[#0f2942]">Field Reports & Operational Defects Register</h2>
                <p className="text-[11px] text-slate-500">Live feed of voice hazards and safety reports submitted by underground miners</p>
              </div>
            </div>

            <div className="gov-panel overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Source / Type</th>
                    <th>Category & Miner Description</th>
                    <th>Worker</th>
                    <th>Zone</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldReports.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold text-[#0f2942]">{r.id}</td>
                      <td>
                        <span className="badge-gov badge-gov-neutral font-mono text-[10px]">{r.source || 'MINER'}</span>
                      </td>
                      <td className="font-medium text-xs max-w-md">
                        <div className="font-bold text-[#0f2942]">{r.suggested_category || r.category || 'Hazard Observation'}</div>
                        {r.description ? (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded mt-1 border border-slate-200 whitespace-pre-wrap break-words">
                            <span className="font-bold text-slate-500">Miner Statement: </span>
                            "{r.description}"
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">No text description provided.</div>
                        )}
                        {r.audio_transcript && r.audio_transcript !== r.description && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            Audio Transcript: {r.audio_transcript}
                          </div>
                        )}
                      </td>
                      <td className="text-xs font-medium text-slate-700">{r.worker_name || 'Miner'}</td>
                      <td>{r.zone || 'Zone 4'}</td>
                      <td>
                        <span className={`badge-gov ${r.severity === 'high' || r.severity === 'critical' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-gov ${r.status === 'CLOSED' ? 'badge-gov-neutral' : r.status === 'RESOLVED' ? 'badge-gov-success' : r.supervisor_ack ? 'badge-gov-info' : 'badge-gov-warning'}`}>
                          {r.status || (r.supervisor_ack ? 'IN PROGRESS' : 'OPEN')}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 font-medium">
                        {r.assigned_to || 'Shift Sirdar A'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleNavigateToIncidentMap({
                              id: r.incident_id || r.id,
                              latitude: Number(r.latitude) || 23.7508,
                              longitude: Number(r.longitude) || 86.4192,
                              incidentType: (r.report_type?.includes('thermal') || r.suggested_category?.includes('Fire') || (r.description && r.description.includes('fire'))) ? 'FIRE' : 'OTHER',
                              zone: r.zone || 'Zone 4',
                              camera_id: r.camera_id,
                              title: `Field Report #${r.id} (${r.suggested_category || 'Hazard'})`,
                              severity: r.severity?.toUpperCase() || 'HIGH',
                              status: r.status || 'OPEN'
                            })}
                            className="btn-gov-secondary text-[11px] py-1 px-2 flex items-center gap-1 text-[#213d77] cursor-pointer font-mono"
                            title="Locate report coordinates on GIS map"
                          >
                            <MapPin className="w-3 h-3 text-[#213d77]" />
                            <span>Redirect to Map</span>
                          </button>
                          <button
                            onClick={() => setSelectedFieldReport(r)}
                            className="btn-gov-outline text-[11px] py-1 px-2 cursor-pointer"
                          >
                            Details
                          </button>
                          {!r.supervisor_ack && (
                            <button
                              onClick={() => handleAcknowledgeFieldReport(r.id)}
                              className="btn-gov-primary text-[11px] py-1 px-2 cursor-pointer"
                            >
                              Verify
                            </button>
                          )}
                          {r.status !== 'CLOSED' && (
                            <button
                              onClick={() => {
                                setCloseReportId(r.id);
                                setCloseReportNotes(`Rectifications inspected on-site by ${user?.full_name || 'Supervisor'}. Issue resolved.`);
                              }}
                              className="btn-gov-secondary text-[11px] py-1 px-2 cursor-pointer"
                            >
                              Close Issue
                            </button>
                          )}
                          {r.status === 'CLOSED' && (
                            <span className="text-[11px] text-slate-400 font-mono">CLOSED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {fieldReports.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-6 text-slate-500 text-xs">
                        No field reports logged for this shift.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Detailed Field Report Modal */}
            {selectedFieldReport && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-white border border-[#213d77] rounded-xs max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase text-[#0f2942]">
                        Field Report Details #{selectedFieldReport.id}
                      </span>
                      <span className="badge-gov badge-gov-neutral font-mono text-[10px]">
                        {selectedFieldReport.source || 'MINER'}
                      </span>
                    </div>
                    <button onClick={() => setSelectedFieldReport(null)} className="text-slate-400 hover:text-black font-bold text-base">&times;</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Reported By</span>
                        <strong className="text-[#0f2942]">{selectedFieldReport.worker_name || 'Ramesh Kumar Mahato'}</strong>
                        <span className="text-slate-400 block text-[10px]">({selectedFieldReport.worker_id || 'usr-miner-01'})</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                        <strong className="text-[#0f2942]">{new Date(selectedFieldReport.created_at || Date.now()).toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Zone & Mine</span>
                        <strong className="text-[#0f2942]">{selectedFieldReport.zone || 'Zone 4'}</strong>
                        <span className="text-slate-400 block text-[10px]">Demo Mine A</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Severity / Status</span>
                        <span className={`badge-gov ${selectedFieldReport.severity === 'high' || selectedFieldReport.severity === 'critical' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                          {selectedFieldReport.severity?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="gov-label">STATUTORY CATEGORY</span>
                      <div className="p-2.5 bg-[#f8fafc] border border-slate-200 rounded font-bold text-[#0f2942]">
                        {selectedFieldReport.suggested_category || selectedFieldReport.category || 'General Safety Observation'}
                      </div>
                    </div>

                    <div>
                      <span className="gov-label">DESCRIPTION / AI OBSERVATION</span>
                      <div className="p-3 bg-amber-50/50 border border-amber-200 rounded text-slate-800 whitespace-pre-wrap break-words leading-relaxed font-sans text-xs">
                        {selectedFieldReport.description ? (
                          selectedFieldReport.description
                        ) : (
                          <span className="text-slate-400 italic">No detailed description was provided.</span>
                        )}
                      </div>
                    </div>

                    {selectedFieldReport.audio_transcript && selectedFieldReport.audio_transcript !== selectedFieldReport.description && (
                      <div>
                        <span className="gov-label">VOICE AUDIO TRANSCRIPT</span>
                        <div className="p-2.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[11px]">
                          {selectedFieldReport.audio_transcript}
                        </div>
                      </div>
                    )}

                    {selectedFieldReport.photo_url && (
                      <div>
                        <span className="gov-label">PHOTO PROOF ATTACHMENT</span>
                        <img 
                          src={selectedFieldReport.photo_url} 
                          alt="Field report attachment" 
                          className="w-full h-40 object-cover rounded border border-slate-200"
                        />
                      </div>
                    )}

                    {selectedFieldReport.supervisor_ack && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px]">
                        <strong>✅ Verified on-site</strong> by {selectedFieldReport.ack_by_name || 'Supervisor'} at {new Date(selectedFieldReport.ack_at || selectedFieldReport.created_at).toLocaleString()}
                        {selectedFieldReport.action_taken && <div className="mt-0.5 text-emerald-900">Note: {selectedFieldReport.action_taken}</div>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFieldReport(null)}
                        className="btn-gov-outline text-xs cursor-pointer"
                      >
                        Close Details
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const rep = selectedFieldReport;
                          setSelectedFieldReport(null);
                          handleNavigateToIncidentMap({
                            id: rep.incident_id || rep.id,
                            latitude: Number(rep.latitude) || 23.7508,
                            longitude: Number(rep.longitude) || 86.4192,
                            incidentType: (rep.report_type?.includes('thermal') || rep.suggested_category?.includes('Fire') || (rep.description && rep.description.includes('fire'))) ? 'FIRE' : 'OTHER',
                            zone: rep.zone || 'Zone 4',
                            camera_id: rep.camera_id,
                            title: `Field Report #${rep.id} (${rep.suggested_category || 'Hazard'})`,
                            severity: rep.severity?.toUpperCase() || 'HIGH',
                            status: rep.status || 'OPEN'
                          });
                        }}
                        className="btn-gov-secondary text-xs flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#213d77]" />
                        <span>Redirect to Map</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedFieldReport.status !== 'ESCALATED' && (
                        <button
                          type="button"
                          onClick={() => handleEscalateFieldReport(selectedFieldReport.id)}
                          className="btn-gov-primary text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white border-0 cursor-pointer"
                        >
                          Escalate to Authority
                        </button>
                      )}
                      {!selectedFieldReport.supervisor_ack && (
                        <button
                          type="button"
                          onClick={() => {
                            handleAcknowledgeFieldReport(selectedFieldReport.id);
                            setSelectedFieldReport(prev => ({ ...prev, supervisor_ack: true, ack_by_name: user?.full_name, ack_at: new Date().toISOString() }));
                          }}
                          className="btn-gov-primary text-xs cursor-pointer"
                        >
                          Verify On-Site
                        </button>
                      )}
                      {selectedFieldReport.status !== 'CLOSED' && (
                        <button
                          type="button"
                          onClick={() => {
                            const repId = selectedFieldReport.id;
                            setSelectedFieldReport(null);
                            setCloseReportId(repId);
                            setCloseReportNotes(`Rectifications inspected on-site by ${user?.full_name || 'Supervisor'}. Issue resolved.`);
                          }}
                          className="btn-gov-secondary text-xs cursor-pointer"
                        >
                          Close Issue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Close Field Report Modal */}
            {closeReportId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div className="bg-white border border-[#213d77] rounded-xs max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs uppercase text-[#0f2942]">Close Field Report #{closeReportId}</span>
                    <button onClick={() => setCloseReportId(null)} className="text-slate-400 hover:text-black">&times;</button>
                  </div>
                  <form onSubmit={handleCloseFieldReport} className="space-y-3 text-xs">
                    <div>
                      <label className="gov-label">MANDATORY RESOLUTION NOTES</label>
                      <textarea
                        rows={3}
                        value={closeReportNotes}
                        onChange={(e) => setCloseReportNotes(e.target.value)}
                        placeholder="State corrective actions verified prior to closing defect..."
                        className="gov-input"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setCloseReportId(null)} className="btn-gov-outline text-xs">Cancel</button>
                      <button type="submit" className="btn-gov-primary text-xs font-bold">CONFIRM CLOSURE</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: COMPLIANCE */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase text-[#0f2942]">Statutory Compliance Items (Demo Mine A)</h2>
            </div>

            <div className="gov-panel overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Statute / Reference</th>
                    <th>Title / Requirement</th>
                    <th>Due Date</th>
                    <th>Escalation Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceItems.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-[#0f2942]">{c.id}</td>
                      <td className="font-mono text-xs">{c.act_reference || 'CMR 2017'}</td>
                      <td className="font-medium">{c.title}</td>
                      <td className="font-mono text-[11px] text-slate-600">{c.due_date}</td>
                      <td>
                        <span className="badge-gov badge-gov-neutral">Level {c.escalation_level || 0}</span>
                      </td>
                      <td>
                        <span className={`badge-gov ${c.status === 'open' ? 'badge-gov-warning' : c.status === 'escalated' ? 'badge-gov-danger' : 'badge-gov-success'}`}>
                          {c.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: MAP */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="bg-[#213d77] text-white p-3 rounded-xs flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase">SECTOR GIS SPATIAL MAP • DEMO MINE A (ZONES 1 - 5)</h2>
                <p className="text-[11px] text-slate-200 mt-0.5">Live statutory mine lease boundaries, risk zone polygons, and active incident markers</p>
              </div>
              <span className="badge-gov bg-[#10b981] text-white text-[10px] uppercase font-bold tracking-wider">
                LIVE TELEMETRY ACTIVE
              </span>
            </div>
            <div className="gov-panel p-2">
              <MineGISMap 
                mineId={user?.mine_id || 'mine-demo-01'} 
                height="560px" 
                token={token}
                focusIncident={focusIncident}
                onClearFocusIncident={() => setFocusIncident(null)}
              />
            </div>
          </div>
        )}

        {/* TAB 9: COMMUNICATION (RULE 7: SUPERVISOR ↔ MINER & SUPERVISOR → AUTHORITY REQUEST APPROVAL) */}
        {activeTab === 'communication' && (
          <div className="space-y-6">
            
            {commFeedback && (
              <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xs flex items-center justify-between">
                <span>{commFeedback}</span>
                <button onClick={() => setCommFeedback('')} className="underline text-[11px]">Dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT: MINER INQUIRIES & DIRECT QUESTIONS */}
              <div className="gov-panel">
                <div className="gov-panel-header">
                  <span>MINER DIRECT INQUIRIES & QUESTIONS</span>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>Worker</th>
                        <th>Subject & Question</th>
                        <th>Urgency</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {minerQueries.map((q) => (
                        <tr key={q.id}>
                          <td>
                            <div className="font-bold text-[#0f2942]">{q.miner_name || 'Miner'}</div>
                            <span className="text-[10px] font-mono text-slate-500">{q.zone || 'Zone 4'}</span>
                          </td>
                          <td className="max-w-xs">
                            <div className="font-bold text-xs">{q.subject}</div>
                            <p className="text-[11px] text-slate-600 line-clamp-1">{q.message}</p>
                            {q.response && (
                              <p className="text-[10px] text-[#16a34a] mt-0.5 font-medium">Replied: {q.response}</p>
                            )}
                          </td>
                          <td>
                            <span className={`badge-gov text-[10px] ${q.urgency === 'HIGH' ? 'badge-gov-danger' : 'badge-gov-neutral'}`}>
                              {q.urgency}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-gov ${q.status === 'answered' ? 'badge-gov-success' : 'badge-gov-warning'}`}>
                              {q.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-right">
                            {q.status !== 'answered' ? (
                              <button
                                onClick={() => {
                                  setQueryReplyId(q.id);
                                  setQueryReplyText('');
                                }}
                                className="btn-gov-primary text-[11px] py-1 px-2"
                              >
                                Reply
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">ANSWERED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {minerQueries.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                            No pending worker inquiries in queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Reply Modal */}
                {queryReplyId && (
                  <div className="p-4 border-t border-slate-200 bg-[#f8fafc] space-y-3 text-xs">
                    <div className="font-bold text-[#0f2942]">Reply to Worker Question #{queryReplyId}</div>
                    <form onSubmit={handleReplyMinerQuery} className="space-y-2">
                      <textarea
                        rows={2}
                        value={queryReplyText}
                        onChange={(e) => setQueryReplyText(e.target.value)}
                        placeholder="Type instructions or response to worker..."
                        className="gov-input"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setQueryReplyId(null)} className="btn-gov-outline text-xs">Cancel</button>
                        <button type="submit" className="btn-gov-primary text-xs">Send Reply</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* RIGHT: AUTHORITY COMMUNICATION APPROVAL WORKFLOW (RULE 7) */}
              <div className="space-y-4">
                
                {/* Form to Request Communication */}
                <div className="gov-panel">
                  <div className="gov-panel-header">
                    <span>REQUEST STATUTORY COMMUNICATION WITH AUTHORITY</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-[#4b5563]">
                      Per statutory protocol, Supervisors must request topic approval before active communication channels with DGMS / Corporate Authority are opened.
                    </p>

                    <form onSubmit={handleRequestAuthorityComm} className="space-y-3 text-xs">
                      <div>
                        <label className="gov-label">TOPIC / SUBJECT</label>
                        <input
                          type="text"
                          value={commRequestForm.topic}
                          onChange={(e) => setCommRequestForm({ ...commRequestForm, topic: e.target.value })}
                          placeholder="e.g. Haul road berm slope stabilization request"
                          className="gov-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="gov-label">URGENCY LEVEL</label>
                        <select
                          value={commRequestForm.urgency}
                          onChange={(e) => setCommRequestForm({ ...commRequestForm, urgency: e.target.value })}
                          className="gov-input"
                        >
                          <option value="LOW">LOW — Routine Statutory Query</option>
                          <option value="MEDIUM">MEDIUM — Operational Clarification</option>
                          <option value="HIGH">HIGH — Safety Concern Requiring Guidance</option>
                          <option value="CRITICAL">CRITICAL — DGMS Intervention Request</option>
                        </select>
                      </div>

                      <div>
                        <label className="gov-label">DESCRIPTION & SUMMARY</label>
                        <textarea
                          rows={2}
                          value={commRequestForm.description}
                          onChange={(e) => setCommRequestForm({ ...commRequestForm, description: e.target.value })}
                          placeholder="State operational context and guidance requested..."
                          className="gov-input"
                          required
                        />
                      </div>

                      <button type="submit" className="btn-gov-primary text-xs w-full py-2">
                        <Send className="w-3.5 h-3.5" />
                        <span>TRANSMIT REQUEST TO AUTHORITY</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Status of Submitted Requests & Active Threads */}
                <div className="gov-panel">
                  <div className="gov-panel-header">
                    <span>SUBMITTED REQUESTS TO AUTHORITY</span>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="gov-table">
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Urgency</th>
                          <th>Status</th>
                          <th className="text-right">Case Thread</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commRequests.map((r) => (
                          <tr key={r.id}>
                            <td className="max-w-xs font-medium text-xs">{r.topic}</td>
                            <td>
                              <span className={`badge-gov text-[10px] ${r.urgency === 'CRITICAL' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                                {r.urgency}
                              </span>
                            </td>
                            <td>
                              <span className={`badge-gov ${r.status === 'approved' ? 'badge-gov-success' : r.status === 'rejected' ? 'badge-gov-danger' : 'badge-gov-neutral'}`}>
                                {r.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="text-right">
                              {r.status === 'approved' ? (
                                <button
                                  onClick={() => {
                                    setSelectedCommReq(r);
                                    handleFetchCommMessages(r.id);
                                  }}
                                  className="btn-gov-outline text-[11px] py-1 px-2"
                                >
                                  Open Chat &gt;
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {r.status === 'rejected' ? 'DECLINED' : 'AWAITING APPROVAL'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Active Chat Modal / Container if Approved */}
                  {selectedCommReq && selectedCommReq.status === 'approved' && (
                    <div className="p-4 border-t border-slate-200 bg-[#f8fafc] space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0f2942]">AUTHORITY CASE THREAD: {selectedCommReq.topic}</span>
                        <button onClick={() => setSelectedCommReq(null)} className="text-slate-400 hover:text-black">&times;</button>
                      </div>

                      <div className="h-40 overflow-y-auto border border-slate-200 p-2.5 rounded-xs bg-white space-y-2">
                        {commMessages.map((m) => (
                          <div key={m.id} className={`p-2 rounded-xs ${m.sender_role === 'supervisor' ? 'bg-[#213d77] text-white ml-6' : 'bg-slate-100 text-[#1f2937] mr-6'}`}>
                            <div className="text-[10px] font-bold opacity-80 flex justify-between">
                              <span>{m.sender_name} ({m.sender_role?.toUpperCase()})</span>
                              <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="mt-1">{m.message}</p>
                          </div>
                        ))}
                        {commMessages.length === 0 && (
                          <p className="text-center text-slate-400 py-6">No messages in this case yet.</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newCommMsg}
                          onChange={(e) => setNewCommMsg(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendCommMessage(selectedCommReq.id)}
                          placeholder="Type message to Authority..."
                          className="gov-input flex-1"
                        />
                        <button
                          onClick={() => handleSendCommMessage(selectedCommReq.id)}
                          className="btn-gov-primary text-xs shrink-0 py-2 px-3"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 10: UPDATES */}
        {activeTab === 'updates' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase text-[#0f2942]">Statutory Directives & Shift Circulars</h2>
            <div className="space-y-3">
              <div className="gov-panel p-4 border-l-4 border-l-[#213d77]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0f2942]">DGMS CIRCULAR 02/2026: HAUL ROAD BERM HEIGHT REGULATION</span>
                  <span className="badge-gov badge-gov-info">GAZETTE</span>
                </div>
                <p className="text-xs text-[#4b5563]">
                  All open-pit haul roads must maintain safety berms at a minimum height of not less than the largest wheel diameter of HEMM operating in the sector.
                </p>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">Issued: 14-Sep-2026 • Directorate General of Mines Safety</div>
              </div>

              <div className="gov-panel p-4 border-l-4 border-l-[#fb792b]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0f2942]">SHIFT ROTATION & MUSTER VERIFICATION ADVISORY</span>
                  <span className="badge-gov badge-gov-warning">INTERNAL</span>
                </div>
                <p className="text-xs text-[#4b5563]">
                  Biometric headcount check-ins must be reconciled with CCTV Ingress counter prior to clearing underground shift entry.
                </p>
                <div className="text-[11px] text-slate-400 mt-2 font-mono">Issued: 22-Sep-2026 • Colliery General Manager</div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Floating Assistant */}
      <FloatingAssistant />
    </div>
  );
}
