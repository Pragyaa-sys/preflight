"use client";

import React, { useState } from "react";
import { AuditReport, Finding } from "@/types";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

interface FullReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AuditReport | null;
  findings: Finding[];
}

export function FullReportModal({
  open,
  onOpenChange,
  report,
  findings,
}: FullReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(
      {
        report,
        findings,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `preflight-audit-${report.project.name || "project"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = `# PreFlight Audit Report — ${report.project.name}
**Generated:** ${new Date(report.generatedAt).toLocaleString()}  
**Release Decision:** ${report.releaseStatus}  
**Overall Safety Score:** ${report.overallScore}/100  

## Severity Summary
- Critical Blockers: ${report.totalFindings.critical}
- High Severity: ${report.totalFindings.high}
- Medium Warnings: ${report.totalFindings.medium}
- Low / Info: ${report.totalFindings.low + report.totalFindings.info}

## Recommended Remediation Order
${report.recommendedFixOrder.map((step, i) => `${i + 1}. ${step}`).join("\n")}

## Detected Findings (${findings.length})
${findings
  .map(
    (f, i) => `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}
- **Category:** ${f.category}
- **Detector:** ${f.detector}
- **File:** ${f.location?.file || "N/A"} (Line ${f.location?.line || "N/A"})
- **Remediation:** ${f.recommendation || "N/A"}`
  )
  .join("\n\n")}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isReady = report.releaseStatus === "READY_TO_SHIP";
  const isBlocked = report.releaseStatus === "BLOCKED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-4xl">
      {/* Modal Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-oled-800 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-cyan/10 border border-status-cyan/30 flex items-center justify-center text-status-cyan">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle>PreFlight Audit Report</DialogTitle>
            <p className="text-xs text-slate-400 font-mono">
              Project: {report.project.name} • {new Date(report.generatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-status-ready" />
                Copied Markdown
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy Markdown
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJSON}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            JSON
          </Button>

          <Button
            variant="cyan"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Printable Report Document Body */}
      <div className="py-6 space-y-8 print:p-0 print:space-y-6 text-slate-100">
        {/* Release Status Banner */}
        <div
          className={`p-6 rounded-2xl border ${
            isBlocked
              ? "bg-status-blocked/10 border-status-blocked/40"
              : isReady
              ? "bg-status-ready/10 border-status-ready/40"
              : "bg-status-review/10 border-status-review/40"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1">
                Executive Release Gate Decision
              </span>
              <div className="text-2xl md:text-3xl font-heading font-black text-white flex items-center gap-3">
                {isBlocked ? (
                  <ShieldAlert className="w-7 h-7 text-status-blocked shrink-0" />
                ) : isReady ? (
                  <ShieldCheck className="w-7 h-7 text-status-ready shrink-0" />
                ) : (
                  <AlertTriangle className="w-7 h-7 text-status-review shrink-0" />
                )}
                {report.releaseStatus}
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-oled-800 sm:pl-6">
              <span className="text-xs font-mono text-slate-400 block mb-1">
                Safety Score
              </span>
              <div className="text-3xl md:text-4xl font-mono font-black text-white">
                {report.overallScore}
                <span className="text-xs text-slate-500 font-normal">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-oled-950 border border-oled-800 p-4 rounded-xl text-xs font-mono">
          <div>
            <span className="text-slate-500 block mb-0.5">Language</span>
            <span className="text-white font-bold uppercase">
              {report.project.stack.language}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Framework</span>
            <span className="text-status-cyan font-bold">
              {report.project.stack.framework || "None"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Package Manager</span>
            <span className="text-white font-bold">
              {report.project.stack.packageManager}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Analyzed Files</span>
            <span className="text-white font-bold">
              {report.project.stack.analyzedFiles} / {report.project.stack.totalFiles}
            </span>
          </div>
        </div>

        {/* Recommended Fix Order */}
        <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
          <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-status-cyan" />
            Recommended Release Fix Order
          </h4>
          <ol className="space-y-2 text-xs font-mono text-slate-300 list-decimal list-inside">
            {report.recommendedFixOrder.map((step, idx) => (
              <li key={idx} className="p-2 rounded bg-oled-950/60 border border-oled-800">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Findings Detailed Table / List */}
        <div className="space-y-4">
          <h4 className="font-heading font-bold text-white text-base">
            Detailed Finding Manifest ({findings.length})
          </h4>

          <div className="space-y-3">
            {findings.map((f, i) => (
              <div
                key={f.id}
                className="bg-oled-950 border border-oled-800 p-4 rounded-xl space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 font-bold">#{i + 1}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        f.severity === "critical"
                          ? "bg-status-blocked/20 text-rose-300"
                          : f.severity === "high"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-status-review/20 text-amber-300"
                      }`}
                    >
                      {f.severity.toUpperCase()}
                    </span>
                    <span className="text-white font-heading font-bold">
                      {f.title}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono">
                    {f.location?.file || "Global"}
                    {f.location?.line ? `:${f.location.line}` : ""}
                  </span>
                </div>

                <p className="text-slate-400 font-body">{f.description}</p>

                {f.recommendation && (
                  <div className="pt-2 text-emerald-400 font-mono">
                    <span className="font-bold text-slate-500">Fix: </span>
                    {f.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
