import React from "react";
import { BidderSummary } from "../types/compliance";
import { AlertOctagon, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";

interface BidderSelectorProps {
  bidders: BidderSummary[];
  selectedBidderId: string;
  onSelectBidder: (id: string) => void;
  onReevaluate: (id: string) => void;
  isEvaluating: boolean;
}

export const BidderSelector: React.FC<BidderSelectorProps> = ({
  bidders,
  selectedBidderId,
  onSelectBidder,
  onReevaluate,
  isEvaluating
}) => {
  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Evaluating Bidders:
          </span>
          <span className="text-xs font-medium text-slate-400">
            ({bidders.length} Submitted)
          </span>
        </div>

        {/* Bidder tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {bidders.map((b) => {
            const isSelected = b.bidder_id === selectedBidderId;

            // Risk badge color
            let riskBadgeBg = "bg-slate-100 text-slate-700";
            if (b.gatekeeper_triggered || b.risk_level === "high") {
              riskBadgeBg = "bg-rose-100 text-rose-800 border-rose-200";
            } else if (b.risk_level === "medium") {
              riskBadgeBg = "bg-amber-100 text-amber-800 border-amber-200";
            } else if (b.risk_level === "low") {
              riskBadgeBg = "bg-emerald-100 text-emerald-800 border-emerald-200";
            }

            // Officer Decision icon
            let decisionBadge = null;
            if (b.officer_decision === "qualified") {
              decisionBadge = <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"><CheckCircle2 className="w-2.5 h-2.5" /> Qualified</span>;
            } else if (b.officer_decision === "disqualified") {
              decisionBadge = <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"><XCircle className="w-2.5 h-2.5" /> Disqualified</span>;
            } else if (b.officer_decision === "pending_review") {
              decisionBadge = <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><Clock className="w-2.5 h-2.5" /> Review</span>;
            }

            return (
              <button
                key={b.bidder_id}
                onClick={() => onSelectBidder(b.bidder_id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-left transition-all border text-xs ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`font-semibold ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {b.legal_name.length > 24 ? b.legal_name.slice(0, 24) + "..." : b.legal_name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {b.bidder_id}
                    </span>
                    <span className={`text-[10px] ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                      • {b.entity_type}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    {b.gatekeeper_triggered && (
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-500" title="Gatekeeper Blocked" />
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${riskBadgeBg}`}>
                      {b.risk_level}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSelected ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700 border border-slate-200"}`}>
                      {b.overall_score !== null ? `${b.overall_score}%` : "—"}
                    </span>
                  </div>
                  {decisionBadge}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => onReevaluate(selectedBidderId)}
            disabled={isEvaluating}
            title="Re-run deterministic compliance evaluation"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? "animate-spin text-amber-600" : ""}`} />
            <span>Re-evaluate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
