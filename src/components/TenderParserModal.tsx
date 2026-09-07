import React, { useState } from "react";
import { parseTenderEligibilityText } from "../services/api";
import { TenderRule } from "../types/compliance";
import { FileText, Sparkles, CheckCircle2, AlertCircle, X } from "lucide-react";

interface TenderParserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TenderParserModal: React.FC<TenderParserModalProps> = ({ isOpen, onClose }) => {
  const [tenderText, setTenderText] = useState<string>(`Section 3: Eligibility & Pre-Qualification Criteria
3.1 Debarment: The bidder must not be under active debarment or holiday listing by GeM or any Central Ministry as of the bid closing date.
3.2 Tax & GST Compliance: The bidder must have an active GST registration and have filed all monthly returns (GSTR-3B) without persistent default. PAN must be linked and active with income tax returns filed for the last 2 financial years.
3.3 Make in India (MII): Only Class-I Local Suppliers with local content of at least 50% are eligible to claim purchase preference under the Public Procurement Order 2017.
3.4 OEM Authorization: For all quoted server hardware and networking equipment, the bidder must submit a Manufacturer's Authorization Form (MAF) specific to this Bid Number.
3.5 Social Security: The bidder must produce proof of EPF and ESIC registration and compliance if the establishment employs 20 or more staff.`);

  const [loading, setLoading] = useState(false);
  const [parsedRules, setParsedRules] = useState<TenderRule[] | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    setLoading(true);
    try {
      const rules = await parseTenderEligibilityText(tenderText);
      setParsedRules(rules);
    } catch (err) {
      console.error("Failed to parse tender text:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-base">Tender Eligibility Clause Parser (Section 5)</h3>
              <p className="text-xs text-slate-400">
                Transforms unstructured tender eligibility specifications into structured rule objects
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Unstructured Tender Eligibility Clauses / Additional Terms &amp; Conditions (ATC):
            </label>
            <textarea
              rows={6}
              value={tenderText}
              onChange={(e) => setTenderText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleParse}
              disabled={loading || !tenderText.trim()}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Extract Structured Eligibility Rules</span>
            </button>
          </div>

          {parsedRules && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Extracted Rule Objects</span>
                <span className="text-xs font-normal text-slate-500">
                  ({parsedRules.length} rules detected)
                </span>
              </h4>

              <div className="space-y-2">
                {parsedRules.map((r, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{r.rule_id}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          {r.category}
                        </span>
                        {r.mandatory && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            Mandatory
                          </span>
                        )}
                      </div>
                      {r.threshold_value !== null && (
                        <span className="text-[11px] font-mono text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Threshold: {r.threshold_value}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-sans">{r.requirement}</p>
                    <p className="text-[10px] text-slate-500 italic">Source: {r.source_clause}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
