import path from 'path';
import crypto from 'crypto';
import { ProjectSnapshot } from '@/types/project.types';
import { CategoryResult, CheckStatus } from '@/types/audit.types';
import { Finding } from '@/types/finding.types';
import { runBrowserAudit, BrowserAuditResult } from '@/lib/engine/browser-runner';

/**
 * Runs browser performance checks:
 * 1. Time to First Byte (TTFB) (> 800ms flag)
 * 2. DOM Content Loaded timing (> 2500ms flag)
 * 3. Large asset payload detection (> 1MB assets)
 * 4. Overall bundle size estimation / total assets volume
 */
export async function runPerformanceCheck(
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

  const auditResult: BrowserAuditResult = auditResultOverride ||
    (await runBrowserAudit(workspacePath, devCommand, ['/']));

  if (!auditResult.serverStarted) {
    findings.push({
      id: `perf_${crypto.randomUUID()}`,
      category: 'performance',
      severity: 'medium',
      title: 'Performance check skipped: Server unreachable',
      description: 'Could not connect to project server to measure browser timing metrics.',
      detector: 'PreFlight Performance Engine',
      recommendation: 'Ensure application dev server runs cleanly.',
      isBlocker: false,
    });

    return {
      category: 'performance',
      status: 'completed',
      score: 50,
      durationMs: Date.now() - startTime,
      findings,
      summary: 'Performance audit skipped: server failed to start.',
    };
  }

  for (const crawl of auditResult.crawlResults) {
    // 1. TTFB Check (> 800ms)
    if (crawl.navigationTiming?.ttfb && crawl.navigationTiming.ttfb > 800) {
      findings.push({
        id: `perf_${crypto.randomUUID()}`,
        category: 'performance',
        severity: crawl.navigationTiming.ttfb > 2000 ? 'high' : 'medium',
        title: `Slow Time to First Byte (TTFB) on '${crawl.route}' (${crawl.navigationTiming.ttfb}ms)`,
        description: `Server response TTFB exceeded target threshold of 800ms.`,
        detector: 'Navigation Timing API',
        recommendation: 'Optimize server-side database queries, SSR render paths, or enable HTTP caching.',
        isBlocker: false,
      });
    }

    // 2. DomContentLoaded Check (> 2500ms)
    if (crawl.navigationTiming?.domContentLoaded && crawl.navigationTiming.domContentLoaded > 2500) {
      findings.push({
        id: `perf_${crypto.randomUUID()}`,
        category: 'performance',
        severity: crawl.navigationTiming.domContentLoaded > 5000 ? 'high' : 'medium',
        title: `Slow DOM Content Loaded time on '${crawl.route}' (${crawl.navigationTiming.domContentLoaded}ms)`,
        description: `DOM parsing and render blocking script execution took over 2.5 seconds.`,
        detector: 'Navigation Timing API',
        recommendation: 'Defer render-blocking JavaScript files and reduce initial DOM node size.',
        isBlocker: false,
      });
    }

    // 3. Large Asset Detection (> 1MB)
    for (const asset of crawl.largeAssets) {
      const sizeMB = (asset.sizeBytes / (1024 * 1024)).toFixed(2);
      findings.push({
        id: `perf_${crypto.randomUUID()}`,
        category: 'performance',
        severity: 'medium',
        title: `Uncompressed large asset (${sizeMB} MB)`,
        description: `Asset requested at '${asset.url}' exceeds 1MB threshold.`,
        detector: 'Playwright Network Resource Monitor',
        recommendation: 'Compress image/media assets using WebP/AVIF or implement dynamic chunk code-splitting.',
        isBlocker: false,
      });
    }
  }

  // 4. Static asset check from snapshot files (e.g. uncompressed images in public directory)
  snapshot.files.forEach((file) => {
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4'].includes(file.extension)) {
      if (file.size > 2 * 1024 * 1024) { // > 2MB static source file
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        findings.push({
          id: `perf_${crypto.randomUUID()}`,
          category: 'performance',
          severity: 'low',
          title: `Large static media file in repository: ${path.basename(file.relativePath)} (${sizeMB} MB)`,
          description: `Media asset '${file.relativePath}' is ${sizeMB} MB.`,
          detector: 'PreFlight Repository Storage Auditor',
          location: { file: file.relativePath },
          recommendation: 'Optimize static media assets using modern compressed formats or host via CDN.',
          isBlocker: false,
        });
      }
    }
  });

  // Calculate score
  let scoreDeductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'high') scoreDeductions += 20;
    else if (f.severity === 'medium') scoreDeductions += 10;
    else if (f.severity === 'low') scoreDeductions += 3;
  });

  const score = Math.max(0, 100 - scoreDeductions);
  const durationMs = Date.now() - startTime;
  const status: CheckStatus = 'completed';

  return {
    category: 'performance',
    status,
    score,
    durationMs,
    findings,
    summary: `Analyzed browser timing & asset sizes. Discovered ${findings.length} performance bottlenecks.`,
  };
}
