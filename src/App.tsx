import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { BidderSelector } from "./components/BidderSelector";
import { BidderOverviewCard } from "./components/BidderOverviewCard";
import { OfficerRecommendationCard } from "./components/OfficerRecommendationCard";
import { CheckBreakdownTable } from "./components/CheckBreakdownTable";
import { DocumentPortalViewer } from "./components/DocumentPortalViewer";
import { OfficerRagChat } from "./components/OfficerRagChat";
import { OfficerDecisionModal } from "./components/OfficerDecisionModal";
import { AuditTrailModal } from "./components/AuditTrailModal";
import { TenderParserModal } from "./components/TenderParserModal";
import { DocExtractorModal } from "./components/DocExtractorModal";
import { fetchBidders, fetchBidderDetail, triggerEvaluation, fetchRAGHistory } from "./services/api";
import { BidderSummary, BidderDetail, RAGQueryItem } from "./types/compliance";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function App() {
  const [bidders, setBidders] = useState<BidderSummary[]>([]);
  const [selectedBidderId, setSelectedBidderId] = useState<string>("BID-101");
  const [bidderDetail, setBidderDetail] = useState<BidderDetail | null>(null);
  const [ragHistory, setRagHistory] = useState<RAGQueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activeRagQuery, setActiveRagQuery] = useState<string>("");

  // Modals state
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTenderParserOpen, setIsTenderParserOpen] = useState(false);
  const [isDocExtractorOpen, setIsDocExtractorOpen] = useState(false);

  // Initial load
  useEffect(() => {
    loadAllBidders();
    loadRAGHistory();
  }, []);

  // Load single bidder detail on selection change
  useEffect(() => {
    if (selectedBidderId) {
      loadBidderDetail(selectedBidderId);
    }
  }, [selectedBidderId]);

  const loadAllBidders = async () => {
    try {
      const data = await fetchBidders();
      setBidders(data.bidders);
      if (data.bidders.length > 0 && !selectedBidderId) {
        setSelectedBidderId(data.bidders[0].bidder_id);
      }
    } catch (err) {
      console.error("Failed to load bidders:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBidderDetail = async (id: string) => {
    setLoading(true);
    try {
      const detail = await fetchBidderDetail(id);
      setBidderDetail(detail);
    } catch (err) {
      console.error("Failed to load bidder detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRAGHistory = async () => {
    try {
      const data = await fetchRAGHistory();
      setRagHistory(data.queries || []);
    } catch (err) {
      console.error("Failed to load RAG history:", err);
    }
  };

  const handleReevaluate = async (id: string) => {
    setEvaluating(true);
    try {
      const updatedReport = await triggerEvaluation(id);
      if (bidderDetail && bidderDetail.bidder.bidder_id === id) {
        setBidderDetail({
          ...bidderDetail,
          report: updatedReport
        });
      }
      await loadAllBidders();
      await loadRAGHistory();
    } catch (err) {
      console.error("Re-evaluation failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleAskRAG = (query: string, checkId?: string) => {
    setActiveRagQuery(query);
    // Smooth scroll to RAG Chat section
    const el = document.getElementById("officer-rag-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* 1. Official Header */}
      <Header
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenTenderParser={() => setIsTenderParserOpen(true)}
        onOpenDocExtractor={() => setIsDocExtractorOpen(true)}
      />

      {/* 2. Top Bidder Selector Bar */}
      <BidderSelector
        bidders={bidders}
        selectedBidderId={selectedBidderId}
        onSelectBidder={(id) => setSelectedBidderId(id)}
        onReevaluate={handleReevaluate}
        isEvaluating={evaluating}
      />

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && !bidderDetail ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-xs font-semibold">Loading verification profile and evaluation...</p>
          </div>
        ) : bidderDetail ? (
          <div>
            {/* Bidder Overview & Score Card (with Gatekeeper Hard Block banner) */}
            <BidderOverviewCard
              bidder={bidderDetail.bidder}
              report={bidderDetail.report}
              onOpenDecisionModal={() => setIsDecisionModalOpen(true)}
            />

            {/* AI Decision Support Recommendation Card */}
            {bidderDetail.report && (
              <OfficerRecommendationCard
                recommendation={bidderDetail.report.ai_recommendation}
                riskLevel={bidderDetail.report.risk_level}
                gatekeeperTriggered={bidderDetail.report.gatekeeper_triggered}
              />
            )}

            {/* Deterministic Compliance Check Results Table */}
            {bidderDetail.report && (
              <CheckBreakdownTable
                checks={bidderDetail.report.check_results}
                onAskRAG={handleAskRAG}
              />
            )}

            {/* Document & Simulated Portal Registry Cross-Checker */}
            <DocumentPortalViewer
              documents={bidderDetail.documents}
              portals={bidderDetail.portals}
              resolvedFields={bidderDetail.bidder.fields}
            />

            {/* Officer Regulatory RAG Q&A Assistant */}
            <div id="officer-rag-section">
              <OfficerRagChat
                initialQueries={ragHistory}
                activeQueryText={activeRagQuery}
                onClearActiveQuery={() => setActiveRagQuery("")}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 text-sm">
            Please select a bidder to view compliance evaluation.
          </div>
        )}
      </main>

      {/* Footer Notice */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="text-slate-300 font-medium">
              Government e-Marketplace (GeM) Bid Compliance Verification Prototype
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Built strictly per GeM Verification Specification • Architecture: Python Deterministic Rule Engine + Hybrid RAG + React Dashboard
            </p>
          </div>
          <div className="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded">
            All portal queries are simulated sandbox mocks.
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {bidderDetail && (
        <OfficerDecisionModal
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          bidderId={bidderDetail.bidder.bidder_id}
          bidderName={bidderDetail.bidder.legal_name}
          currentDecision={bidderDetail.report?.officer_decision || null}
          currentNotes={bidderDetail.report?.officer_notes || null}
          onSuccess={(updated) => {
            setBidderDetail({ ...bidderDetail, report: updated });
            loadAllBidders();
          }}
        />
      )}

      <AuditTrailModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <TenderParserModal
        isOpen={isTenderParserOpen}
        onClose={() => setIsTenderParserOpen(false)}
      />

      <DocExtractorModal
        isOpen={isDocExtractorOpen}
        onClose={() => setIsDocExtractorOpen(false)}
        onDocExtracted={() => {
          if (selectedBidderId) loadBidderDetail(selectedBidderId);
        }}
      />
    </div>
  );
}
