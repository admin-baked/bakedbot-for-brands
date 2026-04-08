export const dynamic = 'force-dynamic';
/**
 * POST /api/vm/run
 *
 * Sandboxed server-side code execution for vm_run artifacts.
 *
 * Supported runtimes:
 *  - javascript / node_vm  → Node.js vm.runInNewContext with console capture
 *
 * Request body:
 *  { code: string, language: 'javascript', runId: string, stepId: string, timeout?: number }
 *
 * Response:
 *  { success: boolean, stdout: string, stderr: string, exitCode: number, durationMs: number }
 *
 * Security:
 *  - Requires authenticated user (session cookie)
 *  - Code runs in an isolated vm context — no access to Node internals beyond
 *    a sandboxed console and Math/JSON/Date globals
 *  - Hard timeout: 10 000 ms max (caller may request shorter via `timeout`)
 *  - Output capped at 50 KB
 */

import { NextRequest, NextResponse } from 'next/server';
import vm from 'node:vm';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

const MAX_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 50_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RunRequest {
  code: string;
  language?: string;
  runId?: string;
  stepId?: string;
  timeout?: number;
}

interface RunResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT_BYTES) return s;
  return s.slice(0, MAX_OUTPUT_BYTES) + '\n[output truncated]';
}

function runJavaScript(
  code: string,
  timeoutMs: number
): { stdout: string; stderr: string; exitCode: number; durationMs: number } {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  const sandbox = {
    console: {
      log:   (...args: unknown[]) => stdoutLines.push(args.map(String).join(' ')),
      info:  (...args: unknown[]) => stdoutLines.push(args.map(String).join(' ')),
      warn:  (...args: unknown[]) => stderrLines.push('[warn] ' + args.map(String).join(' ')),
      error: (...args: unknown[]) => stderrLines.push('[err] ' + args.map(String).join(' ')),
    },
    Math,
    JSON,
    Date,
    setTimeout: undefined as unknown,  // blocked
    setInterval: undefined as unknown, // blocked
    fetch: undefined as unknown,       // blocked
    process: undefined as unknown,     // blocked
    require: undefined as unknown,     // blocked
  };

  vm.createContext(sandbox);

  const start = Date.now();
  try {
    vm.runInContext(code, sandbox as vm.Context, { timeout: timeoutMs });
    const durationMs = Date.now() - start;
    return {
      stdout: truncate(stdoutLines.join('\n')),
      stderr: truncate(stderrLines.join('\n')),
      exitCode: 0,
      durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: truncate(stdoutLines.join('\n')),
      stderr: truncate(stderrLines.join('\n') + '\n[runtime error] ' + msg),
      exitCode: 1,
      durationMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Optional: persist step result back to vm_run artifact in Firestore
// ---------------------------------------------------------------------------

async function persistStepResult(
  runId: string,
  stepId: string,
  result: { stdout: string; stderr: string; exitCode: number; durationMs: number }
): Promise<void> {
  try {
    const db = getAdminFirestore();
    // vm_run artifacts are stored under inbox_artifacts, keyed by runId field
    const snap = await db
      .collection('inbox_artifacts')
      .where('data.runId', '==', runId)
      .limit(1)
      .get();

    if (snap.empty) return;

    const docRef = snap.docs[0].ref;
    const artifact = snap.docs[0].data();
    const steps: Record<string, unknown>[] = Array.isArray(artifact?.data?.steps)
      ? [...artifact.data.steps]
      : [];

    const stepIdx = steps.findIndex((s) => (s as { id?: string }).id === stepId);
    if (stepIdx !== -1) {
      steps[stepIdx] = {
        ...steps[stepIdx],
        status: result.exitCode === 0 ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
        detail: result.exitCode === 0
          ? `Completed in ${result.durationMs}ms`
          : `Failed: ${result.stderr.slice(0, 200)}`,
      };
    }

    const outputs: Record<string, unknown>[] = Array.isArray(artifact?.data?.outputs)
      ? [...artifact.data.outputs]
      : [];

    if (result.stdout) {
      outputs.push({ kind: 'code', title: 'stdout', content: result.stdout, language: 'text' });
    }
    if (result.stderr) {
      outputs.push({ kind: 'code', title: 'stderr', content: result.stderr, language: 'text' });
    }

    const allStepsDone = steps.every(
      (s) => (s as { status?: string }).status === 'completed' || (s as { status?: string }).status === 'failed'
    );

    await docRef.update({
      'data.steps': steps,
      'data.outputs': outputs,
      'data.status': result.exitCode === 0 && allStepsDone ? 'completed' : result.exitCode !== 0 ? 'failed' : 'running',
      'data.updatedAt': new Date().toISOString(),
    });
  } catch (err) {
    logger.warn('[vm/run] Failed to persist step result', { runId, stepId, error: String(err) });
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse<RunResponse>> {
  try {
    // Auth — must be logged in
    await requireUser();
  } catch {
    return NextResponse.json(
      { success: false, stdout: '', stderr: 'Unauthorized', exitCode: 401, durationMs: 0 },
      { status: 401 }
    );
  }

  let body: RunRequest;
  try {
    body = (await req.json()) as RunRequest;
  } catch {
    return NextResponse.json(
      { success: false, stdout: '', stderr: 'Invalid JSON body', exitCode: 400, durationMs: 0 },
      { status: 400 }
    );
  }

  const { code, language = 'javascript', runId, stepId, timeout } = body;

  if (typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json(
      { success: false, stdout: '', stderr: 'code is required', exitCode: 400, durationMs: 0 },
      { status: 400 }
    );
  }

  const timeoutMs = Math.min(
    typeof timeout === 'number' && timeout > 0 ? timeout : 5_000,
    MAX_TIMEOUT_MS
  );

  const lang = language.toLowerCase().replace(/^node[_-]?/, '');

  if (!['javascript', 'js'].includes(lang)) {
    return NextResponse.json(
      {
        success: false,
        stdout: '',
        stderr: `Unsupported language "${language}". Supported: javascript.`,
        exitCode: 400,
        durationMs: 0,
      },
      { status: 400 }
    );
  }

  logger.info('[vm/run] Executing code', { language, timeoutMs, hasRunId: !!runId });

  const result = runJavaScript(code, timeoutMs);

  // Optionally persist step results back to the vm_run artifact
  if (runId && stepId) {
    void persistStepResult(runId, stepId, result);
  }

  return NextResponse.json({
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
  });
}
