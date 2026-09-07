import React, { useEffect, useState } from "react";
import { fetchAuditTrail } from "../services/api";
import { AuditTrailEvent } from "../types/compliance";
import { Clock, Shield, Sparkles, User, FileText, CheckCircle2, X } from "lucide-react";

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditTrailEvent[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAuditTrail()
        .then((data) => setLogs(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (filter === "ALL") return true;
    return l.category.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-base">GeM Bid Compliance Audit Trail Log</h3>
              <p className="text-xs text-slate-400">
                Immutable record of all evaluations, RAG retrievals, and procurement officer decisions
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

        {/* Filter bar */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider mr-1">
              Filter Log:
            </span>
            {["ALL", "EVALUATION", "RAG", "DECISION", "DOCUMENT"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === cat
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {filteredLogs.length} Events Recorded
          </span>
        </div>

        {/* Log Entries List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading audit events...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No audit events found.</div>
          ) : (
            filteredLogs.map((item) => {
              let icon = <Clock className="w-4 h-4 text-slate-600" />;
              let badgeColor = "bg-slate-200 text-slate-800";

              if (item.category === "decision") {
                icon = <User className="w-4 h-4 text-emerald-600" />;
                badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
              } else if (item.category === "rag") {
                icon = <Sparkles className="w-4 h-4 text-sky-600" />;
                badgeColor = "bg-sky-100 text-sky-800 border-sky-300";
              } else if (item.category === "evaluation") {
                icon = <Shield className="w-4 h-4 text-indigo-600" />;
                badgeColor = "bg-indigo-100 text-indigo-800 border-indigo-300";
              } else if (item.category === "document") {
                icon = <FileText className="w-4 h-4 text-amber-600" />;
                badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
              }

              return (
                <div
                  key={item.event_id}
                  className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-100">{icon}</div>
                      <div>
                        <span className="font-bold text-slate-900">{item.action}</span>
                        <span className="text-slate-400 text-[11px] ml-2">by {item.actor}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-sans">{item.details}</p>

                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Event ID: {item.event_id}</span>
                    {item.bidder_id && <span>Bidder: {item.bidder_id}</span>}
                    {item.related_id && <span>Ref: {item.related_id}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
