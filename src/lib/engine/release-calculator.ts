import { CategoryResult } from '@/types/audit.types';
import { Finding } from '@/types/finding.types';
import { AuditReport, ReleaseStatus } from '@/types/report.types';
import { ProjectSnapshot } from '@/types/project.types';

export interface CalculationInput {
  snapshot: ProjectSnapshot;
  categoryResults: Record<string, CategoryResult>;
}

export function calculateReleaseStatus(input: CalculationInput): AuditReport {
  const { snapshot, categoryResults } = input;

  const allFindings: Finding[] = [];
  const categoryScores: number[] = [];

  Object.values(categoryResults).forEach((result) => {
    allFindings.push(...result.findings);
    if (result.status === 'completed') {
      categoryScores.push(result.score);
    }
  });

  // Calculate Overall Score (Average of completed category scores)
  const overallScore =
    categoryScores.length > 0
      ? Math.round(categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length)
      : 100;

  // Count findings by severity
  const totalFindings = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const blockers: Finding[] = [];

  allFindings.forEach((finding) => {
    totalFindings[finding.severity]++;
    if (finding.isBlocker || finding.severity === 'critical') {
      blockers.push(finding);
    }
  });

  // Determine Release Status
  let releaseStatus: ReleaseStatus = 'READY_TO_SHIP';

  const hasBuildFailure = categoryResults['build-test']?.status === 'failed';

  if (blockers.length > 0 || totalFindings.critical > 0 || hasBuildFailure || totalFindings.high >= 3) {
    releaseStatus = 'BLOCKED';
  } else if (overallScore < 80 || totalFindings.high > 0) {
    releaseStatus = 'REVIEW_BEFORE_SHIP';
  }

  // Recommended Fix Order
  const recommendedFixOrder: string[] = [];
  if (totalFindings.critical > 0) {
    recommendedFixOrder.push(`Fix ${totalFindings.critical} CRITICAL security/config blockers immediately.`);
  }
  if (hasBuildFailure) {
    recommendedFixOrder.push('Resolve build/test compilation failures.');
  }
  if (totalFindings.high > 0) {
    recommendedFixOrder.push(`Address ${totalFindings.high} HIGH severity findings before deploying.`);
  }
  if (totalFindings.medium > 0) {
    recommendedFixOrder.push(`Review ${totalFindings.medium} MEDIUM severity code health/UI issues.`);
  }
  if (recommendedFixOrder.length === 0) {
    recommendedFixOrder.push('All checks passed cleanly! Project is ready for production deployment.');
  }

  return {
    id: snapshot.id,
    generatedAt: new Date().toISOString(),
    project: snapshot,
    overallScore,
    releaseStatus,
    blockers,
    categoryResults,
    totalFindings,
    recommendedFixOrder,
  };
}
