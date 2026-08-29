import { Finding, Severity } from "@/types/finding.types";
import { CategoryResult, CheckStatus } from "@/types/audit.types";
import { CheckCategory } from "@/types/finding.types";

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 40,
  high: 20,
  medium: 10,
  low: 4,
  info: 0,
};

/** Simple, transparent scoring: start at 100, subtract per finding, floor at 0. */
export function scoreFromFindings(findings: Finding[]): number {
  const penalty = findings.reduce((sum, f) => sum + SEVERITY_PENALTY[f.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function buildCategoryResult(
  category: CheckCategory,
  findings: Finding[],
  durationMs: number,
  summary: string,
  status: CheckStatus = "completed"
): CategoryResult {
  return {
    category,
    status,
    score: scoreFromFindings(findings),
    durationMs,
    findings,
    summary,
  };
}

let counter = 0;
export function findingId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}
