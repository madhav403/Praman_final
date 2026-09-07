import { BidderSummary, BidderDetail, ComplianceReport, RAGQueryItem, AuditTrailEvent, TenderRule } from "../types/compliance";

export async function fetchBidders(): Promise<{ bidders: BidderSummary[]; tenderRules: TenderRule[] }> {
  const res = await fetch("/api/bidders");
  if (!res.ok) throw new Error("Failed to fetch bidders");
  return res.json();
}

export async function fetchBidderDetail(bidderId: string): Promise<BidderDetail> {
  const res = await fetch(`/api/bidders/${bidderId}`);
  if (!res.ok) throw new Error("Failed to fetch bidder details");
  return res.json();
}

export async function triggerEvaluation(bidderId: string): Promise<ComplianceReport> {
  const res = await fetch(`/api/bidders/${bidderId}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Failed to evaluate compliance");
  const data = await res.json();
  return data.report;
}

export async function submitOfficerDecision(
  bidderId: string,
  decision: "qualified" | "disqualified" | "pending_review",
  notes?: string
): Promise<ComplianceReport> {
  const res = await fetch("/api/officer-decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bidder_id: bidderId,
      decision,
      notes: notes || "",
      officer_name: "P. Officer (GeM Auth #DL-4819)"
    })
  });
  if (!res.ok) throw new Error("Failed to save officer decision");
  const data = await res.json();
  return data.report;
}

export async function queryRAG(queryText: string, relatedCheckId?: string): Promise<RAGQueryItem> {
  const res = await fetch("/api/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_text: queryText,
      triggered_by: "officer_chat",
      related_check_id: relatedCheckId || null
    })
  });
  if (!res.ok) throw new Error("Failed to query RAG knowledge base");
  return res.json();
}

export async function fetchRAGHistory(): Promise<{ queries: RAGQueryItem[] }> {
  const res = await fetch("/api/rag/history");
  if (!res.ok) throw new Error("Failed to fetch RAG query history");
  return res.json();
}

export async function extractDocument(
  documentType: string,
  rawText: string,
  ocrText?: string,
  bidderId?: string
): Promise<any> {
  const res = await fetch("/api/extract-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_type: documentType,
      raw_text: rawText,
      ocr_text: ocrText,
      bidder_id: bidderId
    })
  });
  if (!res.ok) throw new Error("Failed to extract document");
  return res.json();
}

export async function parseTenderEligibilityText(tenderText: string): Promise<TenderRule[]> {
  const res = await fetch("/api/parse-tender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tender_text: tenderText })
  });
  if (!res.ok) throw new Error("Failed to parse tender clauses");
  const data = await res.json();
  return data.rules;
}

export async function fetchAuditTrail(): Promise<AuditTrailEvent[]> {
  const res = await fetch("/api/audit-trail");
  if (!res.ok) throw new Error("Failed to fetch audit trail");
  const data = await res.json();
  return data.auditTrail;
}
