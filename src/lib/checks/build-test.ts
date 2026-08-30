import crypto from 'crypto';
import path from 'path';
import { ProjectSnapshot } from '@/types/project.types';
import { CategoryResult, CheckStatus } from '@/types/audit.types';
import { Finding } from '@/types/finding.types';
import { runProcess, ProcessRunnerResult } from '@/lib/engine/process-runner';

/**
 * Parses command execution output to identify specific failed files and lines.
 */
function parseFailureDetails(
  rawOutput: string,
  snapshot: ProjectSnapshot
): { file?: string; line?: number; snippet?: string } {
  if (!rawOutput) return {};

  const lines = rawOutput.split('\n');

  for (const fileObj of snapshot.files) {
    const relPath = fileObj.relativePath;
    const baseName = path.basename(relPath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(relPath) || line.includes(baseName)) {
        // Try to match line:col patterns (e.g., file.ts:15:3 or file.ts(15,3))
        const lineColMatch = line.match(/(?::|\()(\d+)(?::|,|\))/);
        const lineNumber = lineColMatch ? parseInt(lineColMatch[1], 10) : undefined;
        const snippet = lines.slice(i, Math.min(i + 3, lines.length)).join(' ').trim().slice(0, 150);

        return {
          file: relPath,
          line: lineNumber,
          snippet: snippet || line.trim().slice(0, 100),
        };
      }
    }
  }

  // Fallback if no specific file matched: return top output lines as snippet
  const errorSnippet = lines
    .filter((l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail'))
    .slice(0, 2)
    .join(' ')
    .trim()
    .slice(0, 150);

  return { snippet: errorSnippet || lines.slice(0, 2).join(' ').trim().slice(0, 150) };
}

/**
 * Executes static build, typecheck, lint, and test scripts sequentially using process runner.
 */
export async function runBuildTestCheck(snapshot: ProjectSnapshot): Promise<CategoryResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];

  // Identify workspace path. In ProjectSnapshot, path is derived from files or uploaded workspace.
  const workspacePath = snapshot.files.length > 0
    ? path.dirname(snapshot.files[0].path)
    : process.cwd();

  const { scripts, stack } = snapshot;
  const pm = stack.packageManager === 'unknown' ? 'npm' : stack.packageManager;

  // Determine commands to run
  const stagesToRun: { name: string; command: string; args: string[]; isCritical: boolean }[] = [];

  const parseScriptCommand = (scriptStr: string) => {
    // Split safely handling quotes or simple spaces
    const parts = scriptStr.trim().split(/\s+/);
    let cmd = parts[0];
    if (process.platform === 'win32' && (cmd === 'npm' || cmd === 'npx' || cmd === 'pnpm' || cmd === 'yarn' || cmd === 'bun')) {
      cmd = `${cmd}.cmd`;
    }
    return { command: cmd, args: parts.slice(1) };
  };

  // 1. Typecheck
  if (scripts.typecheck || stack.hasTypeScript) {
    if (scripts.typecheck) {
      if (scripts.typecheck.startsWith('npm ') || scripts.typecheck.startsWith('pnpm ') || scripts.typecheck.startsWith('yarn ') || scripts.typecheck.startsWith('bun ') || scripts.typecheck.startsWith('node ') || scripts.typecheck.startsWith('tsc ')) {
        const parsed = parseScriptCommand(scripts.typecheck);
        stagesToRun.push({ name: 'Typecheck', command: parsed.command, args: parsed.args, isCritical: true });
      } else {
        stagesToRun.push({ name: 'Typecheck', command: pm === 'npm' && process.platform === 'win32' ? 'npm.cmd' : pm, args: ['run', 'typecheck'], isCritical: true });
      }
    } else if (stack.hasTypeScript) {
      stagesToRun.push({ name: 'Typecheck', command: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['tsc', '--noEmit'], isCritical: true });
    }
  }

  // 2. Lint
  if (scripts.lint) {
    if (scripts.lint.startsWith('npm ') || scripts.lint.startsWith('pnpm ') || scripts.lint.startsWith('yarn ') || scripts.lint.startsWith('bun ') || scripts.lint.startsWith('node ') || scripts.lint.startsWith('eslint ')) {
      const parsed = parseScriptCommand(scripts.lint);
      stagesToRun.push({ name: 'Linter', command: parsed.command, args: parsed.args, isCritical: false });
    } else {
      stagesToRun.push({ name: 'Linter', command: pm === 'npm' && process.platform === 'win32' ? 'npm.cmd' : pm, args: ['run', 'lint'], isCritical: false });
    }
  }

  // 3. Test
  if (scripts.test || stack.hasTests) {
    if (scripts.test) {
      if (scripts.test.startsWith('npm ') || scripts.test.startsWith('pnpm ') || scripts.test.startsWith('yarn ') || scripts.test.startsWith('bun ') || scripts.test.startsWith('node ') || scripts.test.startsWith('jest ') || scripts.test.startsWith('vitest ')) {
        const parsed = parseScriptCommand(scripts.test);
        stagesToRun.push({ name: 'Test Suite', command: parsed.command, args: parsed.args, isCritical: true });
      } else {
        stagesToRun.push({ name: 'Test Suite', command: pm === 'npm' && process.platform === 'win32' ? 'npm.cmd' : pm, args: ['test'], isCritical: true });
      }
    }
  }

  // 4. Build
  if (scripts.build) {
    if (scripts.build.startsWith('npm ') || scripts.build.startsWith('pnpm ') || scripts.build.startsWith('yarn ') || scripts.build.startsWith('bun ') || scripts.build.startsWith('node ') || scripts.build.startsWith('next ')) {
      const parsed = parseScriptCommand(scripts.build);
      stagesToRun.push({ name: 'Build Process', command: parsed.command, args: parsed.args, isCritical: true });
    } else {
      stagesToRun.push({ name: 'Build Process', command: pm === 'npm' && process.platform === 'win32' ? 'npm.cmd' : pm, args: ['run', 'build'], isCritical: true });
    }
  }

  let totalStagesRun = 0;
  for (const stage of stagesToRun) {
    totalStagesRun++;

    const result: ProcessRunnerResult = await runProcess({
      cwd: workspacePath,
      command: stage.command,
      args: stage.args,
      timeoutMs: 90000, // 90 sec timeout
    });

    if (result.failed || result.timedOut) {
      const outputText = `${result.stdout}\n${result.stderr}`;
      const locationDetails = parseFailureDetails(outputText, snapshot);

      let title = `${stage.name} failed`;
      let severity: 'critical' | 'high' | 'medium' = stage.isCritical ? 'high' : 'medium';

      if (result.timedOut) {
        title = `${stage.name} timed out (>90s)`;
        severity = 'high';
      } else if (stage.name === 'Build Process') {
        title = `Production Build Failed`;
        severity = 'critical';
      }

      findings.push({
        id: `bt_${crypto.randomUUID()}`,
        category: 'build-test',
        severity,
        title,
        description: `Command '${result.command}' failed with exit code ${result.exitCode}.`,
        detector: `PreFlight Process Runner (${stage.name})`,
        location: locationDetails.file
          ? {
              file: locationDetails.file,
              line: locationDetails.line,
              snippet: locationDetails.snippet,
            }
          : undefined,
        evidence: locationDetails.snippet || outputText.slice(0, 300),
        recommendation: `Fix the errors reported by '${result.command}' before publishing/shipping.`,
        isBlocker: severity === 'critical' || severity === 'high',
      });
    }
  }

  // Calculate Sub-Score
  let scoreDeductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'critical') scoreDeductions += 35;
    else if (f.severity === 'high') scoreDeductions += 20;
    else if (f.severity === 'medium') scoreDeductions += 10;
    else if (f.severity === 'low') scoreDeductions += 5;
  });

  const score = Math.max(0, 100 - scoreDeductions);
  const durationMs = Date.now() - startTime;
  const status: CheckStatus = 'completed';

  return {
    category: 'build-test',
    status,
    score,
    durationMs,
    findings,
    summary: stagesToRun.length === 0
      ? 'No build/test scripts configured.'
      : `Ran ${totalStagesRun} build/test stages. Generated ${findings.length} findings.`,
  };
}
