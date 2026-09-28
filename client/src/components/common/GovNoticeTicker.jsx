import React from 'react';
import { Bell, Info, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function GovNoticeTicker({ notices }) {
  const defaultNotices = [
    { id: 1, text: 'DGMS Statutory Compliance Circular No. 04/2026: Mandatory PPE compliance and slope stability review in Zone 4.', tag: 'CIRCULAR' },
    { id: 2, text: 'Demo Simulation Mode active: Video telemetry running across Zone 1 - Zone 5 nodes.', tag: 'SIMULATION' },
    { id: 3, text: 'Shift Handover Protocol: All supervisor field inspection tickets must be verified prior to shift closure.', tag: 'STATUTORY' }
  ];

  const displayList = notices || defaultNotices;

  return (
    <div className="w-full bg-[#e0f2fe] border-y border-[#bae6fd] px-4 lg:px-8 py-2 text-xs flex items-center justify-between gap-4 text-[#0369a1]">
      <div className="flex items-center gap-2 overflow-hidden w-full">
        <span className="flex items-center gap-1 font-black bg-[#0284c7] text-white px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider shrink-0">
          <Bell className="w-3 h-3 animate-pulse" />
          OFFICIAL NOTICE
        </span>
        <div className="truncate font-medium text-slate-800">
          {displayList[0]?.text}
        </div>
      </div>
    </div>
  );
}
