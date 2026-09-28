import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export default function GovBreadcrumbs({ items = [], onBack, onHome, showNavControls = false }) {
  return (
    <div className="bg-white border-b border-[#e2e8f0] px-4 lg:px-8 py-2 text-xs text-[#64748b] flex items-center justify-between gap-3 overflow-x-auto shadow-2xs">
      <div className="flex items-center gap-1.5 min-w-0">
        <button 
          onClick={onHome} 
          className="flex items-center gap-1 text-[#0f2942] font-semibold hover:text-[#213d77] transition shrink-0"
          title="Return to Portal Home"
        >
          <Home className="w-3.5 h-3.5 text-[#213d77]" />
          <span>CoalGuard</span>
        </button>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = typeof item === 'string' ? item : item?.label;
          const onClick = typeof item === 'object' && item?.onClick ? item.onClick : null;
          return (
            <React.Fragment key={index}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {onClick && !isLast ? (
                <button
                  onClick={onClick}
                  className="text-slate-600 hover:text-[#0f2942] hover:underline font-medium truncate transition cursor-pointer"
                >
                  {label}
                </button>
              ) : (
                <span className={isLast ? 'font-bold text-[#0f2942] truncate' : 'text-slate-600 truncate'}>
                  {label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {showNavControls && (
        <div className="flex items-center gap-2 shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1e293b] font-bold text-[11px] border border-slate-300 transition shadow-2xs cursor-pointer"
              title="Return to previous section"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-700" />
              <span>Go Back</span>
            </button>
          )}
          {onHome && (
            <button
              onClick={onHome}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#213d77] hover:bg-[#162d5a] text-white font-bold text-[11px] transition shadow-2xs cursor-pointer"
              title="Return to Portal Home Dashboard"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Go Home</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

