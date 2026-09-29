import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mic, MicOff, Camera, MapPin, Sparkles, X, CheckCircle, AlertOctagon } from 'lucide-react';

export default function VoiceHazardModal({ isOpen, onClose, onReportSubmitted, onSuccess, initialText = '' }) {
  const { user, token, lang, t, saveOfflineReport } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState(initialText || '');
  const [severity, setSeverity] = useState('medium');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [locationCoords, setLocationCoords] = useState({ lat: 23.7508, lng: 86.4192 });
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSuggestedCategory = async (text) => {
    if (!text || text.length < 5) return;
    try {
      const res = await fetch('/api/field-reports/suggest-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedCategory(data.suggestedCategory);
      }
    } catch (e) {
      console.error('Categorization error:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTranscript('');
      setSuggestedCategory('');
      setSuccessMsg('');
      setIsListening(false);
      return;
    }

    if (initialText) {
      setTranscript(initialText);
      fetchSuggestedCategory(initialText);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Geolocation fallback used')
      );
    }
  }, [isOpen, initialText]);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. You can type the description below.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = async (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText);

        if (currentText.length > 5) {
          try {
            const res = await fetch('/api/field-reports/suggest-category', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ text: currentText })
            });
            if (res.ok) {
              const data = await res.json();
              setSuggestedCategory(data.suggestedCategory);
            }
          } catch (e) {
            console.error('Categorization error:', e);
          }
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error('Speech recognition failed to initialize:', err);
      setIsListening(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    setIsSubmitting(true);

    const reportPayload = {
      report_type: 'hazard_observation',
      description: transcript.trim(),
      audio_transcript: transcript.trim(),
      suggested_category: suggestedCategory || 'General Mining Safety Observation',
      category: suggestedCategory || 'General Mining Safety Observation',
      severity,
      source: 'MINER_VOICE',
      zone: 'Zone 4 (Underground Face 3)',
      photo_url: photoUrl || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
      latitude: locationCoords.lat,
      longitude: locationCoords.lng,
      timestamp: new Date().toISOString()
    };

    const triggerCallbacks = () => {
      if (onReportSubmitted) onReportSubmitted();
      if (onSuccess) onSuccess();
    };

    if (!navigator.onLine) {
      saveOfflineReport(reportPayload);
      setSuccessMsg('Saved locally in offline queue! Will sync when connection restores.');
      setIsSubmitting(false);
      setTimeout(() => {
        onClose();
        triggerCallbacks();
      }, 1800);
      return;
    }

    try {
      const res = await fetch('/api/field-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportPayload)
      });

      if (res.ok) {
        setSuccessMsg('Field Hazard Report broadcasted to Colliery Control Room!');
        setTimeout(() => {
          onClose();
          triggerCallbacks();
        }, 1200);
      } else {
        throw new Error('Server returned error');
      }
    } catch (err) {
      saveOfflineReport(reportPayload);
      setSuccessMsg('Network error. Saved safely in offline storage.');
      setTimeout(() => {
        onClose();
        triggerCallbacks();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B16]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#DDD6C7] rounded-3xl shadow-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DDD6C7]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E3EFE8] text-[#1F6B45] flex items-center justify-center border border-[#1F6B45]/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#1E1B16] font-heading">{t('voiceInput')}</h3>
              <p className="text-xs text-[#6B6558]">Speak in Hindi or English to report field hazards</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B6558] hover:text-[#1E1B16] hover:bg-[#EFEBE2]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-[#2E7D4F] mx-auto animate-bounce" />
            <p className="text-sm font-bold text-[#2E7D4F]">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            
            {/* Mic Pulse Button */}
            <div className="flex flex-col items-center justify-center py-5 bg-[#F7F5F0] rounded-2xl border border-[#DDD6C7]">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isListening
                    ? 'bg-[#A13D2F] text-white scale-110 shadow-[#A13D2F]/40 animate-pulse'
                    : 'bg-[#1F6B45] hover:bg-[#17512F] text-white hover:scale-105 shadow-[#1F6B45]/30'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
              <span className="text-xs font-bold text-[#1E1B16] mt-3">
                {isListening ? t('listening') : 'Tap microphone to start speaking'}
              </span>
              <span className="text-[11px] text-[#6B6558] font-mono">Language: {lang === 'hi' ? 'हिन्दी (Hindi)' : 'English (India)'}</span>
            </div>

            {/* Transcript Input */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">
                Hazard Description / वॉइस ट्रांसक्रिप्ट
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Transcribed text appears here... You can also type manually."
                rows={3}
                className="w-full bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl p-3 text-xs text-[#1E1B16] placeholder-[#6B6558] focus:outline-none focus:border-[#1F6B45] font-sans"
                required
              />
            </div>

            {/* AI Suggested Category */}
            {suggestedCategory && (
              <div className="p-2.5 rounded-xl bg-[#E4EAF0] border border-[#1B3A5C]/30 flex items-center gap-2 text-xs text-[#1B3A5C]">
                <Sparkles className="w-4 h-4 text-[#1B3A5C] shrink-0" />
                <div>
                  <span className="text-[#6B6558] font-medium">AI Categorization: </span>
                  <span className="font-bold text-[#1B3A5C]">{suggestedCategory}</span>
                </div>
              </div>
            )}

            {/* Severity & GPS Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl p-2.5 text-xs text-[#1E1B16] focus:outline-none focus:border-[#1F6B45]"
                >
                  <option value="low">Low (Routine Notice)</option>
                  <option value="medium">Medium (Requires Action)</option>
                  <option value="high">High (Immediate Danger)</option>
                  <option value="critical">Critical (Stop Work / Evacuation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">GPS Location</label>
                <div className="flex items-center gap-1.5 p-2.5 bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl text-xs text-[#1E1B16] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#A13D2F] shrink-0" />
                  <span className="truncate">{locationCoords.lat.toFixed(4)}° N, {locationCoords.lng.toFixed(4)}° E</span>
                </div>
              </div>
            </div>

            {/* Photo Capture */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">
                Photo Proof / तस्वीर जोड़ें
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#DDD6C7] hover:border-[#1F6B45] bg-[#F7F5F0] text-xs text-[#6B6558] transition">
                  <Camera className="w-4 h-4 text-[#1F6B45]" />
                  <span>{photoUrl ? 'Photo Attached' : 'Capture or Browse Photo'}</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {photoUrl && (
                  <img src={photoUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-[#DDD6C7]" />
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#1B3A5C] text-[#1B3A5C] hover:bg-[#E4EAF0] text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !transcript}
                className="flex-1 py-2.5 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : t('submitReport')}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
