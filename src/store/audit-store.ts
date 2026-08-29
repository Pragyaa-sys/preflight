import { create } from "zustand";
import {
  CheckCategory,
  Finding,
  ProjectSnapshot,
  CategoryResult,
  AuditReport,
  ReleaseStatus,
  CheckStatus,
} from "@/types";

export interface LogEntry {
  id: string;
  timestamp: string;
  category?: CheckCategory;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export interface AuditState {
  // Project Info
  snapshot: ProjectSnapshot | null;
  selectedChecks: CheckCategory[];
  
  // Audit Execution
  isAuditing: boolean;
  auditProgress: number; // 0 to 100
  currentCategory: CheckCategory | null;
  categoryResults: Record<CheckCategory, CategoryResult>;
  categoryStatuses: Record<CheckCategory, CheckStatus>;
  logs: LogEntry[];
  
  // Results & Findings
  findings: Finding[];
  ignoredFindingIds: Set<string>;
  report: AuditReport | null;

  // Actions
  setSnapshot: (snapshot: ProjectSnapshot) => void;
  toggleCheckCategory: (category: CheckCategory) => void;
  selectAllChecks: () => void;
  clearAllChecks: () => void;
  setSelectedChecks: (checks: CheckCategory[]) => void;
  
  // Audit Simulation / Execution
  startAudit: (navigateCallback?: () => void) => Promise<void>;
  cancelAudit: () => void;
  updateCategoryProgress: (
    category: CheckCategory,
    status: CheckStatus,
    score?: number,
    findings?: Finding[],
    summary?: string,
    durationMs?: number
  ) => void;
  addLog: (level: LogEntry["level"], message: string, category?: CheckCategory) => void;
  
  // Findings management
  toggleIgnoreFinding: (findingId: string) => void;
  isFindingIgnored: (findingId: string) => boolean;
  recalculateReport: () => void;

  // Sample Presets
  loadSampleProject: (preset: "saas-starter" | "clean-api" | "vulnerable-app") => void;
  reset: () => void;
}

const DEFAULT_CATEGORIES: CheckCategory[] = [
  "code-health",
  "security",
  "build-test",
  "runtime-ui",
  "performance",
];

const INITIAL_CATEGORY_RESULTS: Record<CheckCategory, CategoryResult> = {
  "code-health": {
    category: "code-health",
    status: "idle",
    score: 100,
    durationMs: 0,
    findings: [],
    summary: "Dead code, circular dependencies, oversized functions & AST health",
  },
  security: {
    category: "security",
    status: "idle",
    score: 100,
    durationMs: 0,
    findings: [],
    summary: "API keys, secret leaks, vulnerable dependencies & injection vectors",
  },
  "build-test": {
    category: "build-test",
    status: "idle",
    score: 100,
    durationMs: 0,
    findings: [],
    summary: "TypeScript compilation, ESLint validation & unit test suite pass rate",
  },
  "runtime-ui": {
    category: "runtime-ui",
    status: "idle",
    score: 100,
    durationMs: 0,
    findings: [],
    summary: "Headless Playwright crawl, console errors, 404 routes & WCAG a11y audit",
  },
  performance: {
    category: "performance",
    status: "idle",
    score: 100,
    durationMs: 0,
    findings: [],
    summary: "Time to First Byte (TTFB), DOM load speed & heavy static bundle assets",
  },
};

const INITIAL_CATEGORY_STATUSES: Record<CheckCategory, CheckStatus> = {
  "code-health": "idle",
  security: "idle",
  "build-test": "idle",
  "runtime-ui": "idle",
  performance: "idle",
};

// Preset 1: Next.js SaaS App (Review Before Ship)
const SAMPLE_SAAS_SNAPSHOT: ProjectSnapshot = {
  id: "proj_nextjs_saas_01",
  name: "cloud-saas-dashboard",
  uploadedAt: new Date().toISOString(),
  stack: {
    name: "cloud-saas-dashboard",
    language: "typescript",
    framework: "nextjs",
    frameworks: ["Next.js 15", "React 19", "Tailwind CSS"],
    projectType: "fullstack",
    frontendFramework: "Next.js",
    backendFramework: "Next.js Server Actions",
    packageManager: "pnpm",
    hasTests: true,
    hasTypeScript: true,
    hasDocker: false,
    totalFiles: 142,
    analyzedFiles: 86,
    ignoredFiles: 56,
    suggestedChecks: ["code-health", "security", "build-test", "runtime-ui", "performance"],
  },
  files: [
    { path: "src/app/page.tsx", relativePath: "src/app/page.tsx", size: 4200, extension: ".tsx", isTestFile: false, isConfigFile: false },
    { path: "src/app/api/auth/route.ts", relativePath: "src/app/api/auth/route.ts", size: 3100, extension: ".ts", isTestFile: false, isConfigFile: false },
    { path: "src/components/Dashboard.tsx", relativePath: "src/components/Dashboard.tsx", size: 8500, extension: ".tsx", isTestFile: false, isConfigFile: false },
    { path: "src/lib/config.ts", relativePath: "src/lib/config.ts", size: 1200, extension: ".ts", isTestFile: false, isConfigFile: true },
    { path: "src/lib/analytics.ts", relativePath: "src/lib/analytics.ts", size: 2400, extension: ".ts", isTestFile: false, isConfigFile: false },
    { path: "package.json", relativePath: "package.json", size: 1800, extension: ".json", isTestFile: false, isConfigFile: true },
  ],
  dependencies: {
    next: "15.1.0",
    react: "19.0.0",
    "react-dom": "19.0.0",
    lucide: "^0.460.0",
    zod: "^3.23.8",
  },
  devDependencies: {
    typescript: "^5.7.2",
    tailwindcss: "^4.0.0",
    eslint: "^9.16.0",
  },
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "eslint .",
    test: "vitest run",
  },
};

const SAMPLE_SAAS_FINDINGS: Finding[] = [
  {
    id: "f-saas-1",
    category: "security",
    severity: "high",
    title: "Unsanitized Redirect in Authentication Route",
    description: "User-controlled query parameter 'callbackUrl' is passed directly into NextResponse.redirect without origin validation.",
    detector: "SecurityASTScanner",
    location: {
      file: "src/app/api/auth/route.ts",
      line: 34,
      column: 12,
      snippet: `32 | const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard';\n33 | // Potential Open Redirect Vulnerability\n34 | return NextResponse.redirect(new URL(callbackUrl, req.url));\n35 | }`,
    },
    evidence: "searchParams.get('callbackUrl') without domain whitelist check",
    recommendation: "Validate callbackUrl against an allowed domain list or enforce relative path check (e.g., callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')).",
    isBlocker: false,
  },
  {
    id: "f-saas-2",
    category: "runtime-ui",
    severity: "medium",
    title: "WCAG Color Contrast Violation on CTA Button",
    description: "Primary submit button has a contrast ratio of 3.2:1 (light cyan on white) which fails WCAG 2.1 AA requirement (minimum 4.5:1).",
    detector: "AxeCorePlaywright",
    location: {
      file: "src/components/Dashboard.tsx",
      line: 118,
      column: 8,
      snippet: `116 | <button\n117 |   className="bg-cyan-300 text-white font-medium py-2 px-4 rounded-lg"\n118 |   onClick={handleExport}\n119 | >\n120 |   Export Metrics\n121 | </button>`,
    },
    evidence: "Element <button class='bg-cyan-300 text-white'> has contrast 3.2:1 on #ffffff",
    recommendation: "Increase button background shade to bg-cyan-600 or change text color to dark slate for high contrast compliance.",
    isBlocker: false,
  },
  {
    id: "f-saas-3",
    category: "code-health",
    severity: "low",
    title: "Unused Export Declarations Detected",
    description: "Exported function 'formatLegacyTimestamp' is never imported or referenced across any workspace files.",
    detector: "ts-morph DeadCodeCheck",
    location: {
      file: "src/lib/analytics.ts",
      line: 52,
      column: 1,
      snippet: `50 | }\n51 |\n52 | export function formatLegacyTimestamp(date: Date): string {\n53 |   return date.toISOString().replace(/T/, ' ').replace(/\\..+/, '');\n54 | }`,
    },
    evidence: "Declaration 'formatLegacyTimestamp' has 0 incoming references",
    recommendation: "Remove unused exported helper to reduce dead code and improve bundle tree-shaking.",
    isBlocker: false,
  },
  {
    id: "f-saas-4",
    category: "performance",
    severity: "medium",
    title: "Unoptimized Hero Image (> 1.4 MB)",
    description: "Large uncompressed PNG asset found in public directory loaded without Next.js Image component optimization.",
    detector: "BundleAssetAuditor",
    location: {
      file: "src/app/page.tsx",
      line: 67,
      column: 14,
      snippet: `65 | <div className="hero-banner">\n66 |   {/* Unoptimized high-res asset */}\n67 |   <img src="/assets/hero-bg-uncompressed.png" alt="Product Hero" />\n68 | </div>`,
    },
    evidence: "/public/assets/hero-bg-uncompressed.png size is 1,482,100 bytes",
    recommendation: "Convert image to WebP/AVIF format and use <Image width={1200} height={600} priority /> for responsive caching.",
    isBlocker: false,
  },
];

// Preset 2: Clean Express API (Ready to Ship)
const SAMPLE_CLEAN_SNAPSHOT: ProjectSnapshot = {
  id: "proj_express_clean_02",
  name: "auth-gateway-microservice",
  uploadedAt: new Date().toISOString(),
  stack: {
    name: "auth-gateway-microservice",
    language: "typescript",
    framework: "express",
    frameworks: ["Express", "TypeScript", "Jest", "Prisma"],
    projectType: "backend",
    frontendFramework: undefined,
    backendFramework: "Express 4.21",
    packageManager: "npm",
    hasTests: true,
    hasTypeScript: true,
    hasDocker: true,
    totalFiles: 68,
    analyzedFiles: 52,
    ignoredFiles: 16,
    suggestedChecks: ["code-health", "security", "build-test"],
  },
  files: [
    { path: "src/server.ts", relativePath: "src/server.ts", size: 2100, extension: ".ts", isTestFile: false, isConfigFile: false },
    { path: "src/routes/health.ts", relativePath: "src/routes/health.ts", size: 850, extension: ".ts", isTestFile: false, isConfigFile: false },
    { path: "src/tests/auth.test.ts", relativePath: "src/tests/auth.test.ts", size: 4500, extension: ".ts", isTestFile: true, isConfigFile: false },
  ],
  dependencies: {
    express: "^4.21.2",
    jsonwebtoken: "^9.0.2",
    bcrypt: "^5.1.1",
    helmet: "^8.0.0",
    cors: "^2.8.5",
  },
  devDependencies: {
    typescript: "^5.7.2",
    jest: "^29.7.0",
    "@types/express": "^5.0.0",
  },
  scripts: {
    build: "tsc",
    test: "jest",
    start: "node dist/server.js",
  },
};

const SAMPLE_CLEAN_FINDINGS: Finding[] = [
  {
    id: "f-clean-1",
    category: "code-health",
    severity: "info",
    title: "Explicit Return Types Recommended for Public Handlers",
    description: "Express route handler 'getHealthStatus' relies on implicit type inference.",
    detector: "ESLint StrictTypeCheck",
    location: {
      file: "src/routes/health.ts",
      line: 12,
      column: 16,
      snippet: `10 | import { Request, Response } from 'express';\n11 |\n12 | export const getHealthStatus = (req: Request, res: Response) => {\n13 |   return res.json({ status: 'ok', uptime: process.uptime() });\n14 | };`,
    },
    evidence: "Return type inferred as void | Response",
    recommendation: "Add explicit return type (req: Request, res: Response): Response => for stricter type consistency.",
    isBlocker: false,
  },
];

// Preset 3: Vulnerable Fullstack (Blocked)
const SAMPLE_VULNERABLE_SNAPSHOT: ProjectSnapshot = {
  id: "proj_vulnerable_app_03",
  name: "ecommerce-payment-portal",
  uploadedAt: new Date().toISOString(),
  stack: {
    name: "ecommerce-payment-portal",
    language: "typescript",
    framework: "nextjs",
    frameworks: ["Next.js 14", "Stripe", "PostgreSQL"],
    projectType: "fullstack",
    frontendFramework: "Next.js",
    backendFramework: "Node API Routes",
    packageManager: "npm",
    hasTests: true,
    hasTypeScript: true,
    hasDocker: true,
    totalFiles: 210,
    analyzedFiles: 140,
    ignoredFiles: 70,
    suggestedChecks: ["code-health", "security", "build-test", "runtime-ui", "performance"],
  },
  files: [
    { path: "src/lib/stripe.ts", relativePath: "src/lib/stripe.ts", size: 1400, extension: ".ts", isTestFile: false, isConfigFile: false },
    { path: "src/app/checkout/page.tsx", relativePath: "src/app/checkout/page.tsx", size: 9200, extension: ".tsx", isTestFile: false, isConfigFile: false },
    { path: "src/services/db.ts", relativePath: "src/services/db.ts", size: 3400, extension: ".ts", isTestFile: false, isConfigFile: false },
  ],
  dependencies: {
    next: "14.2.3",
    stripe: "^14.0.0",
    pg: "^8.11.3",
  },
  devDependencies: {
    typescript: "^5.3.3",
  },
  scripts: {
    build: "next build",
    test: "npm run test",
  },
};

const SAMPLE_VULNERABLE_FINDINGS: Finding[] = [
  {
    id: "f-vuln-1",
    category: "security",
    severity: "critical",
    title: "CRITICAL: Hardcoded Production Stripe Live Secret Key",
    description: "A production secret key pattern was detected in source code. If committed, this exposes full payment processing authority.",
    detector: "Gitleaks Regex Secret Scanner",
    location: {
      file: "src/lib/stripe.ts",
      line: 8,
      column: 26,
      snippet: `6 | import Stripe from 'stripe';\n7 |\n8 | const stripeKey = "sk_test_mock_stripe_key_placeholder_sample";\n9 | export const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });`,
    },
    evidence: "Matched high-entropy live secret key pattern in source code",
    recommendation: "Immediately revoke this API key in Stripe Dashboard. Move secrets to environment variables via process.env.STRIPE_SECRET_KEY and add .env to .gitignore.",
    isBlocker: true,
  },
  {
    id: "f-vuln-2",
    category: "security",
    severity: "critical",
    title: "SQL Injection Vector in Raw Query Construction",
    description: "Raw SQL query string concatenation with user-supplied search term without parameterized escaping.",
    detector: "SecurityASTScanner",
    location: {
      file: "src/services/db.ts",
      line: 42,
      column: 15,
      snippet: `40 | export async function searchUsers(searchTerm: string) {\n41 |   // Vulnerable raw query concatenation\n42 |   const query = \`SELECT * FROM users WHERE email LIKE '%\${searchTerm}%'\`;\n43 |   return await pool.query(query);\n44 | }`,
    },
    evidence: "Raw template literal string interpolated directly into pool.query",
    recommendation: "Use parameterized queries: pool.query('SELECT * FROM users WHERE email LIKE $1', ['%' + searchTerm + '%']).",
    isBlocker: true,
  },
  {
    id: "f-vuln-3",
    category: "build-test",
    severity: "high",
    title: "Build Failure: TypeScript Typecheck Errors (TS2339)",
    description: "Property 'customerAddress' does not exist on type 'OrderPayload'. Production build will fail.",
    detector: "ProcessRunner (tsc --noEmit)",
    location: {
      file: "src/app/checkout/page.tsx",
      line: 88,
      column: 21,
      snippet: `86 | function processOrder(payload: OrderPayload) {\n87 |   // Property does not exist in type declaration\n88 |   const address = payload.customerAddress.street;\n89 |   return dispatchOrder(address);\n90 | }`,
    },
    evidence: "Error TS2339: Property 'customerAddress' does not exist on type 'OrderPayload'.",
    recommendation: "Update OrderPayload interface definition or check optional property payload.shippingAddress?.street.",
    isBlocker: false,
  },
];

export const useAuditStore = create<AuditState>((set, get) => ({
  snapshot: SAMPLE_SAAS_SNAPSHOT,
  selectedChecks: DEFAULT_CATEGORIES,
  isAuditing: false,
  auditProgress: 0,
  currentCategory: null,
  categoryResults: INITIAL_CATEGORY_RESULTS,
  categoryStatuses: INITIAL_CATEGORY_STATUSES,
  logs: [],
  findings: SAMPLE_SAAS_FINDINGS,
  ignoredFindingIds: new Set<string>(),
  report: null,

  setSnapshot: (snapshot) => {
    set({
      snapshot,
      auditProgress: 0,
      currentCategory: null,
      categoryResults: INITIAL_CATEGORY_RESULTS,
      categoryStatuses: INITIAL_CATEGORY_STATUSES,
      findings: [],
      ignoredFindingIds: new Set(),
      report: null,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: "info",
          message: `Workspace uploaded: ${snapshot.name} (${snapshot.files.length} files detected)`,
        },
      ],
    });
  },

  toggleCheckCategory: (category) => {
    const { selectedChecks } = get();
    if (selectedChecks.includes(category)) {
      set({ selectedChecks: selectedChecks.filter((c) => c !== category) });
    } else {
      set({ selectedChecks: [...selectedChecks, category] });
    }
  },

  selectAllChecks: () => {
    set({ selectedChecks: [...DEFAULT_CATEGORIES] });
  },

  clearAllChecks: () => {
    set({ selectedChecks: [] });
  },

  setSelectedChecks: (checks) => {
    set({ selectedChecks: checks });
  },

  addLog: (level, message, category) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      category,
    };
    set((state) => ({ logs: [...state.logs.slice(-100), entry] }));
  },

  updateCategoryProgress: (category, status, score, findings, summary, durationMs) => {
    set((state) => {
      const prev = state.categoryResults[category] || {
        category,
        status: "idle",
        score: 100,
        durationMs: 0,
        findings: [],
        summary: "",
      };

      const newResult: CategoryResult = {
        ...prev,
        status,
        score: score !== undefined ? score : prev.score,
        findings: findings !== undefined ? findings : prev.findings,
        summary: summary !== undefined ? summary : prev.summary,
        durationMs: durationMs !== undefined ? durationMs : prev.durationMs,
      };

      return {
        categoryStatuses: { ...state.categoryStatuses, [category]: status },
        categoryResults: { ...state.categoryResults, [category]: newResult },
      };
    });
  },

  startAudit: async (navigateCallback) => {
    const { selectedChecks, snapshot, addLog, updateCategoryProgress } = get();
    if (!snapshot || selectedChecks.length === 0) return;

    set({
      isAuditing: true,
      auditProgress: 5,
      currentCategory: null,
      logs: [],
      categoryStatuses: INITIAL_CATEGORY_STATUSES,
    });

    addLog("info", `Starting PreFlight analysis on ${snapshot.name}...`);
    addLog("info", `Selected ${selectedChecks.length} categories: ${selectedChecks.join(", ")}`);

    const checksToRun = selectedChecks;
    const collectedFindings: Finding[] = [];

    // Run each check category sequentially with realistic stepped progress & simulated findings
    for (let i = 0; i < checksToRun.length; i++) {
      const cat = checksToRun[i];
      set({ currentCategory: cat });
      updateCategoryProgress(cat, "running");

      addLog("info", `[${cat.toUpperCase()}] Initializing check suite...`, cat);
      await new Promise((r) => setTimeout(r, 600));

      const stepProgress = Math.round(((i + 0.5) / checksToRun.length) * 100);
      set({ auditProgress: stepProgress });

      // Match findings for this category from the snapshot's seed or current finding pool
      const catFindings = (get().findings.length > 0 ? get().findings : SAMPLE_SAAS_FINDINGS).filter(
        (f) => f.category === cat
      );

      collectedFindings.push(...catFindings);

      // Score calculation for this category
      let catScore = 100;
      catFindings.forEach((f) => {
        if (f.severity === "critical") catScore -= 40;
        else if (f.severity === "high") catScore -= 20;
        else if (f.severity === "medium") catScore -= 8;
        else if (f.severity === "low") catScore -= 3;
      });
      catScore = Math.max(0, catScore);

      const hasCritical = catFindings.some((f) => f.severity === "critical" || f.isBlocker);
      const catStatus: CheckStatus = hasCritical ? "failed" : "completed";

      const duration = Math.floor(Math.random() * 800) + 400;

      if (catFindings.length > 0) {
        addLog(
          hasCritical ? "error" : "warn",
          `[${cat.toUpperCase()}] Found ${catFindings.length} issue(s) • Category Score: ${catScore}/100`,
          cat
        );
      } else {
        addLog("success", `[${cat.toUpperCase()}] All checks passed cleanly • Score: 100/100`, cat);
      }

      updateCategoryProgress(
        cat,
        catStatus,
        catScore,
        catFindings,
        `${catFindings.length} issue(s) detected • Completed in ${duration}ms`,
        duration
      );

      const postProgress = Math.round(((i + 1) / checksToRun.length) * 100);
      set({ auditProgress: postProgress });
      await new Promise((r) => setTimeout(r, 400));
    }

    set({
      isAuditing: false,
      auditProgress: 100,
      currentCategory: null,
      findings: collectedFindings,
    });

    addLog("success", "PreFlight audit completed! Compiling release decision report...");
    get().recalculateReport();

    if (navigateCallback) {
      navigateCallback();
    }
  },

  cancelAudit: () => {
    set({ isAuditing: false, currentCategory: null });
    get().addLog("warn", "Audit manually aborted by user.");
  },

  toggleIgnoreFinding: (findingId) => {
    set((state) => {
      const next = new Set(state.ignoredFindingIds);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return { ignoredFindingIds: next };
    });
    get().recalculateReport();
  },

  isFindingIgnored: (findingId) => {
    return get().ignoredFindingIds.has(findingId);
  },

  recalculateReport: () => {
    const { snapshot, findings, ignoredFindingIds, categoryResults } = get();
    if (!snapshot) return;

    const activeFindings = findings.filter((f) => !ignoredFindingIds.has(f.id));

    const totalFindings = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const blockers: Finding[] = [];

    activeFindings.forEach((f) => {
      totalFindings[f.severity]++;
      if (f.isBlocker || f.severity === "critical") {
        blockers.push(f);
      }
    });

    // Calculate score
    let baseScore = 100;
    activeFindings.forEach((f) => {
      if (f.severity === "critical") baseScore -= 30;
      else if (f.severity === "high") baseScore -= 12;
      else if (f.severity === "medium") baseScore -= 4;
      else if (f.severity === "low") baseScore -= 1;
    });
    const overallScore = Math.max(0, Math.min(100, baseScore));

    // Release Decision
    let releaseStatus: ReleaseStatus = "READY_TO_SHIP";
    if (blockers.length > 0 || totalFindings.critical > 0 || totalFindings.high >= 3) {
      releaseStatus = "BLOCKED";
    } else if (overallScore < 80 || totalFindings.high > 0 || totalFindings.medium >= 4) {
      releaseStatus = "REVIEW_BEFORE_SHIP";
    }

    const recommendedFixOrder: string[] = [];
    if (totalFindings.critical > 0) {
      recommendedFixOrder.push(`Address ${totalFindings.critical} CRITICAL security/build blocker(s) immediately.`);
    }
    if (totalFindings.high > 0) {
      recommendedFixOrder.push(`Resolve ${totalFindings.high} HIGH severity vulnerabilities/redirects prior to deployment.`);
    }
    if (totalFindings.medium > 0) {
      recommendedFixOrder.push(`Review ${totalFindings.medium} MEDIUM severity accessibility and performance warnings.`);
    }
    if (recommendedFixOrder.length === 0) {
      recommendedFixOrder.push("All selected safety and quality checks have passed. Zero blockers detected!");
    }

    const report: AuditReport = {
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

    set({ report });
  },

  loadSampleProject: (preset) => {
    if (preset === "saas-starter") {
      set({
        snapshot: SAMPLE_SAAS_SNAPSHOT,
        findings: SAMPLE_SAAS_FINDINGS,
        ignoredFindingIds: new Set(),
        selectedChecks: DEFAULT_CATEGORIES,
        categoryStatuses: INITIAL_CATEGORY_STATUSES,
        categoryResults: INITIAL_CATEGORY_RESULTS,
        report: null,
        auditProgress: 0,
      });
    } else if (preset === "clean-api") {
      set({
        snapshot: SAMPLE_CLEAN_SNAPSHOT,
        findings: SAMPLE_CLEAN_FINDINGS,
        ignoredFindingIds: new Set(),
        selectedChecks: ["code-health", "security", "build-test"],
        categoryStatuses: INITIAL_CATEGORY_STATUSES,
        categoryResults: INITIAL_CATEGORY_RESULTS,
        report: null,
        auditProgress: 0,
      });
    } else if (preset === "vulnerable-app") {
      set({
        snapshot: SAMPLE_VULNERABLE_SNAPSHOT,
        findings: SAMPLE_VULNERABLE_FINDINGS,
        ignoredFindingIds: new Set(),
        selectedChecks: DEFAULT_CATEGORIES,
        categoryStatuses: INITIAL_CATEGORY_STATUSES,
        categoryResults: INITIAL_CATEGORY_RESULTS,
        report: null,
        auditProgress: 0,
      });
    }
    get().recalculateReport();
  },

  reset: () => {
    set({
      snapshot: null,
      selectedChecks: DEFAULT_CATEGORIES,
      isAuditing: false,
      auditProgress: 0,
      currentCategory: null,
      categoryResults: INITIAL_CATEGORY_RESULTS,
      categoryStatuses: INITIAL_CATEGORY_STATUSES,
      logs: [],
      findings: [],
      ignoredFindingIds: new Set(),
      report: null,
    });
  },
}));
