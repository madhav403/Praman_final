import React from "react";
import { ComplianceReport, ResolvedBidderProfile } from "../types/compliance";
import { AlertOctagon, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface BidderOverviewCardProps {
  bidder: ResolvedBidderProfile;
  report: ComplianceReport | null;
  onOpenDecisionModal: () => void;
}

export const BidderOverviewCard: React.FC<BidderOverviewCardProps> = ({
  bidder,
  report,
  onOpenDecisionModal
}) => {
  if (!report) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-slate-500">
        No compliance evaluation generated yet.
      </div>
    );
  }

  const score = report.overall_score;
  const riskLevel = report.risk_level;
  const isGatekeeper = report.gatekeeper_triggered;

  // Chart data for score gauge
  const chartData = [
    {
      name: "Compliance Score",
      value: score,
      fill: isGatekeeper
        ? "#e11d48"
        : riskLevel === "low"
        ? "#10b981"
        : riskLevel === "medium"
        ? "#f59e0b"
        : "#e11d48"
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* 1. STAGE 1: HARD GATEKEEPER ALERT BANNER (If Triggered) */}
      {isGatekeeper && (
        <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                Hard Gatekeeper Block Triggered
              </span>
              <span className="text-xs text-rose-700 font-semibold">Stage 1 Rule Enforcement</span>
            </div>
            <p className="text-sm font-semibold text-rose-900 mt-1">
              {report.gatekeeper_details || "A Category 1 Gatekeeper check (Blacklist, PAN, or GSTIN) has failed."}
            </p>
            <p className="text-xs text-rose-700 mt-0.5">
              Under Section 7.5 of GeM Compliance Regulations, a gatekeeper failure overrides the weighted score and forces Risk = High immediately.
            </p>
          </div>
        </div>
      )}

      {/* Main Overview Grid */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Bidder Details & Metadata */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {bidder.bidder_id}
              </span>
              <span className="text-xs text-slate-500 capitalize">{bidder.entity_type.replace("_", " ")}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {bidder.legal_name}
            </h2>
            <p className="text-xs text-slate-500">
              Trade Name: <strong className="text-slate-700">{bidder.trade_name || bidder.legal_name}</strong>
            </p>
          </div>

          {/* Key Verification Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">MSME Claim</span>
              <span className="text-xs font-semibold text-slate-800">
                {bidder.claimed_msme_category || "Not Claimed"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Staff Count</span>
              <span className="text-xs font-semibold text-slate-800">
                {bidder.employee_count} Employees
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Make in India</span>
              <span className="text-xs font-semibold text-slate-800">
                {bidder.local_content_percentage}% Local Content
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Manufacturer / OEM</span>
              <span className="text-xs font-semibold text-slate-800">
                {bidder.is_manufacturer ? "Yes (OEM)" : "No (Reseller)"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Startup DPIIT</span>
              <span className="text-xs font-semibold text-slate-800">
                {bidder.claimed_startup_benefit ? "Claimed (Exempt)" : "Standard"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Tender ID</span>
              <span className="text-xs font-semibold text-slate-800 truncate block">
                {report.tender_id}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Recharts Visual Gauge & Score */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-xl border border-slate-100">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="72%"
                outerRadius="100%"
                barSize={12}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: "#e2e8f0" }}
                  dataKey="value"
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Center score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {score}%
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Compliance
              </span>
            </div>
          </div>

          <div className="mt-2 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Evaluated Risk:</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  riskLevel === "low"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : riskLevel === "medium"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {riskLevel} Risk
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {riskLevel === "low"
                ? "Score ≥ 90% • All gatekeepers passed • Zero inconsistencies"
                : riskLevel === "medium"
                ? "Score 70–89% • Minor pending checks or non-critical item"
                : isGatekeeper
                ? "Hard Gatekeeper violation active"
                : "Mandatory statutory check failure or score < 70%"}
            </p>
          </div>
        </div>

        {/* Right: Procurement Officer Decision Section */}
        <div className="lg:col-span-3 flex flex-col justify-between h-full bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Officer Action
              </span>
              <span className="text-[10px] text-slate-400">Decision-Support</span>
            </div>

            <div className="mt-3">
              {report.officer_decision ? (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    report.officer_decision === "qualified"
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : report.officer_decision === "disqualified"
                      ? "bg-rose-50 text-rose-900 border-rose-200"
                      : "bg-amber-50 text-amber-900 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold uppercase">
                    {report.officer_decision === "qualified" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {report.officer_decision === "disqualified" && <XCircle className="w-4 h-4 text-rose-600" />}
                    {report.officer_decision === "pending_review" && <Clock className="w-4 h-4 text-amber-600" />}
                    <span>Marked: {report.officer_decision.replace("_", " ")}</span>
                  </div>
                  {report.officer_notes && (
                    <p className="mt-1.5 text-slate-700 italic border-t border-slate-200/50 pt-1.5">
                      "{report.officer_notes}"
                    </p>
                  )}
                  {report.officer_decided_at && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Logged: {new Date(report.officer_decided_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center">
                  <p className="text-xs text-slate-500">
                    No officer decision recorded yet. AI recommendation is advisory.
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onOpenDecisionModal}
            className="mt-4 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{report.officer_decision ? "Update Officer Decision" : "Record Officer Decision"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
