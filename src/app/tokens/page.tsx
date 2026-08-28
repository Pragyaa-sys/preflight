import React from "react";

export default function DesignTokensPage() {
  const colorSwatches = [
    {
      name: "OLED Canvas Base",
      token: "oled-950 / bg-black",
      hex: "#000000",
      bgClass: "bg-black",
      borderClass: "border-oled-800",
      usage: "Main pure black app background",
    },
    {
      name: "OLED Card Surface",
      token: "oled-900",
      hex: "#08080a",
      bgClass: "bg-oled-900",
      borderClass: "border-oled-800",
      usage: "Elevated card panels & containers",
    },
    {
      name: "OLED Panel / Input",
      token: "oled-850",
      hex: "#101014",
      bgClass: "bg-oled-850",
      borderClass: "border-oled-700",
      usage: "Input fields, inner code boxes, hover states",
    },
    {
      name: "Glass Border",
      token: "oled-800",
      hex: "#1c1c24",
      bgClass: "bg-oled-800",
      borderClass: "border-slate-700",
      usage: "Subtle 1px card & divider borders",
    },
    {
      name: "Electric Emerald",
      token: "status-ready",
      hex: "#10b981",
      bgClass: "bg-status-ready",
      borderClass: "border-emerald-400",
      usage: "Ready to Ship • Passed Checks • Success",
    },
    {
      name: "Cyber Amber",
      token: "status-review",
      hex: "#f59e0b",
      bgClass: "bg-status-review",
      borderClass: "border-amber-400",
      usage: "Review Before Ship • Warnings • Non-critical",
    },
    {
      name: "Laser Crimson",
      token: "status-blocked",
      hex: "#f43f5e",
      bgClass: "bg-status-blocked",
      borderClass: "border-rose-400",
      usage: "Blocked • Critical Security • Build Failures",
    },
    {
      name: "Tech Cyan",
      token: "status-cyan",
      hex: "#06b6d4",
      bgClass: "bg-status-cyan",
      borderClass: "border-cyan-400",
      usage: "Active Checks • Framework Badges • Highlights",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-100 p-6 md:p-12 font-body selection:bg-cyan-500 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="space-y-4 border-b border-oled-800 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-status-cyan/10 text-status-cyan border border-status-cyan/20">
            <span className="w-2 h-2 rounded-full bg-status-cyan animate-pulse" />
            PREFLIGHT DESIGN SYSTEM (OLED THEME)
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-white">
            Design Tokens & UI Theme
          </h1>
          <p className="text-slate-400 max-w-2xl text-base md:text-lg font-body">
            Pure OLED black canvas with developer-focused typography and high-contrast status colors.
          </p>
        </div>

        {/* 1. Typography Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-cyan" />
            <h2 className="text-xl font-heading font-bold text-white tracking-wide">
              1. Typography & Google Fonts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Headings Font */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-6 space-y-3">
              <span className="text-xs font-mono text-status-cyan tracking-wider uppercase">
                Heading Font (Plus Jakarta Sans)
              </span>
              <div className="font-heading space-y-1">
                <p className="text-2xl font-extrabold text-white">Check Before You Ship</p>
                <p className="text-lg font-bold text-slate-300">Fast Project Analysis</p>
                <p className="text-sm font-semibold text-slate-400">Class: font-heading</p>
              </div>
            </div>

            {/* Body Font */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-6 space-y-3">
              <span className="text-xs font-mono text-status-ready tracking-wider uppercase">
                Body & UI Font (Inter)
              </span>
              <div className="font-body space-y-2 text-sm text-slate-300">
                <p>
                  PreFlight analyzes code health, security vulnerabilities, broken builds, and runtime errors in minutes.
                </p>
                <p className="text-xs text-slate-500 font-medium">Class: font-body</p>
              </div>
            </div>

            {/* Monospace Font */}
            <div className="bg-oled-900 border border-oled-800 rounded-2xl p-6 space-y-3">
              <span className="text-xs font-mono text-status-review tracking-wider uppercase">
                Code & Line Numbers (JetBrains Mono)
              </span>
              <div className="font-mono space-y-1 text-xs">
                <p className="text-slate-300">src/config.ts:18:4</p>
                <p className="text-status-blocked">const API_SECRET = &quot;...&quot;;</p>
                <p className="text-slate-500">Score: 82 / 100 [BLOCKED]</p>
                <p className="text-xs text-slate-500 pt-1">Class: font-mono</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Color Palette Swatches */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-ready" />
            <h2 className="text-xl font-heading font-bold text-white tracking-wide">
              2. Color Palette Tokens
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {colorSwatches.map((color) => (
              <div
                key={color.name}
                className="bg-oled-900 border border-oled-800 rounded-2xl p-4 shadow-xl space-y-3 hover:border-oled-700 transition"
              >
                <div
                  className={`h-16 w-full rounded-xl ${color.bgClass} border ${color.borderClass} shadow-inner`}
                />
                <div>
                  <h3 className="font-heading font-semibold text-white text-sm">
                    {color.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {color.token} • {color.hex}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">{color.usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Component Previews */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-review" />
            <h2 className="text-xl font-heading font-bold text-white tracking-wide">
              3. Sample PreFlight UI Components
            </h2>
          </div>

          {/* Release Decision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Blocked */}
            <div className="bg-status-blocked/10 border border-status-blocked/30 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-status-blocked font-mono text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-status-blocked animate-pulse" />
                RELEASE STATUS: BLOCKED
              </div>
              <p className="text-xs text-slate-300">
                1 Critical Security Issue & Build failure detected. Do not deploy.
              </p>
            </div>

            {/* Review */}
            <div className="bg-status-review/10 border border-status-review/30 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-status-review font-mono text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-status-review" />
                RELEASE STATUS: REVIEW
              </div>
              <p className="text-xs text-slate-300">
                Non-critical warnings or dead dependencies found. Review recommended.
              </p>
            </div>

            {/* Ready */}
            <div className="bg-status-ready/10 border border-status-ready/30 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-status-ready font-mono text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-status-ready animate-pulse" />
                RELEASE STATUS: READY TO SHIP
              </div>
              <p className="text-xs text-slate-300">
                All selected checks and tests passed cleanly.
              </p>
            </div>
          </div>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-oled-900 border border-oled-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400">OVERALL SCORE</span>
              <div className="text-2xl font-mono font-extrabold text-white">82 <span className="text-xs text-slate-500 font-normal">/ 100</span></div>
            </div>
            <div className="bg-oled-900 border border-oled-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400">CODE HEALTH</span>
              <div className="text-2xl font-mono font-extrabold text-status-ready">86</div>
            </div>
            <div className="bg-oled-900 border border-oled-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400">SECURITY</span>
              <div className="text-2xl font-mono font-extrabold text-status-blocked">71</div>
            </div>
            <div className="bg-oled-900 border border-oled-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs font-mono text-slate-400">BUILD & TEST</span>
              <div className="text-2xl font-mono font-extrabold text-status-ready">100</div>
            </div>
            <div className="bg-oled-900 border border-oled-800 p-4 rounded-2xl space-y-1 col-span-2 md:col-span-1">
              <span className="text-xs font-mono text-slate-400">RUNTIME / UI</span>
              <div className="text-2xl font-mono font-extrabold text-status-review">82</div>
            </div>
          </div>

          {/* Sample Finding Snippet Box */}
          <div className="bg-oled-900 border border-oled-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-status-blocked/20 text-status-blocked border border-status-blocked/30">
                  HIGH
                </span>
                <h3 className="font-heading font-semibold text-white text-sm">
                  Potential exposed secret in configuration file
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Detector: Gitleaks</span>
            </div>

            <div className="bg-oled-950 border border-oled-800 rounded-xl p-4 font-mono text-xs space-y-1 text-slate-300">
              <div className="text-status-cyan">File: src/config.ts (Line 18)</div>
              <div className="text-slate-500 select-none">17 | export const API_HOST = &quot;https://api.example.com&quot;;</div>
              <div className="text-status-blocked bg-status-blocked/10 px-2 py-0.5 rounded -mx-2">
                18 | export const STRIPE_SECRET = &quot;sk_live_51M0...94x&quot;;
              </div>
              <div className="text-slate-500 select-none">19 | export const TIMEOUT = 5000;</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
