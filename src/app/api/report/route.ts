import { NextRequest, NextResponse } from 'next/server';
import { runSecurityCheck } from '@/lib/checks/security';
import { runCodeHealthCheck } from '@/lib/checks/code-health';
import { runBuildTestCheck } from '@/lib/checks/build-test';
import { runRuntimeUICheck } from '@/lib/checks/runtime-ui';
import { runPerformanceCheck } from '@/lib/checks/performance';
import { calculateReleaseStatus } from '@/lib/engine/release-calculator';
import { processProjectInput } from '@/lib/engine/extract';
import { createProjectSnapshot } from '@/lib/engine/snapshot';
import { CategoryResult } from '@/types/audit.types';
import { ProjectSnapshot } from '@/types/project.types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));

    let snapshot: ProjectSnapshot | null = null;
    let existingCategoryResults: Record<string, CategoryResult> = {};

    if (body.snapshot && typeof body.snapshot === 'object') {
      snapshot = body.snapshot as ProjectSnapshot;
    } else if (body.project && typeof body.project === 'object') {
      snapshot = body.project as ProjectSnapshot;
    } else if (body.files && Array.isArray(body.files) && body.stack) {
      snapshot = body as unknown as ProjectSnapshot;
    }

    if (body.categoryResults && typeof body.categoryResults === 'object') {
      existingCategoryResults = body.categoryResults;
    }

    // If snapshot is not provided, check if a workspace path or directory path was provided
    if (!snapshot) {
      const dirPath = body.path || body.directoryPath || body.workspacePath || body.directory;
      if (dirPath && typeof dirPath === 'string') {
        const workspace = await processProjectInput(dirPath);
        snapshot = createProjectSnapshot(workspace);
      }
    }

    if (!snapshot) {
      return NextResponse.json(
        {
          error: 'Invalid request payload. Please provide project snapshot or workspace path.',
        },
        { status: 400 }
      );
    }

    // Selected checks array or default to all checks
    const requestedChecks: string[] = Array.isArray(body.selectedChecks)
      ? body.selectedChecks
      : ['security', 'code-health', 'build-test', 'runtime-ui', 'performance'];

    const newResults: Record<string, CategoryResult> = {};

    // 1. Security Check
    if (requestedChecks.includes('security') && !existingCategoryResults['security']) {
      try {
        newResults['security'] = await runSecurityCheck(snapshot);
      } catch (err: any) {
        newResults['security'] = {
          category: 'security',
          status: 'failed',
          score: 0,
          durationMs: 0,
          findings: [],
          summary: `Security check execution failed: ${err?.message || err}`,
        };
      }
    }

    // 2. Code Health Check
    if (requestedChecks.includes('code-health') && !existingCategoryResults['code-health']) {
      try {
        newResults['code-health'] = await runCodeHealthCheck(snapshot);
      } catch (err: any) {
        newResults['code-health'] = {
          category: 'code-health',
          status: 'failed',
          score: 0,
          durationMs: 0,
          findings: [],
          summary: `Code Health check execution failed: ${err?.message || err}`,
        };
      }
    }

    // 3. Build & Test Check
    if (requestedChecks.includes('build-test') && !existingCategoryResults['build-test']) {
      try {
        newResults['build-test'] = await runBuildTestCheck(snapshot);
      } catch (err: any) {
        newResults['build-test'] = {
          category: 'build-test',
          status: 'failed',
          score: 0,
          durationMs: 0,
          findings: [],
          summary: `Build & Test check execution failed: ${err?.message || err}`,
        };
      }
    }

    // 4 & 5. Runtime & UI Check and Performance Check
    const needsRuntime = requestedChecks.includes('runtime-ui') && !existingCategoryResults['runtime-ui'];
    const needsPerf = requestedChecks.includes('performance') && !existingCategoryResults['performance'];

    if (needsRuntime) {
      try {
        newResults['runtime-ui'] = await runRuntimeUICheck(snapshot);
      } catch (err: any) {
        newResults['runtime-ui'] = {
          category: 'runtime-ui',
          status: 'failed',
          score: 0,
          durationMs: 0,
          findings: [],
          summary: `Runtime & UI check execution failed: ${err?.message || err}`,
        };
      }
    }

    if (needsPerf) {
      try {
        newResults['performance'] = await runPerformanceCheck(snapshot);
      } catch (err: any) {
        newResults['performance'] = {
          category: 'performance',
          status: 'failed',
          score: 0,
          durationMs: 0,
          findings: [],
          summary: `Performance check execution failed: ${err?.message || err}`,
        };
      }
    }

    // Merge existing category results with new results
    const combinedCategoryResults: Record<string, CategoryResult> = {
      ...existingCategoryResults,
      ...newResults,
    };

    // Calculate final release status and assemble AuditReport
    const report = calculateReleaseStatus({
      snapshot,
      categoryResults: combinedCategoryResults,
    });

    return NextResponse.json(report, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'An unknown error occurred while generating the audit report.',
      },
      { status: 500 }
    );
  }
}
