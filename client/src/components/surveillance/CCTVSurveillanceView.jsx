import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Users, 
  ShieldAlert, 
  Flame, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Send, 
  CheckSquare, 
  XSquare,
  FileSpreadsheet,
  Layers,
  HardHat,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';

export default function CCTVSurveillanceView({ token, onNavigateToViolations }) {
  const [selectedFeedId, setSelectedFeedId] = useState('CAM-Z3-01'); // CAM-Z3-01 | CAM-CHK-02 | CAM-HAUL-03
  const [feedsData, setFeedsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // --------------------------------------------------------------------------
  // 1. SYNCHRONIZED CAMERA COUNTER ENGINE (SINGLE SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  // Base cumulative counts across video loops
  const baseCumulativeInRef = useRef(24);
  const baseCumulativeOutRef = useRef(18);
  const lastTimeRef = useRef(0);

  // Live Camera Detection State (Source of Truth for BOTH Camera Overlay & Website UI)
  const [cameraMetrics, setCameraMetrics] = useState({
    totalEntered: 28,
    totalExited: 22,
    currentInside: 6,
    lastEvent: 'Worker Ingress (Track #14)',
    lastEventTime: '10:42:15'
  });

  // --------------------------------------------------------------------------
  // 2. HELMET DETECTION DATA ENGINE (EVERY TRACK ID EVALUATED)
  // --------------------------------------------------------------------------
  const [trackedMiners, setTrackedMiners] = useState([
    { track_id: 1, name: 'Miner ID-1', status: 'HELMET_COMPLIANT', helmet_detected: true, confidence: 0.985, frame: 172, timestamp: '10:43:58', area: 'Left Incline Berm' },
    { track_id: 2, name: 'Miner ID-2', status: 'NO_HELMET', helmet_detected: false, confidence: 0.954, frame: 185, timestamp: '10:44:02', area: 'Main Incline Face' },
    { track_id: 3, name: 'Miner ID-3', status: 'NO_HELMET', helmet_detected: false, confidence: 0.938, frame: 192, timestamp: '10:44:05', area: 'Haulage Crosscut 2' },
    { track_id: 4, name: 'Miner ID-4', status: 'HELMET_COMPLIANT', helmet_detected: true, confidence: 0.976, frame: 205, timestamp: '10:44:12', area: 'Shaft Bottom Gate' },
    { track_id: 5, name: 'Miner ID-5', status: 'HELMET_COMPLIANT', helmet_detected: true, confidence: 0.962, frame: 212, timestamp: '10:44:15', area: 'Shaft Bottom Gate' },
    { track_id: 6, name: 'Miner ID-6', status: 'DAMAGED_HELMET', helmet_detected: false, confidence: 0.885, frame: 220, timestamp: '10:44:18', area: 'Conveyor Drive Head' }
  ]);

  const [helmetFilter, setHelmetFilter] = useState('violations'); // 'violations' | 'all' | 'compliant'

  // Smoke & Fire states
  const [smokeStatus, setSmokeStatus] = useState({ detected: false, flameRatio: '0.0%', airQuality: 'NOMINAL' });
  const [actionMessage, setActionMessage] = useState('');
  const [routedActions, setRoutedActions] = useState({});

  const videoRef = useRef(null);

  // Fetch CCTV feeds metadata
  const fetchFeeds = async () => {
    try {
      const res = await fetch('/api/models/cctv/feeds', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedsData(data.feeds || []);
      }
    } catch (err) {
      console.error('Failed to load CCTV feeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, [token]);

  const activeFeed = feedsData.find(f => f.id === selectedFeedId) || feedsData[0];

  // Real-Time Video Camera Detection Pipeline (Source of Truth)
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    // Detect loop wrap-around to increment persistent cumulative count
    if (time < lastTimeRef.current && lastTimeRef.current > 5.0) {
      baseCumulativeInRef.current += 3;
      baseCumulativeOutRef.current += 3;
    }
    lastTimeRef.current = time;

    // 1. Miner Counter Pipeline Synchronization (CAM-Z3-01)
    if (selectedFeedId === 'CAM-Z3-01') {
      // Step timeline for workers crossing ingress/egress tripwire
      let stepIn = 0;
      let stepOut = 0;
      let currentEvent = 'Monitoring Shaft Gate';

      if (time >= 1.5) { stepIn += 1; currentEvent = 'Worker Ingress (Track #12)'; }
      if (time >= 3.2) { stepIn += 1; currentEvent = 'Worker Ingress (Track #13)'; }
      if (time >= 5.0) { stepOut += 1; currentEvent = 'Worker Egress (Track #8)'; }
      if (time >= 6.8) { stepIn += 1; currentEvent = 'Worker Ingress (Track #14)'; }
      if (time >= 8.6) { stepOut += 1; currentEvent = 'Worker Egress (Track #9)'; }
      if (time >= 10.4) { stepIn += 1; currentEvent = 'Worker Ingress (Track #15)'; }

      const totalEntered = baseCumulativeInRef.current + stepIn;
      const totalExited = baseCumulativeOutRef.current + stepOut;
      const currentInside = totalEntered - totalExited;

      setCameraMetrics({
        totalEntered,
        totalExited,
        currentInside: Math.max(1, currentInside),
        lastEvent: currentEvent,
        lastEventTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }

    // 2. Smoke Detection sync (CAM-HAUL-03)
    if (selectedFeedId === 'CAM-HAUL-03') {
      if (time > 3.2) {
        setSmokeStatus({ detected: true, flameRatio: '2.4%', airQuality: 'CRITICAL HAZARD' });
      } else {
        setSmokeStatus({ detected: false, flameRatio: '0.0%', airQuality: 'NOMINAL' });
      }
    }
  };

  // 1. Emergency Headcount Action
  const handleTriggerHeadcount = async () => {
    try {
      const res = await fetch('/api/models/cctv/people-headcount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          current_inside: cameraMetrics.currentInside, 
          total_entered: cameraMetrics.totalEntered,
          total_exited: cameraMetrics.totalExited,
          camera_id: 'CAM-Z3-01' 
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✅ Verified Muster: ${cameraMetrics.currentInside} miners inside recorded to DGMS Form B muster audit trail.`);
        setTimeout(() => setActionMessage(''), 6000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Universal Supervisor Helmet Action (Works dynamically for ANY Track ID)
  const handleHelmetAction = async (trackId, status, action, frame = 185) => {
    try {
      const res = await fetch('/api/models/cctv/helmet-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          track_id: trackId,
          status,
          action,
          camera_id: 'CAM-CHK-02',
          frame_number: frame,
          notes: `Supervisor ${action === 'RAISE_FIELD_ISSUE' ? 'verified violation and created field ticket' : 'dismissed detection'} for Track ID #${trackId} (${status}).`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoutedActions(prev => ({ ...prev, [`helmet_${trackId}`]: action }));
        setActionMessage(`📋 Track ID #${trackId} (${status}): ${data.message || (action === 'RAISE_FIELD_ISSUE' ? 'Field hazard ticket generated and dispatched to shift safety patrol!' : 'Detection dismissed.')}`);
        setTimeout(() => setActionMessage(''), 7000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Supervisor Smoke Action (FIELD_REPORT | AUTHORITY | BOTH)
  const handleSmokeAction = async (actionType) => {
    try {
      const res = await fetch('/api/models/cctv/smoke-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          camera_id: 'CAM-HAUL-03',
          incident_type: 'FIRE + SMOKE DETECTED',
          location: 'Haulage Road 3 Return Airway (Zone 4)',
          action: actionType,
          notes: `Supervisor operational dispatch routed to ${actionType}.`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRoutedActions(prev => ({ ...prev, smoke: actionType }));
        setActionMessage(`🔥 ${data.message}`);
        setTimeout(() => setActionMessage(''), 8000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Calculate dynamic helmet stats from tracked miners list
  const totalMinersScanned = trackedMiners.length;
  const compliantCount = trackedMiners.filter(m => m.helmet_detected).length;
  const violationMiners = trackedMiners.filter(m => !m.helmet_detected);
  const complianceRate = ((compliantCount / totalMinersScanned) * 100).toFixed(1);

  const filteredMiners = trackedMiners.filter(m => {
    if (helmetFilter === 'violations') return !m.helmet_detected;
    if (helmetFilter === 'compliant') return m.helmet_detected;
    return true;
  });

  return (
    <div className="space-y-5">
      
      {/* Simulation Banner Notice */}
      <div className="bg-[#f8fafc] border border-[#d1d5db] p-3 rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-[#213d77] text-white px-2 py-0.5 rounded-xs font-bold text-[10px] uppercase">
            LIVE CCTV STREAM & VISION AI
          </span>
          <span className="font-medium text-slate-700">
            Node: <strong>{activeFeed?.id || 'CAM-Z4-01'}</strong> • Location: <strong>Demo Mine A (Zone 4)</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">
          Inference Engine: {activeFeed?.ai_model?.split('(')[0] || 'YOLOv8 + ByteTrack Computer Vision'}
        </span>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="p-3 bg-[#dcfce7] border border-[#86efac] text-[#166534] text-xs font-bold rounded-xs flex items-center justify-between animate-in fade-in duration-200">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="underline text-[11px] cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* 3 Dedicated Camera Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        
        {/* Tab 1: Miner Counter */}
        <button
          onClick={() => setSelectedFeedId('CAM-Z3-01')}
          className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
            selectedFeedId === 'CAM-Z3-01'
              ? 'bg-[#213d77] text-white border-[#213d77] shadow-sm'
              : 'bg-white text-[#1f2937] border-[#d1d5db] hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold uppercase text-xs">1. PEOPLE COUNTER</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${selectedFeedId === 'CAM-Z3-01' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              CAM-Z3-01
            </span>
          </div>
          <div className="text-[11px] opacity-90">
            Active Optical Tripwire • Zone 3 Shaft Gate
          </div>
        </button>

        {/* Tab 2: Helmet Detection */}
        <button
          onClick={() => setSelectedFeedId('CAM-CHK-02')}
          className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
            selectedFeedId === 'CAM-CHK-02'
              ? 'bg-[#213d77] text-white border-[#213d77] shadow-sm'
              : 'bg-white text-[#1f2937] border-[#d1d5db] hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold uppercase text-xs">2. HELMET DETECTION</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${selectedFeedId === 'CAM-CHK-02' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              CAM-CHK-02
            </span>
          </div>
          <div className="text-[11px] opacity-90 font-mono">
            Compliance: <strong>{complianceRate}%</strong> • <span className="text-amber-300 font-bold">{violationMiners.length} Violations Flagged</span>
          </div>
        </button>

        {/* Tab 3: Smoke & Fire Detection */}
        <button
          onClick={() => setSelectedFeedId('CAM-HAUL-03')}
          className={`p-3 text-left border rounded-xs transition-colors cursor-pointer ${
            selectedFeedId === 'CAM-HAUL-03'
              ? 'bg-[#213d77] text-white border-[#213d77] shadow-sm'
              : 'bg-white text-[#1f2937] border-[#d1d5db] hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold uppercase text-xs">3. SMOKE & FIRE DETECTION</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${selectedFeedId === 'CAM-HAUL-03' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              CAM-HAUL-03
            </span>
          </div>
          <div className="text-[11px] opacity-90 font-mono">
            Air Quality: <strong className={smokeStatus.detected ? 'text-red-300' : 'text-emerald-300'}>{smokeStatus.airQuality}</strong>
          </div>
        </button>

      </div>

      {/* Main Video Screen & Operational Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Video Player Box (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="gov-panel overflow-hidden bg-black border border-slate-700 relative shadow-md">
            <div className="bg-[#0f2942] text-white px-3 py-1.5 text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                LIVE CCTV CAMERA FEED — {activeFeed?.id}
              </span>
              <span className="text-slate-300">30 FPS • 1080p • LIVE INFERENCE</span>
            </div>

            <div className="aspect-video w-full bg-slate-950 relative flex items-center justify-center">
              <video
                ref={videoRef}
                key={activeFeed?.video_url}
                src={activeFeed?.video_url || '/videos/people_counter_demo.mp4'}
                autoPlay
                loop
                muted
                playsInline
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />

              {/* 1. STATUTORY LIMIT: MAX THRESHOLD (NATIVE CAMERA COUNTER IS SOURCE OF TRUTH) */}
              {selectedFeedId === 'CAM-Z3-01' && (
                <div className="absolute bottom-3 left-3 z-10 max-w-xs">
                  {/* Max Threshold Message */}
                  <div className="bg-black/90 border border-amber-500/80 text-amber-300 px-3 py-1.5 rounded-lg text-[11px] font-mono backdrop-blur-md shadow-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>MAX THRESHOLD: 45 MINERS</span>
                  </div>
                </div>
              )}

              {/* 2. SYNCHRONIZED CAMERA OVERLAY: HELMET DETECTION (FLAGS EVERY UNHELMETED TRACK ID) */}
              {selectedFeedId === 'CAM-CHK-02' && (
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-xs">
                  {violationMiners.map(m => (
                    <div 
                      key={m.track_id}
                      className="bg-black/90 border border-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-md shadow-lg flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-bold text-rose-300">Track #{m.track_id}:</span>
                        <span className="text-rose-100 font-semibold">{m.status.replace('_', ' ')} ❌</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-mono">{(m.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. SYNCHRONIZED CAMERA OVERLAY: SMOKE DETECTION */}
              {selectedFeedId === 'CAM-HAUL-03' && smokeStatus.detected && (
                <div className="absolute top-3 right-3 z-10 bg-red-600/95 border border-red-300 text-white px-3.5 py-2 rounded-xl text-xs font-mono font-bold animate-pulse shadow-xl">
                  🔥 THERMAL FLAME & SMOKE DETECTED (CONF: 96.4%)
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="bg-slate-100 border-t border-slate-300 p-2 flex items-center justify-between text-xs text-slate-700">
              <button onClick={togglePlay} className="btn-gov-outline py-1 px-3 text-xs cursor-pointer flex items-center gap-1.5">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Camera Feed' : 'Resume Camera Feed'}</span>
              </button>
              <span className="font-mono text-[11px] text-slate-600 font-medium">{activeFeed?.location}</span>
            </div>
          </div>
        </div>

        {/* Operational Control Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Subsection 1: MINER COUNTER CONTROLS (MUSTER & PROTOCOL) */}
          {selectedFeedId === 'CAM-Z3-01' && (
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>CAMERA SURVEILLANCE & MUSTER VERIFICATION</span>
              </div>
              <div className="p-4 space-y-4 text-xs">
                
                {/* Optical Tripwire Camera Node Details (No duplicate counters) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Camera Stream Node:</span>
                    <strong className="text-slate-800">CAM-Z3-01 (Shaft Ingress)</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Optical Detection Engine:</span>
                    <span className="text-emerald-600 font-bold">YOLOv8 + ByteTrack (Active)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Statutory Capacity Limit:</span>
                    <span className="text-amber-600 font-bold">MAX THRESHOLD: 45 MINERS</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Live Optical Status:</span>
                    <span className="text-[#0f2942] font-semibold">{cameraMetrics.lastEvent}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleTriggerHeadcount}
                    className="btn-gov-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>SYNCHRONIZE EMERGENCY MUSTER ROLL</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Live camera detection system is the authoritative source of truth.
                </p>
              </div>
            </div>
          )}

          {/* Subsection 2: HELMET DETECTION SUPERVISOR VERIFICATION (EVERY TRACK ID FLAGGED) */}
          {selectedFeedId === 'CAM-CHK-02' && (
            <div className="gov-panel">
              <div className="gov-panel-header">
                <div className="flex items-center justify-between w-full">
                  <span>PPE HELMET DETECTIONS & VERIFICATION</span>
                  <span className="text-[11px] font-mono font-bold text-amber-300">
                    {violationMiners.length} VIOLATIONS FLAGGED
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3 text-xs">
                
                {/* Filter Selector */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                  <button
                    onClick={() => setHelmetFilter('violations')}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                      helmetFilter === 'violations' ? 'bg-[#dc2626] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Flagged Violations ({violationMiners.length})
                  </button>
                  <button
                    onClick={() => setHelmetFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                      helmetFilter === 'all' ? 'bg-[#213d77] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Tracked ({trackedMiners.length})
                  </button>
                  <button
                    onClick={() => setHelmetFilter('compliant')}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                      helmetFilter === 'compliant' ? 'bg-[#166534] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Compliant ({compliantCount})
                  </button>
                </div>

                {/* List of Tracked Persons */}
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredMiners.map((m) => {
                    const isViol = !m.helmet_detected;
                    const actionDone = routedActions[`helmet_${m.track_id}`];

                    return (
                      <div 
                        key={m.track_id}
                        className={`p-3 rounded-xs border space-y-2 transition-all ${
                          isViol ? 'bg-rose-50/70 border-rose-300' : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-[#0f2942] text-xs">Track ID #{m.track_id} ({m.name})</strong>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                isViol ? 'bg-rose-600 text-white' : 'bg-emerald-700 text-white'
                              }`}>
                                {isViol ? 'VIOLATION FLAGGED' : 'HELMET OK'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                              {m.area} • Frame #{m.frame} • Confidence: {(m.confidence * 100).toFixed(1)}%
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`text-xs font-bold font-mono ${isViol ? 'text-[#dc2626]' : 'text-[#166534]'}`}>
                              {m.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Actions Row for Flagged Violations */}
                        {isViol && (
                          <div className="flex items-center gap-2 pt-1 border-t border-rose-200/60">
                            <button
                              onClick={() => handleHelmetAction(m.track_id, m.status, 'RAISE_FIELD_ISSUE', m.frame)}
                              disabled={actionDone === 'RAISE_FIELD_ISSUE'}
                              className={`py-1 px-2.5 text-[11px] font-bold rounded flex-1 transition cursor-pointer ${
                                actionDone === 'RAISE_FIELD_ISSUE'
                                  ? 'bg-emerald-700 text-white cursor-default'
                                  : 'bg-[#213d77] hover:bg-[#1a305e] text-white shadow-xs'
                              }`}
                            >
                              <span>{actionDone === 'RAISE_FIELD_ISSUE' ? '✓ FIELD ISSUE DISPATCHED' : 'RAISE FIELD ISSUE'}</span>
                            </button>
                            <button
                              onClick={() => handleHelmetAction(m.track_id, m.status, 'DISMISS', m.frame)}
                              disabled={actionDone === 'DISMISS'}
                              className="btn-gov-outline py-1 px-2.5 text-[11px] cursor-pointer"
                            >
                              <span>{actionDone === 'DISMISS' ? 'DISMISSED' : 'DISMISS'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Subsection 3: SMOKE & FIRE 3-WAY ROUTING */}
          {selectedFeedId === 'CAM-HAUL-03' && (
            <div className="gov-panel">
              <div className="gov-panel-header">
                <span>SMOKE & FIRE INCIDENT DECISION ROUTING</span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                <div className="p-3 bg-[#fee2e2] border border-[#fca5a5] rounded-xs text-[#991b1b]">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#dc2626]" />
                    <span>THERMAL OUTBREAK DETECTED (ZONE 4)</span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-700">
                    Location: Haulage Road 3 Return Airway. Supervisor must select operational destination based on severity:
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => handleSmokeAction('FIELD_REPORT')}
                    className="btn-gov-secondary w-full py-2 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>1. SEND TO FIELD REPORT</span>
                    <span className="text-[10px] opacity-80 font-normal">Internal Shift Action</span>
                  </button>

                  <button
                    onClick={() => handleSmokeAction('AUTHORITY')}
                    className="btn-gov-danger w-full py-2 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>2. ESCALATE TO AUTHORITY</span>
                    <span className="text-[10px] opacity-80 font-normal">DGMS / Corporate SOS</span>
                  </button>

                  <button
                    onClick={() => handleSmokeAction('BOTH')}
                    className="btn-gov-primary w-full py-2 text-xs flex items-center justify-between cursor-pointer"
                  >
                    <span>3. SEND TO BOTH</span>
                    <span className="text-[10px] opacity-80 font-normal">Field Team + Authority</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
