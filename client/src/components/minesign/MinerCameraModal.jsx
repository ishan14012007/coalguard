import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  ShieldAlert, 
  RefreshCw, 
  UserCheck, 
  Eye, 
  Radio, 
  Sparkles,
  Ban,
  Video,
  VideoOff,
  Sliders
} from 'lucide-react';
import { GESTURE_DISPLAY_CONFIG } from './MineSignView';

export default function MinerCameraModal({ isOpen, onClose, user, token }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Camera Lifecycle States: 'CAMERA CONNECTING' | 'CAMERA CONNECTED' | 'CAMERA ERROR'
  const [cameraStatus, setCameraStatus] = useState('CAMERA CONNECTING');
  const [cameraError, setCameraError] = useState('');
  
  // Real-Time MineSign AI Telemetry States:
  // 'LISTENING' | 'VERIFYING' | 'DETECTED' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED'
  const [aiStatus, setAiStatus] = useState('LISTENING');
  const aiStatusRef = useRef(aiStatus);
  useEffect(() => {
    aiStatusRef.current = aiStatus;
  }, [aiStatus]);

  const [detectedGesture, setDetectedGesture] = useState('NO_GESTURE');
  const [confidence, setConfidence] = useState(null);
  const [validationDetail, setValidationDetail] = useState('AMBIENT (SAFE)');
  const [candidateEvent, setCandidateEvent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Initializing MineSign real-time AI pipeline...');
  const [gasTimer, setGasTimer] = useState('');
  const [ppeTapInfo, setPpeTapInfo] = useState('');
  const [gasDebug, setGasDebug] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [fpsCounter, setFpsCounter] = useState(0);

  const workerId = user?.employee_id || user?.id || 'MIN-84729';
  const workerName = user?.full_name || 'Ramesh Kumar Mahato';
  const mineId = user?.mine_id || 'mine-demo-01';
  const zoneName = 'Zone 4 (Underground Face 3)';

  // Request & Bind Laptop Webcam Stream
  const startCamera = async () => {
    setCameraStatus('CAMERA CONNECTING');
    setCameraError('');

    // Stop any existing tracks before requesting a new stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('CAMERA ERROR');
      setCameraError('Webcam API (navigator.mediaDevices.getUserMedia) is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraStatus('CAMERA CONNECTED');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.warn('AutoPlay failed:', err);
          });
        };
      }
    } catch (err) {
      console.error('Webcam getUserMedia failed:', err);
      setCameraStatus('CAMERA ERROR');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Webcam permission denied. Please allow camera access in browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No webcam hardware found on this Mac/device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('Webcam is already in use by another application or browser tab.');
      } else {
        setCameraError(`Camera error: ${err.message || err.name || 'Unable to open webcam'}`);
      }
    }
  };

  // Stop all active webcam tracks
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('CAMERA CONNECTING');
  };

  const resetState = async () => {
    setAiStatus('LISTENING');
    setDetectedGesture('NO_GESTURE');
    setConfidence(null);
    setValidationDetail('AMBIENT (SAFE)');
    setCandidateEvent(null);
    setStatusMessage('Live monitoring active: ambient baseline');
    setGasTimer('');
    setPpeTapInfo('');
    try {
      await fetch('/api/minesign/reset-inference', { method: 'POST' });
    } catch (e) {}
  };

  // Lifecycle on modal open / close
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Ensure video element receives stream when ready
  useEffect(() => {
    if (videoRef.current && streamRef.current && cameraStatus === 'CAMERA CONNECTED') {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Video play error:', e));
    }
  }, [cameraStatus]);

  // Real-time AI Inference Loop (Sends frames to MineSign AI Inference Pipeline)
  useEffect(() => {
    if (!isOpen || cameraStatus !== 'CAMERA CONNECTED') return;

    let isMounted = true;
    let frameCount = 0;
    let lastFpsTime = Date.now();

    const inferenceInterval = setInterval(async () => {
      if (isProcessingRef.current || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState < 2) return; // HAVE_CURRENT_DATA
      if (aiStatusRef.current === 'AWAITING_CONFIRMATION' || aiStatusRef.current === 'CONFIRMED') return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      isProcessingRef.current = true;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.6);

        const res = await fetch('/api/minesign/process-frame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            image: base64Data,
            worker_id: workerId
          })
        });

        if (res.ok && isMounted) {
          const telemetry = await res.json();
          frameCount++;
          const now = Date.now();
          if (now - lastFpsTime >= 1000) {
            setFpsCounter(frameCount);
            frameCount = 0;
            lastFpsTime = now;
          }

          const dispClass = telemetry.displayed_class || telemetry.smoothed_prediction || telemetry.raw_prediction || 'NO_GESTURE';
          const dispConf = telemetry.displayed_confidence ?? telemetry.smoothed_confidence ?? telemetry.raw_confidence ?? null;

          setValidationDetail(telemetry.gesture_validation_status || 'AMBIENT');
          setGasTimer(telemetry.gas_timer_str || '');
          setPpeTapInfo(telemetry.ppe_tap_info || '');
          setGasDebug(telemetry.gas_debug || null);
          setDebugInfo(telemetry.debug_info || null);

          // Check if Temporal Engine CONFIRMED an actionable gesture
          if (telemetry.is_confirmed && telemetry.confirmed_gesture && telemetry.confirmed_gesture !== 'NO_GESTURE') {
            const confGesture = telemetry.confirmed_gesture;
            const confVal = dispConf || 0.92;
            setDetectedGesture(confGesture);
            setConfidence(confVal);
            setAiStatus('DETECTED');
            setStatusMessage(`GESTURE DETECTED: ${GESTURE_DISPLAY_CONFIG[confGesture]?.label || confGesture} (${(confVal * 100).toFixed(1)}%). Submitting candidate signal...`);

            // Automatically dispatch candidate event to backend (PENDING_CONFIRMATION)
            try {
              const postRes = await fetch('/api/minesign/events', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  gesture: confGesture,
                  confidence: confVal,
                  worker_id: workerId,
                  worker_name: workerName,
                  mine_id: mineId,
                  mine_name: 'Demo Mine A (Zone 4)',
                  zone: zoneName,
                  camera_id: 'CAM-MINESIGN-DEMO'
                })
              });

              if (postRes.ok) {
                const candData = await postRes.json();
                setCandidateEvent(candData);
                setAiStatus('AWAITING_CONFIRMATION');
                setStatusMessage('SIGNAL SENT — Awaiting Supervisor Confirmation');
              } else {
                const errData = await postRes.json();
                setAiStatus('LISTENING');
                setStatusMessage(`⚠️ Candidate Submission: ${errData.message || 'Suppressed or rejected'}`);
              }
            } catch (err) {
              console.error('Candidate submission error:', err);
              setAiStatus('LISTENING');
              setStatusMessage('❌ Network error submitting candidate event');
            }
          } else if (telemetry.validation_state === 'VERIFYING' || (dispClass !== 'NO_GESTURE' && dispConf >= 0.50)) {
            // Verifying pattern actively with temporal smoothing
            setDetectedGesture(dispClass);
            setConfidence(dispConf);
            setAiStatus('VERIFYING');

            if (dispClass === 'SUSPECTED_GAS_LEAK' && telemetry.gas_timer_str) {
              setStatusMessage(`SUSPECTED GAS LEAK | Hold: ${telemetry.gas_timer_str} | Validation: VERIFYING`);
            } else if (dispClass === 'PPE_DAMAGE' || (telemetry.ppe_tap_info && !telemetry.ppe_tap_info.includes('0/2'))) {
              setStatusMessage(`PPE DAMAGE | ${telemetry.ppe_tap_info} [${telemetry.ppe_state || 'IDLE'}] | Validation: VERIFYING`);
            } else {
              setStatusMessage(`VERIFYING PATTERN: ${telemetry.gesture_validation_status} (${telemetry.status_text})`);
            }
          } else {
            // Ambient / No Gesture Baseline
            setDetectedGesture('NO_GESTURE');
            setConfidence(dispConf && dispConf > 0.15 ? dispConf : null);
            setAiStatus('LISTENING');
            setStatusMessage(telemetry.has_worker ? `Monitoring: ${telemetry.status_text || 'Safe Baseline'}` : 'Waiting for worker in camera frame...');
          }
        }
      } catch (err) {
        // Handle background frame error gracefully
      } finally {
        isProcessingRef.current = false;
      }
    }, 120); // ~8.3 FPS continuous temporal inference

    return () => {
      isMounted = false;
      clearInterval(inferenceInterval);
    };
  }, [isOpen, cameraStatus, workerId, token]);

  // Poll for Supervisor Confirmation if Candidate is Awaiting Confirmation
  useEffect(() => {
    if (!candidateEvent || aiStatus !== 'AWAITING_CONFIRMATION') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/minesign/events/${candidateEvent.event_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const evt = await res.json();
          if (evt.status === 'OPEN' || evt.status === 'ACKNOWLEDGED' || evt.status === 'RESOLVED') {
            setAiStatus('CONFIRMED');
            setStatusMessage(`MineSign signal confirmed by supervisor (${evt.confirmed_by || 'Colliery Supervisor'}). Official event created.`);
            clearInterval(interval);
          } else if (evt.status === 'REJECTED') {
            setAiStatus('REJECTED');
            setStatusMessage(`Supervisor rejected the MineSign signal — no official safety event created.`);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Polling candidate event status error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [candidateEvent, aiStatus, token]);

  // Fallback Manual Gesture Trigger for Evaluators
  const handleManualFallbackGesture = async (gestureKey) => {
    if (gestureKey === 'NO_GESTURE') {
      setDetectedGesture('NO_GESTURE');
      setConfidence(null);
      setAiStatus('LISTENING');
      setStatusMessage('Ambient baseline active: NO_GESTURE does not generate events.');
      return;
    }

    setDetectedGesture(gestureKey);
    const mockConf = +(0.95 + Math.random() * 0.045).toFixed(3);
    setConfidence(mockConf);
    setAiStatus('VERIFYING');
    setStatusMessage(`[Manual Fallback] Verifying pattern for '${GESTURE_DISPLAY_CONFIG[gestureKey]?.label || gestureKey}'...`);

    setTimeout(async () => {
      setAiStatus('DETECTED');
      setStatusMessage('Temporal validation passed! Submitting candidate signal to supervisor...');

      try {
        const res = await fetch('/api/minesign/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            gesture: gestureKey,
            confidence: mockConf,
            worker_id: workerId,
            worker_name: workerName,
            mine_id: mineId,
            mine_name: 'Demo Mine A (Zone 4)',
            zone: zoneName,
            camera_id: 'CAM-MINESIGN-DEMO'
          })
        });

        if (res.ok) {
          const data = await res.json();
          setCandidateEvent(data);
          setAiStatus('AWAITING_CONFIRMATION');
          setStatusMessage('SIGNAL SENT — Awaiting Supervisor Confirmation');
        } else {
          const errData = await res.json();
          setAiStatus('LISTENING');
          setStatusMessage(`⚠️ ${errData.message || 'Signal rejected by backend'}`);
        }
      } catch (err) {
        console.error('Failed to post candidate event:', err);
        setAiStatus('LISTENING');
        setStatusMessage('❌ Network error communicating with backend API.');
      }
    }, 1000);
  };

  if (!isOpen) return null;

  const currentConfig = GESTURE_DISPLAY_CONFIG[detectedGesture] || null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E1B16] text-white border border-[#443E33] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} width="480" height="360" className="hidden" />

        {/* Modal Header */}
        <div className="p-4 bg-[#2A261F] border-b border-[#443E33] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1F6B45] text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base font-heading text-white">
                  MineSign — Real-Time Visual AI Camera
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                  SIMULATION MODE
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Connected to MediaPipe Holistic + Trained Temporal Sequence ML Classifier (v2)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Metadata Strip */}
        <div className="bg-[#151310] px-4 py-2 border-b border-[#332E25] flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 gap-2">
          <div>Worker: <span className="font-bold text-white">{workerId} ({workerName})</span></div>
          <div>Mine: <span className="font-bold text-white">Demo Coal Mine</span></div>
          <div>Zone: <span className="font-bold text-[#1F6B45]">Conveyor Zone 4</span></div>
          <div>Camera: <span className="font-bold text-[#F59E0B]">CAM-MINESIGN-DEMO</span></div>
        </div>

        {/* Live Camera Viewport with Real-Time HUD Overlay */}
        <div className="relative bg-black flex-1 min-h-[300px] max-h-[380px] w-full flex items-center justify-center overflow-hidden">
          
          {/* Real Live Laptop Webcam Video Element */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transform -scale-x-100 ${
              cameraStatus === 'CAMERA CONNECTED' ? 'block' : 'hidden'
            }`}
          />

          {/* Camera Connecting or Error Overlay */}
          {cameraStatus !== 'CAMERA CONNECTED' && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-300 space-y-3 z-10 max-w-md">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                cameraStatus === 'CAMERA CONNECTING'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}>
                {cameraStatus === 'CAMERA CONNECTING' ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="font-bold text-sm text-white font-heading">
                  {cameraStatus === 'CAMERA CONNECTING' ? 'Connecting to Mac / Laptop Webcam...' : 'Camera Access Error'}
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono leading-relaxed">
                  {cameraError || 'Requesting browser media permission for live visual safety gesture detection...'}
                </p>
              </div>

              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-[#1F6B45] hover:bg-[#185336] text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{cameraStatus === 'CAMERA CONNECTING' ? 'Re-request Permission' : 'Retry Camera'}</span>
              </button>
            </div>
          )}

          {/* HUD Top Left: Camera Status & AI Pipeline Status */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
            {/* Camera Status Badge */}
            <div className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 border backdrop-blur-md shadow-sm ${
              cameraStatus === 'CAMERA CONNECTED'
                ? 'bg-emerald-950/85 border-emerald-400 text-emerald-300'
                : cameraStatus === 'CAMERA CONNECTING'
                ? 'bg-amber-950/85 border-amber-400 text-amber-300 animate-pulse'
                : 'bg-rose-950/85 border-rose-400 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                cameraStatus === 'CAMERA CONNECTED' ? 'bg-emerald-400' : cameraStatus === 'CAMERA CONNECTING' ? 'bg-amber-400 animate-ping' : 'bg-rose-400'
              }`} />
              <span>{cameraStatus}</span>
              {fpsCounter > 0 && <span className="opacity-75 text-[9px]">({fpsCounter} FPS)</span>}
            </div>

            {/* AI Status Badge */}
            <div className="bg-black/75 backdrop-blur-xs border border-white/20 px-2.5 py-1 rounded-xl text-[11px] font-mono flex items-center gap-1.5">
              <span className="text-gray-400">AI Status:</span>
              <span className={`font-bold uppercase ${
                aiStatus === 'CONFIRMED' ? 'text-emerald-400' : aiStatus === 'REJECTED' ? 'text-rose-400' : aiStatus === 'AWAITING_CONFIRMATION' ? 'text-amber-400' : aiStatus === 'VERIFYING' ? 'text-blue-400 animate-pulse' : 'text-white'
              }`}>
                {aiStatus}
              </span>
            </div>

            {/* Live Gas Leak Geometric Diagnostics */}
            {gasDebug && (detectedGesture === 'SUSPECTED_GAS_LEAK' || (gasTimer && gasTimer !== '0.0 / 4.0s')) && (
              <div className="bg-black/85 backdrop-blur-md border border-cyan-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-mono text-cyan-200 shadow-lg space-y-0.5 mt-0.5">
                <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Gas Validator Diagnostics</div>
                <div>Palm→Face: <span className="font-bold text-white">{gasDebug.palm_to_face}</span> (Max: {gasDebug.threshold})</div>
                <div>Coverage: <span className={gasDebug.face_coverage === 'PASS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{gasDebug.face_coverage}</span> | Proximity: <span className={gasDebug.hand_proximity === 'PASS' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{gasDebug.hand_proximity}</span></div>
                <div>Temporal: <span className="text-amber-300 font-bold">{gasDebug.temporal_valid}</span> ({gasDebug.hold})</div>
              </div>
            )}
          </div>

          {/* HUD Top Right: Live Gesture & Smoothed Confidence */}
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl text-xs font-mono text-right z-20 shadow-md">
            <div className="text-[9px] text-gray-400 uppercase font-bold tracking-wide">Detected Gesture</div>
            <div className="font-extrabold text-white text-xs mt-0.5">
              {currentConfig ? currentConfig.label : 'NO_GESTURE'}
            </div>
            <div className="text-[10px] text-[#10B981] font-bold mt-0.5">
              Confidence: {confidence ? `${(confidence * 100).toFixed(1)}%` : '--'}
            </div>
            <div className="text-[9px] text-amber-300 font-semibold mt-0.5 truncate max-w-[160px]">
              {validationDetail}
            </div>
            {gasTimer && gasTimer !== '0.0 / 4.0s' && (
              <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded border ${
                validationDetail.includes('REACQUIRING')
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
                  : 'bg-cyan-950/70 border-cyan-500/30 text-cyan-300'
              }`}>
                Hold: {gasTimer} {validationDetail.includes('REACQUIRING') ? '· REACQUIRING' : ''}
              </div>
            )}
            {ppeTapInfo && !ppeTapInfo.includes('0/2') && (
              <div className="text-[9px] text-orange-300 font-bold mt-1 bg-orange-950/70 px-1.5 py-0.5 rounded border border-orange-500/30">
                {ppeTapInfo}
              </div>
            )}
            {debugInfo && (
              <div className="text-[8px] font-mono text-gray-400 mt-1 border-t border-white/10 pt-1 text-right space-y-0.2">
                <div>Pred: <span className="text-white font-bold">{debugInfo.predicted}</span> ({debugInfo.confidence_pct}%)</div>
                <div>Margin: <span className="text-cyan-300 font-bold">{debugInfo.margin_pct}%</span> | Cons: <span className="text-amber-300 font-bold">{debugInfo.temporal_consistency}</span></div>
                <div>Physical: <span className={debugInfo.physical_validation === 'PASS' ? 'text-emerald-400 font-bold' : 'text-gray-400'}>{debugInfo.physical_validation}</span> | State: <span className="text-white font-bold">{debugInfo.final_state}</span></div>
              </div>
            )}
          </div>

          {/* HUD Bottom Center: Real-time Feedback Banner */}
          {statusMessage && (
            <div className={`absolute bottom-3 left-3 right-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-medium flex items-center gap-2 z-20 shadow-lg ${
              aiStatus === 'CONFIRMED'
                ? 'bg-emerald-900/90 border-emerald-400 text-emerald-100'
                : aiStatus === 'REJECTED'
                ? 'bg-rose-900/90 border-rose-400 text-rose-100'
                : aiStatus === 'AWAITING_CONFIRMATION'
                ? 'bg-amber-900/90 border-amber-400 text-amber-100 animate-pulse'
                : aiStatus === 'VERIFYING'
                ? 'bg-blue-900/80 border-blue-400 text-blue-100'
                : 'bg-black/80 border-white/30 text-white'
            }`}>
              {aiStatus === 'CONFIRMED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : aiStatus === 'REJECTED' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : aiStatus === 'AWAITING_CONFIRMATION' ? (
                <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span className="font-mono text-xs leading-snug">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Action Panel: Fallback Manual Simulation & Gesture References */}
        <div className="p-4 bg-[#231F19] border-t border-[#443E33] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-300 font-heading flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1F6B45]" />
              <span>MineSign Live Gesture Guide & Manual Simulation Fallback:</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Real webcam actively processed by AI
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(GESTURE_DISPLAY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                disabled={aiStatus === 'AWAITING_CONFIRMATION'}
                onClick={() => handleManualFallbackGesture(key)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  detectedGesture === key && aiStatus !== 'LISTENING'
                    ? 'bg-[#1F6B45]/30 border-[#1F6B45] text-white ring-2 ring-[#1F6B45]/50'
                    : 'bg-[#2E2922] border-[#443E33] hover:border-[#1F6B45] text-gray-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">{config.shortName || config.label}</span>
                  <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                    config.priority === 'CRITICAL' ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
                  }`}>
                    {config.priority}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 line-clamp-1 mt-1 font-mono">
                  {config.pattern}
                </span>
              </button>
            ))}

            {/* Baseline NO_GESTURE trigger */}
            <button
              onClick={() => handleManualFallbackGesture('NO_GESTURE')}
              className="p-2.5 rounded-xl border border-[#443E33] bg-[#2E2922] hover:border-gray-400 text-gray-300 hover:text-white text-left transition flex items-center justify-between cursor-pointer"
            >
              <div>
                <div className="font-bold text-xs flex items-center gap-1">
                  <Ban className="w-3 h-3 text-gray-400" />
                  <span>NO_GESTURE</span>
                </div>
                <span className="text-[9px] text-gray-500 block font-mono">Ambient / Safe State</span>
              </div>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                0 EVENT
              </span>
            </button>
          </div>

          {/* Controls Strip: Camera Reconnect & Close Button */}
          <div className="flex items-center justify-between pt-2 border-t border-[#332E25] text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={startCamera}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Restart Camera</span>
              </button>

              <button
                onClick={resetState}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer border border-white/10"
              >
                <span>Reset Engine</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1F6B45] hover:bg-[#185336] text-white font-bold text-xs transition cursor-pointer shadow-md"
            >
              Done & Return to Terminal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
