import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Camera, MapPin, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function TwoStepViolationModal({ isOpen, onClose, violation, onStatusUpdated }) {
  const { user, token } = useAuth();
  
  const [proofPhoto, setProofPhoto] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [geoCoords, setGeoCoords] = useState({ lat: 23.7508, lng: 86.4192 });

  const [supervisorRemarks, setSupervisorRemarks] = useState('');
  const [isApproved, setIsApproved] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !violation) return null;

  const isSupervisorOrAbove = ['authority', 'supervisor', 'corporate', 'regulator'].includes(user?.role);
  const isStep1Done = violation.status === 'rectification_submitted' || violation.rectification_proof_photo_url;
  const isFullyClosed = violation.status === 'verified_closed';

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProofPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/violations/${violation.id}/submit-rectification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          proof_photo_url: proofPhoto || 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
          latitude: geoCoords.lat,
          longitude: geoCoords.lng,
          action_notes: actionNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof');

      setSuccessMsg('Step 1 complete! Rectification proof logged. Awaiting supervisor site verification.');
      setTimeout(() => {
        if (onStatusUpdated) onStatusUpdated();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClosure = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/violations/${violation.id}/verify-closure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remarks: supervisorRemarks,
          is_approved: isApproved
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccessMsg(isApproved ? 'Violation verified and officially CLOSED in tamper-evident ledger!' : 'Rectification rejected.');
      setTimeout(() => {
        if (onStatusUpdated) onStatusUpdated();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B16]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#DDD6C7] rounded-3xl shadow-xl p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DDD6C7]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E3EFE8] text-[#1F6B45] flex items-center justify-center border border-[#1F6B45]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#1E1B16] font-heading">Two-Step Violation Closure Workflow</h3>
              <p className="text-xs text-[#6B6558]">DGMS Statutory Verification Standard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#6B6558] hover:text-[#1E1B16] hover:bg-[#EFEBE2]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Violation Context Card */}
        <div className="mt-4 p-4 rounded-2xl bg-[#F7F5F0] border border-[#DDD6C7] text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1E1B16] text-sm font-heading">{violation.title}</span>
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold ${
              violation.severity === 'critical' ? 'bg-[#F5E2DE] text-[#A13D2F] border border-[#A13D2F]/30' :
              violation.severity === 'high' ? 'bg-[#F5EDD6] text-[#3A2E00] border border-[#B8860B]/30' :
              'bg-[#E4EAF0] text-[#1B3A5C] border border-[#1B3A5C]/30'
            }`}>
              {violation.severity} Severity
            </span>
          </div>
          <p className="text-[#6B6558]">Location: {violation.location_description}</p>
          <p className="text-[#1E1B16] font-medium font-mono">Action Required: {violation.corrective_action_required}</p>
        </div>

        {/* Progress Tracker */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className={`p-3.5 rounded-2xl border text-xs ${
            isStep1Done
              ? 'bg-[#E1F0E6] border-[#2E7D4F]/30 text-[#2E7D4F]'
              : 'bg-[#F5EDD6] border-[#B8860B]/30 text-[#3A2E00]'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1 font-heading">
              <span className="w-5 h-5 rounded-full bg-[#2E7D4F] text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>Step 1: Rectification Proof</span>
            </div>
            <p className="text-[11px] opacity-90">
              {isStep1Done ? '✅ Geo-photo proof submitted' : '⏳ Field photo upload pending'}
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border text-xs ${
            isFullyClosed
              ? 'bg-[#E1F0E6] border-[#2E7D4F]/30 text-[#2E7D4F]'
              : isStep1Done
              ? 'bg-[#F5EDD6] border-[#B8860B]/30 text-[#3A2E00]'
              : 'bg-[#EFEBE2] border-[#DDD6C7] text-[#6B6558]'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1 font-heading">
              <span className="w-5 h-5 rounded-full bg-[#DDD6C7] text-[#1E1B16] text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Step 2: Supervisor Sign-off</span>
            </div>
            <p className="text-[11px] opacity-90">
              {isFullyClosed ? '✅ Officially verified & closed' : isStep1Done ? '⏳ Ready for physical review' : '🔒 Locked until Step 1'}
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-[#E1F0E6] border border-[#2E7D4F]/30 rounded-xl text-xs text-[#2E7D4F] font-bold flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#2E7D4F] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#F5E2DE] border border-[#A13D2F]/30 rounded-xl text-xs text-[#A13D2F] font-bold flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#A13D2F] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1 FORM */}
        {!isStep1Done && (
          <form onSubmit={handleSubmitProof} className="space-y-3">
            <h4 className="text-xs font-bold text-[#1E1B16] uppercase tracking-wider font-heading">Step 1: Upload Field Rectification Photo</h4>
            
            <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-[#DDD6C7] hover:border-[#1F6B45] bg-[#F7F5F0] cursor-pointer transition">
              <Camera className="w-8 h-8 text-[#1F6B45] mb-1" />
              <span className="text-xs font-bold text-[#1E1B16]">Attach Geo-tagged Physical Proof</span>
              <span className="text-[11px] text-[#6B6558] font-mono">Captures GPS coordinates automatically</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleProofUpload} className="hidden" />
            </label>

            {proofPhoto && (
              <div className="p-2.5 bg-[#F7F5F0] rounded-2xl border border-[#DDD6C7] flex items-center gap-3">
                <img src={proofPhoto} alt="Proof" className="w-14 h-14 object-cover rounded-xl border border-[#DDD6C7]" />
                <div className="text-xs text-[#1E1B16] font-mono">
                  <p className="font-bold text-[#1E1B16]">GPS Locked:</p>
                  <p className="text-[#6B6558]">{geoCoords.lat.toFixed(4)}° N, {geoCoords.lng.toFixed(4)}° E</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">Corrective Action Summary</label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Explain the work carried out (e.g., berm reconstructed to 2.4m height)..."
                rows={2}
                className="w-full bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl p-2.5 text-xs text-[#1E1B16] placeholder-[#6B6558] focus:outline-none focus:border-[#1F6B45]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#1F6B45] hover:bg-[#17512F] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 font-heading"
            >
              {loading ? 'Submitting...' : 'Submit Rectification for Supervisor Review'}
            </button>
          </form>
        )}

        {/* STEP 2 FORM */}
        {isStep1Done && !isFullyClosed && (
          <form onSubmit={handleVerifyClosure} className="space-y-3">
            <h4 className="text-xs font-bold text-[#1E1B16] uppercase tracking-wider font-heading">Step 2: Supervisor Verification & Final Sign-off</h4>
            
            {violation.rectification_proof_photo_url && (
              <div className="p-3 bg-[#F7F5F0] rounded-2xl border border-[#DDD6C7] flex items-center gap-4">
                <img src={violation.rectification_proof_photo_url} alt="Proof Submitted" className="w-20 h-20 object-cover rounded-xl border border-[#DDD6C7]" />
                <div className="text-xs space-y-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E1F0E6] text-[#2E7D4F] font-bold border border-[#2E7D4F]/30 font-mono">
                    Step 1 Proof Submitted
                  </span>
                  <p className="text-[#1E1B16] font-mono text-[11px]">GPS: {violation.rectification_latitude || 23.7508}° N, {violation.rectification_longitude || 86.4192}° E</p>
                  <p className="text-[#6B6558] text-[11px]">{violation.rectification_notes || 'Physical corrective measures applied.'}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1E1B16] mb-1 font-mono uppercase">Supervisor Inspection Remarks & Certificate</label>
              <textarea
                value={supervisorRemarks}
                onChange={(e) => setSupervisorRemarks(e.target.value)}
                placeholder="I have physically verified the site and confirm full compliance with DGMS circulars..."
                rows={2}
                className="w-full bg-[#F7F5F0] border border-[#DDD6C7] rounded-xl p-2.5 text-xs text-[#1E1B16] placeholder-[#6B6558] focus:outline-none focus:border-[#1F6B45]"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsApproved(false)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition ${
                  !isApproved ? 'bg-[#A13D2F] text-white border-[#A13D2F]' : 'border-[#A13D2F] text-[#A13D2F] hover:bg-[#F5E2DE]'
                }`}
              >
                Reject Proof (Re-open)
              </button>
              <button
                type="button"
                onClick={() => setIsApproved(true)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition ${
                  isApproved ? 'bg-[#1F6B45] text-white border-[#1F6B45] shadow-xs' : 'border-[#1B3A5C] text-[#1B3A5C] hover:bg-[#E4EAF0]'
                }`}
              >
                Certify & Close Violation
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#2E7D4F] hover:bg-[#256540] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 font-mono"
            >
              {loading ? 'Sealing Audit Block...' : 'Finalize Verification in Blockchain-Lite Ledger'}
            </button>
          </form>
        )}

        {isFullyClosed && (
          <div className="p-4 bg-[#E1F0E6] border border-[#2E7D4F]/30 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#2E7D4F] mx-auto" />
            <h4 className="text-sm font-bold text-[#1E1B16] font-heading">Violation Officially Closed</h4>
            <p className="text-xs text-[#6B6558]">Verified by: {violation.verified_by_supervisor_name || 'Safety Officer'}</p>
            <p className="text-[11px] text-[#6B6558] font-mono">{violation.closure_remarks}</p>
          </div>
        )}

      </div>
    </div>
  );
}
