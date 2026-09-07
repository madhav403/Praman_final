import React, { useState } from "react";
import { ComplianceCheck } from "../types/compliance";
import { CheckCircle2, XCircle, Clock, MinusCircle, ShieldAlert, Sparkles, BookOpen, Filter } from "lucide-react";

interface CheckBreakdownTableProps {
  checks: ComplianceCheck[];
  onAskRAG: (query: string, checkId?: string) => void;
}

export const CheckBreakdownTable: React.FC<CheckBreakdownTableProps> = ({ checks, onAskRAG }) => {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filteredChecks = checks.filter((c) => {
    if (activeFilter === "GATEKEEPERS") return c.is_gatekeeper;
    if (activeFilter === "STATUTORY") return c.rule_source === "statutory_fixed" && !c.is_gatekeeper;
    if (activeFilter === "TENDER") return c.rule_source === "tender_parsed";
    if (activeFilter === "RAG") return c.rule_source === "rag_threshold";
    if (activeFilter === "FAILED") return c.status === "fail";
    if (activeFilter === "PENDING") return c.status === "pending";
    return true;
  });

  const getStatusBadge = (status: string, applicability: string) => {
    if (applicability === "not_applicable" || status === "not_applicable") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          <MinusCircle className="w-3 h-3" /> N/A (Exempt)
        </span>
      );
    }
    if (status === "pass") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pass
        </span>
      );
    }
    if (status === "fail") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" /> Fail
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" /> Pending
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header & Filter Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Deterministic Compliance Check Results</span>
            <span className="text-xs font-normal text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              Schema 4 • {checks.length} Rules Evaluated
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Computed strictly by deterministic Python rule engine — never altered or hallucinated by LLM.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "ALL" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All ({checks.length})
          </button>
          <button
            onClick={() => setActiveFilter("GATEKEEPERS")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "GATEKEEPERS" ? "bg-rose-700 text-white" : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            Gatekeepers
          </button>
          <button
            onClick={() => setActiveFilter("STATUTORY")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "STATUTORY" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Statutory
          </button>
          <button
            onClick={() => setActiveFilter("TENDER")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "TENDER" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Tender-Specific
          </button>
          <button
            onClick={() => setActiveFilter("RAG")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "RAG" ? "bg-sky-700 text-white" : "bg-white text-sky-700 hover:bg-sky-50 border border-sky-200"
            }`}
          >
            RAG-Resolved
          </button>
          <button
            onClick={() => setActiveFilter("FAILED")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeFilter === "FAILED" ? "bg-rose-600 text-white" : "bg-white text-rose-600 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/75 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Rule Source</th>
              <th className="py-3 px-4 font-semibold w-2/5">Evaluation Finding &amp; Reason</th>
              <th className="py-3 px-4 font-semibold">Regulatory / Tender Reference</th>
              <th className="py-3 px-4 font-semibold text-right">RAG Inquiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">
                  No checks match the selected filter.
                </td>
              </tr>
            ) : (
              filteredChecks.map((c) => {
                const isFail = c.status === "fail";
                const isPending = c.status === "pending";

                return (
                  <tr
                    key={c.check_id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      c.is_gatekeeper && isFail
                        ? "bg-rose-50/40"
                        : isFail
                        ? "bg-rose-50/20"
                        : isPending
                        ? "bg-amber-50/20"
                        : ""
                    }`}
                  >
                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          {c.category}
                          {c.is_gatekeeper && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                              Gatekeeper
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.check_id}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(c.status, c.applicability)}
                    </td>

                    {/* Rule Source & Weight */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700 capitalize">
                          {c.rule_source.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Weight: {c.weight} pts
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-slate-800 leading-relaxed">
                      <span className={isFail ? "font-semibold text-rose-950" : ""}>
                        {c.reason}
                      </span>
                    </td>

                    {/* Source Reference */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-start gap-1 text-[11px]">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{c.source_reference}</span>
                      </div>
                    </td>

                    {/* RAG Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() =>
                          onAskRAG(
                            `Explain statutory regulatory rules and thresholds for ${c.category} in GeM procurement`,
                            c.check_id
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded transition-colors"
                        title="Query RAG knowledge base regarding this compliance standard"
                      >
                        <Sparkles className="w-3 h-3 text-sky-600" />
                        <span>RAG Context</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
