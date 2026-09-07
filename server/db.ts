import { runPythonRuleEngine, runPythonRAG } from "./evaluator_bridge.ts";
import { generateOfficerRecommendation } from "./ai_service.ts";

export interface BidderDocumentRecord {
  document_id: string;
  bidder_id: string;
  document_type: "udyam_certificate" | "gst_certificate" | "oem_authorization" | "pan_card" | "epfo_letter" | "startup_dpiit_cert" | "mca_incorporation_cert";
  document_source: "uploaded" | "digilocker_verified";
  extracted_fields: Record<string, any>;
  extraction_confidence: "high" | "medium" | "low";
  upload_timestamp: string;
  raw_file_reference: string;
  ocr_preview?: string;
}

export interface PortalVerificationRecord {
  record_id: string;
  bidder_id: string;
  source: "udyam_portal" | "gstn_portal" | "pan_itd" | "epfo" | "esic" | "mca21" | "dpiit_startup" | "nsic" | "blacklist_registry";
  retrieved_fields: Record<string, any>;
  query_status: "success" | "pending" | "unavailable";
  queried_at: string;
  is_mocked_simulation: boolean;
  simulation_notice: string;
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
  entity_type: "proprietorship" | "partnership" | "private_limited" | "public_limited" | "llp";
  employee_count: number;
  claimed_msme_category: string;
  local_content_percentage: number;
  is_manufacturer: boolean;
  claimed_startup_benefit: boolean;
  fields: ResolvedField[];
}

export interface ComplianceCheckResult {
  check_id: string;
  bidder_id: string;
  category: "MSME" | "GST" | "PAN_IT" | "EPFO_ESIC" | "LOCAL_CONTENT" | "OEM_AUTH" | "STARTUP_NSIC" | "BLACKLIST" | "MCA21" | "TENDER_SPECIFIC";
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
  check_results: ComplianceCheckResult[];
  pending_items: string[];
  ai_recommendation: string;
  officer_decision: "qualified" | "disqualified" | "pending_review" | null;
  officer_notes: string | null;
  officer_decided_at: string | null;
  report_generated_at: string;
}

export interface RAGQueryRecord {
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
  actor: "System Rule Engine" | "RAG Retrieval Pipeline" | "Procurement Officer" | "Document Extractor";
  action: string;
  details: string;
  bidder_id?: string;
  related_id?: string;
  category: "evaluation" | "rag" | "decision" | "document" | "portal";
}

// In-Memory Database Store with initial seed
class DatabaseStore {
  bidders: Map<string, ResolvedBidderProfile> = new Map();
  documents: Map<string, BidderDocumentRecord[]> = new Map();
  portals: Map<string, PortalVerificationRecord[]> = new Map();
  reports: Map<string, ComplianceReport> = new Map();
  ragQueries: RAGQueryRecord[] = [];
  auditTrail: AuditTrailEvent[] = [];
  tenderRules: any[] = [];

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    const now = new Date().toISOString();

    // 1. TENDER RULES
    this.tenderRules = [
      {
        rule_id: "TND-RULE-GATE-01",
        category: "BLACKLIST",
        requirement: "The bidder must not be under active debarment or holiday listing by GeM or any Central/State Ministry.",
        mandatory: true,
        threshold_value: null,
        source_clause: "Clause 3.1 - Debarment & Banning Policy"
      },
      {
        rule_id: "TND-RULE-PAN-02",
        category: "PAN_IT",
        requirement: "Valid PAN card and regular Income Tax return filings for the preceding 2 assessment years (AY 2024-25 and AY 2023-24).",
        mandatory: true,
        threshold_value: 2,
        source_clause: "Clause 3.4 - Income Tax Compliance"
      },
      {
        rule_id: "TND-RULE-GST-03",
        category: "GST",
        requirement: "Active GSTIN registration with up-to-date monthly GSTR-3B filings without prolonged defaults.",
        mandatory: true,
        threshold_value: null,
        source_clause: "Clause 3.2 - GST Registration"
      },
      {
        rule_id: "TND-RULE-MII-04",
        category: "LOCAL_CONTENT",
        requirement: "Only Class-I Local Suppliers having local content equal to or greater than 50% are eligible to claim purchase preference under Make in India.",
        mandatory: true,
        threshold_value: 50,
        source_clause: "Clause 5.2 - Public Procurement (Preference to Make in India) Order 2017"
      },
      {
        rule_id: "TND-RULE-OEM-05",
        category: "OEM_AUTH",
        requirement: "If the bidder is not the OEM, a Manufacturer's Authorization Form (MAF) specific to this Bid Number must be uploaded.",
        mandatory: true,
        threshold_value: null,
        source_clause: "Clause 4.1 - OEM Authorization Certificate"
      },
      {
        rule_id: "TND-RULE-EPFO-06",
        category: "EPFO_ESIC",
        requirement: "Compliance with EPF and ESIC statutory remittances if the bidder employs 20 or more staff.",
        mandatory: true,
        threshold_value: 20,
        source_clause: "Clause 3.8 - Labour Laws & Social Security Compliance"
      }
    ];

    // 2. SEED BIDDER 1: Compliant MSME (BID-101)
    const b1: ResolvedBidderProfile = {
      bidder_id: "BID-101",
      legal_name: "Bharat Tech Solutions Private Limited",
      trade_name: "Bharat Tech Solutions",
      tender_id: "GEM/2026/B/894120",
      entity_type: "private_limited",
      employee_count: 48,
      claimed_msme_category: "Small",
      local_content_percentage: 68,
      is_manufacturer: false,
      claimed_startup_benefit: false,
      fields: [
        { field_name: "PAN Number", document_value: "AABCB1234F", portal_value: "AABCB1234F", match_status: "matched", resolved_value: "AABCB1234F" },
        { field_name: "Legal Entity Name", document_value: "Bharat Tech Solutions Private Limited", portal_value: "BHARAT TECH SOLUTIONS PRIVATE LIMITED", match_status: "matched", resolved_value: "Bharat Tech Solutions Private Limited" },
        { field_name: "GSTIN", document_value: "07AABCB1234F1Z5", portal_value: "07AABCB1234F1Z5", match_status: "matched", resolved_value: "07AABCB1234F1Z5" },
        { field_name: "Udyam Reg Number", document_value: "UDYAM-DL-01-0012345", portal_value: "UDYAM-DL-01-0012345", match_status: "matched", resolved_value: "UDYAM-DL-01-0012345" },
        { field_name: "MSME Classification", document_value: "Small Enterprise", portal_value: "Small", match_status: "matched", resolved_value: "Small" },
        { field_name: "EPFO Establishment", document_value: "DLCPM0098765000", portal_value: "DLCPM0098765000", match_status: "matched", resolved_value: "DLCPM0098765000" },
        { field_name: "CIN", document_value: "U72200DL2018PTC334567", portal_value: "U72200DL2018PTC334567", match_status: "matched", resolved_value: "U72200DL2018PTC334567" }
      ]
    };
    this.bidders.set("BID-101", b1);

    const docs1: BidderDocumentRecord[] = [
      {
        document_id: "DOC-101-UDYAM",
        bidder_id: "BID-101",
        document_type: "udyam_certificate",
        document_source: "digilocker_verified",
        upload_timestamp: "2026-02-14T09:30:00Z",
        raw_file_reference: "udyam_cert_bharat_tech.pdf",
        extraction_confidence: "high",
        ocr_preview: "UDYAM REGISTRATION CERTIFICATE\nUDYAM-DL-01-0012345\nBHARAT TECH SOLUTIONS PRIVATE LIMITED\nENTERPRISE TYPE: SMALL\nMAJOR ACTIVITY: SERVICES & MANUFACTURING\nPAN: AABCB1234F",
        extracted_fields: {
          udyam_registration_number: "UDYAM-DL-01-0012345",
          enterprise_name: "Bharat Tech Solutions Private Limited",
          enterprise_type: "Small",
          pan: "AABCB1234F",
          major_activity: "Services & Manufacturing",
          date_of_incorporation: "2018-03-15"
        }
      },
      {
        document_id: "DOC-101-GST",
        bidder_id: "BID-101",
        document_type: "gst_certificate",
        document_source: "uploaded",
        upload_timestamp: "2026-02-14T09:32:00Z",
        raw_file_reference: "gst_reg_cert_form_gst_reg06.pdf",
        extraction_confidence: "high",
        ocr_preview: "GOVERNMENT OF INDIA - GST REG-06\nREGISTRATION CERTIFICATE\nGSTIN: 07AABCB1234F1Z5\nLegal Name: Bharat Tech Solutions Private Limited\nTrade Name: Bharat Tech Solutions\nRegistration Date: 12/04/2018",
        extracted_fields: {
          gstin: "07AABCB1234F1Z5",
          legal_name: "Bharat Tech Solutions Private Limited",
          trade_name: "Bharat Tech Solutions",
          pan: "AABCB1234F",
          registration_date: "2018-04-12"
        }
      },
      {
        document_id: "DOC-101-OEM",
        bidder_id: "BID-101",
        document_type: "oem_authorization",
        document_source: "uploaded",
        upload_timestamp: "2026-02-14T09:35:00Z",
        raw_file_reference: "hp_oem_authorization_bid894120.pdf",
        extraction_confidence: "high",
        ocr_preview: "MANUFACTURER'S AUTHORIZATION FORM (MAF)\nFrom: Hewlett Packard Enterprise India Pvt Ltd\nTo: National Informatics Centre (NIC) / GeM Procurement Authority\nSubject: GeM Bid No. GEM/2026/B/894120\nWe hereby confirm that Bharat Tech Solutions Pvt Ltd is our authorized system integrator. Full warranty and spare parts support committed through 31 Dec 2026.",
        extracted_fields: {
          oem_name: "Hewlett Packard Enterprise India Pvt Ltd",
          authorized_partner_name: "Bharat Tech Solutions Private Limited",
          tender_ref: "GEM/2026/B/894120",
          tender_number_matched: true,
          valid_till: "2026-12-31",
          is_valid_for_tender: true,
          warranty_commitment: true
        }
      }
    ];
    this.documents.set("BID-101", docs1);

    const portals1: PortalVerificationRecord[] = [
      {
        record_id: "REC-MOCK-BL-101",
        bidder_id: "BID-101",
        source: "blacklist_registry",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - GeM Debarment Repository",
        retrieved_fields: { is_blacklisted: false, debarred_by: null, incident_count: 0 }
      },
      {
        record_id: "REC-MOCK-PAN-101",
        bidder_id: "BID-101",
        source: "pan_itd",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - Income Tax Department (ITD)",
        retrieved_fields: { pan_number: "AABCB1234F", pan_status: "ACTIVE", aadhaar_linked: true, itr_compliant: true, itr_filed_years: ["AY 2024-25", "AY 2023-24"] }
      },
      {
        record_id: "REC-MOCK-GST-101",
        bidder_id: "BID-101",
        source: "gstn_portal",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - Goods & Services Tax Network (GSTN)",
        retrieved_fields: { gstin: "07AABCB1234F1Z5", gstin_status: "ACTIVE", consecutive_non_filing_months: 0, gstr1_filed_up_to: "Jan 2026", gstr3b_filed_up_to: "Jan 2026", legal_name: "Bharat Tech Solutions Private Limited" }
      },
      {
        record_id: "REC-MOCK-UDYAM-101",
        bidder_id: "BID-101",
        source: "udyam_portal",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - Ministry of MSME Udyam Portal",
        retrieved_fields: { udyam_registration_number: "UDYAM-DL-01-0012345", enterprise_name: "Bharat Tech Solutions Private Limited", enterprise_type: "Small", is_valid: true }
      },
      {
        record_id: "REC-MOCK-EPFO-101",
        bidder_id: "BID-101",
        source: "epfo",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - Employees' Provident Fund Organisation",
        retrieved_fields: { establishment_code: "DLCPM0098765000", is_registered: true, challans_paid_regularly: true, last_ecr_month: "Jan 2026" }
      },
      {
        record_id: "REC-MOCK-MCA-101",
        bidder_id: "BID-101",
        source: "mca21",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - MCA21 Registrar of Companies",
        retrieved_fields: { cin_llpin: "U72200DL2018PTC334567", company_name: "BHARAT TECH SOLUTIONS PRIVATE LIMITED", roc_status: "ACTIVE" }
      }
    ];
    this.portals.set("BID-101", portals1);

    // 3. SEED BIDDER 2: Gatekeeper Blocked (BID-102)
    const b2: ResolvedBidderProfile = {
      bidder_id: "BID-102",
      legal_name: "Apex Infra & Supplies LLP",
      trade_name: "Apex Infra",
      tender_id: "GEM/2026/B/894120",
      entity_type: "llp",
      employee_count: 28,
      claimed_msme_category: "Medium",
      local_content_percentage: 55,
      is_manufacturer: false,
      claimed_startup_benefit: false,
      fields: [
        { field_name: "PAN Number", document_value: "AAACA8888P", portal_value: "AAACA8888P", match_status: "matched", resolved_value: "AAACA8888P" },
        { field_name: "GSTIN Status", document_value: "Active", portal_value: "SUSPENDED (Rule 21A)", match_status: "mismatch", resolved_value: "SUSPENDED" },
        { field_name: "Debarment Status", document_value: "None", portal_value: "Debarred by Western Railway until 2027", match_status: "mismatch", resolved_value: "DEBARRED" }
      ]
    };
    this.bidders.set("BID-102", b2);

    this.documents.set("BID-102", [
      {
        document_id: "DOC-102-GST",
        bidder_id: "BID-102",
        document_type: "gst_certificate",
        document_source: "uploaded",
        upload_timestamp: "2026-02-12T14:10:00Z",
        raw_file_reference: "apex_gst_cert_old.pdf",
        extraction_confidence: "high",
        ocr_preview: "GST REG-06 - Apex Infra & Supplies LLP\nGSTIN: 27AAACA8888P1Z3",
        extracted_fields: { gstin: "27AAACA8888P1Z3", pan: "AAACA8888P", legal_name: "Apex Infra & Supplies LLP" }
      }
    ]);

    this.portals.set("BID-102", [
      {
        record_id: "REC-MOCK-BL-102",
        bidder_id: "BID-102",
        source: "blacklist_registry",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - GeM Debarment Repository",
        retrieved_fields: {
          is_blacklisted: true,
          debarred_by: "Ministry of Railways / Western Railway Vigilance",
          debarment_reason: "Submission of forged OEM authorization certificate in tender WR/2024/991",
          debarred_until: "2027-11-30"
        }
      },
      {
        record_id: "REC-MOCK-GST-102",
        bidder_id: "BID-102",
        source: "gstn_portal",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - GSTN",
        retrieved_fields: {
          gstin: "27AAACA8888P1Z3",
          gstin_status: "SUSPENDED",
          consecutive_non_filing_months: 5,
          gstr3b_filed_up_to: "Aug 2025",
          e_way_bill_blocked: true
        }
      },
      {
        record_id: "REC-MOCK-PAN-102",
        bidder_id: "BID-102",
        source: "pan_itd",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER - ITD",
        retrieved_fields: { pan_number: "AAACA8888P", pan_status: "ACTIVE", itr_compliant: false, itr_filed_years: ["AY 2022-23"] }
      }
    ]);

    // 4. SEED BIDDER 3: Small Proprietorship (BID-103)
    const b3: ResolvedBidderProfile = {
      bidder_id: "BID-103",
      legal_name: "Shree Ganesh Enterprises",
      trade_name: "Shree Ganesh Enterprises",
      tender_id: "GEM/2026/B/894120",
      entity_type: "proprietorship",
      employee_count: 12,
      claimed_msme_category: "Micro",
      local_content_percentage: 52,
      is_manufacturer: false,
      claimed_startup_benefit: true,
      fields: [
        { field_name: "Entity Form", document_value: "Proprietorship", portal_value: "Sole Proprietor", match_status: "matched", resolved_value: "proprietorship" },
        { field_name: "Employee Count", document_value: "12 Staff", portal_value: "12 (Below 20 limit)", match_status: "matched", resolved_value: 12 },
        { field_name: "Startup India DIPP", document_value: "DIPP99412", portal_value: "DIPP99412", match_status: "matched", resolved_value: "DIPP99412" }
      ]
    };
    this.bidders.set("BID-103", b3);

    this.documents.set("BID-103", [
      {
        document_id: "DOC-103-UDYAM",
        bidder_id: "BID-103",
        document_type: "udyam_certificate",
        document_source: "uploaded",
        upload_timestamp: "2026-02-15T11:00:00Z",
        raw_file_reference: "udyam_shree_ganesh.pdf",
        extraction_confidence: "high",
        ocr_preview: "UDYAM-HR-03-0044551 - SHREE GANESH ENTERPRISES - MICRO",
        extracted_fields: { udyam_registration_number: "UDYAM-HR-03-0044551", enterprise_type: "Micro", pan: "BPWPS5544K" }
      },
      {
        document_id: "DOC-103-OEM",
        bidder_id: "BID-103",
        document_type: "oem_authorization",
        document_source: "uploaded",
        upload_timestamp: "2026-02-15T11:05:00Z",
        raw_file_reference: "scanned_oem_letter_blurry.jpg",
        extraction_confidence: "low",
        ocr_preview: "[LOW QUALITY SCAN] ...Dell India... ...Authorizes... ...Tender reference unclear / smudged... ...Dec 2026...",
        extracted_fields: { oem_name: "Dell Technologies India", tender_ref: "Unclear / smudged text", is_valid_for_tender: true, valid_till: "2026-12-31" }
      }
    ]);

    this.portals.set("BID-103", [
      {
        record_id: "REC-MOCK-BL-103",
        bidder_id: "BID-103",
        source: "blacklist_registry",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER",
        retrieved_fields: { is_blacklisted: false }
      },
      {
        record_id: "REC-MOCK-PAN-103",
        bidder_id: "BID-103",
        source: "pan_itd",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER",
        retrieved_fields: { pan_number: "BPWPS5544K", pan_status: "ACTIVE", itr_compliant: true, itr_filed_years: ["AY 2024-25", "AY 2023-24"] }
      },
      {
        record_id: "REC-MOCK-GST-103",
        bidder_id: "BID-103",
        source: "gstn_portal",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER",
        retrieved_fields: { gstin: "06BPWPS5544K1ZR", gstin_status: "ACTIVE", consecutive_non_filing_months: 0, gstr3b_filed_up_to: "Jan 2026" }
      },
      {
        record_id: "REC-MOCK-UDYAM-103",
        bidder_id: "BID-103",
        source: "udyam_portal",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER",
        retrieved_fields: { udyam_registration_number: "UDYAM-HR-03-0044551", enterprise_name: "Shree Ganesh Enterprises", enterprise_type: "Micro", is_valid: true }
      },
      {
        record_id: "REC-MOCK-DPIIT-103",
        bidder_id: "BID-103",
        source: "dpiit_startup",
        query_status: "success",
        queried_at: now,
        is_mocked_simulation: true,
        simulation_notice: "SIMULATED MOCK ADAPTER",
        retrieved_fields: { is_recognized: true, dipp_number: "DIPP99412", status: "VALID_STARTUP" }
      }
    ]);

    // Initial Audit Trail Events
    this.addAuditTrail({
      event_id: "AUD-INIT-01",
      timestamp: "2026-02-16T08:00:00Z",
      actor: "System Rule Engine",
      action: "System Initialized",
      details: "Tender GEM/2026/B/894120 compliance rules loaded and regulatory knowledge base indexed.",
      category: "evaluation"
    });
  }

  addAuditTrail(event: AuditTrailEvent) {
    this.auditTrail.unshift(event);
  }

  async evaluateBidder(bidderId: string): Promise<ComplianceReport> {
    const bidder = this.bidders.get(bidderId);
    if (!bidder) throw new Error(`Bidder ${bidderId} not found`);

    const docs = this.documents.get(bidderId) || [];
    const portals = this.portals.get(bidderId) || [];

    // 1. Resolve RAG thresholds for EPFO & Make In India
    const ragEpfo = await runPythonRAG("EPFO applicability employee count threshold", "rule_engine", `CHK-STAT-EPFO-${bidderId}`);
    this.ragQueries.unshift(ragEpfo);

    const ragThresholds = {
      epfo_threshold: 20,
      epfo_citation: ragEpfo.cited_sources?.[0] || "EPFO Applicability Circular Section 1(3)(b)",
      esic_threshold: 10,
      esic_citation: "ESIC Act Section 2(12)",
      mii_class1_threshold: 50,
      mii_citation: "Public Procurement (Preference to Make in India) Order 2017 Clause 3(a)"
    };

    // 2. Deterministic evaluation through Python rule engine
    const { check_results, report } = await runPythonRuleEngine({
      bidder_profile: bidder,
      documents: docs,
      portal_records: portals,
      tender_rules: this.tenderRules,
      rag_thresholds: ragThresholds
    });

    // 3. Generate AI decision-support recommendation (grounded)
    const recText = await generateOfficerRecommendation(
      bidder,
      report.overall_score,
      report.risk_level,
      check_results,
      report.gatekeeper_triggered,
      report.gatekeeper_details
    );

    report.ai_recommendation = recText;

    // Retain any existing officer decision
    const existing = this.reports.get(bidderId);
    if (existing && existing.officer_decision) {
      report.officer_decision = existing.officer_decision;
      report.officer_notes = existing.officer_notes;
      report.officer_decided_at = existing.officer_decided_at;
    }

    this.reports.set(bidderId, report);

    this.addAuditTrail({
      event_id: `AUD-EVAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: "System Rule Engine",
      action: "Compliance Evaluation Completed",
      details: `Evaluated ${bidder.legal_name}. Computed Score: ${report.overall_score}%, Risk: ${report.risk_level.toUpperCase()}${report.gatekeeper_triggered ? " (Gatekeeper Blocked)" : ""}.`,
      bidder_id: bidderId,
      category: "evaluation"
    });

    return report;
  }
}

export const db = new DatabaseStore();
