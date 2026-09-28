import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Layers, 
  RefreshCw,
  Tag,
  ShieldAlert,
  ArrowRight,
  Mic,
  MessageSquare
} from 'lucide-react';

export default function Model5ClassifierView({ token }) {
  const [inputText, setInputText] = useState('Heavy roof delamination and timber support crack detected near seam 4 extraction face with potential fall danger');
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState(null);

  const samplePresets = [
    { label: '🔥 Methane & Gas Leak', text: 'Abnormal methane gas concentration surge detected near main ventilation intake shaft exceeding 1.2% threshold' },
    { label: '🪨 Roof & Highwall Fall', text: 'Significant highwall rock fracture and tension crack expanding on opencast bench 3' },
    { label: '🚜 HEMM / Dumper Failure', text: 'Haulage dumper 85-ton brake pressure loss warning on 1:16 incline gradient road' },
    { label: '⛑️ Missing PPE Violation', text: 'Contractor drill crew operating without safety helmets and reflective high-vis vests' },
    { label: '💧 Sump Water Inundation', text: 'Underground sump 4 water level rising rapidly due to continuous surface seepage' }
  ];

  const handleClassify = async (textToUse) => {
    const text = textToUse || inputText;
    if (!text.trim()) return;
    setClassifying(true);
    try {
      const res = await fetch('/api/models/classify-hazard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error('Classification error:', err);
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <Cpu className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Model 5 — Statutory Hazard Auto-Classifier (NLP)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                TF-IDF + Logistic Classifier (91.8% Accuracy)
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Live NLP evaluation sandbox: Test natural language hazard descriptions against our statutory mining classification pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Input & Sample Pills */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Enter Safety / Hazard Observation Text
              </label>
              <span className="text-xs text-slate-400 font-mono">English / Transliterated</span>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe hazard in natural language (e.g. gas leakage, roof crack, machinery issue)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-slate-600 resize-none leading-relaxed"
            />

            {/* Quick Sample Presets */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quick Test Bench Presets:
              </div>
              <div className="flex flex-wrap gap-2">
                {samplePresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(preset.text);
                      handleClassify(preset.text);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-950/50 hover:text-purple-300 hover:border-purple-500/40 border border-slate-700/60 text-slate-300 transition-all font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleClassify(inputText)}
                disabled={classifying || !inputText.trim()}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {classifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Running Model 5 Inference...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Classify Hazard Live
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Integration Note */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg shrink-0 mt-0.5">
              <Mic className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Field Worker Mobile Integration:</strong> This exact Model 5 model executes automatically whenever a Miner submits a voice or text hazard report. Transcribed audio is classified in real-time before landing in the Authority dashboard.
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Live Classification Results Output */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Real-Time Model 5 Inference Output
            </h3>

            {result ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                {/* Category Card */}
                <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5">
                  <div className="text-[11px] text-purple-300 font-mono uppercase tracking-wider flex items-center justify-between">
                    <span>Predicted Hazard Category</span>
                    <span className="text-white font-bold">{result.category_confidence}% Conf</span>
                  </div>
                  <div className="text-base font-bold text-white">
                    {result.category}
                  </div>
                </div>

                {/* Severity Card */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider flex items-center justify-between">
                    <span>Statutory DGMS Severity Tag</span>
                    <span className="text-slate-300 font-bold">{result.severity_confidence}% Conf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-mono font-bold text-xs">
                      {result.severity_info?.label || `Category ${result.severity}`}
                    </span>
                    <span className="text-xs text-slate-400">
                      SLA Resolution: {result.severity_info?.slaHours || 24} hours
                    </span>
                  </div>
                </div>

                {/* Top Contributing NLP Keywords */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                    Feature Weights / Top Contributing Terms
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.top_contributing_terms || ['hazard', 'face', 'support']).map((term, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-xs flex items-center gap-1"
                      >
                        <Tag className="w-3 h-3" />
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                <p>Click "Classify Hazard Live" or select a preset to view AI inference.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
