import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "cyan"
    | "emerald"
    | "amber";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-heading font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98] select-none";

    const variantStyles: Record<string, string> = {
      primary:
        "bg-white text-black hover:bg-slate-200 focus-visible:ring-white shadow-[0_0_20px_rgba(255,255,255,0.15)]",
      secondary:
        "bg-oled-850 hover:bg-oled-800 text-slate-200 border border-oled-700 hover:border-slate-600 focus-visible:ring-slate-400",
      outline:
        "bg-transparent hover:bg-oled-850 text-slate-300 border border-oled-800 hover:border-oled-700 focus-visible:ring-slate-500",
      ghost:
        "bg-transparent hover:bg-oled-850 text-slate-400 hover:text-white focus-visible:ring-slate-500",
      destructive:
        "bg-status-blocked/15 hover:bg-status-blocked/25 text-status-blocked border border-status-blocked/40 focus-visible:ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
      cyan:
        "bg-status-cyan text-black hover:bg-cyan-400 font-bold focus-visible:ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]",
      emerald:
        "bg-status-ready text-black hover:bg-emerald-400 font-bold focus-visible:ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
      amber:
        "bg-status-review text-black hover:bg-amber-400 font-bold focus-visible:ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
    };

    const sizeStyles: Record<string, string> = {
      sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
      md: "text-sm px-4 py-2.5 gap-2 rounded-xl",
      lg: "text-base px-6 py-3.5 gap-2.5 rounded-2xl",
      icon: "h-9 w-9 p-0 rounded-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
