"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuditStore, LogEntry } from "@/store/audit-store";
import { AuditProgressCard } from "@/components/audit/AuditProgressCard";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  Play,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Loader2,
  Sparkles,
} from "lucide-react";
import { CheckCategory } from "@/types";

const CATEGORY_NAMES: Record<CheckCategory, string> = {
  "code-health": "Code Health & AST Architecture",
  security: "Security & Secret Scanning",
  "build-test": "Build, Lint & Test Runner",
  "runtime-ui": "Runtime, UI & A11y Crawl",
  performance: "Performance & Asset Profiler",
};

export default function AuditExecutionPage() {
  const router = useRouter();
  const {
    snapshot,
    selectedChecks,
    isAuditing,
    auditProgress,
    currentCategory,
    categoryResults,
    categoryStatuses,
    logs,
    startAudit,
    cancelAudit,
  } = useAuditStore();

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-start audit on mount if not already auditing or if progress is 0
  useEffect(() => {
    if (!snapshot) {
      router.push("/");
      return;
    }

    if (!isAuditing && auditProgress < 100) {
      startAudit(() => {
        // Auto transition after brief completion pause
        setTimeout(() => {
          router.push("/results");
        }, 1200);
      });
    }
  }, [snapshot, isAuditing, auditProgress, startAudit, router]);

  // Auto scroll logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSkipToResults = () => {
    router.push("/results");
  };

  const handleCancel = () => {
    cancelAudit();
    router.push("/project");
  };

  if (!snapshot) return null;

  return (
    <div className="min-h-screen bg-black text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-oled-800 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-status-cyan/10 border border-status-cyan/30 flex items-center justify-center text-status-cyan font-bold text-sm">
              <Loader2 className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-white text-base sm:text-lg">
                PreFlight Execution Suite
              </span>
              <Badge variant="cyan" pulse={isAuditing}>
                {isAuditing ? "ACTIVE PIPELINE" : "COMPLETED"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-xs text-slate-400 hover:text-white"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              variant="cyan"
              size="sm"
              onClick={handleSkipToResults}
              className="text-xs"
            >
              <span>View Results</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Execution View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Progress Bar Card */}
        <section className="bg-oled-900 border border-oled-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Target: {snapshot.name} ({snapshot.stack.framework || snapshot.stack.language})
              </span>
              <h2 className="text-xl md:text-2xl font-heading font-black text-white flex items-center gap-2.5">
                {isAuditing ? (
                  <>
                    <span>Running: </span>
                    <span className="text-status-cyan">
                      {currentCategory
                        ? CATEGORY_NAMES[currentCategory as CheckCategory]
                        : "Initializing sandbox environment..."}
                    </span>
                  </>
                ) : (
                  <span className="text-status-ready">
                    PreFlight Audit Completed (100%)
                  </span>
                )}
              </h2>
            </div>

            <div className="font-mono text-2xl md:text-3xl font-extrabold text-white">
              {auditProgress}%
            </div>
          </div>

          <Progress value={auditProgress} indicatorColor="gradient" className="h-3" />
        </section>

        {/* Categories Progress Cards & Live Terminal Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 5 Progress Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
              Category Execution Stages
            </h3>

            {selectedChecks.map((cat: CheckCategory) => (
              <AuditProgressCard
                key={cat}
                category={cat}
                name={CATEGORY_NAMES[cat] || cat}
                status={categoryStatuses[cat]}
                result={categoryResults[cat]}
                isCurrent={currentCategory === cat}
              />
            ))}
          </div>

          {/* Right: Live Terminal Event Stream (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-oled-950 border border-oled-800 rounded-2xl overflow-hidden shadow-2xl min-h-[380px] max-h-[560px]">
            {/* Terminal Header */}
            <div className="px-4 py-3 bg-oled-900 border-b border-oled-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal className="w-4 h-4 text-status-cyan" />
                <span className="font-bold text-white">live-event-stream.log</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {logs.length} events logged
              </span>
            </div>

            {/* Terminal Log Output */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2 font-mono text-xs text-slate-300">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">Waiting for pipeline events...</div>
              ) : (
                logs.map((log: LogEntry) => {
                  const colorClass =
                    log.level === "error"
                      ? "text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-500/20"
                      : log.level === "warn"
                      ? "text-amber-300 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20"
                      : log.level === "success"
                      ? "text-emerald-400"
                      : "text-slate-300";

                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 shrink-0 select-none">
                        [{log.timestamp}]
                      </span>
                      <span className={colorClass}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
