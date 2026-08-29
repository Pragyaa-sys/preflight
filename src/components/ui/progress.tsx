import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100
  indicatorColor?: "cyan" | "emerald" | "amber" | "rose" | "gradient";
  showLabel?: boolean;
}

export function Progress({
  className,
  value = 0,
  indicatorColor = "cyan",
  showLabel = false,
  ...props
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colorStyles: Record<string, string> = {
    cyan: "bg-status-cyan shadow-[0_0_12px_rgba(6,182,212,0.5)]",
    emerald: "bg-status-ready shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    amber: "bg-status-review shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    rose: "bg-status-blocked shadow-[0_0_12px_rgba(244,63,94,0.5)]",
    gradient: "bg-gradient-to-r from-status-cyan via-status-ready to-emerald-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
  };

  return (
    <div className="w-full space-y-1.5">
      {showLabel && (
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Progress</span>
          <span className="text-white font-bold">{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-oled-800 border border-oled-700/50",
          className
        )}
        {...props}
      >
        <div
          className={cn("h-full transition-all duration-500 ease-out rounded-full", colorStyles[indicatorColor])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
