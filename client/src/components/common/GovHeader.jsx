import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Users, 
  Video, 
  Camera, 
  Sparkles, 
  AlertTriangle, 
  FileText, 
  HelpCircle, 
  ShieldCheck, 
  Map as MapIcon, 
  Activity, 
  Bell, 
  LogOut, 
  Globe, 
  Layers, 
  Clock, 
  MessageSquare, 
  History, 
  CheckSquare, 
  ChevronRight,
  Shield,
  Zap,
  Flame,
  FileSpreadsheet,
  PhoneCall,
  MapPin
} from 'lucide-react';
import { CoalGuardEmblem, MiningHelmetIcon } from './MiningIcons';

export default function GovHeader({ activeTab, onSelectTab, customNavItems, sectionNotifications = {}, onNavigateToMap }) {
  const { user, logout, lang, toggleLanguage, notifications } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [fontSizeLevel, setFontSizeLevel] = useState('normal'); // 'small' | 'normal' | 'large'
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Live Clock matching IRCTC top header: DD-MMM-YYYY [HH:MM:SS]
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

  useEffect(() => {
    if (notifications) {
      setUnreadCount(notifications.filter(n => !n.is_read).length);
    }
  }, [notifications]);

  // Handle font size change on root
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

  // Role Default Navigation Bars
  const getNavItems = () => {
    let items = [];
    if (customNavItems) {
      items = customNavItems;
    } else if (user?.role === 'miner') {
      items = [
        { id: 'home', label: 'HOME', icon: Building2 },
        { id: 'gestures', label: 'CAMERA GESTURES', icon: Camera },
        { id: 'my_reports', label: 'MY REPORTS', icon: FileText },
        { id: 'ask_supervisor', label: 'ASK SUPERVISOR', icon: MessageSquare },
        { id: 'safety', label: 'SAFETY NOTICES', icon: ShieldCheck },
        { id: 'notifications', label: 'NOTIFICATIONS', icon: Bell, badge: unreadCount },
        { id: 'profile', label: 'MY PROFILE', icon: Users },
        { id: 'sos', label: 'SOS / DISTRESS', icon: PhoneCall, badge: 'SOS' }
      ];
    } else if (user?.role === 'supervisor') {
      items = [
        { id: 'overview', label: 'HOME / OVERVIEW', icon: Building2 },
        { id: 'cameras', label: 'CAMERAS', icon: Video },
        { id: 'gestures', label: 'CAMERA GESTURES', icon: Camera },
        { id: 'models', label: 'AI MODELS', icon: Sparkles },
        { id: 'emergencies', label: 'EMERGENCIES', icon: Flame },
        { id: 'field_reports', label: 'FIELD REPORTS', icon: FileSpreadsheet },
        { id: 'compliance', label: 'COMPLIANCE', icon: ShieldCheck },
        { id: 'map', label: 'MAP', icon: MapIcon },
        { id: 'communication', label: 'COMMUNICATION', icon: MessageSquare },
        { id: 'updates', label: 'UPDATES', icon: Bell }
      ];
    } else {
      // Default: Authority Portal
      items = [
        { id: 'overview', label: 'HOME', icon: Building2 },
        { id: 'mines', label: 'MINES', icon: Layers },
        { id: 'compliance', label: 'COMPLIANCE', icon: ShieldCheck },
        { id: 'emergencies', label: 'EMERGENCIES', icon: Flame },
        { id: 'ai_assessments', label: 'AI ASSESSMENTS', icon: Sparkles },
        { id: 'analytics', label: 'ANALYTICS', icon: Activity },
        { id: 'map', label: 'MAP', icon: MapIcon },
        { id: 'communication', label: 'COMMUNICATION', icon: MessageSquare },
        { id: 'audit', label: 'AUDIT', icon: History },
        { id: 'updates', label: 'UPDATES', icon: Bell }
      ];
    }

    return items.map(item => ({
      ...item,
      hasNotification: item.hasNotification || !!sectionNotifications[item.id]
    }));
  };

  const navItems = getNavItems();

  const getRoleTitle = () => {
    if (user?.role === 'miner') return 'Miner Portal';
    if (user?.role === 'supervisor') return 'Supervisor Control Panel';
    return 'Authority Governance Portal';
  };

  return (
    <header className="w-full bg-white border-b border-[#d1d5db] select-none text-[13px]">
      
      {/* 1. TOP STATUTORY META BAR (IRCTC Aesthetic) */}
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#475569]">
        
        {/* Left: Indian Emblem & Gov Ministry Reference */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#0f2942] uppercase tracking-wide">
              GOVERNMENT OF INDIA
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-700">
              MINISTRY OF COAL & DGMS
            </span>
          </div>
          <span className="hidden sm:inline-block px-2 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] font-bold text-[10px] rounded-xs uppercase">
            DEMO / PROTOTYPE ENVIRONMENT
          </span>
        </div>

        {/* Right: Date/Time Clock + Font Resizers + Language Switcher */}
        <div className="flex items-center gap-4 text-xs">
          
          {/* Real-time Clock */}
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
              title="Default Font Size"
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

          <span className="text-slate-300">|</span>

          {/* Hindi / English Switch */}
          <button
            onClick={toggleLanguage}
            className="font-bold text-[#0f2942] hover:text-[#fb792b] flex items-center gap-1 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#fb792b]" />
            <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN BRANDING BANNER */}
      <div className="px-4 lg:px-8 py-3 bg-white flex flex-wrap items-center justify-between gap-4">
        
        {/* Logo & Portal Identity */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#0f2942] text-white rounded-xs border border-[#091a2b] shadow-xs">
            <CoalGuardEmblem className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg lg:text-xl font-black text-[#0f2942] tracking-tight leading-tight uppercase font-sans">
                CoalGuard
              </h1>
              <span className="text-[11px] px-2 py-0.5 bg-[#213d77] text-white font-bold rounded-xs tracking-wider uppercase">
                {getRoleTitle()}
              </span>
            </div>
            <p className="text-[11px] text-[#475569] font-medium leading-none mt-0.5">
              Smart Governance & Statutory Compliance Platform • Demo Mine A (Zone 4)
            </p>
          </div>
        </div>

        {/* User Context & Action Buttons */}
        <div className="flex items-center gap-3">
          
          {/* Location-Aware Notification Bell Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDrawer(!showNotifDrawer)}
              className="relative p-2 rounded-xl bg-[#f8fafc] hover:bg-[#e2e8f0] text-[#0f2942] border border-[#cbd5e1] transition shadow-xs cursor-pointer"
              title="Statutory Alerts & Incident Notifications"
            >
              <Bell className="w-4 h-4 text-[#0f2942]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#dc2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Drawer */}
            {showNotifDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#cbd5e1] rounded-2xl shadow-2xl z-50 p-4 overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#e2e8f0] mb-2.5">
                  <h4 className="text-xs font-bold text-[#0f2942] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#fb792b]" />
                    Incident & Statutory Alerts
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {notifications?.length || 0} active
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {(!notifications || notifications.length === 0) ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No active statutory alerts</p>
                  ) : (
                    notifications.map((n) => {
                      const hasLoc = n.has_location || n.location || n.type === 'incident';
                      const locData = n.location || {
                        id: n.incident_id || n.id,
                        title: n.title,
                        zone: n.zone || 'Zone 4',
                        latitude: n.latitude || 23.7508,
                        longitude: n.longitude || 86.4192,
                        incident_type: n.incident_type || 'FIRE'
                      };

                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs transition ${
                            n.type === 'incident' || n.severity === 'CRITICAL' || n.severity === 'HIGH'
                              ? 'bg-[#fef2f2] border-rose-200 text-[#0f2942]'
                              : n.type === 'escalation'
                              ? 'bg-[#fffbeb] border-amber-200 text-[#0f2942]'
                              : 'bg-[#f8fafc] border-slate-200 text-[#0f2942]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-[#0f2942] text-xs font-heading">
                              {n.title}
                            </div>
                            {n.severity && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase bg-rose-100 text-rose-800 shrink-0">
                                {n.severity}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                            {n.message}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                            <span className="font-mono">
                              {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {hasLoc && onNavigateToMap && (
                              <button
                                onClick={() => {
                                  setShowNotifDrawer(false);
                                  onNavigateToMap(locData);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#213d77] hover:bg-[#1b4369] text-white font-bold transition shadow-2xs cursor-pointer font-mono"
                              >
                                <MapPin className="w-3 h-3 text-[#fb792b]" />
                                <span>Redirect to Map</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {user && (
            <div className="hidden sm:flex flex-col text-right pr-3 border-r border-slate-300">
              <span className="text-xs font-bold text-[#0f2942]">{user.full_name || 'Authorized User'}</span>
              <span className="text-[11px] text-[#64748b] font-mono">
                {user.designation || user.role?.toUpperCase()} • {user.employee_id || 'DGMS-ID'}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            className="btn-gov-outline text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer"
            title="Sign out of government portal"
          >
            <LogOut className="w-3.5 h-3.5 text-[#dc2626]" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 3. DARK NAVY BLUE NAVIGATION BAR (IRCTC Style) */}
      <nav className="bg-[#0f2942] text-white px-2 lg:px-8 shadow-sm">
        <div className="flex items-center overflow-x-auto no-scrollbar scroll-smooth">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors relative border-b-3 cursor-pointer ${
                  isActive 
                    ? 'bg-[#1b4369] text-white border-[#fb792b]' 
                    : 'text-slate-200 hover:bg-[#153454] hover:text-white border-transparent'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#fb792b]' : 'text-slate-300'}`} />}
                <span>{item.label}</span>
                
                {/* Regular Info / Count Badge */}
                {item.badge !== undefined && item.badge !== null && item.badge !== '' && item.badge !== 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                    item.badge === 'SOS' 
                      ? 'bg-[#dc2626] text-white animate-bounce' 
                      : 'bg-[#213d77] text-white border border-white/20'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Section-Specific Red Notification Dot */}
                {item.hasNotification && (
                  <span 
                    className="w-2 h-2 rounded-full bg-[#dc2626] ring-2 ring-white animate-pulse inline-block ml-1 shrink-0 shadow-sm"
                    title="New alert / update in this section"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </header>
  );
}
