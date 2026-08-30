"use client";

import React from "react";
import { ReleaseStatus } from "@/types";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

interface ReleaseDecisionBannerProps {
  releaseStatus: ReleaseStatus;
  overallScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  projectName?: string;
}

export function ReleaseDecisionBanner({
  releaseStatus,
  overallScore,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  projectName,
}: ReleaseDecisionBannerProps) {
  const isReady = releaseStatus === "READY_TO_SHIP";
  const isReview = releaseStatus === "REVIEW_BEFORE_SHIP";
  const isBlocked = releaseStatus === "BLOCKED";

  const getStatusConfig = () => {
    if (isBlocked) {
      return {
        title: "RELEASE DECISION: BLOCKED",
        badgeText: "BLOCKED",
        badgeClass: "bg-status-blocked/20 text-status-blocked border-status-blocked/40",
        containerClass:
          "bg-status-blocked/10 border-status-blocked/40 shadow-[0_0_50px_rgba(244,63,94,0.15)]",
        scoreColor: "text-status-blocked",
        icon: ShieldAlert,
        description:
          "Critical security leak, SQL injection vector, or broken build compilation detected. Production deployment is strictly blocked.",
      };
    }
    if (isReview) {
      return {
        title: "RELEASE DECISION: REVIEW BEFORE SHIP",
        badgeText: "REVIEW BEFORE SHIP",
        badgeClass: "bg-status-review/20 text-status-review border-status-review/40",
        containerClass:
          "bg-status-review/10 border-status-review/40 shadow-[0_0_50px_rgba(245,158,11,0.15)]",
        scoreColor: "text-status-review",
        icon: AlertTriangle,
        description:
          "High/Medium severity warnings, accessibility contrast violations, or unoptimized bundles detected. Review recommended before shipping.",
      };
    }
    return {
      title: "RELEASE DECISION: READY TO SHIP",
      badgeText: "READY TO SHIP",
      badgeClass: "bg-status-ready/20 text-status-ready border-status-ready/40",
      containerClass:
        "bg-status-ready/10 border-status-ready/40 shadow-[0_0_50px_rgba(16,185,129,0.15)]",
      scoreColor: "text-status-ready",
      icon: ShieldCheck,
      description:
        "All automated static AST checks, security scanners, build scripts, and runtime tests passed cleanly. Safe for production deployment.",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`rounded-3xl border p-6 md:p-8 transition-all duration-300 ${config.containerClass}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Status Info */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${config.badgeClass}`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {config.badgeText}
            </span>
            {projectName && (
              <span className="text-xs font-mono text-slate-400">
                Repository: <span className="text-white font-semibold">{projectName}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Icon className={`w-8 h-8 md:w-9 md:h-9 shrink-0 ${config.scoreColor}`} />
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
              {config.title}
            </h2>
          </div>

          <p className="text-sm md:text-base text-slate-300 font-body leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Right Score & Metrics */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 bg-oled-950/80 border border-oled-800 p-5 rounded-2xl shrink-0">
          {/* Circular Score Gauge */}
          <div className="text-center pr-4 sm:border-r sm:border-oled-800">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Safety Score
            </span>
            <div className={`text-4xl md:text-5xl font-mono font-black ${config.scoreColor}`}>
              {overallScore}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </div>
          </div>

          {/* Finding Counters */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-blocked" />
              <span className="text-slate-400">Critical:</span>
              <span className="text-white font-bold">{criticalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-slate-400">High:</span>
              <span className="text-white font-bold">{highCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-review" />
              <span className="text-slate-400">Medium:</span>
              <span className="text-white font-bold">{mediumCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-400">Low:</span>
              <span className="text-white font-bold">{lowCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
