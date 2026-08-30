import path from 'path';
import crypto from 'crypto';
import { ProjectSnapshot } from '@/types/project.types';
import { CategoryResult, CheckStatus } from '@/types/audit.types';
import { Finding } from '@/types/finding.types';
import { runBrowserAudit, BrowserAuditResult } from '@/lib/engine/browser-runner';

/**
 * Runs dynamic Runtime & UI checks using headless Playwright browser automation.
 * Evaluates:
 * 1. Dev server launch capability
 * 2. Unhandled JavaScript console errors & page crashes
 * 3. 4xx/5xx network request failures
 * 4. WCAG Accessibility violations (contrast, alt tags, ARIA labels)
 */
export async function runRuntimeUICheck(
  snapshot: ProjectSnapshot,
  auditResultOverride?: BrowserAuditResult
): Promise<CategoryResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];

  const workspacePath = snapshot.files.length > 0
    ? path.dirname(snapshot.files[0].path)
    : process.cwd();

  const devCommand = snapshot.scripts.dev
    ? `${snapshot.stack.packageManager === 'unknown' ? 'npm' : snapshot.stack.packageManager} run dev`
    : 'npm start';

  // Discover routes to test based on snapshot files
  const discoveredRoutes = new Set<string>(['/']);
  snapshot.files.forEach((f) => {
    const rel = f.relativePath;
    if (rel.includes('app/') || rel.includes('pages/')) {
      if (rel.includes('/about')) discoveredRoutes.add('/about');
      if (rel.includes('/login')) discoveredRoutes.add('/login');
      if (rel.includes('/dashboard')) discoveredRoutes.add('/dashboard');
      if (rel.includes('/settings')) discoveredRoutes.add('/settings');
    }
  });

  const routesToTest = Array.from(discoveredRoutes).slice(0, 5);

  // Execute or reuse browser audit
  const auditResult: BrowserAuditResult = auditResultOverride ||
    (await runBrowserAudit(workspacePath, devCommand, routesToTest));

  if (!auditResult.serverStarted) {
    findings.push({
      id: `rui_${crypto.randomUUID()}`,
      category: 'runtime-ui',
      severity: 'high',
      title: 'Dev server failed to launch',
      description: `Could not start local application server using command '${devCommand}'.`,
      detector: 'PreFlight Browser Engine',
      evidence: auditResult.serverLogs.slice(-10).join('\n'),
      recommendation: 'Check dev script configuration in package.json and verify all dependencies are installed.',
      isBlocker: true,
    });

    return {
      category: 'runtime-ui',
      status: 'completed',
      score: 20,
      durationMs: Date.now() - startTime,
      findings,
      summary: 'Runtime & UI audit aborted: local dev server failed to start.',
    };
  }

  // Process crawl results
  for (const crawl of auditResult.crawlResults) {
    // 1. HTTP Status check
    if (crawl.statusCode && crawl.statusCode >= 400) {
      findings.push({
        id: `rui_${crypto.randomUUID()}`,
        category: 'runtime-ui',
        severity: crawl.statusCode >= 500 ? 'critical' : 'high',
        title: `Route '${crawl.route}' returned HTTP ${crawl.statusCode}`,
        description: `Server responded with status code ${crawl.statusCode} during page navigation.`,
        detector: 'PreFlight Route Crawler',
        evidence: crawl.screenshotPath ? `Screenshot preview captured at ${crawl.screenshotPath}` : undefined,
        recommendation: `Fix server error or broken routing logic for '${crawl.route}'.`,
        isBlocker: crawl.statusCode >= 500,
      });
    }

    // 2. Unhandled Console Errors
    for (const consoleErr of crawl.consoleErrors) {
      findings.push({
        id: `rui_${crypto.randomUUID()}`,
        category: 'runtime-ui',
        severity: 'high',
        title: `Browser console error on '${crawl.route}'`,
        description: consoleErr.text.slice(0, 200),
        detector: 'Playwright Console Listener',
        location: consoleErr.location
          ? { file: consoleErr.location }
          : undefined,
        recommendation: 'Fix unhandled client-side exception reported in browser console.',
        isBlocker: false,
      });
    }

    // 3. Network Request Failures (4xx/5xx/CORS)
    for (const netFail of crawl.networkFailures) {
      findings.push({
        id: `rui_${crypto.randomUUID()}`,
        category: 'runtime-ui',
        severity: 'medium',
        title: `Network failure on route '${crawl.route}'`,
        description: `Failed request to ${netFail.url} (${netFail.errorText || 'Failed'}).`,
        detector: 'Playwright Network Listener',
        recommendation: 'Verify API endpoint availability and check cross-origin CORS headers.',
        isBlocker: false,
      });
    }

    // 4. Accessibility Violations
    for (const a11y of crawl.accessibilityViolations) {
      const severity = a11y.impact === 'critical' ? 'high' : a11y.impact === 'serious' ? 'medium' : 'low';
      findings.push({
        id: `rui_${crypto.randomUUID()}`,
        category: 'runtime-ui',
        severity,
        title: `Accessibility Violation: ${a11y.help} (${crawl.route})`,
        description: `Rule '${a11y.id}' violated across ${a11y.nodesCount} DOM node(s).`,
        detector: 'Axe Accessibility Engine',
        evidence: a11y.targetSnippet ? `Target snippet: ${a11y.targetSnippet}` : undefined,
        recommendation: `Follow WCAG guidelines (${a11y.helpUrl}) to resolve this accessibility defect.`,
        isBlocker: false,
      });
    }
  }

  // Deduct score based on findings
  let scoreDeductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'critical') scoreDeductions += 30;
    else if (f.severity === 'high') scoreDeductions += 15;
    else if (f.severity === 'medium') scoreDeductions += 7;
    else if (f.severity === 'low') scoreDeductions += 2;
  });

  const score = Math.max(0, 100 - scoreDeductions);
  const durationMs = Date.now() - startTime;
  const status: CheckStatus = 'completed';

  return {
    category: 'runtime-ui',
    status,
    score,
    durationMs,
    findings,
    summary: `Audited ${auditResult.crawlResults.length} routes. Discovered ${findings.length} UI/runtime issues.`,
  };
}
