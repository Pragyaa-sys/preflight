import { CheckCategory, Finding } from "./finding.types";

export type CheckStatus = "idle" | "running" | "completed" | "failed" | "skipped";

export interface CheckOption {
  id: CheckCategory;
  name: string;
  description: string;
  isAvailable: boolean;
  isSelected: boolean;
  subchecks: string[];
}

export interface CategoryResult {
  category: CheckCategory;
  status: CheckStatus;
  score: number; // 0 - 100
  durationMs: number;
  findings: Finding[];
  summary: string;
}

export interface AuditProgress {
  overallPercentage: number;
  currentCheck: string;
  completedChecks: number;
  totalChecks: number;
}
