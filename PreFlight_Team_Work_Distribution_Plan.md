# PreFlight — Team Work Distribution & Technical Execution Plan

This document outlines the 4-member team task breakdown, library choices, architectural patterns, and execution methodologies for building **PreFlight** in a 24-hour hackathon environment.

---

## Shared Foundation (All 4 Members — Hour 0 to Hour 1)

Before writing individual features, all members must agree on shared TypeScript schemas and install core dependencies to ensure zero runtime integration friction.

### 1. Key Libraries & Setup Commands
Run this master command to install shared dependencies across the team:

```bash
npm install adm-zip fast-glob ts-morph typescript dotenv execa playwright @axe-core/playwright get-port zod lucide-react framer-motion clsx tailwind-merge prismjs react-syntax-highlighter
npm install -D @types/adm-zip @types/prismjs @types/react-syntax-highlighter
npx playwright install chromium
```

### 2. Core Shared Interfaces (`src/types/index.ts`)

#### Severity & Findings (`src/types/finding.types.ts`)
```ts
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type CheckCategory = 
  | 'CODE_HEALTH' 
  | 'SECURITY' 
  | 'BUILD_TEST' 
  | 'RUNTIME_UI' 
  | 'PERFORMANCE';

export interface CodeLocation {
  filePath: string;
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
  location?: CodeLocation;
  detectedBy: string;
  remediation?: string;
  ignored?: boolean;
}
```

#### Project Snapshot & Capabilities (`src/types/project.types.ts`)
```ts
export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'go' | 'java' | 'unknown';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'maven' | 'unknown';

export interface StackInfo {
  language: SupportedLanguage;
  framework?: string; // e.g. "next.js", "vite", "express", "fastapi"
  packageManager: PackageManager;
  hasTests: boolean;
  hasLint: boolean;
  hasTypecheck: boolean;
  detectedCommands: {
    install?: string;
    build?: string;
    test?: string;
    lint?: string;
    typecheck?: string;
    dev?: string;
  };
}

export interface ProjectSnapshot {
  projectId: string;
  workspacePath: string;
  stack: StackInfo;
  totalFiles: number;
  ignoredFiles: number;
  fileList: string[];
}
```

#### Audit Progress & Release Status (`src/types/audit.types.ts` & `src/types/report.types.ts`)
```ts
export type AuditStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type ReleaseDecision = 'READY_TO_SHIP' | 'REVIEW_BEFORE_SHIP' | 'BLOCKED';

export interface CategoryProgress {
  category: CheckCategory;
  status: AuditStatus;
  progressPercent: number;
  findingsCount: number;
  message?: string;
}

export interface OverallScore {
  totalScore: number; // 0 - 100
  categoryScores: Record<CheckCategory, number>;
  decision: ReleaseDecision;
}

export interface AuditReport {
  projectId: string;
  createdAt: string;
  snapshot: ProjectSnapshot;
  score: OverallScore;
  findings: Finding[];
  blockersCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
```

---

## Member 1 (Himanshu): Core Engine & Static Analysis (Code Health & Security)

**Primary Focus (Himanshu):** Safe workspace extraction, stack detection, static code analysis (Code Health), security pattern scanning, and overall release status scoring.

### 1. Selected Libraries & Tools
* **`adm-zip`**: Fast in-memory/disk unzipping for uploaded project archives.
* **`fast-glob`**: High-performance filesystem globbing to filter files and search extensions.
* **`ts-morph`**: AST analysis for TypeScript/JavaScript code health checks (detecting unused code, complex functions).
* **`dotenv`**: Parsing `.env` and `.env.example` files to audit missing or hardcoded environment variables.

### 2. Implementation Methodology & Basic Ways to Implement

#### Workspace & Extraction (`src/lib/engine/extract.ts`)
* Receive uploaded file buffer or path, create temporary directory using `os.tmpdir()` + UUID (`/tmp/preflight-xyz`).
* Extract zip file via `adm-zip`.
* Run ignore filter using `fast-glob` to exclude junk directories (`node_modules`, `.next`, `.git`, `dist`, `build`, `coverage`).

#### Stack Detector (`src/lib/engine/detector.ts`)
* Read `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`.
* Parse `package.json` `dependencies` and `devDependencies` to detect Next.js, React, Express, Vite, Tailwind, etc.
* Read `scripts` field to automatically detect `build`, `test`, `lint`, and `typecheck` commands.

#### Code Health Checker (`src/lib/checks/code-health.ts`)
* **Unused Exports / Imports:** Use `ts-morph` to traverse `Project` source files, find unused declarations and dead imports.
* **Large Files & Functions:** AST walk to count lines per function (> 80 lines) and per file (> 400 lines).
* **Duplicate Detection:** Use a simple hash-based chunk sliding window or string similarity across file contents to flag duplicate blocks.

#### Security Checker (`src/lib/checks/security.ts`)
* **Secret Scanning:** Run regex patterns against file contents (excluding binary assets):
  * AWS Keys: `AKIA[0-9A-Z]{16}`
  * OpenAI / Stripe Keys: `sk-[a-zA-Z0-9]{20,}`, `sk_live_[0-9a-zA-Z]{24}`
  * Generic API Tokens & Private Keys: `-----BEGIN PRIVATE KEY-----`, `Bearer [A-Za-z0-9\-\._~\+\/]+=*`
* **Dependency Vulnerability Checker:** Execute `npm audit --json` or parse lockfiles for known vulnerable package versions.

#### Release & Score Calculator (`src/lib/engine/release-calculator.ts`)
* Base score starts at `100`. Deductions per finding:
  * `CRITICAL`: -25 points (Triggers `BLOCKED`)
  * `HIGH`: -10 points (Triggers `REVIEW_BEFORE_SHIP` or `BLOCKED` if count > 2)
  * `MEDIUM`: -3 points
  * `LOW`: -1 point
* Decision logic:
  * If Build failed OR `CRITICAL` findings present $\rightarrow$ `BLOCKED`
  * If score < 80 OR `HIGH` findings present $\rightarrow$ `REVIEW_BEFORE_SHIP`
  * Otherwise $\rightarrow$ `READY_TO_SHIP`

### Directory & File Ownership
* `src/lib/engine/extract.ts`
* `src/lib/engine/detector.ts`
* `src/lib/engine/snapshot.ts`
* `src/lib/engine/release-calculator.ts`
* `src/lib/checks/code-health.ts`
* `src/lib/checks/security.ts`

---

## Member 2 (Anuj): Build/Test Runner, Runtime & UI/Performance Checks

**Primary Focus (Anuj):** Process execution engine, running project build/test scripts non-interactively, Playwright dynamic web application crawling, accessibility auditing, and basic browser performance.

### 1. Selected Libraries & Tools
* **`execa`**: Spawning sub-processes (`npm run build`, `npm test`, `pytest`) safely with timeouts and non-interactive environment flags.
* **`playwright`**: Headless browser automation for spinning up local web apps, navigating routes, capturing browser console errors, and taking visual screenshots.
* **`@axe-core/playwright`**: Automated WCAG accessibility audit runner against live pages.
* **`get-port`**: Finding a random free local TCP port to launch the user project without port collision.

### 2. Implementation Methodology & Basic Ways to Implement

#### Process Runner Engine (`src/lib/engine/process-runner.ts`)
* Spawn dynamic commands inside the isolated temporary project directory.
* Set `CI=true` and `FORCE_COLOR=0` environment variables to prevent interactive prompts or hanging commands.
* Apply a strict timeout (e.g., 60 seconds per process) to kill runaway build/test scripts.
* Capture `stdout` and `stderr` streams, regex-parsing failed lines into standard `Finding` models.

#### Build & Test Checker (`src/lib/checks/build-test.ts`)
* Execute detected commands from `StackInfo` sequentially (`typecheck` $\rightarrow$ `lint` $\rightarrow$ `test` $\rightarrow$ `build`).
* If `tsc --noEmit` fails, extract file name, line number, and error message into a `HIGH` severity finding.
* If `npm test` fails, extract failing test names and stack traces.

#### Runtime & UI Checker (`src/lib/checks/runtime-ui.ts` & `browser-runner.ts`)
* Allocate a dynamic free port using `get-port`.
* Launch project dev server (`npm run dev` or `npm start`).
* Wait for port HTTP status 200 via poll loop.
* Launch headless Chromium with `playwright`:
  * Attach listeners: `page.on('console', ...)` for JS errors and `page.on('requestfailed', ...)` for 4xx/5xx network failures.
  * Discover top routes (`/`, `/about`, `/login`, `/dashboard`).
  * Navigate to each route, take full-page PNG screenshots saved into public/temp for frontend preview.
  * Execute `AxeBuilder({ page }).analyze()` to report accessibility violations (contrast, missing alt tags, missing labels).

#### Performance Checker (`src/lib/checks/performance.ts`)
* Inject Navigation Timing API evaluation in Playwright context:
  `window.performance.timing` or `performance.getEntriesByType('navigation')`.
* Measure TTFB (Time to First Byte) and DomContentLoaded timing.
* Track total asset download volume and flag assets > 1MB.

### Directory & File Ownership
* `src/lib/checks/build-test.ts`
* `src/lib/checks/runtime-ui.ts`
* `src/lib/checks/performance.ts`
* `src/lib/engine/process-runner.ts`
* `src/lib/engine/browser-runner.ts`

---

## Member 3 (Pragya): API Routes, Live Streaming Engine & Client State Store

**Primary Focus (Pragya):** API route endpoints, asynchronous check execution orchestration, real-time Server-Sent Events (SSE) streaming engine, and client Zustand state management.

### 1. Selected Libraries & Tools
* **`zod`**: Request payload and check-configuration validation schemas.
* **`zustand`**: Lightweight client-side store for project state, live audit updates, findings, and filter selections.
* **Next.js App Router API Routes (`Response` with `ReadableStream`)**: Native real-time SSE streaming without relying on external websockets or Redis.

### 2. Implementation Methodology & Basic Ways to Implement

#### API Endpoints (`src/app/api/`)
* **`POST /api/upload`**:
  * Parse incoming `FormData` containing `file` (`project.zip`).
  * Invoke Member 1's `extractZipToTempWorkspace()`.
  * Run `detectStack()`, build `ProjectSnapshot`.
  * Return `{ projectId, snapshot, stack }`.
* **`POST /api/audit/start`**:
  * Receives `projectId` and `selectedChecks` array `['CODE_HEALTH', 'SECURITY', ...]`.
  * Initializes background orchestration pipeline.
* **`GET /api/audit/stream?id=[projectId]`**:
  * Creates a Server-Sent Events stream:
    ```ts
    const stream = new ReadableStream({
      start(controller) {
        // push updates via controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
    ```
* **`GET /api/report?id=[projectId]`**:
  * Assembles final `AuditReport` payload with calculated scores and sorted findings.

#### Orchestrator Engine (`src/lib/engine/orchestrator.ts`)
* Manages category execution lifecycle.
* Runs static checks (`CODE_HEALTH`, `SECURITY`) in parallel first.
* Runs dynamic checks (`BUILD_TEST`, `RUNTIME_UI`, `PERFORMANCE`) sequentially.
* Emits live progress events (`CATEGORY_STARTED`, `CATEGORY_PROGRESS`, `CATEGORY_FINISHED`, `AUDIT_COMPLETE`) into the active SSE controller.

#### Global Client Store (`src/store/audit-store.ts`)
* Store state tree:
  ```ts
  interface AuditStore {
    projectId: string | null;
    snapshot: ProjectSnapshot | null;
    selectedChecks: CheckCategory[];
    progress: Record<CheckCategory, CategoryProgress>;
    findings: Finding[];
    report: AuditReport | null;
    setSelectedChecks: (checks: CheckCategory[]) => void;
    startAuditStream: (projectId: string) => void;
  }
  ```

### Directory & File Ownership
* `src/app/api/upload/route.ts`
* `src/app/api/detect/route.ts`
* `src/app/api/audit/start/route.ts`
* `src/app/api/audit/stream/route.ts`
* `src/app/api/report/route.ts`
* `src/lib/engine/orchestrator.ts`
* `src/store/audit-store.ts`

---

## Member 4 (Kamakhya): Frontend UI Pages, Interactive Findings & Exportable Report

**Primary Focus (Kamakhya):** Developer-focused UI/UX design, Next.js page creation, live progress indicators, interactive finding inspector with syntax highlighting, and exportable HTML report generation.

### 1. Selected Libraries & Tools
* **`lucide-react`**: Developer tool icon set (`ShieldAlert`, `CheckCircle2`, `Terminal`, `FileCode`, `Cpu`, `Zap`).
* **`framer-motion`**: Smooth UI transition effects for progress bars, cards, and modal popups.
* **`react-syntax-highlighter` / `prismjs`**: Code snippet rendering with file line highlighting.
* **`shadcn/ui`**: Base UI elements (`Card`, `Badge`, `Button`, `Progress`, `Tabs`, `Dialog`).

### 2. Implementation Methodology & Basic Ways to Implement

#### Landing & Upload Page (`src/app/page.tsx`)
* Build `ProjectUploader` component with HTML5 drag-and-drop zone.
* Show file selection validation (reject files that are not `.zip`).
* Show loading state during upload and auto-redirect to `/project`.

#### Project & Selection Page (`src/app/project/page.tsx`)
* Build `ProjectSummary` card displaying detected stack tags (e.g. `Next.js`, `TypeScript`, `pnpm`).
* Build `AuditSelector` grid displaying 5 check categories with descriptive subtext and toggle checkboxes.
* Controls: "Select All" / "Clear All" buttons and prominent `[ RUN PREFLIGHT ]` CTA button routing to `/audit`.

#### Live Audit Page (`src/app/audit/page.tsx`)
* Subscribe to Zustand `progress` state driven by Member 3's SSE stream.
* Render main `ProgressBar` (0–100%).
* Render 5 `AuditProgressCard` items showing real-time status badges (`Waiting`, `Running`, `Completed`, `Failed`) with live item counters.
* Auto-redirect to `/results` upon receiving `AUDIT_COMPLETE`.

#### Results Dashboard & Finding Viewer (`src/app/results/page.tsx`)
* Render top `ReleaseDecision` hero banner:
  * `READY TO SHIP` (Green)
  * `REVIEW BEFORE SHIP` (Yellow)
  * `BLOCKED` (Red)
* Render Overall Score circular gauge / numeric indicator (0–100) and 4 category sub-score cards.
* Render `FindingCard` list with severity filter tabs (`All`, `Critical`, `High`, `Medium`, `Low`).
* Build interactive finding drawer:
  * Show file location (`src/config.ts:18`).
  * Render code snippet with highlighted line using `react-syntax-highlighter`.
  * Include "Ignore Finding" toggle button to re-calculate score locally.

#### Exportable Full Report
* Create standalone printable/downloadable HTML report modal (`src/components/report/FullReportModal.tsx`).
* Apply `@media print` CSS rules allowing single-click "Save as PDF" browser export.

### Directory & File Ownership
* `src/app/page.tsx`
* `src/app/project/page.tsx`
* `src/app/audit/page.tsx`
* `src/app/results/page.tsx`
* `src/components/ui/*`
* `src/components/upload/ProjectUploader.tsx`
* `src/components/audit/AuditSelector.tsx`
* `src/components/audit/AuditProgressCard.tsx`
* `src/components/results/ReleaseDecisionBanner.tsx`
* `src/components/results/FindingCard.tsx`
* `src/components/results/CodeSnippetViewer.tsx`
* `src/components/report/FullReportModal.tsx`

---

## Technical Coordination & Workflow Map

```text
      HIMANSHU                      ANUJ                       PRAGYA                     KAMAKHYA
 (Core & Static Analysis)    (Build, Runtime & UI)       (API & State Engine)           (Frontend & UX)
            │                           │                           │                           │
  [Hour 0-1] Align Types                │                           │                   [Hour 0-1] Align Types
            │                           │                           │                           │
  [Hour 1-4] extract.ts                 │                           │                   [Hour 1-4] page.tsx (Upload)
            detector.ts                 │                   POST /api/upload ──────────► ProjectUploader UI
            │                           │                           │                           │
  [Hour 4-8] code-health.ts      [Hour 4-8] process-runner   POST /api/audit/start        [Hour 4-8] project/page.tsx
            security.ts                 build-test.ts               orchestrator.ts             AuditSelector UI
            │                           │                           │                           │
  [Hour 8-12] release-calc      [Hour 8-12] runtime-ui      GET /api/audit/stream       [Hour 8-12] audit/page.tsx
            │                           performance.ts              Zustand store ─────────────► ProgressCard UI
            │                           │                           │                           │
  [Hour 12-16] Integration ──────► Integration ───────────► SSE Integration ──────────► results/page.tsx
            │                           │                           │                           FindingCard UI
            │                           │                           │                           │
  [Hour 16-24] Bug fixing, sample projects verification, polishing demo story, freezing release candidate.
```
