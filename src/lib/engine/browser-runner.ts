import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import getPort from 'get-port';
import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { execa, ExecaChildProcess } from 'execa';

export interface RouteCrawlResult {
  route: string;
  url: string;
  statusCode?: number;
  screenshotPath?: string;
  consoleErrors: Array<{ type: string; text: string; location?: string }>;
  networkFailures: Array<{ url: string; status?: number; errorText?: string }>;
  accessibilityViolations: Array<{
    id: string;
    impact: string;
    help: string;
    helpUrl: string;
    nodesCount: number;
    targetSnippet?: string;
  }>;
  navigationTiming?: {
    ttfb: number;
    domContentLoaded: number;
    loadTime: number;
  };
  largeAssets: Array<{ url: string; sizeBytes: number }>;
}

export interface BrowserAuditResult {
  baseUrl: string;
  port: number;
  serverStarted: boolean;
  crawlResults: RouteCrawlResult[];
  serverLogs: string[];
}

/**
 * Polls an HTTP endpoint until it responds or timeout expires.
 */
async function waitForServerReady(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const ready = await new Promise<boolean>((resolve) => {
        const req = http.get(url, (res) => {
          resolve(!!res.statusCode);
        });
        req.on('error', () => resolve(false));
        req.end();
      });
      if (ready) return true;
    } catch {
      // Continue polling
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/**
 * Spins up local project server on a random free port, crawls top routes via Playwright,
 * runs @axe-core/playwright accessibility audit, and captures screenshots & performance metrics.
 */
export async function runBrowserAudit(
  workspacePath: string,
  devCommand: string = 'npm run dev',
  routesToTest: string[] = ['/', '/about', '/login', '/dashboard']
): Promise<BrowserAuditResult> {
  const port = await getPort();
  const baseUrl = `http://localhost:${port}`;
  const serverLogs: string[] = [];

  // Parse command & args for execa
  let cmdParts = devCommand.trim().split(/\s+/);
  let mainCmd = cmdParts[0];
  if (process.platform === 'win32' && (mainCmd === 'npm' || mainCmd === 'npx' || mainCmd === 'pnpm' || mainCmd === 'yarn' || mainCmd === 'bun')) {
    mainCmd = `${mainCmd}.cmd`;
  }
  const args = cmdParts.slice(1);

  let serverProcess: ExecaChildProcess | null = null;
  let serverStarted = false;

  try {
    serverProcess = execa(mainCmd, args, {
      cwd: workspacePath,
      env: {
        ...process.env,
        PORT: String(port),
        CI: 'true',
        FORCE_COLOR: '0',
      },
      reject: false,
    });

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data: Buffer | string) => {
        serverLogs.push(data.toString());
      });
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data: Buffer | string) => {
        serverLogs.push(data.toString());
      });
    }

    // Wait for dev server to respond
    serverStarted = await waitForServerReady(baseUrl, 25000);
  } catch (err) {
    serverLogs.push(`Failed to start dev server process: ${String(err)}`);
  }

  const crawlResults: RouteCrawlResult[] = [];

  if (!serverStarted) {
    // Kill server process if it failed to start
    if (serverProcess) {
      try {
        serverProcess.kill('SIGKILL');
      } catch {
        // Ignore kill errors
      }
    }
    return {
      baseUrl,
      port,
      serverStarted: false,
      crawlResults: [],
      serverLogs,
    };
  }

  // Ensure public screenshot preview dir exists
  const screenshotDir = path.join(process.cwd(), 'public', 'temp', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    for (const route of routesToTest) {
      const pageUrl = `${baseUrl}${route.startsWith('/') ? route : '/' + route}`;
      const page: Page = await context.newPage();

      const consoleErrors: RouteCrawlResult['consoleErrors'] = [];
      const networkFailures: RouteCrawlResult['networkFailures'] = [];
      const largeAssets: RouteCrawlResult['largeAssets'] = [];

      // Listen for browser console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
          });
        }
      });

      // Listen for failed HTTP requests
      page.on('requestfailed', (req) => {
        networkFailures.push({
          url: req.url(),
          errorText: req.failure()?.errorText || 'Request failed',
        });
      });

      // Monitor network response asset sizes
      page.on('response', async (res) => {
        if (res.status() >= 400) {
          networkFailures.push({
            url: res.url(),
            status: res.status(),
            errorText: `HTTP Status ${res.status()}`,
          });
        }
        try {
          const headers = res.headers();
          const contentLength = headers['content-length'];
          if (contentLength) {
            const sizeBytes = parseInt(contentLength, 10);
            if (sizeBytes > 1024 * 1024) { // > 1MB
              largeAssets.push({ url: res.url(), sizeBytes });
            }
          }
        } catch {
          // Ignore header parsing errors
        }
      });

      let statusCode: number | undefined;
      let screenshotPath: string | undefined;
      let navigationTiming: RouteCrawlResult['navigationTiming'];
      let accessibilityViolations: RouteCrawlResult['accessibilityViolations'] = [];

      try {
        const response = await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        statusCode = response?.status();

        // Capture screenshot
        if (statusCode === 200 || !statusCode) {
          const imgFileName = `screenshot_${crypto.randomUUID()}.png`;
          const fullImgPath = path.join(screenshotDir, imgFileName);
          await page.screenshot({ path: fullImgPath, fullPage: false });
          screenshotPath = `/temp/screenshots/${imgFileName}`;
        }

        // Measure Navigation Performance
        try {
          navigationTiming = await page.evaluate(() => {
            const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
            if (entry) {
              return {
                ttfb: Math.round(entry.responseStart - entry.requestStart),
                domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.startTime),
                loadTime: Math.round(entry.loadEventEnd - entry.startTime),
              };
            }
            const timing = (window.performance as unknown as { timing: Record<string, number> }).timing;
            if (timing) {
              return {
                ttfb: Math.max(0, timing.responseStart - timing.requestStart),
                domContentLoaded: Math.max(0, timing.domContentLoadedEventEnd - timing.navigationStart),
                loadTime: Math.max(0, timing.loadEventEnd - timing.navigationStart),
              };
            }
            return undefined;
          });
        } catch {
          // Ignore performance measurement errors
        }

        // Run Axe Accessibility Audit
        try {
          const axeResults = await new AxeBuilder({ page }).analyze();
          accessibilityViolations = axeResults.violations.map((v) => ({
            id: v.id,
            impact: v.impact || 'medium',
            help: v.help,
            helpUrl: v.helpUrl,
            nodesCount: v.nodes.length,
            targetSnippet: v.nodes[0]?.html.slice(0, 100),
          }));
        } catch {
          // Ignore Axe audit failures on non-HTML pages
        }
      } catch (err) {
        consoleErrors.push({
          type: 'navigation-error',
          text: `Failed to navigate to ${pageUrl}: ${String(err)}`,
        });
      } finally {
        await page.close();
      }

      // Only record routes that attempted navigation or responded
      crawlResults.push({
        route,
        url: pageUrl,
        statusCode,
        screenshotPath,
        consoleErrors,
        networkFailures,
        accessibilityViolations,
        navigationTiming,
        largeAssets,
      });

      // Stop crawling remaining routes if home route completely failed to connect
      if (route === '/' && statusCode !== 200 && statusCode !== 301 && statusCode !== 302) {
        break;
      }
    }
  } catch (err) {
    serverLogs.push(`Browser runner error: ${String(err)}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProcess) {
      try {
        serverProcess.kill('SIGKILL');
      } catch {
        // Ignore kill errors
      }
    }
  }

  return {
    baseUrl,
    port,
    serverStarted: true,
    crawlResults,
    serverLogs,
  };
}
