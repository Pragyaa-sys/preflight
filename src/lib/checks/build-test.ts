import { execSync } from "node:child_process";
import { ProjectSnapshot } from "@/types/project.types";
import { CategoryResult } from "@/types/audit.types";
import { Finding } from "@/types/finding.types";
import { buildCategoryResult, findingId } from "./shared";

const NO_TEST_SCRIPT_PLACEHOLDER = 'echo "Error: no test specified" && exit 1';

/**
 * Actually runs `npm run build` and `npm test` in rootDir and captures the
 * real failing output as evidence. rootDir must be the real extracted
 * project directory with node_modules installed (or installable).
 */
export async function runBuildTestCheck(snapshot: ProjectSnapshot, rootDir: string): Promise<CategoryResult> {
  const start = Date.now();
  const findings: Finding[] = [];

  if (snapshot.scripts?.build) {
    runScriptAndCollect(rootDir, "build", "Production build", findings, true);
  } else {
    findings.push({
      id: findingId("no-build-script"),
      category: "build-test",
      severity: "medium",
      title: 'No "build" script in package.json',
      description: "Without a build script this check (and most deploy targets) can't confirm the project compiles.",
      detector: "package-json-check",
      evidence: `Scripts found: ${Object.keys(snapshot.scripts || {}).join(", ") || "(none)"}`,
      recommendation: 'Add a "build" script to package.json.',
      isBlocker: false,
    });
  }

  const hasRealTestScript = snapshot.scripts?.test && snapshot.scripts.test !== NO_TEST_SCRIPT_PLACEHOLDER;
  if (hasRealTestScript) {
    runScriptAndCollect(rootDir, "test", "Test suite", findings, true);
  } else {
    findings.push({
      id: findingId("no-test-script"),
      category: "build-test",
      severity: "low",
      title: "No test script configured",
      description: 'package.json has no runnable "test" script.',
      detector: "package-json-check",
      evidence: "scripts.test is missing or is the default placeholder.",
      recommendation: "Not blocking for a hackathon, but a couple of smoke tests catch regressions between pushes.",
      isBlocker: false,
    });
  }

  const durationMs = Date.now() - start;
  const summary =
    findings.length === 0 ? "Build and tests both passed." : `${findings.length} build/test finding(s).`;

  return buildCategoryResult("build-test", findings, durationMs, summary);
}

function runScriptAndCollect(
  rootDir: string,
  scriptName: "build" | "test",
  label: string,
  findings: Finding[],
  isBlockerOnFail: boolean
) {
  try {
    execSync(`npm run ${scriptName} --silent`, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err: any) {
    const output = (err.stdout || "") + (err.stderr || err.message || "");
    const tail = output.split("\n").filter(Boolean).slice(-15).join("\n");
    findings.push({
      id: findingId(scriptName),
      category: "build-test",
      severity: "critical",
      title: `${label} failed`,
      description: `Running "npm run ${scriptName}" exited with a non-zero status.`,
      detector: scriptName === "build" ? "next-build" : "npm-test",
      evidence: tail || "(no output captured)",
      recommendation:
        scriptName === "build"
          ? `Fix the error shown above (usually a type error or missing import), then re-run "npm run build" locally before pushing.`
          : `Run "npm test" locally, fix the failing case(s) shown above, and re-run before pushing.`,
      isBlocker: isBlockerOnFail,
    });
  }
}
