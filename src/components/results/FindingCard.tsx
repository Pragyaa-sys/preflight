"use client";

import React, { useState } from "react";
import { Finding } from "@/types";
import { useAuditStore } from "@/store/audit-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeSnippetViewer } from "./CodeSnippetViewer";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye,
  Wrench,
  Flame,
  FileCode,
} from "lucide-react";

interface FindingCardProps {
  finding: Finding;
}

export function FindingCard({ finding }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { isFindingIgnored, toggleIgnoreFinding } = useAuditStore();
  const ignored = isFindingIgnored(finding.id);

  const getSeverityBadge = () => {
    switch (finding.severity) {
      case "critical":
        return (
          <Badge variant="critical" pulse>
            <Flame className="w-3 h-3 mr-1" />
            CRITICAL BLOCKER
          </Badge>
        );
      case "high":
        return <Badge variant="high">HIGH SEVERITY</Badge>;
      case "medium":
        return <Badge variant="medium">MEDIUM WARNING</Badge>;
      case "low":
        return <Badge variant="low">LOW</Badge>;
      default:
        return <Badge variant="info">INFO</Badge>;
    }
  };

  const getCategoryBadge = () => {
    const categoryLabels: Record<string, string> = {
      "code-health": "Code Health",
      security: "Security",
      "build-test": "Build & Test",
      "runtime-ui": "Runtime & UI",
      performance: "Performance",
    };
    return (
      <Badge variant="outline">
        {categoryLabels[finding.category] || finding.category}
      </Badge>
    );
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        ignored
          ? "bg-oled-950/60 border-oled-800/60 opacity-50"
          : finding.severity === "critical"
          ? "bg-oled-900 border-status-blocked/40 shadow-lg shadow-rose-950/20"
          : finding.severity === "high"
          ? "bg-oled-900 border-rose-500/30"
          : "bg-oled-900 border-oled-800 hover:border-oled-700"
      }`}
    >
      {/* Card Header Bar */}
      <div
        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {getSeverityBadge()}
            {getCategoryBadge()}
            {finding.detector && (
              <span className="text-[11px] font-mono text-slate-500">
                via {finding.detector}
              </span>
            )}
            {ignored && (
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-oled-800 px-2 py-0.5 rounded border border-slate-700">
                IGNORED FROM SCORE
              </span>
            )}
          </div>

          <h3
            className={`font-heading text-base md:text-lg font-bold ${
              ignored
                ? "text-slate-500 line-through"
                : finding.severity === "critical"
                ? "text-rose-300"
                : "text-white"
            }`}
          >
            {finding.title}
          </h3>
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleIgnoreFinding(finding.id)}
            className={`h-8 px-3 text-xs ${
              ignored
                ? "text-status-cyan border-status-cyan/40 bg-status-cyan/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {ignored ? (
              <>
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Unignore
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                Ignore
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-slate-400 hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-oled-800/80 pt-4">
          {/* Description */}
          <div className="text-sm text-slate-300 font-body leading-relaxed">
            {finding.description}
          </div>

          {/* Evidence Details */}
          {finding.evidence && (
            <div className="bg-oled-950 border border-oled-800 rounded-xl p-3 text-xs font-mono text-slate-400">
              <span className="text-slate-500 font-bold uppercase mr-2">
                Evidence:
              </span>
              <span className="text-slate-300">{finding.evidence}</span>
            </div>
          )}

          {/* Code Snippet Viewer */}
          {finding.location && (
            <div className="space-y-1.5">
              <CodeSnippetViewer
                location={finding.location}
                title={finding.title}
                detector={finding.detector}
                severity={finding.severity}
              />
            </div>
          )}

          {/* Recommendation Box */}
          {finding.recommendation && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-status-ready font-heading font-bold text-xs">
                <Wrench className="w-4 h-4" />
                <span>Recommended Remediation</span>
              </div>
              <p className="text-xs text-slate-300 font-body leading-relaxed">
                {finding.recommendation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
