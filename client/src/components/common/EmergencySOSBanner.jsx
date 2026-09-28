import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PhoneCall, AlertOctagon, CheckCircle2, ShieldAlert, Radio, UserCheck, Clock, MapPin } from 'lucide-react';

export default function EmergencySOSBanner({ onStatusChange, onNavigateToMap }) {
  const { token, user } = useAuth();
  const [activeSOSList, setActiveSOSList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchActiveSOS = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/emergency/sos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter active and recently acknowledged events
        const urgent = data.filter(e => e.status === 'active' || (e.status === 'acknowledged' && (Date.now() - new Date(e.acknowledged_at).getTime() < 300000)));
        setActiveSOSList(urgent);
      }
    } catch (err) {
      console.error('Error fetching emergency SOS:', err);
    }
  };

  useEffect(() => {
    fetchActiveSOS();
    const interval = setInterval(fetchActiveSOS, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAcknowledge = async (sosId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/ack`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action_notes: `Acknowledged by ${user?.full_name || 'Control Room'}. Rescue dispatch deployed.`
        })
      });
      if (res.ok) {
        setActionMsg(`✅ Rescue dispatch logged for SOS #${sosId}!`);
        fetchActiveSOS();
        if (onStatusChange) onStatusChange();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (sosId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/emergency/sos/${sosId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution_summary: `All underground personnel accounted for. Situation de-escalated by ${user?.full_name}.`
        })
      });
      if (res.ok) {
        setActionMsg('✅ Emergency SOS successfully marked RESOLVED.');
        fetchActiveSOS();
        if (onStatusChange) onStatusChange();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (activeSOSList.length === 0) return null;

  return (
    <div className="w-full bg-[#A13D2F] text-white p-3.5 border-b-2 border-red-950 shadow-lg animate-pulse transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Left: Pulsing Alarm Indicator & Miner Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl border border-white/30 flex items-center justify-center shrink-0">
            <PhoneCall className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest bg-white text-[#A13D2F] px-2 py-0.5 rounded-full font-mono">
                🚨 CRITICAL LIFE SAFETY SOS ({activeSOSList.length})
              </span>
              <span className="text-[11px] font-mono text-red-100 flex items-center gap-1">
                <Radio className="w-3 h-3 text-red-200" />
                Live Telemetry Beacon Active
              </span>
            </div>
            
            {activeSOSList.map(sos => (
              <div key={sos.id} className="mt-1">
                <p className="text-sm font-extrabold text-white font-heading">
                  Worker: <span className="underline">{sos.miner_name}</span> ({sos.miner_employee_id || 'Miner'}) • {sos.mine_name}
                </p>
                <p className="text-xs text-red-100 font-mono flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    GPS: [{Number(sos.latitude).toFixed(4)}, {Number(sos.longitude).toFixed(4)}]
                  </span>
                  <span>•</span>
                  <span>{new Date(sos.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  {sos.status === 'acknowledged' && (
                    <span className="bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      DISPATCHED by {sos.acknowledged_by}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {actionMsg && (
            <span className="text-xs font-mono font-bold bg-white/20 px-3 py-1 rounded-xl text-white">
              {actionMsg}
            </span>
          )}

          {activeSOSList.map(sos => (
            <div key={sos.id} className="flex items-center gap-2">
              {onNavigateToMap && (
                <button
                  type="button"
                  onClick={() => onNavigateToMap({
                    id: sos.id,
                    latitude: Number(sos.latitude) || 23.7508,
                    longitude: Number(sos.longitude) || 86.4192,
                    incidentType: sos.emergency_type || 'OTHER',
                    zone: sos.zone || 'Zone 4',
                    title: `SOS: ${sos.miner_name || 'Worker'} (${sos.emergency_type || 'Distress'})`,
                    severity: 'CRITICAL',
                    status: sos.status || 'ACTIVE'
                  })}
                  className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 font-mono cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-950" />
                  <span>Redirect to Map</span>
                </button>
              )}
              {sos.status === 'active' ? (
                <button
                  disabled={loading}
                  onClick={() => handleAcknowledge(sos.id)}
                  className="px-4 py-2 bg-white hover:bg-red-50 text-[#A13D2F] font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1.5 font-mono cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Acknowledge & Dispatch Rescue</span>
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={() => handleResolve(sos.id)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 font-mono cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
