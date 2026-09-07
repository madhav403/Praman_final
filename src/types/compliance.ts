export interface BidderSummary {
  bidder_id: string;
  legal_name: string;
  entity_type: string;
  employee_count: number;
  claimed_msme_category: string;
  overall_score: number | null;
  risk_level: "low" | "medium" | "high" | "pending";
  gatekeeper_triggered: boolean;
  officer_decision: "qualified" | "disqualified" | "pending_review" | null;
}

export interface BidderDocument {
  document_id: string;
  bidder_id: string;
  document_type: string;
  document_source: string;
  extracted_fields: Record<string, any>;
  extraction_confidence: "high" | "medium" | "low";
  upload_timestamp: string;
  raw_file_reference: string;
  ocr_preview?: string;
}

export interface PortalRecord {
  record_id: string;
  bidder_id: string;
  source: string;
  retrieved_fields: Record<string, any>;
  query_status: "success" | "pending" | "unavailable";
  queried_at: string;
  is_mocked_simulation: boolean;
  simulation_notice: string;
}

export interface ComplianceCheck {
  check_id: string;
  bidder_id: string;
  category: string;
  rule_source: "statutory_fixed" | "tender_parsed" | "rag_threshold";
  is_gatekeeper: boolean;
  applicability: "applicable" | "not_applicable";
  status: "pass" | "fail" | "pending" | "not_applicable";
  weight: number;
  reason: string;
  source_reference: string;
  related_rag_query_id: string | null;
  evaluated_at: string;
}

export interface ComplianceReport {
  bidder_id: string;
  tender_id: string;
  overall_score: number;
  risk_level: "low" | "medium" | "high";
  gatekeeper_triggered: boolean;
  gatekeeper_details: string | null;
  check_results: ComplianceCheck[];
  pending_items: string[];
  ai_recommendation: string;
  officer_decision: "qualified" | "disqualified" | "pending_review" | null;
  officer_notes: string | null;
  officer_decided_at: string | null;
  report_generated_at: string;
}

export interface ResolvedField {
  field_name: string;
  document_value: any;
  portal_value: any;
  match_status: "matched" | "mismatch" | "fuzzy_match" | "single_source_only";
  resolved_value: any;
}

export interface ResolvedBidderProfile {
  bidder_id: string;
  legal_name: string;
  trade_name: string;
  tender_id: string;
  entity_type: string;
  employee_count: number;
  claimed_msme_category: string;
  local_content_percentage: number;
  is_manufacturer: boolean;
  claimed_startup_benefit: boolean;
  fields: ResolvedField[];
}

export interface BidderDetail {
  bidder: ResolvedBidderProfile;
  documents: BidderDocument[];
  portals: PortalRecord[];
  report: ComplianceReport | null;
}

export interface RAGQueryItem {
  query_id: string;
  query_text: string;
  triggered_by: "rule_engine" | "officer_chat";
  related_check_id: string | null;
  retrieved_chunks: Array<{
    chunk_id: string;
    source_document: string;
    clause_reference: string | null;
    rrf_score: number;
    dense_rank: number;
    sparse_rank: number;
    effective_date: string;
    snippet: string;
  }>;
  llm_answer: string;
  cited_sources: string[];
  confidence_flag: "grounded" | "insufficient_context";
  created_at: string;
}

export interface AuditTrailEvent {
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  bidder_id?: string;
  related_id?: string;
  category: "evaluation" | "rag" | "decision" | "document" | "portal";
}

export interface TenderRule {
  rule_id: string;
  category: string;
  requirement: string;
  mandatory: boolean;
  threshold_value: number | null;
  source_clause: string;
}
