"use client";

import React from "react";
import Link from "next/link";
import { ProjectUploader } from "@/components/upload/ProjectUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Code2,
  Cpu,
  MonitorCheck,
  Zap,
  ArrowRight,
  Terminal,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="border-b border-oled-800 bg-black/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-status-cyan flex items-center justify-center text-black font-black text-lg shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              ✈
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl tracking-tight text-white">
                PreFlight
              </span>
              <Badge variant="cyan">v1.0</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/tokens">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Design Tokens
              </Button>
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-oled-800 hover:border-oled-700 bg-oled-900 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-status-cyan/10 text-status-cyan border border-status-cyan/30">
            <Sparkles className="w-3.5 h-3.5" />
            AUTOMATED PRE-DEPLOYMENT SAFETY GATE
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-heading font-black tracking-tight text-white leading-[1.1]">
            Check Before <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-status-cyan via-emerald-400 to-status-ready">
              You Ship.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-body leading-relaxed">
            Catch broken builds, leaked API keys, dead code, runtime crashes, and accessibility violations before they reach production.
          </p>

          {/* Quick Value Props Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="px-3 py-1 rounded-lg bg-oled-900 border border-oled-800 text-xs font-mono text-slate-300">
              ⚡ Zero Config Needed
            </span>
            <span className="px-3 py-1 rounded-lg bg-oled-900 border border-oled-800 text-xs font-mono text-slate-300">
              🔒 In-Memory & Local Sandbox
            </span>
            <span className="px-3 py-1 rounded-lg bg-oled-900 border border-oled-800 text-xs font-mono text-slate-300">
              🛡 Real-Time AST Verification
            </span>
          </div>
        </section>

        {/* Project Uploader Component */}
        <section>
          <ProjectUploader />
        </section>

        {/* 5-Category Feature Highlights */}
        <section className="space-y-8 pt-8 border-t border-oled-800">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-heading font-black text-white">
              Complete 5-Point Safety Verification
            </h2>
            <p className="text-sm text-slate-400 font-body">
              PreFlight executes multi-stage static analysis and isolated dynamic checks in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Feature 1 */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-white text-sm">
                1. Code Health
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                AST dead code scans, circular imports, and oversized functions via ts-morph.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-white text-sm">
                2. Security & Secrets
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Detects live Stripe/AWS API keys, private certs, SQL injections, and package CVEs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-white text-sm">
                3. Build & Test
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Isolated typechecking, compiler error line extraction, and automated unit test runner.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <MonitorCheck className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-white text-sm">
                4. Runtime & UI
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Headless Playwright navigation, console crash listeners, and Axe-core WCAG audits.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-white text-sm">
                5. Performance
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed">
                Time to First Byte (TTFB), DOM render speed, and static asset weight limits (&gt;1MB).
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-oled-800 bg-oled-950 py-8 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-ready" />
            <span>PreFlight Engine • Ready</span>
          </div>
          <div>Built for 24-Hour Hackathon • Developer-First Release Gate</div>
        </div>
      </footer>
    </div>
  );
}
