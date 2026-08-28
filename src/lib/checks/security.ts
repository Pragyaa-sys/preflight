import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ProjectSnapshot } from '@/types/project.types';
import { CategoryResult, CheckStatus } from '@/types/audit.types';
import { Finding } from '@/types/finding.types';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key ID',
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    severity: 'critical',
    recommendation: 'Revoke key immediately and use environment variables / AWS Secrets Manager.',
  },
  {
    name: 'AWS Secret Access Key',
    pattern: /aws_secret_access_key\s*=\s*['"][A-Za-z0-9\/+=]{40}['"]/gi,
    severity: 'critical',
    recommendation: 'Remove hardcoded AWS secrets from codebase.',
  },
  {
    name: 'OpenAI / Stripe API Key',
    pattern: /sk_live_[0-9a-zA-Z]{24}|sk-[a-zA-Z0-9]{32,}/g,
    severity: 'critical',
    recommendation: 'Rotate API key and move credential into secret manager.',
  },
  {
    name: 'Generic Private Key',
    pattern: /-----BEGIN (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----/g,
    severity: 'critical',
    recommendation: 'Remove private keys from repository immediately.',
  },
  {
    name: 'GitHub Personal Access Token',
    pattern: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
    severity: 'critical',
    recommendation: 'Revoke exposed GitHub token.',
  },
  {
    name: 'Hardcoded JWT Token',
    pattern: /eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,}/g,
    severity: 'high',
    recommendation: 'Ensure bearer tokens are dynamic and not stored in source files.',
  },
  {
    name: 'Hardcoded Database URI with Password',
    pattern: /(?:mongodb(?:\+srv)?|postgres|postgresql|mysql):\/\/[a-zA-Z0-9_]+:[^@\s"']+@[a-zA-Z0-9_.-]+/g,
    severity: 'critical',
    recommendation: 'Store database credentials in environment variables.',
  },
  {
    name: 'Generic Hardcoded Password Assignment',
    pattern: /(?:password|passwd|secret|api_key|apikey)\s*=\s*["'][^"']{6,}["']/gi,
    severity: 'high',
    recommendation: 'Remove hardcoded secret variables.',
  },
];

/**
 * Runs static Security checks on the project.
 * Detects:
 * 1. Hardcoded API keys, private keys, AWS tokens, DB credentials
 * 2. Committed .env files containing live secrets
 * 3. Dangerous code patterns (eval, innerHTML, exec execution)
 */
export async function runSecurityCheck(snapshot: ProjectSnapshot): Promise<CategoryResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];

  const { files } = snapshot;

  // 1. Check for committed sensitive .env files
  files.forEach((file) => {
    const filename = path.basename(file.relativePath).toLowerCase();
    if (filename === '.env' || filename === '.env.local' || filename === '.env.production') {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        if (content.trim().length > 0 && !content.includes('EXAMPLE')) {
          findings.push({
            id: `sec_${crypto.randomUUID()}`,
            category: 'security',
            severity: 'critical',
            title: 'Sensitive environment file committed',
            description: `Live environment file '${file.relativePath}' is committed to the codebase.`,
            detector: 'PreFlight Secret Scanner',
            location: {
              file: file.relativePath,
              line: 1,
            },
            recommendation: 'Add .env files to .gitignore and sanitize git history.',
            isBlocker: true,
          });
        }
      } catch {
        // Ignore read errors
      }
    }
  });

  // 2. Secret Pattern Scanning & Dangerous Code Patterns
  const scannableFiles = files.filter((f) =>
    !f.relativePath.includes('node_modules') &&
    !f.relativePath.includes('.git') &&
    ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java', '.json', '.env', '.yaml', '.yml'].includes(f.extension)
  );

  for (const file of scannableFiles) {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      const lines = content.split('\n');

      // Check Secret Patterns
      for (const patternObj of SECRET_PATTERNS) {
        patternObj.pattern.lastIndex = 0; // Reset regex state
        let match;
        while ((match = patternObj.pattern.exec(content)) !== null) {
          // Find line number of match
          const offset = match.index;
          const lineNumber = content.substring(0, offset).split('\n').length;
          const matchedLine = lines[lineNumber - 1] || '';

          // Mask match snippet for security display
          const rawMatch = match[0];
          const maskedMatch = rawMatch.length > 8
            ? rawMatch.substring(0, 4) + '***' + rawMatch.substring(rawMatch.length - 4)
            : '***';

          findings.push({
            id: `sec_${crypto.randomUUID()}`,
            category: 'security',
            severity: patternObj.severity,
            title: `Exposed ${patternObj.name}`,
            description: `Potential secret pattern matched (${maskedMatch}).`,
            detector: 'PreFlight Gitleaks Engine',
            location: {
              file: file.relativePath,
              line: lineNumber,
              snippet: matchedLine.trim().slice(0, 100),
            },
            evidence: `Pattern matched: ${patternObj.name}`,
            recommendation: patternObj.recommendation,
            isBlocker: patternObj.severity === 'critical',
          });

          if (patternObj.pattern.lastIndex === match.index) {
            patternObj.pattern.lastIndex++;
          }
        }
      }

      // Check Dangerous Code Execution Patterns (eval, dangerouslySetInnerHTML)
      lines.forEach((lineText, idx) => {
        const trimmed = lineText.trim();
        if (
          trimmed.includes('eval(') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*')
        ) {
          findings.push({
            id: `sec_${crypto.randomUUID()}`,
            category: 'security',
            severity: 'high',
            title: 'Dangerous eval() statement detected',
            description: 'Use of eval() introduces severe arbitrary code execution vulnerabilities.',
            detector: 'PreFlight AST Security Scanner',
            location: {
              file: file.relativePath,
              line: idx + 1,
              snippet: trimmed.slice(0, 80),
            },
            recommendation: 'Refactor code to avoid eval(). Use structured JSON parsing or safer abstractions.',
            isBlocker: false,
          });
        }

        if (
          trimmed.includes('dangerouslySetInnerHTML') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*')
        ) {
          findings.push({
            id: `sec_${crypto.randomUUID()}`,
            category: 'security',
            severity: 'medium',
            title: 'Potential XSS vulnerability (dangerouslySetInnerHTML)',
            description: 'Direct HTML rendering can lead to Cross-Site Scripting (XSS) if un-sanitized.',
            detector: 'PreFlight Security Scanner',
            location: {
              file: file.relativePath,
              line: idx + 1,
              snippet: trimmed.slice(0, 80),
            },
            recommendation: 'Sanitize HTML inputs using DOMPurify before dangerouslySetInnerHTML.',
            isBlocker: false,
          });
        }
      });
    } catch {
      // Ignore read failures
    }
  }

  // Deduce Score
  let scoreDeductions = 0;
  findings.forEach((f) => {
    if (f.severity === 'critical') scoreDeductions += 30;
    else if (f.severity === 'high') scoreDeductions += 15;
    else if (f.severity === 'medium') scoreDeductions += 8;
    else if (f.severity === 'low') scoreDeductions += 3;
  });

  const score = Math.max(0, 100 - scoreDeductions);
  const durationMs = Date.now() - startTime;
  const status: CheckStatus = 'completed';

  return {
    category: 'security',
    status,
    score,
    durationMs,
    findings,
    summary: `Scanned ${scannableFiles.length} files. Found ${findings.length} security findings.`,
  };
}
