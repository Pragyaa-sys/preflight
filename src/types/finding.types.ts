export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type CheckCategory =
  | "code-health"
  | "security"
  | "build-test"
  | "runtime-ui"
  | "performance";

export interface CodeLocation {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export interface Finding {
  id: string;
  category: CheckCategory;
  severity: Severity;
  title: string;
  description: string;
  detector: string; // e.g. "Gitleaks", "ESLint", "Playwright", "Knip", "npm-audit"
  location?: CodeLocation;
  evidence?: string;
  recommendation?: string;
  isBlocker: boolean;
}
