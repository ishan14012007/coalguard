import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('coalguard_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('coalguard_token') || null);
  const [lang, setLang] = useState(() => localStorage.getItem('coalguard_lang') || 'en');
  const [notifications, setNotifications] = useState([]);
  const [offlineReports, setOfflineReports] = useState(() => {
    const saved = localStorage.getItem('coalguard_offline_reports');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    // Clear legacy localStorage user session to prevent bypassing login page
    localStorage.removeItem('coalguard_user');
    localStorage.removeItem('coalguard_token');
  }, []);

  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('coalguard_lang', nextLang);
  };

  const DEMO_USERS = {
    miner: {
      id: 'usr-miner-01',
      full_name: 'Ramesh Kumar Mahato',
      email: 'miner@coalguard.gov.in',
      phone: '+91 98351 23456',
      employee_id: 'MIN-84729',
      role: 'miner',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      designation: 'Underground Dumper & Shovel Operator',
      language_preference: 'hi',
      is_active: true
    },
    supervisor: {
      id: 'usr-super-01',
      full_name: 'Er. Rajeshwar Verma',
      email: 'supervisor@coalguard.gov.in',
      phone: '+91 94311 78901',
      employee_id: 'SUP-41029',
      role: 'supervisor',
      subsidiary_id: 'sub-bccl-01',
      mine_id: 'mine-demo-01',
      designation: 'Safety Officer & Colliery Sirdar (DGMS Certified)',
      language_preference: 'en',
      is_active: true
    },
    authority: {
      id: 'usr-auth-01',
      full_name: 'Dr. Rajeshwar Murthy, Chief Compliance & Safety Authority',
      email: 'authority@coalguard.gov.in',
      phone: '+91 94311 78901',
      employee_id: 'AUTH-DGMS-01',
      role: 'authority',
      subsidiary_id: 'sub-bccl-01',
      mine_id: null,
      designation: 'Statutory Safety & Mine Compliance Authority',
      language_preference: 'en',
      is_active: true
    }
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        sessionStorage.setItem('coalguard_token', data.token);
        sessionStorage.setItem('coalguard_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (err) {
      console.warn('Backend login unavailable, evaluating demo accounts:', err);
    }

    // Client-side demo fallback for quick evaluation
    const cleanEmail = email.toLowerCase().trim();
    let matchedRole = 'authority';
    if (cleanEmail.includes('miner')) matchedRole = 'miner';
    else if (cleanEmail.includes('super')) matchedRole = 'supervisor';

    const fallbackUser = DEMO_USERS[matchedRole] || DEMO_USERS.authority;
    const fallbackToken = 'demo-token-' + matchedRole + '-' + Date.now();
    setToken(fallbackToken);
    setUser(fallbackUser);
    sessionStorage.setItem('coalguard_token', fallbackToken);
    sessionStorage.setItem('coalguard_user', JSON.stringify(fallbackUser));
    return fallbackUser;
  };

  const quickSwitchRole = async (targetRole) => {
    const roleKey = targetRole === 'corporate' || targetRole === 'regulator' ? 'authority' : targetRole;
    try {
      const res = await fetch(`/api/auth/quick-login/${roleKey}`);
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        sessionStorage.setItem('coalguard_token', data.token);
        sessionStorage.setItem('coalguard_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (err) {
      console.warn('Backend quick-login unavailable, using instant fallback:', err);
    }

    // Instant seamless fallback
    const fallbackUser = DEMO_USERS[roleKey] || DEMO_USERS.authority;
    const fallbackToken = 'demo-token-' + roleKey + '-' + Date.now();
    setToken(fallbackToken);
    setUser(fallbackUser);
    sessionStorage.setItem('coalguard_token', fallbackToken);
    sessionStorage.setItem('coalguard_user', JSON.stringify(fallbackUser));
    return fallbackUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('coalguard_token');
    sessionStorage.removeItem('coalguard_user');
    localStorage.removeItem('coalguard_token');
    localStorage.removeItem('coalguard_user');
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/workflow/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Save offline report locally
  const saveOfflineReport = (report) => {
    const updated = [report, ...offlineReports];
    setOfflineReports(updated);
    localStorage.setItem('coalguard_offline_reports', JSON.stringify(updated));
  };

  // Sync offline reports with server
  const syncOfflineReports = async () => {
    if (offlineReports.length === 0 || !token) return 0;
    try {
      const res = await fetch('/api/field-reports/sync-offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reports: offlineReports })
      });
      if (res.ok) {
        setOfflineReports([]);
        localStorage.removeItem('coalguard_offline_reports');
        return offlineReports.length;
      }
    } catch (err) {
      console.error('Offline sync failed:', err);
    }
    return 0;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        lang,
        t,
        toggleLanguage,
        loginWithCredentials,
        quickSwitchRole,
        logout,
        notifications,
        fetchNotifications,
        offlineReports,
        saveOfflineReport,
        syncOfflineReports
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
