import { execa, ExecaError } from 'execa';

export interface ProcessRunnerOptions {
  cwd: string;
  command: string;
  args?: string[];
  timeoutMs?: number;
  env?: Record<string, string>;
}

export interface ProcessRunnerResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  failed: boolean;
}

/**
 * Spawns dynamic commands inside an isolated project directory safely.
 * Sets CI=true, FORCE_COLOR=0, and NON_INTERACTIVE environment variables
 * to prevent hanging prompts. Applies strict timeouts to kill runaway tasks.
 */
export async function runProcess(options: ProcessRunnerOptions): Promise<ProcessRunnerResult> {
  const {
    cwd,
    command,
    args = [],
    timeoutMs = 60000,
    env = {},
  } = options;

  const startTime = Date.now();

  const processEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CI: 'true',
    FORCE_COLOR: '0',
    CONTINUOUS_INTEGRATION: 'true',
    NON_INTERACTIVE: 'true',
    NODE_ENV: 'test',
    ...env,
  };

  try {
    const result = await execa(command, args, {
      cwd,
      env: processEnv,
      timeout: timeoutMs,
      reject: false, // Don't throw on non-zero exit codes so we can parse output safely
      buffer: true,
      all: true,
    });

    const durationMs = Date.now() - startTime;

    return {
      command: `${command} ${args.join(' ')}`.trim(),
      exitCode: result.exitCode ?? 0,
      stdout: typeof result.stdout === 'string' ? result.stdout : String(result.stdout || ''),
      stderr: typeof result.stderr === 'string' ? result.stderr : String(result.stderr || ''),
      durationMs,
      timedOut: result.timedOut || false,
      failed: result.failed || result.exitCode !== 0,
    };
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const err = error as ExecaError;

    return {
      command: `${command} ${args.join(' ')}`.trim(),
      exitCode: err.exitCode ?? 1,
      stdout: typeof err.stdout === 'string' ? err.stdout : String(err.stdout || ''),
      stderr: typeof err.stderr === 'string' ? err.stderr : String(err.stderr || err.message || error),
      durationMs,
      timedOut: err.timedOut || false,
      failed: true,
    };
  }
}
