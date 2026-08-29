"use client";

import React, { useState } from "react";
import { CodeLocation } from "@/types";
import { Copy, Check, FileCode, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeSnippetViewerProps {
  location?: CodeLocation;
  title?: string;
  detector?: string;
  severity?: string;
}

export function CodeSnippetViewer({
  location,
  title,
  detector,
  severity = "high",
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!location || !location.snippet) {
    return (
      <div className="bg-oled-950 border border-oled-800 rounded-xl p-4 text-xs font-mono text-slate-500">
        No code snippet available for this finding.
      </div>
    );
  }

  const handleCopy = () => {
    if (location.snippet) {
      navigator.clipboard.writeText(location.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = location.snippet.split("\n");
  const targetLineNumber = location.line;

  return (
    <div className="rounded-xl border border-oled-800 bg-oled-950 overflow-hidden shadow-inner font-mono text-xs">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-oled-900 border-b border-oled-800 text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <FileCode className="w-4 h-4 text-status-cyan shrink-0" />
          <span className="text-status-cyan font-bold truncate">
            {location.file}
          </span>
          {targetLineNumber && (
            <span className="text-slate-400 shrink-0">
              (Line {targetLineNumber}
              {location.column ? `:${location.column}` : ""})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detector && (
            <span className="text-[10px] text-slate-500 hidden sm:inline-block">
              Detector: {detector}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-[11px] text-slate-400 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-status-ready mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code Snippet Box */}
      <div className="p-4 overflow-x-auto text-slate-300 leading-relaxed font-mono">
        <pre className="space-y-1">
          {lines.map((line, idx) => {
            // Check if this line matches the target line or contains high-risk keywords
            const isOffendingLine =
              line.includes(String(targetLineNumber)) ||
              line.includes("STRIPE_SECRET") ||
              line.includes("sk_live_") ||
              line.includes("redirect(") ||
              line.includes("bg-cyan-300") ||
              line.includes("SELECT * FROM");

            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 rounded transition-colors ${
                  isOffendingLine
                    ? severity === "critical"
                      ? "bg-status-blocked/20 text-rose-300 border-l-2 border-status-blocked"
                      : "bg-status-review/15 text-amber-200 border-l-2 border-status-review"
                    : "hover:bg-oled-900/50"
                }`}
              >
                <code className="whitespace-pre">{line}</code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
