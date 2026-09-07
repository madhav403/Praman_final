import React, { useState } from "react";
import { extractDocument } from "../services/api";
import { Sparkles, FileText, CheckCircle2, AlertCircle, X, Upload } from "lucide-react";

interface DocExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocExtracted?: () => void;
}

export const DocExtractorModal: React.FC<DocExtractorModalProps> = ({ isOpen, onClose, onDocExtracted }) => {
  const [docType, setDocType] = useState<string>("udyam_certificate");
  const [ocrText, setOcrText] = useState<string>(`UDYAM REGISTRATION CERTIFICATE
UDYAM-DL-01-0099887
NATIONAL INFO-TECH INTEGRATORS PRIVATE LIMITED
ENTERPRISE TYPE: SMALL
MAJOR ACTIVITY: MANUFACTURING & SERVICES
DATE OF INCORPORATION: 10/05/2019
PAN: AABCN8899K`);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    setLoading(true);
    try {
      const res = await extractDocument(docType, "", ocrText, "BID-101");
      setResult(res.document);
      onDocExtracted?.();
    } catch (err) {
      console.error("Document extraction failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Document Extraction Pipeline (Section 4)</h3>
              <p className="text-xs text-slate-400">
                OCR pre-processing + Schema 1 structured JSON field extraction with confidence tagging
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Document Type (Schema 1):
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="udyam_certificate">Udyam MSME Certificate</option>
                <option value="gst_certificate">GST Registration Certificate (REG-06)</option>
                <option value="oem_authorization">OEM Manufacturer's Authorization Form (MAF)</option>
                <option value="pan_card">PAN Card</option>
                <option value="epfo_letter">EPFO Registration Letter</option>
                <option value="startup_dpiit_cert">DPIIT Startup Recognition Certificate</option>
                <option value="mca_incorporation_cert">MCA Certificate of Incorporation</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleExtract}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Run OCR &amp; Schema Extraction</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Pre-processed OCR Stream / Certificate Text:
            </label>
            <textarea
              rows={6}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="Paste simulated OCR output or extracted text here..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {result && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">
                  Extracted Document Record (Schema 1)
                </h4>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    result.extraction_confidence === "high"
                      ? "bg-emerald-100 text-emerald-800"
                      : result.extraction_confidence === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {result.extraction_confidence} Confidence
                </span>
              </div>

              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {JSON.stringify(result.extracted_fields, null, 2)}
              </pre>
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
