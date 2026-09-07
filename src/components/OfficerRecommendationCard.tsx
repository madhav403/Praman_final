import React, { useState } from "react";
import { Sparkles, Shield, Copy, Check, AlertCircle } from "lucide-react";

interface OfficerRecommendationCardProps {
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
  gatekeeperTriggered: boolean;
}

export const OfficerRecommendationCard: React.FC<OfficerRecommendationCardProps> = ({
  recommendation,
  riskLevel,
  gatekeeperTriggered
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(recommendation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl border border-slate-800 shadow-md p-5 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                AI Compliance Decision-Support Assessment
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Grounded Synthesis (Section 9)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Formulated strictly from deterministic rule engine verdicts and statutory reasons.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy for Tender File"}</span>
        </button>
      </div>

      {/* Recommendation Paragraph */}
      <div className="mt-4 text-sm leading-relaxed text-slate-200 font-sans whitespace-pre-line bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
        {recommendation || "Generating grounded assessment summary..."}
      </div>

      {/* Mandatory Decision Support Disclaimer */}
      <div className="mt-4 flex items-center gap-2.5 text-xs text-amber-300/90 bg-amber-950/40 p-3 rounded-lg border border-amber-800/40">
        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="leading-snug">
          <strong>Procurement Officer Oversight Mandate:</strong> The AI system provides decision-support only and is strictly forbidden from executing binding legal disqualifications. Official approval is registered only upon authorized Procurement Officer signature.
        </p>
      </div>
    </div>
  );
};
