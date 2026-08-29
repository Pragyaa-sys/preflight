"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuditStore } from "@/store/audit-store";
import { CheckCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Code2,
  ShieldCheck,
  Cpu,
  MonitorCheck,
  Zap,
  Play,
  CheckSquare,
  Square,
  Clock,
  Flame,
} from "lucide-react";

interface CategoryDefinition {
  id: CheckCategory;
  name: string;
  shortDesc: string;
  fullDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  subchecks: string[];
  estimatedDuration: string;
  isRecommended: boolean;
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: "code-health",
    name: "Code Health & Architecture",
    shortDesc: "ts-morph AST analysis, dead code detection & complexity",
    fullDesc: "Traverses TypeScript AST to detect unused exports, functions exceeding complexity limits, circular imports, and duplicate code blocks.",
    icon: Code2,
    accentColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    badgeBg: "emerald",
    subchecks: ["ts-morph AST", "Dead Code / Exports", "Oversized Functions", "Complexity & Duplication"],
    estimatedDuration: "1.2s",
    isRecommended: true,
  },
  {
    id: "security",
    name: "Security & Secret Scanning",
    shortDesc: "Gitleaks patterns, live API secrets & vulnerable dependencies",
    fullDesc: "Scans repository source code for high-entropy tokens (Stripe, AWS, OpenAI, GitHub), private certificates, raw SQL injection vectors, and known CVEs.",
    icon: ShieldCheck,
    accentColor: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    badgeBg: "critical",
    subchecks: ["Secret Scanner", "Live API Keys (Stripe/AWS)", "SQL Injection Patterns", "npm audit / CVEs"],
    estimatedDuration: "1.8s",
    isRecommended: true,
  },
  {
    id: "build-test",
    name: "Build, Lint & Test Verification",
    shortDesc: "Isolated non-interactive compiler & test runner",
    fullDesc: "Spawns strict tsc typechecking, runs configured test suites with zero-color CI flags, and captures compiler errors and failing unit assertions.",
    icon: Cpu,
    accentColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    badgeBg: "cyan",
    subchecks: ["tsc --noEmit", "ESLint Diagnostics", "Unit Test Runner", "Build Compilation"],
    estimatedDuration: "3.4s",
    isRecommended: true,
  },
  {
    id: "runtime-ui",
    name: "Runtime, UI & Accessibility",
    shortDesc: "Playwright headless browser crawl & Axe-core WCAG audit",
    fullDesc: "Spins up local ephemeral dev server, executes Playwright headless browser navigation, intercepts runtime JS console errors/404s, and runs automated a11y checks.",
    icon: MonitorCheck,
    accentColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    badgeBg: "medium",
    subchecks: ["Playwright Crawl", "Console & Network Errors", "Axe-core WCAG AA", "Route Verification"],
    estimatedDuration: "4.5s",
    isRecommended: false,
  },
  {
    id: "performance",
    name: "Performance & Asset Auditing",
    shortDesc: "TTFB, DOM load latency & heavy bundle assets",
    fullDesc: "Evaluates Navigation Timing APIs, assesses Time to First Byte, flags static images/bundles >1MB, and analyzes Core Web Vital indicators.",
    icon: Zap,
    accentColor: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    badgeBg: "purple",
    subchecks: ["TTFB Timing", "DOM Content Loaded", "Heavy Assets (>1MB)", "Bundle Tree Analysis"],
    estimatedDuration: "2.1s",
    isRecommended: false,
  },
];

export function AuditSelector() {
  const router = useRouter();
  const {
    selectedChecks,
    toggleCheckCategory,
    selectAllChecks,
    clearAllChecks,
    snapshot,
  } = useAuditStore();

  const handleStart = () => {
    if (selectedChecks.length === 0) return;
    router.push("/audit");
  };

  const allSelected = selectedChecks.length === CATEGORY_DEFINITIONS.length;

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-oled-900 border border-oled-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <h3 className="font-heading font-extrabold text-white text-lg flex items-center gap-2">
            <span>Select Audit Checks</span>
            <Badge variant="cyan">{selectedChecks.length} of 5 Selected</Badge>
          </h3>
          <p className="text-xs text-slate-400">
            Customize which automated static and dynamic audit suites run on {snapshot?.name || "this project"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allSelected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllChecks}
              className="text-xs"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Clear All
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllChecks}
              className="text-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
              Select All
            </Button>
          )}
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORY_DEFINITIONS.map((cat) => {
          const isSelected = selectedChecks.includes(cat.id);
          const Icon = cat.icon;

          return (
            <div
              key={cat.id}
              onClick={() => toggleCheckCategory(cat.id)}
              className={`relative group rounded-2xl p-5 border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-oled-850/90 border-oled-700 shadow-lg"
                  : "bg-oled-900/60 border-oled-800/80 opacity-70 hover:opacity-100 hover:border-oled-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left icon & title */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                      isSelected
                        ? cat.accentColor
                        : "bg-oled-800 border-oled-700 text-slate-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-white text-base group-hover:text-status-cyan transition-colors">
                        {cat.name}
                      </h4>
                      {cat.isRecommended && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Flame className="w-3 h-3" /> Core
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-body leading-relaxed max-w-sm">
                      {cat.shortDesc}
                    </p>
                  </div>
                </div>

                {/* Switch toggle */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={isSelected}
                    onCheckedChange={() => toggleCheckCategory(cat.id)}
                  />
                </div>
              </div>

              {/* Subcheck Badges */}
              <div className="mt-4 pt-3.5 border-t border-oled-800/80 flex flex-wrap items-center gap-1.5">
                {cat.subchecks.map((sc) => (
                  <span
                    key={sc}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-oled-950 border border-oled-800 text-slate-400"
                  >
                    {sc}
                  </span>
                ))}
                <span className="ml-auto text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{cat.estimatedDuration}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Footer Bar */}
      <div className="bg-oled-900 border border-oled-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="text-sm font-heading font-bold text-white">
            Ready to execute PreFlight audit pipeline?
          </div>
          <div className="text-xs text-slate-400">
            {selectedChecks.length} categories active • Estimated duration: ~
            {(selectedChecks.length * 2.5).toFixed(1)}s
          </div>
        </div>

        <Button
          variant="cyan"
          size="lg"
          disabled={selectedChecks.length === 0}
          onClick={handleStart}
          className="w-full sm:w-auto"
        >
          <Play className="w-4 h-4 fill-current mr-2" />
          RUN PREFLIGHT AUDIT
        </Button>
      </div>
    </div>
  );
}
