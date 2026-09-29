import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CoalGuardEmblem, MiningHelmetIcon } from '../components/common/MiningIcons';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Mail, 
  Sparkles,
  AlertCircle,
  Video,
  FileSpreadsheet,
  Layers,
  Scale,
  Activity,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function Login() {
  const { loginWithCredentials, quickSwitchRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState('normal');

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentDateTime(`${day}-${month}-${year} [${hours}:${minutes}:${seconds}]`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFontSize = (level) => {
    setFontSizeLevel(level);
    if (level === 'small') {
      document.documentElement.style.fontSize = '14px';
    } else if (level === 'large') {
      document.documentElement.style.fontSize = '17px';
    } else {
      document.documentElement.style.fontSize = '15px';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithCredentials(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setLoading(true);
    setError('');
    try {
      await quickSwitchRole(role);
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#1f2937] flex flex-col justify-between">
      
      {/* 1. TOP STATUTORY META BAR */}
      <div className="bg-[#f8fafc] border-b border-[#d1d5db] px-2 sm:px-4 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#475569]">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-bold text-[#0f2942] uppercase tracking-wide">
            GOVERNMENT OF INDIA
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-700">
            MINISTRY OF COAL • DGMS
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="font-mono text-[11px] font-semibold text-[#1e293b] hidden md:block">
            {currentDateTime}
          </div>

          <span className="text-slate-300 hidden md:inline">|</span>

          {/* Accessibility Font Size Controls */}
          <div className="flex items-center gap-1 font-bold text-xs">
            <button 
              onClick={() => handleFontSize('small')}
              className={`px-1.5 py-0.5 hover:bg-slate-200 rounded-xs transition cursor-pointer ${fontSizeLevel === 'small' ? 'bg-[#213d77] text-white' : 'text-[#334155]'}`}
              title="Decrease Font Size"
            >
              A-
            </button>
            <button 
              onClick={() => handleFontSize('normal')}
              className={`px-1.5 py-0.5 hover:bg-slate-200 rounded-xs transition cursor-pointer ${fontSizeLevel === 'normal' ? 'bg-[#213d77] text-white' : 'text-[#334155]'}`}
              title="Normal Font Size"
            >
              A
            </button>
            <button 
              onClick={() => handleFontSize('large')}
              className={`px-1.5 py-0.5 hover:bg-slate-200 rounded-xs transition cursor-pointer ${fontSizeLevel === 'large' ? 'bg-[#213d77] text-white' : 'text-[#334155]'}`}
              title="Increase Font Size"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BRANDING */}
      <header className="px-2 sm:px-4 lg:px-8 py-2.5 sm:py-3 bg-white border-b border-[#d1d5db] shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden shrink-0 flex items-center justify-center border border-slate-200 bg-white shadow-2xs">
              <CoalGuardEmblem className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-[#0f2942] tracking-tight uppercase truncate">
                CoalGuard
              </h1>
              <p className="text-[11px] sm:text-xs text-[#4b5563] font-medium line-clamp-1 sm:line-clamp-none">
                Smart Governance & Statutory Compliance Platform for Coal Mines
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#fef3c7] border border-[#fcd34d] text-[#92400e] text-xs font-bold rounded-xs shrink-0">
            <Sparkles className="w-4 h-4 text-[#d97706]" />
            <span>Demonstration / Prototype Environment</span>
          </div>
        </div>
      </header>

      {/* 3. MAIN PORTAL BODY */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6">
        
        {/* Notice Banner */}
        <div className="bg-[#e0f2fe] border border-[#7dd3fc] p-2.5 sm:p-3 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#0369a1]">
          <div className="flex items-center gap-2">
            <span className="bg-[#0284c7] text-white px-2 py-0.5 rounded-xs font-bold text-[10px] uppercase shrink-0">
              STATUTORY NOTICE
            </span>
            <span className="font-medium text-slate-800">
              DGMS Digital Mine Safety Registry & Compliance Verification System • Zone 1 - Zone 5 Online.
            </span>
          </div>
          <span className="hidden md:inline font-bold text-[#0284c7] shrink-0">CMR 2017 & Mines Act 1952 Compliant</span>
        </div>

        {/* 2-Column Main Login Layout: Left = Official Credentials Form, Right = 3 Dedicated Role Portals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Column: Official Authentication Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>OFFICIAL PORTAL SIGN-IN</span>
                <span className="text-[11px] font-mono font-normal opacity-80">FORM-AUTH-01</span>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                <p className="text-xs text-[#4b5563]">
                  Authorized colliery personnel and DGMS statutory officers may enter government credentials below.
                </p>

                {error && (
                  <div className="p-3 bg-[#fee2e2] border border-[#fca5a5] text-xs text-[#991b1b] rounded-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#dc2626] shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="gov-label">GOVERNMENT EMAIL / EMPLOYEE ID</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="officer@coalguard.gov.in"
                        className="gov-input !pl-10"
                        style={{ paddingLeft: '2.5rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gov-label">PASSWORD / PIN</label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="gov-input !pl-10"
                        style={{ paddingLeft: '2.5rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-gov-primary w-full py-2.5 text-xs shadow-xs"
                    >
                      <span>{loading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN TO COALGUARD PORTAL'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                <div className="pt-3 border-t border-slate-200 text-[11px] text-[#64748b] leading-relaxed">
                  <div className="font-bold text-[#0f2942] mb-1">DEMONSTRATION ACCESS NOTE:</div>
                  Use the three dedicated access panels on the right for immediate role-based inspection.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3 DEDICATED ROLE ACCESS PANELS (7 Cols) */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4">
            
            <div className="bg-[#213d77] text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xs font-bold text-xs uppercase tracking-wide flex items-center justify-between">
              <span>SELECT STATUTORY ACCESS ROLE</span>
              <span className="text-[11px] font-mono font-normal opacity-90">3 ROLE DEMARCATION</span>
            </div>

            {/* ROLE 1: MINER PORTAL */}
            <div 
              onClick={() => handleQuickLogin('miner')}
              className="gov-panel border-l-4 border-l-[#fb792b] hover:shadow-md hover:border-[#fb792b] cursor-pointer transition-all duration-150 group"
            >
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#fb792b]/10 text-[#fb792b] rounded-xs group-hover:scale-105 transition-transform shrink-0">
                      <MiningHelmetIcon className="w-5 h-5" color="#fb792b" />
                    </span>
                    <h3 className="font-bold text-sm text-[#0f2942] uppercase group-hover:text-[#fb792b] transition-colors">
                      1. MINER PORTAL
                    </h3>
                    <span className="badge-gov badge-gov-neutral">Field Worker</span>
                  </div>
                  <p className="text-xs text-[#4b5563] pl-0 sm:pl-8">
                    Access for mine workers • Field reporting, Ask Supervisor, Safety notices, Biometric check-in, SOS distress beacon.
                  </p>
                  <div className="text-[11px] text-slate-500 pl-0 sm:pl-8 font-mono">
                    Restricted: No access to CCTV, AI models, or Authority governance controls.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleQuickLogin('miner'); }}
                  disabled={loading}
                  className="btn-gov-primary text-xs w-full sm:w-auto shrink-0 py-2 px-4 cursor-pointer pointer-events-auto"
                >
                  <span>ENTER MINER PORTAL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROLE 2: SUPERVISOR CONTROL PANEL */}
            <div 
              onClick={() => handleQuickLogin('supervisor')}
              className="gov-panel border-l-4 border-l-[#213d77] hover:shadow-md hover:border-[#213d77] cursor-pointer transition-all duration-150 group"
            >
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#213d77]/10 text-[#213d77] rounded-xs group-hover:scale-105 transition-transform shrink-0">
                      <Video className="w-5 h-5 text-[#213d77]" />
                    </span>
                    <h3 className="font-bold text-sm text-[#0f2942] uppercase group-hover:text-[#213d77] transition-colors">
                      2. SUPERVISOR CONTROL PANEL
                    </h3>
                    <span className="badge-gov badge-gov-warning">Operational Bridge</span>
                  </div>
                  <p className="text-xs text-[#4b5563] pl-0 sm:pl-8">
                    Operational command • Mine & Zone 4 oversight, Camera CCTV, MineSign gestural verification, Field Reports, Emergency dispatch & escalation.
                  </p>
                  <div className="text-[11px] text-slate-500 pl-0 sm:pl-8 font-mono">
                    The Bridge: Miner ↔ Supervisor ↔ Authority.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleQuickLogin('supervisor'); }}
                  disabled={loading}
                  className="btn-gov-secondary text-xs w-full sm:w-auto shrink-0 py-2 px-4 cursor-pointer pointer-events-auto"
                >
                  <span>ENTER SUPERVISOR PANEL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ROLE 3: AUTHORITY GOVERNANCE PORTAL */}
            <div 
              onClick={() => handleQuickLogin('authority')}
              className="gov-panel border-l-4 border-l-[#0f2942] hover:shadow-md hover:border-[#0f2942] cursor-pointer transition-all duration-150 group"
            >
              <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#0f2942]/10 text-[#0f2942] rounded-xs group-hover:scale-105 transition-transform shrink-0">
                      <Building2 className="w-5 h-5 text-[#0f2942]" />
                    </span>
                    <h3 className="font-bold text-sm text-[#0f2942] uppercase group-hover:text-[#0f2942] transition-colors">
                      3. AUTHORITY GOVERNANCE PORTAL
                    </h3>
                    <span className="badge-gov badge-gov-info">Statutory Oversight</span>
                  </div>
                  <p className="text-xs text-[#4b5563] pl-0 sm:pl-8">
                    Governance & Statutory Compliance • Multi-zone monitoring, Escalated emergencies, Camera AI surveillance, Analytics, and Immutable Audit logs.
                  </p>
                  <div className="text-[11px] text-slate-500 pl-0 sm:pl-8 font-mono">
                    Focus: Strategic oversight without operational noise.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleQuickLogin('authority'); }}
                  disabled={loading}
                  className="btn-gov-outline text-xs w-full sm:w-auto shrink-0 py-2 px-4 border-[#0f2942] text-[#0f2942] font-bold hover:bg-[#0f2942] hover:text-white cursor-pointer pointer-events-auto"
                >
                  <span>ENTER AUTHORITY PORTAL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 4. GOVERNMENT FOOTER */}
      <footer className="bg-white border-t border-[#d1d5db] py-3 sm:py-4 px-2 sm:px-4 lg:px-8 text-xs text-[#64748b]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 text-center sm:text-left">
          <div>
            <span className="font-bold text-[#0f2942]">CoalGuard Smart Governance Platform</span> • Directorate General of Mines Safety & Ministry of Coal
          </div>
          <div className="font-mono text-[11px]">
            Designed as statutory prototype compliance portal • Smart India Hackathon 2026
          </div>
        </div>
      </footer>

    </div>
  );
}
