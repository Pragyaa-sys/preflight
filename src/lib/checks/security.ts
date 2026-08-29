import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ProjectSnapshot } from "@/types/project.types";
import { CategoryResult } from "@/types/audit.types";
import { Finding } from "@/types/finding.types";
import { buildCategoryResult, findingId } from "./shared";

interface SecretPattern {
  re: RegExp;
  label: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  { re: /(sk|pk)_(live|test)_[A-Za-z0-9]{10,}/g, label: "Stripe key" },
  { re: /AKIA[0-9A-Z]{16}/g, label: "AWS access key" },
  { re: /AIza[0-9A-Za-z\-_]{35}/g, label: "Google API key" },
  { re: /ghp_[A-Za-z0-9]{36}/g, label: "GitHub token" },
  { re: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/g, label: "Private key block" },
  {
    re: /(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9\-_/+=]{12,}["']/gi,
    label: "Hardcoded credential-like value",
  },
];

const SCANNABLE_EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml", ".env"]);

/**
 * Scans a project's files on disk for likely leaked secrets, checks whether
 * .env files are gitignored, and runs `npm audit` for vulnerable deps.
 *
 * rootDir must be the real filesystem directory the project was extracted
 * to (FileSnapshot.path/.relativePath alone have no content) — this is
 * whatever directory your /api/upload route wrote the project into.
 */
export async function runSecurityCheck(snapshot: ProjectSnapshot, rootDir: string): Promise<CategoryResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  for (const file of snapshot.files) {
    if (!SCANNABLE_EXT.has(file.extension)) continue;
    const absPath = path.isAbsolute(file.path) ? file.path : path.join(rootDir, file.relativePath);
    let content: string;
    try {
      content = fs.readFileSync(absPath, "utf8");
    } catch {
      continue; // file listed in snapshot but unreadable — skip rather than crash the whole check
    }

    const lines = content.split("\n");
    for (const { re, label } of SECRET_PATTERNS) {
      lines.forEach((line, i) => {
        re.lastIndex = 0;
        if (re.test(line)) {
          findings.push({
            id: findingId("secret"),
            category: "security",
            severity: "critical",
            title: `Possible ${label} found in source`,
            description: `A pattern matching a ${label} was found in ${file.relativePath}. This may be a real, committed credential.`,
            detector: "regex-secret-scan",
            location: { file: file.relativePath, line: i + 1, snippet: line.trim().slice(0, 120) },
            evidence: `${file.relativePath}:${i + 1}  ${line.trim().slice(0, 120)}`,
            recommendation:
              "Remove the literal value, rotate the credential if it's real, and load it via process.env from a .env file that is gitignored.",
            isBlocker: true,
          });
        }
      });
    }
  }

  // .env committed without being gitignored?
  const gitignorePath = path.join(rootDir, ".gitignore");
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
  const envFiles = fs.existsSync(rootDir)
    ? fs.readdirSync(rootDir).filter((f) => /^\.env(\..*)?$/.test(f) && f !== ".env.example")
    : [];
  for (const f of envFiles) {
    if (!gitignore.includes(f) && !gitignore.includes(".env")) {
      findings.push({
        id: findingId("envleak"),
        category: "security",
        severity: "high",
        title: `${f} exists and is not covered by .gitignore`,
        description: `${f} was found at the project root but .gitignore does not exclude it, meaning it may get committed.`,
        detector: "gitignore-check",
        location: { file: f },
        evidence: `.gitignore contents:\n${gitignore || "(empty or missing)"}`,
        recommendation: `Add ".env*" (except .env.example) to .gitignore, then run "git rm --cached ${f}" if it was already committed.`,
        isBlocker: true,
      });
    }
  }

  // npm audit — only meaningful if a lockfile exists in rootDir
  if (fs.existsSync(path.join(rootDir, "package-lock.json"))) {
    try {
      const out = execSync("npm audit --json", { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      appendAuditFindings(out, findings);
    } catch (err: any) {
      // npm audit exits non-zero when vulnerabilities are found — stdout still has the JSON
      appendAuditFindings(err.stdout || "", findings);
    }
  }

  const durationMs = Date.now() - start;
  const summary =
    findings.length === 0
      ? "No leaked secrets, unprotected .env files, or high/critical dependency vulnerabilities found."
      : `${findings.length} security finding(s): ${findings.filter((f) => f.isBlocker).length} blocking.`;

  return buildCategoryResult("security", findings, durationMs, summary);
}

function appendAuditFindings(rawJson: string, findings: Finding[]) {
  try {
    const parsed = JSON.parse(rawJson);
    const meta = parsed.metadata?.vulnerabilities;
    if (!meta) return;
    if (meta.critical || meta.high) {
      findings.push({
        id: findingId("audit"),
        category: "security",
        severity: meta.critical ? "critical" : "high",
        title: `${meta.critical || 0} critical / ${meta.high || 0} high severity dependency vulnerabilities`,
        description: "npm audit found vulnerable dependencies at high or critical severity.",
        detector: "npm-audit",
        evidence: `npm audit metadata: ${JSON.stringify(meta)}`,
        recommendation:
          'Run "npm audit fix" and re-check; for unfixable ones, review "npm audit" output for the specific advisory and consider an alternative package.',
        isBlocker: true,
      });
    } else if (meta.moderate || meta.low) {
      findings.push({
        id: findingId("audit"),
        category: "security",
        severity: "low",
        title: `${meta.moderate || 0} moderate / ${meta.low || 0} low severity dependency vulnerabilities`,
        description: "npm audit found vulnerable dependencies at moderate or low severity.",
        detector: "npm-audit",
        evidence: `npm audit metadata: ${JSON.stringify(meta)}`,
        recommendation: 'Not release-blocking, but run "npm audit fix" when convenient.',
        isBlocker: false,
      });
    }
  } catch {
    // npm audit output wasn't parseable JSON — not fatal, just skip
  }
}
