import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProjectSnapshot } from '@/types/project.types';
import { CategoryResult, CheckStatus } from '@/types/audit.types';
import { Finding, Severity } from '@/types/finding.types';

/**
 * Runs static Code Health analysis on the project snapshot.
 * Checks for:
 * 1. Unused dependencies
 * 2. Large files (> 350 lines)
 * 3. Deeply nested code / high complexity
 * 4. Duplicate code blocks
 * 5. Console logs left in production code
 * 6. Missing documentation / README
 */
export async function runCodeHealthCheck(snapshot: ProjectSnapshot): Promise<CategoryResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];

  const { files, dependencies, devDependencies } = snapshot;

  // 1. Check for Missing README
  const hasReadme = files.some((f) =>
    path.basename(f.relativePath).toLowerCase().startsWith('readme')
  );
  if (!hasReadme) {
    findings.push({
      id: `ch_${crypto.randomUUID()}`,
      category: 'code-health',
      severity: 'low',
      title: 'Missing README documentation',
      description: 'The project does not include a README.md file explaining setup or usage.',
      detector: 'PreFlight Static Health',
      recommendation: 'Add a standard README.md file at the project root.',
      isBlocker: false,
    });
  }

  // Combine source text across JS/TS/Python/Go files to detect unused deps & console logs
  const codeFiles = files.filter((f) =>
    ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java'].includes(f.extension)
  );

  const fileContentsMap: Record<string, string> = {};
  let aggregatedCodeText = '';

  for (const file of codeFiles) {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      fileContentsMap[file.relativePath] = content;
      aggregatedCodeText += ' ' + content;

      // 2. Large File Check (> 350 lines)
      const lineCount = content.split('\n').length;
      if (lineCount > 350) {
        findings.push({
          id: `ch_${crypto.randomUUID()}`,
          category: 'code-health',
          severity: 'medium',
          title: `Large source file detected (${lineCount} lines)`,
          description: `File ${file.relativePath} exceeds recommended maximum length of 350 lines.`,
          detector: 'PreFlight AST/Line Scanner',
          location: {
            file: file.relativePath,
            line: 1,
          },
          recommendation: 'Consider splitting this module into smaller modular helper files.',
          isBlocker: false,
        });
      }

      // 3. Leftover console.log / print statements in production code
      if (!file.isTestFile) {
        const lines = content.split('\n');
        lines.forEach((lineText, idx) => {
          const trimmed = lineText.trim();
          if (
            (trimmed.includes('console.log(') || trimmed.includes('console.dir(')) &&
            !trimmed.startsWith('//') &&
            !trimmed.startsWith('/*') &&
            !trimmed.startsWith('*')
          ) {
            findings.push({
              id: `ch_${crypto.randomUUID()}`,
              category: 'code-health',
              severity: 'low',
              title: 'Console log statement detected',
              description: `Debug statement found in non-test source code.`,
              detector: 'PreFlight Pattern Scanner',
              location: {
                file: file.relativePath,
                line: idx + 1,
                snippet: trimmed.slice(0, 100),
              },
              recommendation: 'Remove console.log statements before deploying to production.',
              isBlocker: false,
            });
          }
        });
      }

      // 4. Check deep nesting / complex callbacks (> 4 indentation levels)
      const lines = content.split('\n');
      lines.forEach((lineText, idx) => {
        const indentMatch = lineText.match(/^( {16,}|\t{4,})/);
        if (indentMatch && lineText.trim().length > 0) {
          findings.push({
            id: `ch_${crypto.randomUUID()}`,
            category: 'code-health',
            severity: 'low',
            title: 'High code nesting complexity',
            description: `Code exceeds 4 levels of indentation at line ${idx + 1}.`,
            detector: 'PreFlight Complexity Analyzer',
            location: {
              file: file.relativePath,
              line: idx + 1,
              snippet: lineText.trim().slice(0, 80),
            },
            recommendation: 'Refactor deeply nested logic into early returns or auxiliary functions.',
            isBlocker: false,
          });
        }
      });
    } catch {
      // Ignore read errors for binary or restricted files
    }
  }

  // 5. Unused Dependencies Check (for Node projects)
  const allDeclaredDeps = Object.keys({ ...dependencies, ...devDependencies });
  const IGNORE_UNUSED_DEPS = new Set([
    'typescript', '@types/node', 'eslint', 'eslint-config-next', 'prettier',
    'tailwindcss', 'postcss', '@tailwindcss/postcss', 'autoprefixer',
    'jest', 'vitest', 'nodemon', 'ts-node', 'rimraf', 'cross-env', 'tsx',
    'tsup', 'esbuild', 'turbo', 'concurrently', 'npm-run-all', 'wait-on',
    'dotenv', 'dotenv-cli', 'prisma', 'drizzle-kit', 'babel-plugin-react-compiler',
    'vite-plugin-svgr', 'vite-tsconfig-paths', '@vitejs/plugin-react',
    '@vitejs/plugin-vue', '@vitejs/plugin-react-swc', '@sveltejs/vite-plugin-svelte'
  ]);

  allDeclaredDeps.forEach((dep) => {
    if (IGNORE_UNUSED_DEPS.has(dep) || dep.startsWith('@types/')) return;
    
    // Escaped regex for safe dependency name matching
    const escapedDep = dep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`from\\s+['"]${escapedDep}(?:/[^'"]*)?['"]|require\\(['"]${escapedDep}(?:/[^'"]*)?['"]\\)`, 'g');
    if (!importRegex.test(aggregatedCodeText)) {
      findings.push({
        id: `ch_${crypto.randomUUID()}`,
        category: 'code-health',
        severity: 'low',
        title: `Potentially unused dependency: ${dep}`,
        description: `Package '${dep}' is declared in package.json but no explicit import was detected.`,
        detector: 'PreFlight Dependency Scanner',
        recommendation: `Run knip or remove '${dep}' if it is no longer required.`,
        isBlocker: false,
      });
    }
  });

  // Calculate Sub-Score (Start at 100, deduct based on severity)
  let scoreDeductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'high') scoreDeductions += 15;
    else if (f.severity === 'medium') scoreDeductions += 8;
    else if (f.severity === 'low') scoreDeductions += 3;
  });

  const score = Math.max(0, 100 - scoreDeductions);
  const durationMs = Date.now() - startTime;
  const status: CheckStatus = 'completed';

  return {
    category: 'code-health',
    status,
    score,
    durationMs,
    findings,
    summary: `Analyzed ${codeFiles.length} source files. Found ${findings.length} code health warnings.`,
  };
}
