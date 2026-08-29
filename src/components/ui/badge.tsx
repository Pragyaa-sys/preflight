import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "info"
    | "ready"
    | "cyan"
    | "purple";
  pulse?: boolean;
}

export function Badge({ className, variant = "default", pulse = false, children, ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold transition-colors";

  const variantStyles: Record<string, string> = {
    default: "bg-oled-800 text-slate-200 border border-oled-700",
    secondary: "bg-oled-850 text-slate-400 border border-oled-800",
    outline: "bg-transparent text-slate-300 border border-oled-700",
    critical: "bg-status-blocked/15 text-status-blocked border border-status-blocked/30",
    high: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    medium: "bg-status-review/15 text-status-review border border-status-review/30",
    low: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    info: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
    ready: "bg-status-ready/15 text-status-ready border border-status-ready/30",
    cyan: "bg-status-cyan/15 text-status-cyan border border-status-cyan/30",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  };

  const dotColors: Record<string, string> = {
    critical: "bg-status-blocked",
    high: "bg-rose-400",
    medium: "bg-status-review",
    low: "bg-yellow-400",
    info: "bg-sky-400",
    ready: "bg-status-ready",
    cyan: "bg-status-cyan",
    purple: "bg-purple-400",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {pulse && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            dotColors[variant] || "bg-current"
          )}
        />
      )}
      {children}
    </div>
  );
}
