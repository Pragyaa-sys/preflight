"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: "sm" | "md";
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
  size = "md",
}: SwitchProps) {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-status-cyan disabled:cursor-not-allowed disabled:opacity-50",
        isSm ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-status-cyan" : "bg-oled-800",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
          isSm ? "h-4 w-4" : "h-5 w-5",
          checked
            ? isSm
              ? "translate-x-4 bg-black"
              : "translate-x-5 bg-black"
            : "translate-x-0 bg-slate-400"
        )}
      />
    </button>
  );
}
