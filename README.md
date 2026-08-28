# 🛫 PreFlight

> **Check before you ship.** PreFlight analyzes software projects before production deployment to detect code health issues, security vulnerabilities, broken builds/tests, runtime errors, and performance bottlenecks.

---

## ⚡ 1. Product Overview & Architecture

PreFlight is **100% stateless**:
- ❌ No user accounts or login
- ❌ No database (MongoDB, Postgres, Redis)
- ❌ No persistent project storage (uploaded project ZIP is extracted temporarily, analyzed, and cleaned up)

### The 4-Screen Flow
```text
1. UPLOAD (/) ──► 2. DETECT & SELECT (/project) ──► 3. LIVE AUDIT (/audit) ──► 4. RESULTS (/results)
   • Drop ZIP        • Detected Stack                  • Real-time progress       • Release Decision (BLOCKED vs READY)
   • Unzip & Parse   • Toggle Checks (all on by default) • Concurrent check runner • Severity Breakdown & Full Report
```

---

## 📁 2. Project Folder Structure

```text
preflight/
├── public/                     # Static assets (favicons, logos)
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript configuration with `@/*` path aliases
├── next.config.ts              # Next.js configuration
├── README.md                   # Project documentation
└── src/
    ├── app/                    # Next.js App Router (Pages & Backend APIs)
    │   ├── layout.tsx          # Root shell layout, global metadata & fonts
    │   ├── globals.css         # Tailwind styling & theme tokens
    │   ├── page.tsx            # [Screen 1] Landing page & ZIP upload dropzone (/)
    │   ├── project/            # [Screen 2] Stack detection & check selector (/project)
    │   │   └── page.tsx
    │   ├── audit/              # [Screen 3] Live audit progress & live console (/audit)
    │   │   └── page.tsx
    │   ├── results/            # [Screen 4] Scores, findings viewer & release decision (/results)
    │   │   └── page.tsx
    │   └── api/                # Next.js Server-side Analysis API routes
    │       ├── upload/         # POST: Temporary ZIP extraction & snapshot init
    │       ├── detect/         # POST: Stack & framework detection
    │       ├── audit/          # POST: Check runner & live findings streaming
    │       └── report/         # GET/POST: Full HTML audit report generator
    │
    ├── components/             # Frontend UI Components
    │   └── ui/                 # Reusable primitives (Buttons, Badges, ProgressBars, Cards)
    │
    ├── lib/                    # Core Business Logic & Check Engine
    │   ├── engine/             # Core analysis pipeline
    │   │   ├── extractor.ts    # Unzip ZIP and filter ignore dirs (node_modules, .git, etc.)
    │   │   ├── detector.ts     # Detect language, framework (Next.js, Vite, Python, etc.)
    │   │   ├── snapshot.ts     # Build lightweight ProjectSnapshot (files, deps, scripts)
    │   │   └── scorer.ts       # Calculate release score & status (BLOCKED / REVIEW / READY)
    │   └── checks/             # Modular check implementations
    │       ├── code-health.ts  # Unused code/deps, duplicates, code smells
    │       ├── security.ts     # Secrets, API keys, insecure patterns, dependency audit
    │       ├── build-test.ts   # Run typecheck, lint, test, production build
    │       ├── runtime-ui.ts   # Headless route test, console errors, accessibility
    │       └── performance.ts  # Bundle sizes, asset sizes, page load timing
    │
    └── types/                  # Shared TypeScript Models
        ├── project.types.ts    # ProjectSnapshot, StackDetection, FileSnapshot
        ├── finding.types.ts    # Finding, Severity (critical/high/medium/low), CodeLocation
        ├── audit.types.ts      # CheckOption, CheckStatus, CategoryResult, AuditProgress
        ├── report.types.ts     # ReleaseStatus (READY_TO_SHIP, REVIEW_BEFORE_SHIP, BLOCKED), AuditReport
        └── index.ts            # Central export of all types
```

---

## 🔍 3. The 5 Main Checks

1. **Code Health**: Identifies unused dependencies, dead code, duplicates, and complex files.
2. **Security**: Scans for hardcoded secrets, private API keys, insecure patterns, and vulnerable packages.
3. **Build & Tests**: Executes typechecks, linter rules, unit tests, and production builds.
4. **Runtime / UI**: Boots web apps in an isolated environment, verifies routes, collects console errors, and runs accessibility checks.
5. **Performance**: Measures page load timing, large asset sizes, and bundle weights.

---

## 🚦 4. Release Decision Rules

- ❌ **BLOCKED**: Build failed OR Critical/High security vulnerability found (e.g. exposed API key).
- ⚠️ **REVIEW BEFORE SHIP**: Build passes, but medium/low code warnings or runtime errors are detected.
- ✅ **READY TO SHIP**: All important checks pass with no release blockers.

---

## 🚀 5. Quickstart

### Installation
```bash
# Clone the repository
git clone https://github.com/HimanshuSingh213/preflight.git
cd preflight

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build Verification
```bash
npm run build
```
