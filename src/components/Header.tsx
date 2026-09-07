import React from "react";
import { ShieldCheck, AlertCircle, User, FileText, Sparkles } from "lucide-react";

interface HeaderProps {
  onOpenAudit: () => void;
  onOpenTenderParser: () => void;
  onOpenDocExtractor: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAudit, onOpenTenderParser, onOpenDocExtractor }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Emblem */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-inner text-white font-bold text-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                GeM Portal
              </span>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Bid Compliance Verification Platform
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Tender Ref: <strong className="text-slate-200">GEM/2026/B/894120</strong></span>
              <span>•</span>
              <span className="truncate max-w-xs md:max-w-md">HPC Workstations &amp; Network Infrastructure</span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Simulated Notice Pill */}
          <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-700/50 text-amber-300 text-xs px-2.5 py-1 rounded-md" title="Government portal APIs are simulated/mocked for prototype fidelity">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Portals: <strong>Simulated Mocks</strong></span>
          </div>

          {/* Quick Tools */}
          <button
            onClick={onOpenTenderParser}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Tender Parser</span>
          </button>

          <button
            onClick={onOpenDocExtractor}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Document OCR</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <span>Audit Trail</span>
          </button>

          {/* Officer Profile Badge */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-700 text-xs text-slate-300">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-200">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-medium text-slate-100 leading-tight">Procurement Officer</p>
              <p className="text-[10px] text-slate-400 leading-tight">GeM Auth #DL-4819</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
