import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db.ts";
import { runPythonRAG } from "./server/evaluator_bridge.ts";
import { extractDocumentFields, parseTenderEligibility, generateOfficerRecommendation } from "./server/ai_service.ts";

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  // Initialize initial evaluations for seeded bidders
  try {
    console.log("Evaluating initial seed bidders...");
    await db.evaluateBidder("BID-101");
    await db.evaluateBidder("BID-102");
    await db.evaluateBidder("BID-103");
  } catch (err) {
    console.warn("Pre-seeding evaluation note:", err);
  }

  // =========================================================================
  // API ROUTES (Mounted before Vite)
  // =========================================================================

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      platform: "GeM Bid Compliance Verification Platform",
      timestamp: new Date().toISOString()
    });
  });

  // 1. Get all bidders
  app.get("/api/bidders", (req, res) => {
    const list = Array.from(db.bidders.values()).map(b => {
      const report = db.reports.get(b.bidder_id);
      return {
        bidder_id: b.bidder_id,
        legal_name: b.legal_name,
        entity_type: b.entity_type,
        employee_count: b.employee_count,
        claimed_msme_category: b.claimed_msme_category,
        overall_score: report?.overall_score ?? null,
        risk_level: report?.risk_level ?? "pending",
        gatekeeper_triggered: report?.gatekeeper_triggered ?? false,
        officer_decision: report?.officer_decision ?? null
      };
    });
    res.json({ bidders: list, tenderRules: db.tenderRules });
  });

  // 2. Get single bidder detail
  app.get("/api/bidders/:id", (req, res) => {
    const { id } = req.params;
    const bidder = db.bidders.get(id);
    if (!bidder) {
      return res.status(404).json({ error: "Bidder not found" });
    }
    const docs = db.documents.get(id) || [];
    const portals = db.portals.get(id) || [];
    const report = db.reports.get(id) || null;

    res.json({
      bidder,
      documents: docs,
      portals,
      report
    });
  });

  // 3. Trigger deterministic evaluation for bidder
  app.post("/api/bidders/:id/evaluate", async (req, res) => {
    const { id } = req.params;
    try {
      const report = await db.evaluateBidder(id);
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to evaluate compliance" });
    }
  });

  // 4. Procurement Officer Decision Control
  app.post("/api/officer-decision", (req, res) => {
    const { bidder_id, decision, notes, officer_name } = req.body;
    if (!bidder_id || !decision) {
      return res.status(400).json({ error: "bidder_id and decision are required" });
    }

    const report = db.reports.get(bidder_id);
    if (!report) {
      return res.status(404).json({ error: "Report not found for bidder" });
    }

    const now = new Date().toISOString();
    report.officer_decision = decision; // 'qualified' | 'disqualified' | 'pending_review'
    report.officer_notes = notes || null;
    report.officer_decided_at = now;

    db.addAuditTrail({
      event_id: `AUD-DEC-${Date.now()}`,
      timestamp: now,
      actor: "Procurement Officer",
      action: `Officer Decision: ${decision.toUpperCase()}`,
      details: `Procurement Officer (${officer_name || "Authorized Officer"}) marked bidder as '${decision}'. Notes: ${notes || "No notes provided"}.`,
      bidder_id: bidder_id,
      category: "decision"
    });

    res.json({ success: true, report });
  });

  // 5. RAG Hybrid Search & Query
  app.post("/api/rag/query", async (req, res) => {
    const { query_text, triggered_by, related_check_id } = req.body;
    if (!query_text) {
      return res.status(400).json({ error: "query_text is required" });
    }

    try {
      const ragRecord = await runPythonRAG(query_text, triggered_by || "officer_chat", related_check_id);
      db.ragQueries.unshift(ragRecord);

      db.addAuditTrail({
        event_id: `AUD-RAG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: triggered_by === "rule_engine" ? "System Rule Engine" : "Procurement Officer",
        action: "Regulatory RAG Hybrid Search",
        details: `Queried: "${query_text}". Retrieved ${ragRecord.retrieved_chunks.length} chunks via RRF fusion. Status: ${ragRecord.confidence_flag}. Citations: ${ragRecord.cited_sources.join(", ")}`,
        related_id: ragRecord.query_id,
        category: "rag"
      });

      res.json(ragRecord);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute RAG hybrid search" });
    }
  });

  // 6. Get Regulatory Knowledge Base Corpus
  app.get("/api/rag/corpus", (req, res) => {
    // Dynamic import from Python or return static schema
    res.json({
      corpus_count: 10,
      documents: [
        { id: "REG-EPFO-SEC1-3", name: "Employees' Provident Funds Act 1952", clause: "Section 1(3)(b)", category: "EPFO" },
        { id: "REG-ESIC-SEC2-12", name: "Employees' State Insurance Act 1948", clause: "Section 2(12)", category: "ESIC" },
        { id: "REG-MSME-SO2119E", name: "Ministry of MSME Notification S.O. 2119(E)", clause: "Clause 1 & 2", category: "MSME" },
        { id: "REG-MII-PPP-2020", name: "Public Procurement (Make in India) Order 2017", clause: "Clause 3A & 3B", category: "LOCAL_CONTENT" },
        { id: "REG-DPIIT-STARTUP-127E", name: "DPIIT Notification G.S.R. 127(E)", clause: "Rule 173(i) GFR", category: "STARTUP_NSIC" },
        { id: "REG-GEM-DEBARMENT-GTC", name: "GeM GTC Debarment Policy", clause: "Clause 4(xii)", category: "BLACKLIST" },
        { id: "REG-ITD-SEC206AB", name: "Income Tax Act 1961 Section 206AB", clause: "Higher TDS on Non-filers", category: "PAN_IT" },
        { id: "REG-GSTN-CGST-RULE138E", name: "CGST Rules Rule 138E", clause: "Return Default Suspension", category: "GST" },
        { id: "REG-MCA-COMPANIES-SEC248", name: "Companies Act 2013", clause: "Section 248 ROC Status", category: "MCA21" },
        { id: "REG-GEM-ATC-OEM-AUTH", name: "GeM ATC Manufacturer's Authorization Form", clause: "Clause 2.1 MAF", category: "OEM_AUTH" }
      ]
    });
  });

  // 7. Get RAG query history (Schema 7)
  app.get("/api/rag/history", (req, res) => {
    res.json({ queries: db.ragQueries });
  });

  // 8. Document Extraction Pipeline (Section 4)
  app.post("/api/extract-document", async (req, res) => {
    const { document_type, raw_text, ocr_text, bidder_id } = req.body;
    if (!document_type) {
      return res.status(400).json({ error: "document_type is required" });
    }

    try {
      const extracted = await extractDocumentFields(document_type, raw_text || "", ocr_text || "");

      const docRecord: any = {
        document_id: `DOC-UPL-${Date.now()}`,
        bidder_id: bidder_id || "BID-101",
        document_type,
        document_source: "uploaded",
        extracted_fields: extracted.extracted_fields,
        extraction_confidence: extracted.extraction_confidence,
        upload_timestamp: new Date().toISOString(),
        raw_file_reference: `${document_type}_uploaded.pdf`,
        ocr_preview: ocr_text || "Pre-processed OCR text analyzed"
      };

      if (bidder_id && db.documents.has(bidder_id)) {
        db.documents.get(bidder_id)?.unshift(docRecord);
      }

      db.addAuditTrail({
        event_id: `AUD-DOC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: "Document Extractor",
        action: "Document Extracted & Parsed",
        details: `Extracted ${document_type} with confidence '${extracted.extraction_confidence}'. OCR pre-processing verified.`,
        bidder_id: bidder_id,
        category: "document"
      });

      res.json({ success: true, document: docRecord });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Document extraction failed" });
    }
  });

  // 9. Tender Eligibility Parser (Section 5)
  app.post("/api/parse-tender", async (req, res) => {
    const { tender_text } = req.body;
    if (!tender_text) {
      return res.status(400).json({ error: "tender_text is required" });
    }

    try {
      const rules = await parseTenderEligibility(tender_text);
      res.json({ success: true, rules });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to parse tender clauses" });
    }
  });

  // 10. Audit Trail Logs
  app.get("/api/audit-trail", (req, res) => {
    res.json({ auditTrail: db.auditTrail });
  });

  // =========================================================================
  // VITE MIDDLEWARE (Development) or STATIC SERVE (Production)
  // =========================================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GeM Compliance Verification Server running on port ${PORT}`);
  });
}

startServer();
