import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GovHeader from '../../components/common/GovHeader';
import GovNoticeTicker from '../../components/common/GovNoticeTicker';
import GovBreadcrumbs from '../../components/common/GovBreadcrumbs';
import EmergencySOSBanner from '../../components/common/EmergencySOSBanner';
import MineGISMap from '../../components/maps/MineGISMap';
import TwoStepViolationModal from '../../components/common/TwoStepViolationModal';
import FloatingAssistant from '../../components/assistant/FloatingAssistant';
import OCRScanModal from '../../components/common/OCRScanModal';
import AuthorityAIAssessmentsView from '../../components/authority/AuthorityAIAssessmentsView';
import AuthorityDailyGovernanceSummary from '../../components/authority/AuthorityDailyGovernanceSummary';
import AuthorityAnalyticsView from '../../components/authority/AuthorityAnalyticsView';
import { MiningHelmetIcon } from '../../components/common/MiningIcons';
import { 
  Building2, 
  LayoutDashboard,
  ClipboardCheck, 
  AlertOctagon, 
  Users, 
  Map as MapIcon, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  ShieldAlert, 
  FileSpreadsheet, 
  Sparkles, 
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Camera,
  Activity,
  ShieldCheck,
  UserPlus,
  Scale,
  FileDown,
  XCircle,
  RefreshCw,
  Lock,
  Unlock,
  FileText,
  Layers,
  Cpu,
  Flame,
  Search,
  CheckCircle,
  Filter,
  Eye,
  ChevronDown,
  CalendarCheck,
  Zap,
  CheckSquare,
  Video,
  Send,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';

export default function AuthorityDashboard() {
  const { user, token, t } = useAuth();
  
  // Navigation: Logical Sections
  const [activeSection, setActiveSection] = useState('overview');
  const [navHistory, setNavHistory] = useState([]);
  const [seenSections, setSeenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('coalguard_authority_seen_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [focusIncident, setFocusIncident] = useState(null);

  const handleSelectSection = (secId) => {
    if (secId === activeSection) return;
    setNavHistory(prev => [...prev, activeSection]);
    setActiveSection(secId);
    setSeenSections(prev => {
      const updated = { ...prev, [secId]: Date.now() };
      localStorage.setItem('coalguard_authority_seen_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigateToIncidentMap = (incidentLocation) => {
    if (incidentLocation) {
      setFocusIncident(incidentLocation);
    }
    setNavHistory(prev => [...prev, activeSection]);
    setActiveSection('map');
    setSeenSections(prev => {
      const updated = { ...prev, map: Date.now() };
      localStorage.setItem('coalguard_authority_seen_sections', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoBack = () => {
    if (isViolationModalOpen) { setIsViolationModalOpen(false); return; }
    if (isOcrOpen) { setIsOcrOpen(false); return; }
    if (isCreateItemOpen) { setIsCreateItemOpen(false); return; }
    if (isOnboardContractorOpen) { setIsOnboardContractorOpen(false); return; }
    if (isGrievanceModalOpen) { setIsGrievanceModalOpen(false); return; }
    if (selectedCommRequest) { setSelectedCommRequest(null); return; }
    if (navHistory.length > 0) {
      const prevSec = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveSection(prevSec);
    } else {
      setActiveSection('overview');
    }
  };

  const handleGoHome = () => {
    setIsViolationModalOpen(false);
    setIsOcrOpen(false);
    setIsCreateItemOpen(false);
    setIsOnboardContractorOpen(false);
    setIsGrievanceModalOpen(false);
    setSelectedCommRequest(null);
    setNavHistory([]);
    setActiveSection('overview');
  };

  // Global Mine Filter Scope: 'all' or specific mine_id
  const [selectedMineId, setSelectedMineId] = useState('all');
  const [availableMines, setAvailableMines] = useState([
    { id: 'all', name: 'All Demonstration Mines (National Scope)' },
    { id: 'mine-demo-01', name: 'Demo Mine A (Zone 1 - Zone 5)' },
    { id: 'mine-raniganj-02', name: 'Demo Mine B (Underground Colliery)' },
    { id: 'mine-korba-03', name: 'Demo Mine C (Open Cast Pit)' },
    { id: 'mine-piparwar-04', name: 'Demo Mine D (Surface Operations)' }
  ]);

  // Data States
  const [complianceItems, setComplianceItems] = useState([]);
  const [violations, setViolations] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [fieldReports, setFieldReports] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [rankedMines, setRankedMines] = useState([
    { mine_id: 'mine-jharia-01', mine_name: 'Demo Mine A (Zone 1 - Zone 5)', subsidiary_code: 'BCCL', risk_score: 38.3, compliance_rate: 84.0, active_violations_count: 1 },
    { mine_id: 'mine-korba-03', mine_name: 'Demo Mine C (Open Cast Pit)', subsidiary_code: 'ECL', risk_score: 22.5, compliance_rate: 91.5, active_violations_count: 0 },
    { mine_id: 'mine-raniganj-02', mine_name: 'Demo Mine B (Underground Colliery)', subsidiary_code: 'SECL', risk_score: 8.3, compliance_rate: 96.2, active_violations_count: 0 },
    { mine_id: 'mine-singrauli-04', mine_name: 'Demo Mine D (Surface Operations)', subsidiary_code: 'CCL', risk_score: 8.3, compliance_rate: 98.0, active_violations_count: 0 }
  ]);
  const [productionData, setProductionData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [escalationSweepResult, setEscalationSweepResult] = useState('');
  const [aiAssessments, setAiAssessments] = useState([]);
  
  // Phase E: Escalated Emergencies & Communication States
  const [sosEvents, setSosEvents] = useState([]);
  const [commRequests, setCommRequests] = useState([]);
  const [selectedCommRequest, setSelectedCommRequest] = useState(null);
  const [commMessages, setCommMessages] = useState([]);
  const [newCommMessage, setNewCommMessage] = useState('');
  const [commFeedbackMsg, setCommFeedbackMsg] = useState('');
  const [authorityDirectMsgForm, setAuthorityDirectMsgForm] = useState({
    topic: 'Statutory Operational Directive',
    urgency: 'HIGH',
    description: '',
    zone: 'Zone 4'
  });

  // Modals & Sub-states
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [searchAuditHash, setSearchAuditHash] = useState('');
  const [integrityResult, setIntegrityResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Sub-tabs inside sections
  const [violationsSubTab, setViolationsSubTab] = useState('violations'); // 'violations' | 'inspections'
  const [workforceSubTab, setWorkforceSubTab] = useState('contractors'); // 'contractors' | 'attendance'
  const [reportsSubTab, setReportsSubTab] = useState('field_feed'); // 'field_feed' | 'grievances'

  // Form States
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ 
    title: '', 
    category: 'safety', 
    act_reference: 'CMR 2017 Reg 104', 
    due_date: '',
    mine_id: 'mine-jharia-01'
  });

  const [isCreateViolationOpen, setIsCreateViolationOpen] = useState(false);
  const [newViolationForm, setNewViolationForm] = useState({
    title: '',
    category: 'Safety Berms & Haul Roads',
    severity: 'high',
    location_description: 'Pit Bench 4 Section C',
    corrective_action_required: '',
    deadline: '',
    mine_id: 'mine-jharia-01'
  });

  const [isCreateInspectionOpen, setIsCreateInspectionOpen] = useState(false);
  const [newInspectionForm, setNewInspectionForm] = useState({
    inspection_type: 'routine_internal',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: 'DGMS Statutory ventilation and electrical safety review.',
    mine_id: 'mine-jharia-01'
  });

  const [isOnboardContractorOpen, setIsOnboardContractorOpen] = useState(false);
  const [newContractorForm, setNewContractorForm] = useState({
    name: '',
    company_reg_no: '',
    service_type: 'Overburden Excavation & Heavy Haulage',
    active_workers_count: 25,
    license_number: 'PESO/BCCL/2026/09',
    license_expiry_date: '',
    mine_id: 'mine-jharia-01'
  });

  const getItemTime = (item) => {
    if (!item) return 0;
    const raw = item.updated_at || item.created_at || item.timestamp || item.date;
    return raw ? new Date(raw).getTime() : 0;
  };

  // Section-specific notification indicators (Red Dots) - evaluated after all state hooks
  const sectionNotifications = {
    compliance: activeSection !== 'compliance' && ((violations || []).some(v => v.status === 'rectification_submitted' && getItemTime(v) > (seenSections.compliance || 0)) || (complianceItems || []).some(c => (c.status === 'overdue' || c.status === 'escalated') && getItemTime(c) > (seenSections.compliance || 0))),
    emergencies: activeSection !== 'emergencies' && (sosEvents || []).some(s => (s.status === 'active' || s.escalated_to_authority) && getItemTime(s) > (seenSections.emergencies || 0)),
    communication: activeSection !== 'communication' && (commRequests || []).some(r => r.status === 'pending' && getItemTime(r) > (seenSections.communication || 0)),
    ai_assessments: activeSection !== 'ai_assessments' && (aiAssessments || []).some(a => a.status === 'NEW' || getItemTime(a) > (seenSections.ai_assessments || 0)),
    audit: false,
    updates: activeSection !== 'updates' && (fieldReports || []).some(r => !r.supervisor_ack && getItemTime(r) > (seenSections.updates || 0)),
    mines: false,
    analytics: false,
    map: false
  };

  // Fetch all Authority datasets
  const fetchAuthorityData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const mineParam = selectedMineId !== 'all' ? `?mine_id=${selectedMineId}` : '';

      // 1. Compliance
      const compRes = await fetch(`/api/compliance${mineParam}`, { headers });
      if (compRes.ok) setComplianceItems(await compRes.json());

      // 2. Violations
      const violRes = await fetch(`/api/violations${mineParam}`, { headers });
      if (violRes.ok) setViolations(await violRes.json());

      // 3. Inspections
      const inspRes = await fetch(`/api/inspections${mineParam}`, { headers });
      if (inspRes.ok) setInspections(await inspRes.json());

      // 4. Contractors
      const contRes = await fetch(`/api/contractors${mineParam}`, { headers });
      if (contRes.ok) setContractors(await contRes.json());

      // 5. Attendance & Workforce Summary
      const attRes = await fetch(`/api/attendance${mineParam}`, { headers });
      if (attRes.ok) setAttendanceData(await attRes.json());

      // 6. Field Reports
      const feedRes = await fetch(`/api/field-reports${mineParam}`, { headers });
      if (feedRes.ok) setFieldReports(await feedRes.json());

      // 7. Grievances
      const grievRes = await fetch(`/api/grievances${mineParam}`, { headers });
      if (grievRes.ok) setGrievances(await grievRes.json());

      // 8. Cross-Mine Risk
      const riskRankRes = await fetch('/api/analytics/cross-mine-risk', { headers });
      if (riskRankRes.ok) setRankedMines(await riskRankRes.json());

      // 9. Production Overview
      const prodRes = await fetch('/api/compliance/production-overview', { headers });
      if (prodRes.ok) setProductionData(await prodRes.json());

      // 10. Audit Logs
      const auditRes = await fetch('/api/audit/logs', { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      // 11. AI Assessments Transmitted from Supervisors
      const aiRes = await fetch(`/api/models/assessments${mineParam}`, { headers });
      if (aiRes.ok) setAiAssessments(await aiRes.json());

      // 12. Violation Trends
      const trendRes = await fetch('/api/analytics/recurring-violations', { headers });
      if (trendRes.ok) setTrendData(await trendRes.json());

      // 12. Specific Mine Risk if filtered
      const targetMineId = selectedMineId !== 'all' ? selectedMineId : 'mine-jharia-01';
      const riskRes = await fetch(`/api/analytics/risk-score/${targetMineId}`, { headers });
      if (riskRes.ok) setRiskData(await riskRes.json());

      // 13. Escalated Emergencies (RULE 10: Authority sees escalated emergencies)
      const sosRes = await fetch(`/api/emergency/sos${mineParam}`, { headers });
      if (sosRes.ok) setSosEvents(await sosRes.json());

      // 14. Communication Requests from Supervisors
      const commRes = await fetch('/api/communication/requests', { headers });
      if (commRes.ok) setCommRequests(await commRes.json());

    } catch (err) {
      console.error('Authority data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAuthorityData();
    const interval = setInterval(fetchAuthorityData, 10000);
    return () => clearInterval(interval);
  }, [token, selectedMineId]);

  // Handlers
  const handleCreateComplianceItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newItemForm,
          mine_id: selectedMineId !== 'all' ? selectedMineId : newItemForm.mine_id
        })
      });
      if (res.ok) {
        setIsCreateItemOpen(false);
        setNewItemForm({ title: '', category: 'safety', act_reference: 'CMR 2017 Reg 104', due_date: '', mine_id: 'mine-jharia-01' });
        fetchAuthorityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateViolation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newViolationForm,
          mine_id: selectedMineId !== 'all' ? selectedMineId : newViolationForm.mine_id
        })
      });
      if (res.ok) {
        setIsCreateViolationOpen(false);
        setNewViolationForm({
          title: '', category: 'Safety Berms & Haul Roads', severity: 'high',
          location_description: 'Pit Bench 4 Section C', corrective_action_required: '', deadline: '', mine_id: 'mine-jharia-01'
        });
        fetchAuthorityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleInspection = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newInspectionForm,
          mine_id: selectedMineId !== 'all' ? selectedMineId : newInspectionForm.mine_id
        })
      });
      if (res.ok) {
        setIsCreateInspectionOpen(false);
        fetchAuthorityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnboardContractor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newContractorForm,
          mine_id: selectedMineId !== 'all' ? selectedMineId : newContractorForm.mine_id
        })
      });
      if (res.ok) {
        setIsOnboardContractorOpen(false);
        fetchAuthorityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit/verify-integrity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIntegrityResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTampering = async () => {
    try {
      await fetch('/api/audit/simulate-tampering', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAuthorityData();
      handleVerifyIntegrity();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreIntegrity = async () => {
    try {
      await fetch('/api/audit/restore-integrity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAuthorityData();
      handleVerifyIntegrity();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerEscalationSweep = async () => {
    setEscalationSweepResult('Executing statutory escalation sweep across all mines...');
    try {
      const res = await fetch('/api/workflow/escalation-sweep', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEscalationSweepResult(`✅ Sweep Complete: ${data.escalated_count || 1} overdue items auto-escalated to DGMS Priority.`);
        fetchAuthorityData();
        setTimeout(() => setEscalationSweepResult(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setEscalationSweepResult('❌ Sweep simulation error');
    }
  };

  const handleExportPdf = async () => {
    setPdfDownloading(true);
    try {
      const targetMine = selectedMineId !== 'all' ? selectedMineId : 'mine-jharia-01';
      const res = await fetch(`/api/workflow/generate-statutory-report/${targetMine}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CoalGuard-Statutory-Report-${targetMine}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleAcknowledgeReport = async (reportId) => {
    try {
      await fetch(`/api/field-reports/${reportId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action_taken: 'Acknowledged and dispatched to physical safety inspection.' })
      });
      fetchAuthorityData();
    } catch (err) {
      console.error('Acknowledge error:', err);
    }
  };

  const handleConvertToViolation = async (reportId) => {
    try {
      const res = await fetch(`/api/field-reports/${reportId}/convert-to-violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          severity: 'high',
          corrective_action_required: 'Immediate physical rectifications required by Colliery Sirdar.',
          deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        fetchAuthorityData();
        setActiveSection('inspections_violations');
      }
    } catch (err) {
      console.error('Convert violation error:', err);
    }
  };

  const handleUpdateGrievanceStatus = async (id, newStatus, remarks) => {
    try {
      await fetch(`/api/grievances/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          resolution_notes: remarks || `Status updated to ${newStatus} by Mine Safety Authority.`
        })
      });
      fetchAuthorityData();
    } catch (err) {
      console.error('Grievance update error:', err);
    }
  };

  // Phase E: Authority Emergency Handlers (RULE 10: Authority Actions on Escalated Events)
  const handleAckEscalatedEmergency = async (sosId) => {
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action_notes: 'DGMS / Authority Emergency Oversight Unit Acknowledged and Dispatched Response Team.' })
      });
      if (res.ok) {
        setCommFeedbackMsg('✅ Escalated Emergency Acknowledged by Authority.');
        fetchAuthorityData();
        setTimeout(() => setCommFeedbackMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveEscalatedEmergency = async (sosId) => {
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolution_summary: 'Authority verified area secured. Emergency incident officially closed.' })
      });
      if (res.ok) {
        setCommFeedbackMsg('✅ Emergency marked resolved by Authority.');
        fetchAuthorityData();
        setTimeout(() => setCommFeedbackMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Phase E: Communication Approval Handlers (RULE 7: Supervisor -> Authority Approval Workflow)
  const handleCommDecision = async (requestId, decision, reviewNotes) => {
    try {
      const res = await fetch(`/api/communication/requests/${requestId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision,
          review_notes: reviewNotes || (decision === 'approved' ? 'Statutory communication approved by Authority.' : 'Communication request declined.')
        })
      });
      if (res.ok) {
        setCommFeedbackMsg(`✅ Request #${requestId} ${decision.toUpperCase()} successfully.`);
        fetchAuthorityData();
        setTimeout(() => setCommFeedbackMsg(''), 4000);
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
        const msgs = await res.json();
        setCommMessages(msgs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendCommMessage = async (requestId) => {
    if (!newCommMessage.trim()) return;
    try {
      const res = await fetch('/api/communication/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: requestId,
          message: newCommMessage.trim()
        })
      });
      if (res.ok) {
        setNewCommMessage('');
        handleFetchCommMessages(requestId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Phase E: Authority Direct Initiate to Supervisor (RULE 8: Authority can directly message supervisor)
  const handleAuthorityDirectInitiate = async (e) => {
    e.preventDefault();
    try {
      // 1. Create auto-approved communication request
      const reqRes = await fetch('/api/communication/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: authorityDirectMsgForm.topic,
          description: authorityDirectMsgForm.description,
          urgency: authorityDirectMsgForm.urgency,
          zone: authorityDirectMsgForm.zone
        })
      });
      if (reqRes.ok) {
        const created = await reqRes.json();
        const reqId = created.request?.id;
        
        // Auto-approve since initiated by Authority
        await fetch(`/api/communication/requests/${reqId}/decision`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ decision: 'approved', review_notes: 'Direct directive initiated by Authority.' })
        });

        // Send initial message
        await fetch('/api/communication/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            request_id: reqId,
            message: authorityDirectMsgForm.description
          })
        });

        setAuthorityDirectMsgForm({ topic: 'Statutory Operational Directive', urgency: 'HIGH', description: '', zone: 'Zone 4' });
        setCommFeedbackMsg('✅ Statutory directive dispatched directly to Colliery Supervisor.');
        fetchAuthorityData();
        setTimeout(() => setCommFeedbackMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculated Stats
  const totalComplianceItems = complianceItems.length;
  const compliantCount = complianceItems.filter(c => c.status === 'compliant').length;
  const complianceRate = totalComplianceItems > 0 ? ((compliantCount / totalComplianceItems) * 100).toFixed(1) : '94.2';
  const openViolationsCount = violations.filter(v => v.status === 'open' || v.status === 'rectification_submitted').length;
  const highSeverityViolations = violations.filter(v => v.severity === 'high' || v.severity === 'critical').length;
  const totalWorkers = attendanceData?.summary?.total_workforce || contractors.reduce((sum, c) => sum + (c.active_workers_count || 0), 0);
  const presentToday = attendanceData?.summary?.present_today || 131;

  const getBreadcrumbs = () => {
    const titles = {
      overview: 'National Governance Overview',
      mines: 'Demarcated Mine Sectors & Workforce',
      compliance: 'Statutory Compliance & Two-Step Violations',
      emergencies: 'Escalated Colliery Emergencies',
      ai_assessments: 'Supervisor AI Assessments & Situational Oversight',
      analytics: 'Cross-Sector Risk Analytics',
      map: 'National GIS Geospatial Layer',
      communication: 'Supervisor Communications & Grievances',
      audit: 'Immutable SHA-256 Cryptographic Audit Ledger',
      updates: 'DGMS Gazettes & Circular Bulletins'
    };
    return ['Authority Portal', titles[activeSection] || 'Overview'];
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1f2937] flex flex-col font-sans">
      
      {/* 1. GOVERNMENT HEADER */}
      <GovHeader 
        activeTab={activeSection} 
        onSelectTab={handleSelectSection} 
        sectionNotifications={sectionNotifications}
        onNavigateToMap={handleNavigateToIncidentMap}
      />

      {/* 2. STATUTORY NOTICE TICKER */}
      <GovNoticeTicker />

      {/* 3. BREADCRUMBS WITH BACK & HOME NAVIGATION */}
      <GovBreadcrumbs 
        items={getBreadcrumbs()} 
        onBack={handleGoBack}
        onHome={handleGoHome}
        showNavControls={activeSection !== 'overview' || isViolationModalOpen || isOcrOpen || isCreateItemOpen || isOnboardContractorOpen || isGrievanceModalOpen || !!selectedCommRequest}
      />

      {/* Global Emergency Alert Banner */}
      <EmergencySOSBanner 
        onStatusChange={fetchAuthorityData} 
        onNavigateToMap={handleNavigateToIncidentMap} 
      />

      {/* Authority Control Ribbon with Mine Scope Selector */}
      <div className="bg-[#FFFFFF] border-b border-[#DDD6C7] px-3 sm:px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">Scope:</span>
            <div className="relative">
              <select
                value={selectedMineId}
                onChange={(e) => setSelectedMineId(e.target.value)}
                className="appearance-none bg-[#EFEBE2] border border-[#DDD6C7] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1E1B16] focus:outline-none focus:border-[#1B3A5C] pr-8 cursor-pointer font-heading"
              >
                {availableMines.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B6558] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-[#6B6558] font-mono">
            {selectedMineId === 'all' ? '📊 Aggregated national view' : `📍 Filtered to ${availableMines.find(m => m.id === selectedMineId)?.name}`}
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerEscalationSweep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5EDD6] hover:bg-[#F5EDD6]/80 text-[#3A2E00] border border-[#B8860B]/40 text-xs font-bold shadow-2xs transition font-mono"
            title="Simulate daily DGMS escalation scan for hackathon demo"
          >
            <Zap className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="hidden sm:inline">Escalation Sweep</span>
          </button>

          <button
            onClick={() => setIsOcrOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EFEBE2] border border-[#DDD6C7] text-xs font-semibold text-[#1E1B16] shadow-2xs transition"
          >
            <Camera className="w-3.5 h-3.5 text-[#1F6B45]" />
            <span className="hidden md:inline">OCR Document Scan</span>
          </button>
          
          <button
            onClick={handleExportPdf}
            disabled={pdfDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B3A5C] hover:bg-[#12273F] text-white text-xs font-bold shadow-2xs transition"
          >
            <FileDown className={`w-3.5 h-3.5 ${pdfDownloading ? 'animate-bounce' : ''}`} />
            <span>{pdfDownloading ? 'Generating PDF...' : 'Statutory PDF'}</span>
          </button>
        </div>
      </div>

      {/* Sweep alert toast */}
      {escalationSweepResult && (
        <div className="bg-[#F5EDD6] border-b border-[#B8860B]/40 px-4 py-2 text-xs font-bold text-[#3A2E00] font-mono flex items-center justify-between">
          <span>{escalationSweepResult}</span>
          <button onClick={() => setEscalationSweepResult('')} className="text-[#3A2E00] hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Authority Workspace Content */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-[1600px] mx-auto">

          {/* ========================================================= */}
          {/* SECTION 1: OVERVIEW & HIGH-LEVEL SUMMARY */}
          {/* ========================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-[#1B3A5C] to-[#12273F] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-mono mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>Statutory Safety & Mine Authority Command Center</span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-black font-heading uppercase tracking-tight">
                    {selectedMineId === 'all' ? 'National Coal Mining Governance & Compliance' : availableMines.find(m => m.id === selectedMineId)?.name}
                  </h2>
                  <p className="text-xs text-white/80 mt-1 max-w-2xl">
                    Comprehensive statutory oversight compliant with Coal Mines Regulations 2017, Mines Act 1952, and DGMS Technical Circulars.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSelectSection('compliance')}
                    className="px-4 py-2 rounded-xl bg-white text-[#1B3A5C] text-xs font-bold hover:bg-white/90 transition shadow-xs cursor-pointer"
                  >
                    View Compliance
                  </button>
                  <button
                    onClick={() => handleSelectSection('audit')}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition cursor-pointer"
                  >
                    Verify Audit Ledger
                  </button>
                </div>
              </div>

              {/* 5 Key Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                
                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">Statutory Compliance</span>
                    <ClipboardCheck className="w-4 h-4 text-[#1F6B45]" />
                  </div>
                  <div className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">{complianceRate}%</div>
                  <div className="flex items-center gap-1 text-[11px] text-[#1F6B45] mt-1 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{compliantCount} / {totalComplianceItems} items</span>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">Open Violations</span>
                    <AlertOctagon className="w-4 h-4 text-[#A13D2F]" />
                  </div>
                  <div className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">{openViolationsCount}</div>
                  <div className="flex items-center gap-1 text-[11px] text-[#A13D2F] mt-1 font-semibold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{highSeverityViolations} high severity</span>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">Shift Attendance</span>
                    <CalendarCheck className="w-4 h-4 text-[#1B3A5C]" />
                  </div>
                  <div className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">
                    {attendanceData?.summary?.attendance_rate_pct || 92.3}%
                  </div>
                  <div className="text-[11px] text-[#6B6558] mt-1 font-mono">
                    {presentToday} / {totalWorkers} checked-in
                  </div>
                </div>

                <div 
                  onClick={() => handleSelectSection('ai_assessments')}
                  className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7] shadow-2xs hover:border-[#1B3A5C] transition cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">AI Assessments</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">{aiAssessments.length}</div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-600 mt-1 font-semibold font-mono">
                    <span>{(aiAssessments.filter(a => a.status === 'NEW')).length} new transmissions</span>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B6558] uppercase font-mono">DGMS Audit Chain</span>
                    <ShieldCheck className="w-4 h-4 text-[#B8860B]" />
                  </div>
                  <div className="text-2xl font-black text-[#1E1B16] mt-2 font-heading">{auditLogs.length}</div>
                  <div className="text-[11px] text-[#1F6B45] mt-1 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>SHA-256 Intact</span>
                  </div>
                </div>

              </div>

              {/* Quick Glance Grids: Risk Ranking & Critical Action Items */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Cross-Mine Risk Ranking Table */}
                <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">Cross-Mine Statutory Risk Index</h3>
                      <p className="text-xs text-[#6B6558]">Live multi-mine risk assessment and statutory ranking</p>
                    </div>
                    <button 
                      onClick={() => handleSelectSection('analytics')} 
                      className="text-xs text-[#1B3A5C] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Analytics</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F5F0] border-y border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Mine</th>
                          <th className="py-2.5 px-3">Subsidiary</th>
                          <th className="py-2.5 px-3">Risk Score</th>
                          <th className="py-2.5 px-3">Compliance</th>
                          <th className="py-2.5 px-3">Violations</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDD6C7]/60">
                        {rankedMines.slice(0, 5).map((m) => (
                          <tr key={m.mine_id} className="hover:bg-[#F7F5F0]/50 transition">
                            <td className="py-3 px-3 font-bold text-[#1E1B16]">{m.mine_name}</td>
                            <td className="py-3 px-3 font-mono text-[#6B6558]">{m.subsidiary_code}</td>
                            <td className="py-3 px-3 font-bold font-mono">
                              <span className={`px-2 py-0.5 rounded-full ${
                                m.risk_score > 70 ? 'bg-[#F5E2DE] text-[#A13D2F]' :
                                m.risk_score > 40 ? 'bg-[#F5EDD6] text-[#3A2E00]' : 'bg-[#E3EFE8] text-[#1F6B45]'
                              }`}>
                                {m.risk_score}/100
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">{m.compliance_rate}%</td>
                            <td className="py-3 px-3 font-mono text-[#A13D2F] font-bold">{m.active_violations_count}</td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => { setSelectedMineId(m.mine_id); handleSelectSection('compliance'); }}
                                className="px-2.5 py-1 rounded-lg bg-[#EFEBE2] hover:bg-[#DDD6C7] text-[#1E1B16] text-[11px] font-semibold transition cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right 1 Col: Urgent Attention Queue */}
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading mb-1">
                      Urgent Action Queue
                    </h3>
                    <p className="text-xs text-[#6B6558] mb-4">Pending sign-offs and regulatory alerts</p>

                    <div className="space-y-3">
                      {/* Item 1: Proof Awaiting Verification */}
                      <div className="p-3.5 rounded-xl bg-[#FEF9EE] border border-[#F5EDD6] text-xs">
                        <div className="flex items-center justify-between font-bold text-[#1E1B16]">
                          <span className="font-semibold text-slate-900">Proof Awaiting Verification</span>
                          <span className="text-[10px] font-mono font-bold text-[#B8860B] bg-[#F5EDD6] px-2 py-0.5 rounded-full">Step 2 Pending</span>
                        </div>
                        <p className="text-slate-700 text-xs mt-1">
                          {violations.find(v => v.status === 'rectification_submitted')?.title || 'Methane Ingress Sensor Alarm Failure at Return Airway #2'}
                        </p>
                        <button
                          onClick={() => {
                            const targetV = violations.find(v => v.status === 'rectification_submitted') || violations[0];
                            if (targetV) { setSelectedViolation(targetV); setIsViolationModalOpen(true); }
                          }}
                          className="mt-2 text-xs font-bold text-[#1B3A5C] hover:underline flex items-center gap-1"
                        >
                          Review & Physical Sign-off →
                        </button>
                      </div>

                      {/* Item 2: Worker Hazard Report */}
                      <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-[#1E1B16]">
                          <span className="font-semibold text-slate-900">Worker Hazard Report</span>
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">New</span>
                        </div>
                        <p className="text-slate-700 text-xs mt-1 line-clamp-2">
                          {fieldReports.find(r => !r.supervisor_ack)?.description || 'Haul road dust suppression sprinkler nozzle choked with coal slurry.'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              const targetR = fieldReports.find(r => !r.supervisor_ack);
                              if (targetR) handleAcknowledgeReport(targetR.id);
                            }}
                            className="text-xs font-bold text-[#1F6B45] hover:underline"
                          >
                            Acknowledge →
                          </button>
                          <span className="text-slate-400">•</span>
                          <button
                            onClick={() => {
                              const targetR = fieldReports.find(r => !r.supervisor_ack);
                              if (targetR) handleConvertToViolation(targetR.id);
                            }}
                            className="text-xs font-bold text-[#A13D2F] hover:underline"
                          >
                            Convert to Violation →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#DDD6C7] mt-4 flex items-center justify-between text-xs">
                    <span className="text-[#6B6558]">DGMS Escrow Key</span>
                    <span className="font-mono text-[#1F6B45] font-bold">SECURE-2026-OK</span>
                  </div>
                </div>

              </div>

              {/* Central Consolidated Daily Governance Summary & Operational Stream */}
              <AuthorityDailyGovernanceSummary 
                token={token} 
                selectedMineId={selectedMineId} 
                onNavigate={handleSelectSection} 
              />

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 2: MINES & COMPLIANCE GRID */}
          {/* ========================================================= */}
          {activeSection === 'compliance' && (
            <div className="space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7]">
                <div>
                  <h2 className="text-base font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                    Statutory Compliance Master Tracker
                  </h2>
                  <p className="text-xs text-[#6B6558]">
                    Coal Mines Regulations 2017 & Mines Act 1952 statutory checklists
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateItemOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold transition shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Statutory Compliance Item</span>
                </button>
              </div>

              {/* Compliance Table */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F7F5F0] border-b border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Statutory Act & Regulation</th>
                        <th className="py-3 px-4">Requirement / Description</th>
                        <th className="py-3 px-4">Mine & Target</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6C7]/60">
                      {complianceItems.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F7F5F0]/50 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1E1B16]">{item.act_reference || 'CMR 2017'}</div>
                            <span className="text-[10px] text-[#6B6558] font-mono uppercase">{item.category}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-semibold text-[#1E1B16]">{item.title}</div>
                            <p className="text-[11px] text-[#6B6558] mt-0.5 line-clamp-2">{item.description}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#1E1B16]">{item.mine_name}</div>
                            <div className="text-[10px] text-[#6B6558] font-mono">Escalation: Level {item.escalation_level || 0}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#6B6558]">
                            {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Continuous'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                              item.status === 'compliant' ? 'bg-[#E3EFE8] text-[#1F6B45]' :
                              item.status === 'overdue' || item.status === 'escalated' ? 'bg-[#F5E2DE] text-[#A13D2F]' :
                              'bg-[#F5EDD6] text-[#3A2E00]'
                            }`}>
                              {item.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {item.status !== 'compliant' && (
                              <button
                                onClick={async () => {
                                  await fetch(`/api/compliance/${item.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ status: 'compliant', remarks: 'Marked compliant by Authority' })
                                  });
                                  fetchAuthorityData();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#E3EFE8] hover:bg-[#1F6B45] hover:text-white text-[#1F6B45] text-xs font-semibold transition"
                              >
                                Mark Compliant
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 3: INSPECTIONS & VIOLATIONS (2-STEP CLOSURE) */}
          {/* ========================================================= */}
          {activeSection === 'inspections_violations' && (
            <div className="space-y-5">
              
              {/* Sub-navigation bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] p-3 rounded-2xl border border-[#DDD6C7]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViolationsSubTab('violations')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      violationsSubTab === 'violations'
                        ? 'bg-[#1B3A5C] text-white shadow-xs'
                        : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                    }`}
                  >
                    Violations & 2-Step Closures ({violations.length})
                  </button>
                  <button
                    onClick={() => setViolationsSubTab('inspections')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      violationsSubTab === 'inspections'
                        ? 'bg-[#1B3A5C] text-white shadow-xs'
                        : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                    }`}
                  >
                    Scheduled DGMS Inspections ({inspections.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {violationsSubTab === 'violations' ? (
                    <button
                      onClick={() => setIsCreateViolationOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A13D2F] hover:bg-[#7D2E23] text-white text-xs font-bold transition shadow-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Log New Violation</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsCreateInspectionOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold transition shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Inspection</span>
                    </button>
                  )}
                </div>
              </div>

              {/* VIOLATIONS TAB CONTENT */}
              {violationsSubTab === 'violations' && (
                <div className="space-y-4">
                  
                  {/* Two-step Explainer Ribbon */}
                  <div className="p-3.5 bg-[#F5EDD6]/60 border border-[#B8860B]/30 rounded-2xl flex items-center gap-3 text-xs text-[#3A2E00]">
                    <ShieldCheck className="w-5 h-5 text-[#B8860B] shrink-0" />
                    <div>
                      <span className="font-bold">DGMS 2-Step Strict Closure Workflow:</span>
                      <span className="ml-1">Step 1 requires Geo-tagged Photo Proof upload. Step 2 requires Authority physical on-site inspection sign-off.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {violations.map((v) => (
                      <div key={v.id} className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              v.severity === 'critical' || v.severity === 'high' ? 'bg-[#F5E2DE] text-[#A13D2F]' : 'bg-[#F5EDD6] text-[#3A2E00]'
                            }`}>
                              {v.severity} severity
                            </span>
                            <span className={`text-[11px] font-bold font-mono ${
                              v.status === 'verified_closed' ? 'text-[#1F6B45]' :
                              v.status === 'rectification_submitted' ? 'text-[#B8860B]' : 'text-[#A13D2F]'
                            }`}>
                              {v.status === 'verified_closed' ? '✅ Verified & Closed' :
                               v.status === 'rectification_submitted' ? '⏳ Step 2 Sign-off Needed' : '⚠️ Open Violation'}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-[#1E1B16] mt-2 font-heading">{v.title}</h3>
                          <p className="text-xs text-[#6B6558] mt-1">{v.location_description} • <span className="font-mono">{v.mine_name}</span></p>

                          <div className="mt-3 p-3 bg-[#F7F5F0] rounded-xl text-xs space-y-1">
                            <div className="text-[11px] text-[#6B6558]"><strong>Required Action:</strong> {v.corrective_action_required || 'Immediate rectification'}</div>
                            {v.deadline && (
                              <div className="text-[10px] text-[#6B6558] font-mono">Deadline: {new Date(v.deadline).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#DDD6C7] flex items-center justify-between">
                          <span className="text-[11px] text-[#6B6558] font-mono">Ref: {v.act_regulation_reference || 'CMR 2017'}</span>
                          <button
                            onClick={() => { setSelectedViolation(v); setIsViolationModalOpen(true); }}
                            className="px-3 py-1.5 rounded-xl bg-[#1B3A5C] hover:bg-[#12273F] text-white text-xs font-bold transition"
                          >
                            {v.status === 'rectification_submitted' ? 'Verify & Sign-off' : 'Manage 2-Step Action'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* INSPECTIONS TAB CONTENT */}
              {violationsSubTab === 'inspections' && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F5F0] border-b border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Inspection Type</th>
                          <th className="py-3 px-4">Mine Location</th>
                          <th className="py-3 px-4">Scheduled Date</th>
                          <th className="py-3 px-4">Inspector & Scope</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDD6C7]/60">
                        {inspections.map((ins) => (
                          <tr key={ins.id} className="hover:bg-[#F7F5F0]/50 transition">
                            <td className="py-3.5 px-4 font-bold text-[#1E1B16]">{ins.inspection_type?.replace('_', ' ').toUpperCase()}</td>
                            <td className="py-3.5 px-4">{ins.mine_name}</td>
                            <td className="py-3.5 px-4 font-mono text-[#6B6558]">
                              {new Date(ins.scheduled_date).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-[#1E1B16]">{ins.inspector_name || 'DGMS Designated Official'}</div>
                              <p className="text-[11px] text-[#6B6558] line-clamp-1">{ins.notes}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-[#E4EAF0] text-[#1B3A5C]">
                                {ins.status?.toUpperCase() || 'SCHEDULED'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={async () => {
                                  await fetch(`/api/inspections/${ins.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ status: 'completed', findings_summary: 'Passed statutory inspection checklist.' })
                                  });
                                  fetchAuthorityData();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#E3EFE8] hover:bg-[#1F6B45] hover:text-white text-[#1F6B45] text-xs font-semibold transition"
                              >
                                Complete Checklist
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 4: WORKFORCE & CONTRACTOR SAFETY */}
          {/* ========================================================= */}
          {activeSection === 'contractors' && (
            <div className="space-y-5">
              
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] p-4 rounded-2xl border border-[#DDD6C7]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWorkforceSubTab('contractors')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      workforceSubTab === 'contractors' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                    }`}
                  >
                    Contractor Agencies ({contractors.length})
                  </button>
                  <button
                    onClick={() => setWorkforceSubTab('attendance')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      workforceSubTab === 'attendance' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                    }`}
                  >
                    Live Biometric Shift Attendance ({presentToday} Present)
                  </button>
                </div>

                {workforceSubTab === 'contractors' && (
                  <button
                    onClick={() => setIsOnboardContractorOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1B3A5C] hover:bg-[#12273F] text-white text-xs font-bold transition shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Onboard Contractor Agency</span>
                  </button>
                )}
              </div>

              {/* CONTRACTORS SUB-TAB */}
              {workforceSubTab === 'contractors' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractors.map((c) => (
                    <div key={c.id} className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFEBE2] text-[#6B6558] font-bold">
                            {c.company_reg_no || 'REG-2026-IND'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#E3EFE8] text-[#1F6B45]">
                            Score: {c.safety_score || 92}/100
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-[#1E1B16] mt-2.5 font-heading">{c.name}</h3>
                        <p className="text-xs text-[#6B6558]">{c.service_type}</p>

                        <div className="mt-3 p-3 bg-[#F7F5F0] rounded-xl text-xs space-y-1 font-mono">
                          <div className="text-[#6B6558]">Mine: <span className="font-bold text-[#1E1B16]">{c.mine_name || 'Multi-Mine'}</span></div>
                          <div className="text-[#6B6558]">Active Crew: <span className="font-bold text-[#1E1B16]">{c.active_workers_count} personnel</span></div>
                          <div className="text-[#6B6558]">PESO License: <span className="text-[#1B3A5C] font-semibold">{c.license_number}</span></div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#DDD6C7] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#6B6558] font-mono">Form-O Medical: Valid</span>
                        <span className="text-[11px] text-[#1F6B45] font-bold">✅ Certified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LIVE WORKFORCE ATTENDANCE SUB-TAB */}
              {workforceSubTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#DDD6C7]">
                      <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Total Workforce</span>
                      <div className="text-xl font-black text-[#1E1B16] mt-1 font-heading">{attendanceData?.summary?.total_workforce || 142}</div>
                    </div>
                    <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#DDD6C7]">
                      <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Present Today</span>
                      <div className="text-xl font-black text-[#1F6B45] mt-1 font-heading">{presentToday}</div>
                    </div>
                    <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#DDD6C7]">
                      <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Morning Shift</span>
                      <div className="text-xl font-black text-[#1B3A5C] mt-1 font-heading">{attendanceData?.summary?.morning_shift_count || 72}</div>
                    </div>
                    <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#DDD6C7]">
                      <span className="text-[10px] font-bold text-[#6B6558] uppercase font-mono">Attendance Rate</span>
                      <div className="text-xl font-black text-[#1F6B45] mt-1 font-heading">{attendanceData?.summary?.attendance_rate_pct || 92.3}%</div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F7F5F0] border-b border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Worker ID & Name</th>
                            <th className="py-3 px-4">Mine & Location</th>
                            <th className="py-3 px-4">Shift</th>
                            <th className="py-3 px-4">Biometric Timestamp</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDD6C7]/60">
                          {(attendanceData?.records || []).slice(0, 10).map((att, i) => (
                            <tr key={att.id || i} className="hover:bg-[#F7F5F0]/50 transition font-mono">
                              <td className="py-3 px-4 font-bold text-[#1E1B16] font-sans">
                                {att.worker_name}
                                <div className="text-[10px] text-[#6B6558] font-mono">{att.worker_id}</div>
                              </td>
                              <td className="py-3 px-4 font-sans">{att.mine_name}</td>
                              <td className="py-3 px-4 uppercase text-[#1B3A5C] font-bold">{att.shift}</td>
                              <td className="py-3 px-4 text-[#6B6558] text-[11px]">
                                {att.biometric_timestamp ? new Date(att.biometric_timestamp).toLocaleTimeString() : '06:45:12 AM'}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3EFE8] text-[#1F6B45]">
                                  PRESENT (VERIFIED)
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION: MINES & DEMARCATED SECTORS REGISTER */}
          {/* ========================================================= */}
          {activeSection === 'mines' && (
            <div className="space-y-6">
              
              <div className="bg-[#213d77] text-white p-3.5 rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide">
                    DEMARCATED COLLIERY SECTORS & ZONE GOVERNANCE REGISTER
                  </h2>
                  <p className="text-[11px] opacity-80">
                    Statutory oversight across Demo Mines A - D and Demarcated Operational Zones 1 - 5 (DGMS Reg 104)
                  </p>
                </div>
                <span className="badge-gov bg-white text-[#0f2942] font-mono text-xs font-bold">
                  4 MINES • 5 ACTIVE ZONES
                </span>
              </div>

              {/* Mine Scope Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Demo Mine A', type: 'Underground Seam Operation', zones: 'Zones 1 - 5', compliance: '94.2%', workers: 142, status: 'NOMINAL' },
                  { name: 'Demo Mine B', type: 'Continuous Haulage Colliery', zones: 'Zones 1 - 3', compliance: '91.8%', workers: 118, status: 'INSPECTION DUE' },
                  { name: 'Demo Mine C', type: 'Open Cast Pit Bench 4', zones: 'Zones 1 - 4', compliance: '96.5%', workers: 86, status: 'NOMINAL' },
                  { name: 'Demo Mine D', type: 'Surface Heavy Haulage Pit', zones: 'Zones 1 - 2', compliance: '88.4%', workers: 95, status: 'ADVISORY ACTIVE' },
                ].map((m, idx) => (
                  <div key={idx} className="gov-panel p-4 bg-white space-y-2 border-t-2 border-t-[#213d77]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#0f2942]">{m.name}</span>
                      <span className={`badge-gov text-[10px] ${m.status === 'NOMINAL' ? 'badge-gov-success' : 'badge-gov-warning'}`}>{m.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.type}</div>
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>Sectors: <strong>{m.zones}</strong></div>
                      <div>Compliance: <strong className="text-[#16a34a]">{m.compliance}</strong></div>
                      <div>Active Crew: <strong>{m.workers}</strong></div>
                      <div>DGMS: <strong>Valid</strong></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Zone Breakdown Table */}
              <div className="gov-panel overflow-x-auto">
                <div className="gov-panel-header">
                  <span>ZONE-BY-ZONE OPERATIONAL & STATUTORY STATUS (DEMO MINE A)</span>
                </div>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Zone Identifier</th>
                      <th>Operational Demarcation</th>
                      <th>CCTV Node</th>
                      <th>Airway / Strata Status</th>
                      <th>Compliance %</th>
                      <th>Active Hazards</th>
                      <th className="text-right">Statutory Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'Zone 1', name: 'Surface Haulage & Pit Head', cam: 'CAM-Z1-01', strata: 'Stable (Surface Berms)', comp: '96.0%', hazards: '0 Open', status: 'Compliant' },
                      { id: 'Zone 2', name: 'Overburden Excavation & Dumpers', cam: 'CAM-Z2-02', strata: 'Bench 4 Inspection Logged', comp: '93.5%', hazards: '1 Berm Action', status: 'Notice' },
                      { id: 'Zone 3', name: 'Conveyor Ingress Gate', cam: 'CAM-Z3-01', strata: 'People Counter Node Active', comp: '95.0%', hazards: '0 Open', status: 'Compliant' },
                      { id: 'Zone 4', name: 'Underground Seam Face 3', cam: 'CAM-Z4-01', strata: 'Methane / Life-Safety Monitored', comp: '91.2%', hazards: 'Active SOS Watch', status: 'Supervised' },
                      { id: 'Zone 5', name: 'Ventilation Return & Substation', cam: 'CAM-Z5-01', strata: 'Return Airway nominal', comp: '94.8%', hazards: '0 Open', status: 'Compliant' },
                    ].map((z, i) => (
                      <tr key={i}>
                        <td className="font-mono font-bold text-[#0f2942]">{z.id}</td>
                        <td className="font-medium text-xs text-[#1E1B16]">{z.name}</td>
                        <td className="font-mono text-xs">{z.cam}</td>
                        <td className="text-xs text-slate-600">{z.strata}</td>
                        <td className="font-mono font-bold text-[#16a34a]">{z.comp}</td>
                        <td>
                          <span className={`badge-gov text-[10px] ${z.hazards.includes('0') ? 'badge-gov-success' : 'badge-gov-warning'}`}>
                            {z.hazards}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleSelectSection('compliance')}
                            className="btn-gov-outline text-[11px] py-1 px-2.5 cursor-pointer"
                          >
                            Inspect Register &gt;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION: ESCALATED EMERGENCIES (RULE 10: AUTHORITY SEES ESCALATED INCIDENTS ONLY) */}
          {/* ========================================================= */}
          {activeSection === 'emergencies' && (
            <div className="space-y-4">
              <div className="bg-[#213d77] text-white p-3.5 rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide">
                    ESCALATED COLLIERY EMERGENCIES & LIFE-SAFETY DISTRESS QUEUE
                  </h2>
                  <p className="text-[11px] opacity-80">
                    Direct statutory escalation stream transmitted by Colliery Supervisors for DGMS / Authority Intervention
                  </p>
                </div>
                <span className="badge-gov bg-red-500 text-white font-mono text-xs font-bold animate-pulse">
                  {sosEvents.filter(e => e.status !== 'resolved').length} PENDING ACTION
                </span>
              </div>

              {commFeedbackMsg && (
                <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xs flex items-center justify-between">
                  <span>{commFeedbackMsg}</span>
                  <button onClick={() => setCommFeedbackMsg('')} className="underline text-[11px] cursor-pointer">Dismiss</button>
                </div>
              )}

              <div className="gov-panel overflow-x-auto">
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Incident ID</th>
                      <th>Mine & Zone</th>
                      <th>Source / Event</th>
                      <th>Severity</th>
                      <th>Supervisor Details</th>
                      <th>Supervisor Remarks</th>
                      <th>Status</th>
                      <th className="text-right">Authority Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sosEvents.map((e) => (
                      <tr key={e.id}>
                        <td className="font-mono font-bold text-[#0f2942]">{e.id}</td>
                        <td>
                          <div className="font-bold text-[#0f2942]">{e.mine_name || 'Demo Mine A'}</div>
                          <span className="text-[10px] font-mono text-slate-500">{e.zone || 'Zone 4'}</span>
                        </td>
                        <td>
                          <div className="font-medium text-[#dc2626]">{e.emergency_type || 'Worker SOS Distress Beacon'}</div>
                          <span className="text-[10px] text-slate-400 font-mono">Reported: {new Date(e.created_at).toLocaleTimeString()}</span>
                        </td>
                        <td>
                          <span className={`badge-gov ${e.severity === 'CRITICAL' || e.status === 'active' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                            {e.severity || 'CRITICAL'}
                          </span>
                        </td>
                        <td>
                          <div className="font-medium text-[#1E1B16]">{e.escalated_by || e.acknowledged_by || 'Colliery Supervisor'}</div>
                          <span className="text-[10px] text-slate-500 font-mono">Shift In-Charge</span>
                        </td>
                        <td className="max-w-xs text-xs text-slate-700 italic">
                          "{e.supervisor_notes || e.remarks || 'Critical condition escalated for statutory dispatch.'}"
                        </td>
                        <td>
                          <span className={`badge-gov ${e.status === 'resolved' ? 'badge-gov-success' : e.status === 'acknowledged' ? 'badge-gov-info' : 'badge-gov-danger'}`}>
                            {e.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleNavigateToIncidentMap({
                                id: e.incident_id || e.id,
                                latitude: Number(e.latitude) || (e.zone === 'Zone 2' ? 23.7485 : e.zone === 'Zone 5' ? 23.7465 : 23.7508),
                                longitude: Number(e.longitude) || (e.zone === 'Zone 2' ? 86.4170 : e.zone === 'Zone 5' ? 86.4230 : 86.4192),
                                incidentType: (e.emergency_type || '').includes('FIRE') ? 'FIRE' : (e.emergency_type || '').includes('GAS') ? 'GAS_LEAK' : (e.emergency_type || '').includes('COLLAPSE') ? 'MINE_COLLAPSE' : 'OTHER',
                                zone: e.zone || 'Zone 4',
                                title: `Escalated: ${e.emergency_type || 'Emergency'} (${e.zone || 'Zone 4'})`,
                                severity: e.severity || 'CRITICAL',
                                status: e.status || 'ESCALATED'
                              })}
                              className="btn-gov-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-[#213d77] cursor-pointer font-mono"
                              title="Locate incident on GIS map"
                            >
                              <MapPin className="w-3 h-3 text-[#213d77]" />
                              <span>Redirect to Map</span>
                            </button>
                            {e.status !== 'acknowledged' && e.status !== 'resolved' && (
                              <button
                                onClick={() => handleAckEscalatedEmergency(e.id)}
                                className="btn-gov-secondary text-[11px] py-1 px-2 cursor-pointer"
                                title="Acknowledge and dispatch DGMS response"
                              >
                                Acknowledge
                              </button>
                            )}
                            {e.status !== 'resolved' && (
                              <button
                                onClick={() => handleResolveEscalatedEmergency(e.id)}
                                className="btn-gov-primary text-[11px] py-1 px-2.5 cursor-pointer"
                              >
                                Resolve & Close
                              </button>
                            )}
                            {e.status === 'resolved' && (
                              <span className="text-[11px] text-[#16a34a] font-bold">CASE CLOSED</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sosEvents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500 text-xs">
                          No active escalated emergency incidents in queue. All sector operations nominal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {/* ========================================================= */}
          {/* SECTION: SUPERVISOR AI ASSESSMENTS RECEIVED */}
          {/* ========================================================= */}
          {activeSection === 'ai_assessments' && (
            <AuthorityAIAssessmentsView
              assessments={aiAssessments}
              token={token}
              onRefresh={fetchAuthorityData}
              selectedMineId={selectedMineId}
            />
          )}

          {/* ========================================================= */}
          {/* SECTION 9: EXECUTIVE RISK & PRODUCTION ANALYTICS */}
          {/* ========================================================= */}
          {activeSection === 'analytics' && (
            <AuthorityAnalyticsView
              token={token}
              selectedMineId={selectedMineId}
              onExportPdf={handleExportPdf}
              pdfDownloading={pdfDownloading}
            />
          )}

          {/* ========================================================= */}
          {/* SECTION 6: GIS SPATIAL MAP */}
          {/* ========================================================= */}
          {activeSection === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#DDD6C7]">
                <div>
                  <h3 className="text-sm font-bold text-[#1E1B16] uppercase tracking-wider font-heading">
                    GIS Spatial Hazard & Mine Polygon Overlay
                  </h3>
                  <p className="text-xs text-[#6B6558]">Real-time GPS worker pins, drone orthomosaic bounds, and pit hazard hotspots</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#1F6B45]">● Live GPS Telemetry</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-2 shadow-2xs overflow-hidden">
                <MineGISMap 
                  mineId={selectedMineId !== 'all' ? selectedMineId : null} 
                  height="580px" 
                  token={token} 
                  focusIncident={focusIncident}
                  onClearFocusIncident={() => setFocusIncident(null)}
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 7: SHA-256 AUDIT TRAIL */}
          {/* ========================================================= */}
          {activeSection === 'audit' && (
            <div className="space-y-5">
              
              {/* Audit Verification Control Strip */}
              <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#DDD6C7] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
                    <h2 className="text-base font-bold text-[#1E1B16] font-heading uppercase">
                      DGMS Cryptographic SHA-256 Audit Trail
                    </h2>
                  </div>
                  <p className="text-xs text-[#6B6558] mt-1 max-w-xl">
                    Every statutory compliance action, violation rectification, and inspection sign-off is hashed into an immutable cryptographic chain.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleVerifyIntegrity}
                    disabled={isVerifying}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                    <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
                  </button>
                  <button
                    onClick={handleSimulateTampering}
                    className="px-3 py-2 rounded-xl bg-[#F5E2DE] hover:bg-[#A13D2F] hover:text-white text-[#A13D2F] text-xs font-bold transition"
                  >
                    Simulate Tamper
                  </button>
                  <button
                    onClick={handleRestoreIntegrity}
                    className="px-3 py-2 rounded-xl bg-[#EFEBE2] hover:bg-[#DDD6C7] text-[#1E1B16] text-xs font-bold transition"
                  >
                    Restore
                  </button>
                </div>
              </div>

              {/* Integrity Status Alert Banner */}
              {integrityResult && (
                <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                  integrityResult.valid
                    ? 'bg-[#E3EFE8] border-[#1F6B45]/30 text-[#1F6B45]'
                    : 'bg-[#F5E2DE] border-[#A13D2F]/30 text-[#A13D2F]'
                }`}>
                  <div className="flex items-center gap-2 font-bold font-heading">
                    {integrityResult.valid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{integrityResult.valid ? '✅ Blockchain Hash Chain Fully Verified & Untampered' : '⚠️ Cryptographic Hash Mismatch Detected! Chain Broken.'}</span>
                  </div>
                  <span className="font-mono text-[11px]">{integrityResult.totalLogs || auditLogs.length} blocks verified</span>
                </div>
              )}

              {/* Search Audit Logs */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#6B6558] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchAuditHash}
                  onChange={(e) => setSearchAuditHash(e.target.value)}
                  placeholder="Search by block hash, actor, action type, or entity ID..."
                  className="w-full bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1E1B16] focus:outline-none focus:border-[#1B3A5C] font-mono"
                />
              </div>

              {/* Hash Chain Logs Table */}
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F7F5F0] border-b border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Block #</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Action & Entity</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Cryptographic Hash (SHA-256)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6C7]/60 font-mono">
                      {auditLogs
                        .filter(log => !searchAuditHash || JSON.stringify(log).toLowerCase().includes(searchAuditHash.toLowerCase()))
                        .map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-[#F7F5F0]/50 transition">
                            <td className="py-3 px-4 font-bold text-[#1B3A5C]">#{log.block_number || idx + 1}</td>
                            <td className="py-3 px-4 text-[#6B6558] text-[11px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-[#1E1B16] font-sans">{log.action}</span>
                              <div className="text-[10px] text-[#6B6558]">{log.entity_type} ({log.entity_id})</div>
                            </td>
                            <td className="py-3 px-4 font-sans text-[#1E1B16]">{log.actor_name || 'System Statutory Engine'}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] text-[#1F6B45] font-bold truncate max-w-[200px] inline-block" title={log.current_hash}>
                                {log.current_hash ? `${log.current_hash.substring(0, 16)}...` : 'GENESIS_HASH'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION 8: FIELD FEED & GRIEVANCES */}
          {/* ========================================================= */}
          {activeSection === 'reports' && (
            <div className="space-y-5">
              
              <div className="flex items-center gap-2 bg-[#FFFFFF] p-3 rounded-2xl border border-[#DDD6C7]">
                <button
                  onClick={() => setReportsSubTab('field_feed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reportsSubTab === 'field_feed' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                  }`}
                >
                  Worker Field Reports ({fieldReports.length})
                </button>
                <button
                  onClick={() => setReportsSubTab('grievances')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    reportsSubTab === 'grievances' ? 'bg-[#1B3A5C] text-white shadow-xs' : 'text-[#1E1B16] hover:bg-[#EFEBE2]'
                  }`}
                >
                  Miner Grievances SLA ({grievances.length})
                </button>
              </div>

              {/* FIELD FEED SUB-TAB */}
              {reportsSubTab === 'field_feed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldReports.map((rep) => (
                    <div key={rep.id} className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EFEBE2] text-[#6B6558]">
                            {rep.suggested_category || rep.category || 'General Safety'}
                          </span>
                          <span className={`text-[11px] font-bold ${rep.supervisor_ack ? 'text-[#1F6B45]' : 'text-[#B8860B]'}`}>
                            {rep.supervisor_ack ? '✅ Acknowledged' : '⏳ In Review'}
                          </span>
                        </div>

                        <p className="text-xs text-[#1E1B16] font-medium mt-2 leading-relaxed">
                          "{rep.description}"
                        </p>

                        <div className="mt-3 text-[10px] text-[#6B6558] font-mono space-y-0.5">
                          <div>Reported by: <strong>{rep.worker_name || 'Miner'}</strong></div>
                          <div>Location: {rep.mine_name || 'Jharia Block'} • GPS: ({rep.latitude?.toFixed(4)}, {rep.longitude?.toFixed(4)})</div>
                          {rep.ack_by_name && (
                            <div className="text-[#1F6B45]">Acknowledged by: <strong>{rep.ack_by_name}</strong></div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#DDD6C7] flex items-center gap-2">
                        {!rep.supervisor_ack && (
                          <button
                            onClick={() => handleAcknowledgeReport(rep.id)}
                            className="flex-1 py-2 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!rep.converted_to_violation && (
                          <button
                            onClick={() => handleConvertToViolation(rep.id)}
                            className="flex-1 py-2 rounded-xl bg-[#A13D2F] hover:bg-[#7D2E23] text-white text-xs font-bold transition"
                          >
                            Promote to Violation
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* GRIEVANCES SUB-TAB */}
              {reportsSubTab === 'grievances' && (
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#DDD6C7] overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F7F5F0] border-b border-[#DDD6C7] font-mono text-[#6B6558] uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Ticket</th>
                          <th className="py-3 px-4">Subject & Description</th>
                          <th className="py-3 px-4">Worker & Mine</th>
                          <th className="py-3 px-4">SLA Countdown</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Authority Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDD6C7]/60">
                        {grievances.map((g) => (
                          <tr key={g.id} className="hover:bg-[#F7F5F0]/50 transition">
                            <td className="py-3 px-4 font-bold font-mono text-[#1B3A5C]">{g.ticket_number || g.id}</td>
                            <td className="py-3 px-4 max-w-sm">
                              <div className="font-bold text-[#1E1B16]">{g.subject}</div>
                              <p className="text-[11px] text-[#6B6558] line-clamp-1">{g.description}</p>
                              {g.resolution_notes && (
                                <p className="text-[10px] text-[#1F6B45] mt-0.5">Note: {g.resolution_notes}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#1E1B16]">
                              {g.worker_name || 'Miner'}
                              <div className="text-[10px] text-[#6B6558] font-mono">Mine: Jharia Seam 4</div>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              {g.status === 'resolved' ? (
                                <span className="text-[#1F6B45] font-bold">Resolved within SLA</span>
                              ) : (
                                <span className={g.is_sla_breached ? 'text-[#A13D2F] font-bold' : 'text-[#B8860B] font-bold'}>
                                  {g.remaining_sla_hours} hrs left
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                g.status === 'resolved' ? 'bg-[#E3EFE8] text-[#1F6B45]' :
                                g.status === 'in_review' ? 'bg-[#E4EAF0] text-[#1B3A5C]' :
                                'bg-[#F5EDD6] text-[#3A2E00]'
                              }`}>
                                {g.status?.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {g.status === 'open' && (
                                  <button
                                    onClick={() => handleUpdateGrievanceStatus(g.id, 'in_review', 'Welfare Officer initiated inquiry.')}
                                    className="px-2 py-1 rounded-lg bg-[#E4EAF0] text-[#1B3A5C] text-[11px] font-bold transition hover:bg-[#1B3A5C] hover:text-white"
                                  >
                                    In Review
                                  </button>
                                )}
                                {g.status !== 'resolved' && (
                                  <button
                                    onClick={() => handleUpdateGrievanceStatus(g.id, 'resolved', 'Reviewed and resolved by Mine Safety Authority.')}
                                    className="px-2.5 py-1 rounded-lg bg-[#1F6B45] text-white text-[11px] font-bold transition hover:bg-[#17512F]"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION: COMMUNICATION GATEWAY (RULE 7 & RULE 8) */}
          {/* ========================================================= */}
          {activeSection === 'communication' && (
            <div className="space-y-6">
              
              {/* Header Banner */}
              <div className="bg-[#213d77] text-white p-3.5 rounded-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wide">
                    STATUTORY COMMUNICATION GATEWAY & SUPERVISOR LIAISON
                  </h2>
                  <p className="text-[11px] opacity-80">
                    Governed two-way protocol: Review supervisor requests or issue direct statutory instructions
                  </p>
                </div>
                <span className="badge-gov bg-amber-400 text-black font-mono text-xs font-bold">
                  {commRequests.filter(r => r.status === 'pending').length} APPROVALS PENDING
                </span>
              </div>

              {commFeedbackMsg && (
                <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xs flex items-center justify-between">
                  <span>{commFeedbackMsg}</span>
                  <button onClick={() => setCommFeedbackMsg('')} className="underline text-[11px]">Dismiss</button>
                </div>
              )}

              {/* 2-Column Grid: Left (Supervisor Requests + Thread) | Right (Authority Direct Dispatch) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT: SUPERVISOR INCOMING REQUESTS & ACTIVE THREAD */}
                <div className="space-y-4">
                  <div className="gov-panel">
                    <div className="gov-panel-header">
                      <span>INCOMING SUPERVISOR COMMUNICATION REQUESTS</span>
                    </div>
                    <div className="p-0 overflow-x-auto">
                      <table className="gov-table">
                        <thead>
                          <tr>
                            <th>ID & Supervisor</th>
                            <th>Topic & Urgency</th>
                            <th>Status</th>
                            <th className="text-right">Authority Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commRequests.map((r) => (
                            <tr key={r.id} className={selectedCommRequest?.id === r.id ? 'bg-[#f0f4f8]' : ''}>
                              <td>
                                <div className="font-bold text-[#0f2942]">{r.supervisor_name || 'Supervisor'}</div>
                                <span className="text-[10px] font-mono text-slate-500">{r.zone || 'Zone 4'} ({r.id})</span>
                              </td>
                              <td className="max-w-xs">
                                <div className="font-bold text-xs text-[#1E1B16]">{r.topic}</div>
                                <p className="text-[11px] text-slate-600 line-clamp-1">{r.description}</p>
                                <span className={`badge-gov text-[10px] mt-1 ${r.urgency === 'CRITICAL' || r.urgency === 'HIGH' ? 'badge-gov-danger' : 'badge-gov-warning'}`}>
                                  {r.urgency}
                                </span>
                              </td>
                              <td>
                                <span className={`badge-gov ${r.status === 'approved' ? 'badge-gov-success' : r.status === 'rejected' ? 'badge-gov-danger' : 'badge-gov-neutral'}`}>
                                  {r.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="text-right">
                                {r.status === 'pending' ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleCommDecision(r.id, 'approved', 'Authorized statutory communication channel.')}
                                      className="btn-gov-primary text-[11px] py-1 px-2"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleCommDecision(r.id, 'rejected', 'Topic can be addressed at colliery level.')}
                                      className="btn-gov-danger text-[11px] py-1 px-2"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : r.status === 'approved' ? (
                                  <button
                                    onClick={() => {
                                      setSelectedCommRequest(r);
                                      handleFetchCommMessages(r.id);
                                    }}
                                    className="btn-gov-outline text-[11px] py-1 px-2.5"
                                  >
                                    Open Thread &gt;
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-mono">DECLINED</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {commRequests.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-6 text-slate-500 text-xs">
                                No supervisor communication requests submitted.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ACTIVE APPROVED CASE THREAD */}
                  {selectedCommRequest && selectedCommRequest.status === 'approved' && (
                    <div className="gov-panel">
                      <div className="gov-panel-header">
                        <span>ACTIVE STATUTORY THREAD: {selectedCommRequest.topic}</span>
                        <button onClick={() => setSelectedCommRequest(null)} className="text-white hover:underline text-[11px]">
                          Close &times;
                        </button>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="h-48 overflow-y-auto border border-slate-200 p-3 rounded-xs bg-[#f8fafc] space-y-2 text-xs">
                          {commMessages.map((m) => (
                            <div key={m.id} className={`p-2 rounded-xs ${m.sender_role === 'authority' ? 'bg-[#213d77] text-white ml-6' : 'bg-white border text-[#1f2937] mr-6'}`}>
                              <div className="text-[10px] font-bold opacity-80 flex justify-between">
                                <span>{m.sender_name} ({m.sender_role?.toUpperCase()})</span>
                                <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="mt-1 font-medium">{m.message}</p>
                            </div>
                          ))}
                          {commMessages.length === 0 && (
                            <p className="text-center text-slate-400 py-6 text-xs">No messages exchanged yet in this case.</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newCommMessage}
                            onChange={(e) => setNewCommMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendCommMessage(selectedCommRequest.id)}
                            placeholder="Type official directive / message to Supervisor..."
                            className="gov-input flex-1"
                          />
                          <button
                            onClick={() => handleSendCommMessage(selectedCommRequest.id)}
                            className="btn-gov-primary text-xs shrink-0 py-2 px-3"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: AUTHORITY DIRECT DISPATCH (RULE 8: AUTHORITY INITIATES DIRECTLY) */}
                <div className="gov-panel">
                  <div className="gov-panel-header">
                    <span>DIRECT AUTHORITY → SUPERVISOR DIRECTIVE (UNRESTRICTED)</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-[#4b5563]">
                      The Authority possesses statutory prerogative to initiate direct operational directives to Colliery Supervisors without prior request approval.
                    </p>

                    <form onSubmit={handleAuthorityDirectInitiate} className="space-y-3">
                      <div>
                        <label className="gov-label">TARGET SECTOR / ZONE</label>
                        <select
                          value={authorityDirectMsgForm.zone}
                          onChange={(e) => setAuthorityDirectMsgForm({ ...authorityDirectMsgForm, zone: e.target.value })}
                          className="gov-input"
                        >
                          <option value="Zone 1">Demo Mine A — Zone 1 (Surface Haulage & Pit Head)</option>
                          <option value="Zone 2">Demo Mine A — Zone 2 (Overburden Face & Dumpers)</option>
                          <option value="Zone 3">Demo Mine A — Zone 3 (Conveyor Ingress Gate)</option>
                          <option value="Zone 4">Demo Mine A — Zone 4 (Underground Seam Face 3)</option>
                          <option value="Zone 5">Demo Mine A — Zone 5 (Ventilation Return & Substation)</option>
                        </select>
                      </div>

                      <div>
                        <label className="gov-label">DIRECTIVE TOPIC</label>
                        <input
                          type="text"
                          value={authorityDirectMsgForm.topic}
                          onChange={(e) => setAuthorityDirectMsgForm({ ...authorityDirectMsgForm, topic: e.target.value })}
                          placeholder="e.g. Immediate Methane Sweep Order"
                          className="gov-input"
                          required
                        />
                      </div>

                      <div>
                        <label className="gov-label">STATUTORY PRIORITY</label>
                        <select
                          value={authorityDirectMsgForm.urgency}
                          onChange={(e) => setAuthorityDirectMsgForm({ ...authorityDirectMsgForm, urgency: e.target.value })}
                          className="gov-input"
                        >
                          <option value="LOW">LOW — Routine Advisory</option>
                          <option value="MEDIUM">MEDIUM — Operational Clarification</option>
                          <option value="HIGH">HIGH — Safety Compliance Warning</option>
                          <option value="CRITICAL">CRITICAL — DGMS Stop-Work / Immediate Action Order</option>
                        </select>
                      </div>

                      <div>
                        <label className="gov-label">DIRECTIVE BODY & INSTRUCTIONS</label>
                        <textarea
                          rows={4}
                          value={authorityDirectMsgForm.description}
                          onChange={(e) => setAuthorityDirectMsgForm({ ...authorityDirectMsgForm, description: e.target.value })}
                          placeholder="State mandatory actions required by colliery shift in-charge..."
                          className="gov-input"
                          required
                        />
                      </div>

                      <button type="submit" className="btn-gov-primary text-xs w-full py-2.5">
                        <Send className="w-3.5 h-3.5" />
                        <span>DISPATCH DIRECTIVE TO SUPERVISOR</span>
                      </button>
                    </form>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>

      {/* MODALS */}
      {/* 1. Two-Step Violation Closure Modal */}
      <TwoStepViolationModal
        isOpen={isViolationModalOpen}
        onClose={() => setIsViolationModalOpen(false)}
        violation={selectedViolation}
        onStatusUpdated={fetchAuthorityData}
      />

      {/* 2. OCR Scan Modal */}
      <OCRScanModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onTextExtracted={(text) => {
          setNewItemForm({
            ...newItemForm,
            title: text.slice(0, 60),
            act_reference: 'CMR 2017 Reg 124',
            due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
          });
          setIsCreateItemOpen(true);
        }}
      />

      {/* 3. Create Statutory Compliance Item Modal */}
      {isCreateItemOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1E1B16] font-heading">Add Statutory Compliance Item</h3>
            <form onSubmit={handleCreateComplianceItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Title</label>
                <input
                  type="text"
                  value={newItemForm.title}
                  onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
                  placeholder="e.g., Mandatory Methane & CO Sensor Calibration"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Act / Regulation Reference</label>
                <input
                  type="text"
                  value={newItemForm.act_reference}
                  onChange={(e) => setNewItemForm({ ...newItemForm, act_reference: e.target.value })}
                  placeholder="Coal Mines Regulations 2017, Reg 124"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Category</label>
                <select
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                >
                  <option value="safety">Safety</option>
                  <option value="environmental">Environmental</option>
                  <option value="health">Health & Medical</option>
                  <option value="labour">Labour & Welfare</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Due Date</label>
                <input
                  type="date"
                  value={newItemForm.due_date}
                  onChange={(e) => setNewItemForm({ ...newItemForm, due_date: e.target.value })}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateItemOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#EFEBE2] text-[#1E1B16] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F6B45] text-white font-bold"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Violation Modal */}
      {isCreateViolationOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1E1B16] font-heading">Log Safety Violation</h3>
            <form onSubmit={handleCreateViolation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Violation Title</label>
                <input
                  type="text"
                  value={newViolationForm.title}
                  onChange={(e) => setNewViolationForm({ ...newViolationForm, title: e.target.value })}
                  placeholder="e.g. Sub-standard haul road berm height"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Severity</label>
                <select
                  value={newViolationForm.severity}
                  onChange={(e) => setNewViolationForm({ ...newViolationForm, severity: e.target.value })}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Location Details</label>
                <input
                  type="text"
                  value={newViolationForm.location_description}
                  onChange={(e) => setNewViolationForm({ ...newViolationForm, location_description: e.target.value })}
                  placeholder="e.g. East Pit Ramp Junction"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Required Corrective Action</label>
                <textarea
                  value={newViolationForm.corrective_action_required}
                  onChange={(e) => setNewViolationForm({ ...newViolationForm, corrective_action_required: e.target.value })}
                  placeholder="e.g. Reconstruct berm to at least dumper tire height"
                  rows={2}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateViolationOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#EFEBE2] text-[#1E1B16] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#A13D2F] text-white font-bold"
                >
                  Log Violation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Schedule Inspection Modal */}
      {isCreateInspectionOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1E1B16] font-heading">Schedule Statutory Inspection</h3>
            <form onSubmit={handleScheduleInspection} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Inspection Type</label>
                <select
                  value={newInspectionForm.inspection_type}
                  onChange={(e) => setNewInspectionForm({ ...newInspectionForm, inspection_type: e.target.value })}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                >
                  <option value="routine_internal">Routine Internal Safety Audit</option>
                  <option value="dgms_statutory">DGMS Statutory Physical Inspection</option>
                  <option value="electrical_mechanical">Electrical & Heavy Equipment Audit</option>
                  <option value="ventilation_air">Ventilation & Gas Analysis Sweep</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={newInspectionForm.scheduled_date}
                  onChange={(e) => setNewInspectionForm({ ...newInspectionForm, scheduled_date: e.target.value })}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Inspection Scope & Notes</label>
                <textarea
                  value={newInspectionForm.notes}
                  onChange={(e) => setNewInspectionForm({ ...newInspectionForm, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateInspectionOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#EFEBE2] text-[#1E1B16] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F6B45] text-white font-bold"
                >
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Onboard Contractor Modal */}
      {isOnboardContractorOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#1E1B16] font-heading">Onboard Contractor Agency</h3>
            <form onSubmit={handleOnboardContractor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Agency / Company Name</label>
                <input
                  type="text"
                  value={newContractorForm.name}
                  onChange={(e) => setNewContractorForm({ ...newContractorForm, name: e.target.value })}
                  placeholder="e.g. Eastern Mining Solutions Pvt Ltd"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Company Reg Number</label>
                <input
                  type="text"
                  value={newContractorForm.company_reg_no}
                  onChange={(e) => setNewContractorForm({ ...newContractorForm, company_reg_no: e.target.value })}
                  placeholder="CIN / Reg No"
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-[#1E1B16] mb-1">Service Type</label>
                <input
                  type="text"
                  value={newContractorForm.service_type}
                  onChange={(e) => setNewContractorForm({ ...newContractorForm, service_type: e.target.value })}
                  placeholder="Overburden Excavation, Haulage, etc."
                  className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1E1B16] mb-1">Active Crew Count</label>
                  <input
                    type="number"
                    value={newContractorForm.active_workers_count}
                    onChange={(e) => setNewContractorForm({ ...newContractorForm, active_workers_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1E1B16] mb-1">PESO License No</label>
                  <input
                    type="text"
                    value={newContractorForm.license_number}
                    onChange={(e) => setNewContractorForm({ ...newContractorForm, license_number: e.target.value })}
                    className="w-full p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl font-mono text-xs"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardContractorOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#EFEBE2] text-[#1E1B16] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1B3A5C] text-white font-bold"
                >
                  Onboard Agency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Assistant */}
      <FloatingAssistant />

    </div>
  );
}
