import React, { useState } from "react";
import { queryRAG } from "../services/api";
import { RAGQueryItem } from "../types/compliance";
import { Send, Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface OfficerRagChatProps {
  initialQueries?: RAGQueryItem[];
  activeQueryText?: string;
  onClearActiveQuery?: () => void;
}

export const OfficerRagChat: React.FC<OfficerRagChatProps> = ({
  initialQueries = [],
  activeQueryText,
  onClearActiveQuery
}) => {
  const [queryInput, setQueryInput] = useState(activeQueryText || "");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<RAGQueryItem[]>(initialQueries);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);

  // Sync if active query text changed from external click
  React.useEffect(() => {
    if (activeQueryText) {
      setQueryInput(activeQueryText);
      handleSendQuery(activeQueryText);
      onClearActiveQuery?.();
    }
  }, [activeQueryText]);

  const quickPrompts = [
    "EPFO applicability employee count threshold",
    "Make in India Class-1 local content percentage minimum requirement",
    "Micro enterprise classification turnover and investment thresholds",
    "What causes GSTIN suspension or e-way bill blocking under CGST rules?",
    "Under what conditions are startups exempt from prior turnover and EMD?"
  ];

  const handleSendQuery = async (textToSend?: string) => {
    const text = textToSend || queryInput;
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const record = await queryRAG(text);
      setMessages((prev) => [record, ...prev]);
      if (!textToSend) setQueryInput("");
    } catch (err) {
      console.error("RAG query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Officer Regulatory Q&amp;A Assistant</h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Hybrid Dense + BM25 RRF (Section 6)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Grounded strictly in official Acts, Gazettes, MSME notifications, and GeM General Terms.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>{showTechnicalDetails ? "Hide Search Mechanics" : "Show Search Mechanics"}</span>
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Suggested Queries:
        </span>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => {
              setQueryInput(qp);
              handleSendQuery(qp);
            }}
            className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-md border border-slate-200 transition-colors truncate max-w-xs"
            title={qp}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask a regulatory threshold question (e.g. 'EPFO applicability threshold', 'Class-1 MII percentage')..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Query RAG</span>
          </button>
        </form>
      </div>

      {/* Results Feed */}
      <div className="p-4 sm:p-5 space-y-4 max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Ask any question regarding GeM procurement guidelines, MSME thresholds, EPFO/ESIC rules, or Make in India criteria.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.query_id}
              className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3"
            >
              {/* Question & Confidence Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {m.query_id}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    "{m.query_text}"
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      m.confidence_flag === "grounded"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    {m.confidence_flag === "grounded" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Grounded In Corpus
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-rose-600" /> Insufficient Context
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Grounded Answer */}
              <div className="text-xs leading-relaxed text-slate-800 bg-white p-3.5 rounded-lg border border-slate-200 whitespace-pre-line font-sans">
                {m.llm_answer}
              </div>

              {/* Citations list */}
              {m.cited_sources && m.cited_sources.length > 0 && (
                <div className="bg-sky-50/70 p-2.5 rounded-lg border border-sky-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 block mb-1">
                    Traceable Citations for Audit Trail:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {m.cited_sources.map((c, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium bg-white text-sky-800 px-2 py-0.5 rounded border border-sky-300 shadow-2xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical RRF Retrieval Ranking (Section 6.2) */}
              {showTechnicalDetails && m.retrieved_chunks && m.retrieved_chunks.length > 0 && (
                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-[11px] space-y-2">
                  <span className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider">
                    Hybrid Retrieval Engine Diagnostics (Qdrant Dense + BM25 Sparse Reciprocal Rank Fusion):
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {m.retrieved_chunks.map((ch) => (
                      <div
                        key={ch.chunk_id}
                        className="bg-white p-2 rounded border border-slate-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[10px] truncate max-w-[140px]">
                            {ch.chunk_id}
                          </span>
                          <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1 rounded">
                            RRF: {ch.rrf_score}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 truncate">
                          {ch.source_document}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                          <span>Dense Rank: #{ch.dense_rank}</span>
                          <span>Sparse Rank: #{ch.sparse_rank}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
