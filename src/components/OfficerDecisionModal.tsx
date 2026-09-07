import React, { useState } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, X } from "lucide-react";
import { submitOfficerDecision } from "../services/api";
import { ComplianceReport } from "../types/compliance";

interface OfficerDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bidderId: string;
  bidderName: string;
  currentDecision: "qualified" | "disqualified" | "pending_review" | null;
  currentNotes: string | null;
  onSuccess: (updatedReport: ComplianceReport) => void;
}

export const OfficerDecisionModal: React.FC<OfficerDecisionModalProps> = ({
  isOpen,
  onClose,
  bidderId,
  bidderName,
  currentDecision,
  currentNotes,
  onSuccess
}) => {
  const [decision, setDecision] = useState<"qualified" | "disqualified" | "pending_review">(
    currentDecision || "qualified"
  );
  const [notes, setNotes] = useState(currentNotes || "");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await submitOfficerDecision(bidderId, decision, notes);
      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error("Failed to record officer decision:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Procurement Officer Determination</h3>
              <p className="text-xs text-slate-400">Bidder: {bidderName} ({bidderId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs">
          <div>
            <label className="font-bold text-slate-800 uppercase tracking-wider block mb-2 text-[11px]">
              Select Final Official Determination:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDecision("qualified")}
                className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                  decision === "qualified"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${decision === "qualified" ? "text-emerald-600" : "text-slate-400"}`} />
                <span className="font-bold">Qualify Bidder</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("disqualified")}
                className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                  decision === "disqualified"
                    ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <XCircle className={`w-5 h-5 ${decision === "disqualified" ? "text-rose-600" : "text-slate-400"}`} />
                <span className="font-bold">Disqualify</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision("pending_review")}
                className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center gap-1.5 ${
                  decision === "pending_review"
                    ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Clock className={`w-5 h-5 ${decision === "pending_review" ? "text-amber-600" : "text-slate-400"}`} />
                <span className="font-bold">Seek Clarification</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 uppercase tracking-wider block mb-1 text-[11px]">
              Procurement Officer Findings &amp; Justification Notes:
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter official reasoning, clarification letters issued, or statutory references considered..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Notes are indelibly written to the permanent audit trail (Schema 4/7) with officer timestamp.
            </p>
          </div>

          {/* Legal Notice */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Human Authority Confirmation:</strong> You are certifying this action under GeM Procurement General Terms &amp; Conditions (GTC). The AI system recommendations have served purely as non-binding technical advisory assistance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow transition-colors disabled:opacity-50"
          >
            {loading ? "Recording Signature..." : "Record Official Decision"}
          </button>
        </div>
      </div>
    </div>
  );
};
