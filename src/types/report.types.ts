import { CategoryResult } from "./audit.types";
import { Finding } from "./finding.types";
import { ProjectSnapshot } from "./project.types";

export type ReleaseStatus = "READY_TO_SHIP" | "REVIEW_BEFORE_SHIP" | "BLOCKED";

export interface AuditReport {
  id: string;
  generatedAt: string;
  project: ProjectSnapshot;
  overallScore: number; // 0 - 100
  releaseStatus: ReleaseStatus;
  blockers: Finding[];
  categoryResults: Record<string, CategoryResult>;
  totalFindings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recommendedFixOrder: string[];
}
