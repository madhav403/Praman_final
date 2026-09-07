import React, { useState } from "react";
import { BidderDocument, PortalRecord, ResolvedField } from "../types/compliance";
import { FileText, Database, Check, AlertTriangle, X, ShieldAlert, Sparkles, Eye, Info } from "lucide-react";

interface DocumentPortalViewerProps {
  documents: BidderDocument[];
  portals: PortalRecord[];
  resolvedFields: ResolvedField[];
}

export const DocumentPortalViewer: React.FC<DocumentPortalViewerProps> = ({
  documents,
  portals,
  resolvedFields
}) => {
  const [activeTab, setActiveTab] = useState<"CROSS_VERIFY" | "DOCUMENTS" | "PORTALS">("CROSS_VERIFY");
  const [selectedDoc, setSelectedDoc] = useState<BidderDocument | null>(documents[0] || null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Top Banner with Simulation Notice */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold">Document &amp; Portal Verification Cross-Checker</h3>
            <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
              Layer 1 &amp; Layer 2 Comparison
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Simulated Integration Notice:</strong> All Government portal responses (Udyam, GSTN, PAN/ITD, EPFO, MCA21) are generated via simulated sandbox adapters for prototype demonstration.
            </span>
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setActiveTab("CROSS_VERIFY")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === "CROSS_VERIFY"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Field Cross-Match ({resolvedFields.length})
          </button>
          <button
            onClick={() => setActiveTab("DOCUMENTS")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === "DOCUMENTS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Submitted Docs ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("PORTALS")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeTab === "PORTALS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Portal Mocks ({portals.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Side-by-Side Field Cross-Match */}
      {activeTab === "CROSS_VERIFY" && (
        <div className="p-5">
          <div className="mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resolved Bidder Profile (Schema 3 Cross-Source Mapping)
            </h4>
            <p className="text-xs text-slate-500">
              Compares values extracted from uploaded certificates against government registry portal queries.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold">Field Name</th>
                  <th className="py-2.5 px-4 font-semibold">Document Extracted Value (Layer 1)</th>
                  <th className="py-2.5 px-4 font-semibold">Portal Registry Value (Layer 2)</th>
                  <th className="py-2.5 px-4 font-semibold">Verification Status</th>
                  <th className="py-2.5 px-4 font-semibold">Resolved Truth (Layer 3)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resolvedFields.map((f, idx) => {
                  const isMatch = f.match_status === "matched";
                  const isMismatch = f.match_status === "mismatch";
                  const isFuzzy = f.match_status === "fuzzy_match";

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 transition-colors ${
                        isMismatch ? "bg-rose-50/40" : isFuzzy ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {f.field_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 bg-slate-50/50">
                        {String(f.document_value ?? "—")}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 bg-slate-50/50">
                        {String(f.portal_value ?? "—")}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isMatch && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Matched
                          </span>
                        )}
                        {isMismatch && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <X className="w-3 h-3 text-rose-600" /> Discrepancy / Mismatch
                          </span>
                        )}
                        {isFuzzy && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Fuzzy Match (&gt;80%)
                          </span>
                        )}
                        {f.match_status === "single_source_only" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Single Source
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {String(f.resolved_value ?? "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Uploaded Documents & OCR Details */}
      {activeTab === "DOCUMENTS" && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Document list */}
          <div className="md:col-span-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Uploaded Documents (Schema 1)
            </h4>
            {documents.map((doc) => (
              <button
                key={doc.document_id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedDoc?.document_id === doc.document_id
                    ? "bg-slate-900 text-white border-slate-900 shadow"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold capitalize">
                    {doc.document_type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      doc.extraction_confidence === "high"
                        ? "bg-emerald-100 text-emerald-800"
                        : doc.extraction_confidence === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {doc.extraction_confidence} Conf
                  </span>
                </div>
                <p className={`text-[11px] mt-1 font-mono ${selectedDoc?.document_id === doc.document_id ? "text-slate-300" : "text-slate-500"}`}>
                  {doc.raw_file_reference}
                </p>
                <p className={`text-[10px] mt-0.5 ${selectedDoc?.document_id === doc.document_id ? "text-slate-400" : "text-slate-400"}`}>
                  Source: {doc.document_source}
                </p>
              </button>
            ))}
          </div>

          {/* Document content viewer */}
          <div className="md:col-span-8 bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4">
            {selectedDoc ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm capitalize">
                      {selectedDoc.document_type.replace(/_/g, " ")}
                    </h5>
                    <p className="text-xs text-slate-500">
                      ID: {selectedDoc.document_id} • Uploaded {new Date(selectedDoc.upload_timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-200 text-slate-800 font-mono">
                    {selectedDoc.document_source}
                  </span>
                </div>

                {/* OCR text preview */}
                {selectedDoc.ocr_preview && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pre-processed OCR Extraction Text:
                    </label>
                    <pre className="p-3 bg-white rounded border border-slate-200 text-[11px] font-mono text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {selectedDoc.ocr_preview}
                    </pre>
                  </div>
                )}

                {/* Extracted JSON fields */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Extracted Structured Fields (JSON Schema):
                  </label>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto">
                    {JSON.stringify(selectedDoc.extracted_fields, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 text-center py-8">Select a document to inspect</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Mocked Portal Registry Records */}
      {activeTab === "PORTALS" && (
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portals.map((p) => (
              <div
                key={p.record_id}
                className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs uppercase font-mono">
                    {p.source.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {p.query_status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {p.record_id} • {new Date(p.queried_at).toLocaleTimeString()}
                </p>

                <div className="pt-2 border-t border-slate-200">
                  <pre className="text-[10px] bg-white p-2 rounded border border-slate-200 text-slate-800 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(p.retrieved_fields, null, 2)}
                  </pre>
                </div>

                <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                  {p.simulation_notice}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
