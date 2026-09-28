import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MinerDashboard from './pages/miner/MinerDashboard';
import AuthorityDashboard from './pages/authority/AuthorityDashboard';

import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';

function AppRouter() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  // Pure 3-role physical layout separation (Miner, Supervisor, Authority)
  switch (user.role) {
    case 'miner':
      return <MinerDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'authority':
    case 'corporate':
    case 'regulator':
      return <AuthorityDashboard />;
    default:
      return <Login />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
