import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ProjectSnapshot } from "@/types/project.types";
import { CategoryResult } from "@/types/audit.types";
import { Finding } from "@/types/finding.types";
import { buildCategoryResult, findingId } from "./shared";

interface EslintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
}
interface EslintResult {
  filePath: string;
  errorCount: number;
  warningCount: number;
  messages: EslintMessage[];
}

const ESLINT_CONFIG_NAMES = ["eslint.config.js", "eslint.config.mjs", ".eslintrc.json", ".eslintrc.js"];

/**
 * Runs eslint (if configured) and flags declared-but-apparently-unused
 * dependencies. rootDir must be the real extracted project directory.
 */
export async function runCodeHealthCheck(snapshot: ProjectSnapshot, rootDir: string): Promise<CategoryResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  const hasEslintConfig = ESLINT_CONFIG_NAMES.some((f) => fs.existsSync(path.join(rootDir, f)));
  if (hasEslintConfig) {
    runEslint(rootDir, findings);
  } else {
    findings.push({
      id: findingId("eslint-missing"),
      category: "code-health",
      severity: "low",
      title: "No eslint config found",
      description: `Checked for ${ESLINT_CONFIG_NAMES.join(", ")} in project root.`,
      detector: "config-check",
      evidence: `Files checked: ${ESLINT_CONFIG_NAMES.join(", ")}`,
      recommendation: "Consider adding one — catches dead code and common bugs before they reach a teammate's branch.",
      isBlocker: false,
    });
  }

  checkUnusedDependencies(snapshot, rootDir, findings);

  const durationMs = Date.now() - start;
  const summary =
    findings.length === 0
      ? "No eslint errors and no obviously unused dependencies."
      : `${findings.length} code health finding(s).`;

  return buildCategoryResult("code-health", findings, durationMs, summary);
}

function runEslint(rootDir: string, findings: Finding[]) {
  let raw = "";
  try {
    raw = execSync("npx eslint . --format json", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err: any) {
    // eslint exits non-zero when there are lint errors — stdout still has the JSON
    raw = err.stdout || "";
  }

  let results: EslintResult[];
  try {
    results = JSON.parse(raw);
  } catch {
    findings.push({
      id: findingId("eslint-fail"),
      category: "code-health",
      severity: "info",
      title: "Could not run eslint",
      description: "eslint did not produce parseable output — it may not be installed correctly.",
      detector: "eslint",
      evidence: raw.slice(0, 300) || "(no output)",
      recommendation: 'Ensure eslint is installed ("npm install") and eslint.config.js is valid.',
      isBlocker: false,
    });
    return;
  }

  for (const file of results) {
    if (file.errorCount === 0 && file.warningCount === 0) continue;
    const rel = path.relative(rootDir, file.filePath);
    const topMessages = file.messages.slice(0, 3);
    const evidence = topMessages.map((m) => `L${m.line}: ${m.message} (${m.ruleId ?? "unknown-rule"})`).join("\n");

    findings.push({
      id: findingId("eslint"),
      category: "code-health",
      severity: file.errorCount > 0 ? "medium" : "low",
      title:
        file.errorCount > 0
          ? `${file.errorCount} eslint error(s) in ${rel}`
          : `${file.warningCount} eslint warning(s) in ${rel}`,
      description: "eslint reported issues in this file.",
      detector: "ESLint",
      location: { file: rel, line: topMessages[0]?.line },
      evidence,
      recommendation: `Run "npx eslint ${rel} --fix" for auto-fixable rules; address the rest manually.`,
      isBlocker: file.errorCount > 0,
    });
  }
}

function checkUnusedDependencies(snapshot: ProjectSnapshot, rootDir: string, findings: Finding[]) {
  const deps = Object.keys(snapshot.dependencies || {});
  if (deps.length === 0) return;

  const sourceFiles = snapshot.files.filter((f) => [".js", ".jsx", ".ts", ".tsx"].includes(f.extension));
  let combinedSource = "";
  for (const f of sourceFiles) {
    const absPath = path.isAbsolute(f.path) ? f.path : path.join(rootDir, f.relativePath);
    try {
      combinedSource += fs.readFileSync(absPath, "utf8") + "\n";
    } catch {
      // unreadable file listed in snapshot — skip it, don't fail the whole check
    }
  }

  const unused = deps.filter((d) => {
    const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const usagePattern = new RegExp(`['"\`]${escaped}(/|['"\`])`);
    return !usagePattern.test(combinedSource);
  });

  if (unused.length) {
    findings.push({
      id: findingId("unused-deps"),
      category: "code-health",
      severity: "low",
      title: `${unused.length} declared dependencies appear unused`,
      description: "These packages are listed in package.json but no import/require of them was found in source.",
      detector: "unused-dep-scan",
      evidence: `Unused: ${unused.join(", ")}`,
      recommendation:
        'Double-check first (dynamic imports and config files aren\'t scanned), then remove with "npm uninstall <pkg>".',
      isBlocker: false,
    });
  }
}
