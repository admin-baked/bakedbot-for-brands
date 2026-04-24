export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import type { QAGoldenSetEvalResult } from '@/types/qa';
import { recordQAGoldenEvalRun } from '@/server/services/qa-golden-eval-runs';
import { parseEvalOutput } from './parse-eval-output';

const execFileAsync = promisify(execFile);

/**
 * POST /api/cron/qa-golden-eval
 *
 * Shells out to scripts/run-golden-eval.mjs for Pinky's run_golden_set_eval tool.
 * Can also be triggered directly by Cloud Scheduler for nightly regression protection.
 *
 * Body: { agent: 'smokey'|'craig'|'deebo', tier?: 'fast'|'full' }
 * Auth: CRON_SECRET Bearer token
 *
 * Exit code semantics (from run-golden-eval.mjs):
 *   0 = all pass
 *   1 = compliance-critical failure (blocks deployment)
 *   2 = below threshold (quality degradation)
 */
export async function POST(req: NextRequest) {
    const authError = await requireCronSecret(req);
    if (authError) return authError;

    let body: { agent?: string; tier?: string } = {};
    try {
        body = await req.json();
    } catch {
        // empty body is fine — defaults below
    }

    const agent = body.agent ?? 'deebo';
    const tier = body.tier ?? 'fast';

    const validAgents = ['smokey', 'craig', 'deebo'];
    if (!validAgents.includes(agent)) {
        return NextResponse.json({ error: `Invalid agent. Must be one of: ${validAgents.join(', ')}` }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'run-golden-eval.mjs');
    const args = ['--agent', agent];
    if (tier === 'full') args.push('--full');

    logger.info('[QA Golden Eval] Starting', { agent, tier });

    try {
        const { stdout, stderr } = await execFileAsync('node', [scriptPath, ...args], {
            timeout: 90_000,  // 90s — FULL tier with Claude Haiku calls needs room
            env: { ...process.env },
        });

        if (stderr) {
            logger.warn('[QA Golden Eval] stderr output', { agent, stderr: stderr.slice(0, 500) });
        }

        const result = parseEvalOutput(stdout, agent as QAGoldenSetEvalResult['agent'], tier as QAGoldenSetEvalResult['tier']);
        await recordQAGoldenEvalRun(result, { source: 'cron' });
        logger.info('[QA Golden Eval] Complete', { agent, tier, score: result.score, complianceFailed: result.complianceFailed });
        return NextResponse.json(result);

    } catch (err: unknown) {
        // execFile rejects when process exits non-zero — extract stdout from error
        const execErr = err as { code?: number; stdout?: string; stderr?: string; message?: string };
        const stdout = execErr.stdout ?? '';
        const exitCode = execErr.code ?? -1;

        const result = parseEvalOutput(
            stdout,
            agent as QAGoldenSetEvalResult['agent'],
            tier as QAGoldenSetEvalResult['tier'],
            exitCode,
        );
        await recordQAGoldenEvalRun(result, { source: 'cron' });

        logger.warn('[QA Golden Eval] Eval returned non-zero exit', {
            agent, tier, exitCode,
            complianceFailed: result.complianceFailed,
            score: result.score,
        });

        // Still 200 — the result payload describes the failure; callers decide what to do
        return NextResponse.json(result);
    }
}

export async function GET(req: NextRequest) {
    // Allow manual testing via GET with ?agent=deebo&tier=fast
    const url = new URL(req.url);
    const fakeBody = new Request(req.url, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({
            agent: url.searchParams.get('agent') ?? 'deebo',
            tier: url.searchParams.get('tier') ?? 'fast',
        }),
    });
    return POST(new NextRequest(fakeBody));
}

