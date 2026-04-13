export const dynamic = 'force-dynamic';
/**
 * QA Suite Orchestrator — Unified Autonomous QA Pipeline
 *
 * Runs the full QA suite (smoke + agent quality), stores results in Firestore,
 * posts a Slack summary to #ceo, and creates bug_fix tasks for failures
 * (picked up by desktop-test-loop.mjs or bug-fix-loop.mjs).
 *
 * Trigger: Cloud Scheduler (nightly 2 AM CST + post-deploy)
 *   POST /api/cron/qa-suite   Authorization: Bearer $CRON_SECRET
 *   Body: { trigger?: 'nightly' | 'post-deploy', skipSlack?: boolean }
 *
 * Ralph Wiggum Mode: when failures are found, creates Firestore tasks that
 * the autonomous desktop loop picks up → Claude fixes → re-tests → reports.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';

export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const PROD_URL = process.env.NEXT_PUBLIC_APP_URL
    || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ============================================================================
// AUTH
// ============================================================================

function isAuthorized(req: NextRequest): boolean {
    if (!CRON_SECRET) return false;
    const header = req.headers.get('authorization') || '';
    if (header === `Bearer ${CRON_SECRET}`) return true;
    const param = req.nextUrl.searchParams.get('token') || req.nextUrl.searchParams.get('secret');
    return param === CRON_SECRET;
}

// ============================================================================
// SMOKE TEST DEFINITIONS (API-level, no browser needed)
// ============================================================================

interface SmokeCheck {
    name: string;
    url: string;
    method: 'GET' | 'POST';
    expectedStatus: number;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    validate?: (body: string, status: number) => boolean;
    severity: 'P0' | 'P1' | 'P2';
    area: string;
}

function buildChecks(): SmokeCheck[] {
    return [
        // P0 — Revenue-critical
        {
            name: 'Landing page loads',
            url: '/',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 1000,
            severity: 'P0',
            area: 'homepage',
        },
        {
            name: 'Thrive Syracuse menu loads',
            url: '/thrivesyracuse',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 3000,
            severity: 'P0',
            area: 'public_menu',
        },
        {
            name: 'Dispensary menu page loads',
            url: '/menu/thrive-syracuse',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 3000,
            severity: 'P0',
            area: 'public_menu',
        },
        {
            name: 'Signin page renders',
            url: '/signin',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 1000,
            severity: 'P0',
            area: 'auth',
        },
        // P1 — Functional
        {
            name: 'Cron routes reject unauthenticated',
            url: '/api/cron/pos-sync',
            method: 'GET',
            expectedStatus: 401,
            severity: 'P1',
            area: 'security',
        },
        {
            name: 'Goals API rejects unauthenticated POST',
            url: '/api/goals/suggest',
            method: 'POST',
            expectedStatus: 401,
            headers: { 'Content-Type': 'application/json' },
            body: {},
            severity: 'P1',
            area: 'security',
        },
        {
            name: 'Agent JSON-LD API responds',
            url: '/api/agent/thrivesyracuse',
            method: 'GET',
            expectedStatus: 200,
            severity: 'P1',
            area: 'agents',
        },
        {
            name: 'Non-existent route returns 404 (not 500)',
            url: '/api/this-route-does-not-exist-qa',
            method: 'GET',
            expectedStatus: 404,
            severity: 'P1',
            area: 'routing',
        },
        // P0 — Tablet check-in flow
        {
            name: 'Loyalty tablet page loads',
            url: '/loyalty-tablet',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 1000,
            severity: 'P0',
            area: 'tablet',
        },
        {
            name: 'Loyalty tablet with orgId param loads',
            url: '/loyalty-tablet?orgId=org_thrive_syracuse',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 1000,
            severity: 'P0',
            area: 'tablet',
        },
        // P2 — SEO/Infra
        {
            name: 'robots.txt serves',
            url: '/robots.txt',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.includes('User-agent'),
            severity: 'P2',
            area: 'seo',
        },
        {
            name: 'llm.txt serves',
            url: '/llm.txt',
            method: 'GET',
            expectedStatus: 200,
            severity: 'P2',
            area: 'seo',
        },
        {
            name: 'Pricing page loads',
            url: '/pricing',
            method: 'GET',
            expectedStatus: 200,
            validate: (b) => b.length > 2000,
            severity: 'P2',
            area: 'marketing',
        },
        // P0 — Playbooks
        {
            name: 'Playbook runner cron serves (authenticated)',
            url: '/api/cron/playbook-runner',
            method: 'GET',
            expectedStatus: 200,
            severity: 'P0',
            area: 'playbooks',
        },
    ];
}

// ============================================================================
// RUNNER
// ============================================================================

interface CheckResult {
    name: string;
    passed: boolean;
    statusCode: number | null;
    expectedStatus: number;
    responseMs: number;
    error?: string;
    severity: string;
    area: string;
}

async function runCheck(check: SmokeCheck): Promise<CheckResult> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const opts: RequestInit = {
            method: check.method,
            headers: { 'User-Agent': 'BakedBot-QA-Suite/1.0', ...check.headers },
            signal: controller.signal,
        };
        if (check.body && check.method !== 'GET') opts.body = JSON.stringify(check.body);

        const res = await fetch(`${PROD_URL}${check.url}`, opts);
        clearTimeout(timeout);

        const body = await res.text().catch(() => '');
        const responseMs = Date.now() - start;
        const passed = check.validate
            ? check.validate(body, res.status)
            : res.status === check.expectedStatus;

        return { name: check.name, passed, statusCode: res.status, expectedStatus: check.expectedStatus, responseMs, severity: check.severity, area: check.area, error: passed ? undefined : `HTTP ${res.status} (expected ${check.expectedStatus})` };
    } catch (err: unknown) {
        return { name: check.name, passed: false, statusCode: null, expectedStatus: check.expectedStatus, responseMs: Date.now() - start, severity: check.severity, area: check.area, error: (err as Error).message };
    }
}

// ============================================================================
// FIRESTORE PERSISTENCE
// ============================================================================

interface QASuiteRun {
    runId: string;
    trigger: string;
    timestamp: string;
    passed: number;
    failed: number;
    total: number;
    avgResponseMs: number;
    results: CheckResult[];
    bugTasksCreated: string[];
    commitSha?: string;
}

async function persistRun(run: QASuiteRun): Promise<void> {
    const db = getAdminFirestore();
    await db.collection('qa_suite_runs').doc(run.runId).set(run);
}

async function createBugFixTask(failure: CheckResult, runId: string): Promise<string> {
    const db = getAdminFirestore();
    const taskId = `qa-fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.collection('agent_tasks').doc(taskId).set({
        taskId,
        type: 'bug_fix',
        status: 'pending',
        severity: failure.severity,
        source: 'qa-suite',
        runId,
        task: `QA failure: ${failure.name} — ${failure.error}`,
        context: {
            area: failure.area,
            expectedStatus: failure.expectedStatus,
            actualStatus: failure.statusCode,
            responseMs: failure.responseMs,
        },
        createdAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
    });
    return taskId;
}

// ============================================================================
// SLACK REPORTING
// ============================================================================

async function postSlackSummary(run: QASuiteRun, trigger: string): Promise<void> {
    const allPassed = run.failed === 0;
    const emoji = allPassed ? ':white_check_mark:' : ':rotating_light:';
    const status = allPassed ? 'ALL PASSING' : `${run.failed} FAILURES`;

    const failureLines = run.results
        .filter(r => !r.passed)
        .map(r => `  - [${r.severity}] ${r.name}: ${r.error}`)
        .join('\n');

    const text = [
        `${emoji} *QA Suite — ${status}*`,
        `Trigger: ${trigger} | ${run.passed}/${run.total} passed | Avg: ${run.avgResponseMs}ms`,
        run.commitSha ? `Commit: \`${run.commitSha.slice(0, 8)}\`` : '',
        failureLines ? `\n*Failures:*\n${failureLines}` : '',
        run.bugTasksCreated.length > 0 ? `\n_${run.bugTasksCreated.length} bug fix task(s) created for Ralph Wiggum loop_` : '',
    ].filter(Boolean).join('\n');

    try {
        await slackService.postMessage('ceo', text);
    } catch {
        // Fallback: try linus-deployments
        try {
            await slackService.postMessage('linus-deployments', text);
        } catch (e2) {
            logger.error('[QA-Suite] Slack post failed', { error: (e2 as Error).message });
        }
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function runQASuite(trigger: string, skipSlack: boolean): Promise<QASuiteRun> {
    const runId = `qa-suite-${Date.now()}`;
    const checks = buildChecks();

    logger.info('[QA-Suite] Starting', { runId, trigger, checks: checks.length });

    // Run all checks in parallel
    const results = await Promise.all(checks.map(c => runCheck(c)));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgResponseMs = Math.round(results.reduce((s, r) => s + r.responseMs, 0) / results.length);

    // Get current commit SHA
    let commitSha: string | undefined;
    try {
        const { execSync } = await import('child_process');
        commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
        // Not in a git repo or git not available — fine
    }

    // Create bug fix tasks for P0/P1 failures (Ralph Wiggum auto-fix loop)
    const bugTasksCreated: string[] = [];
    const criticalFailures = results.filter(r => !r.passed && (r.severity === 'P0' || r.severity === 'P1'));
    for (const failure of criticalFailures) {
        try {
            const taskId = await createBugFixTask(failure, runId);
            bugTasksCreated.push(taskId);
            logger.info('[QA-Suite] Bug fix task created', { taskId, test: failure.name });
        } catch (err) {
            logger.error('[QA-Suite] Failed to create bug task', { test: failure.name, error: (err as Error).message });
        }
    }

    const run: QASuiteRun = {
        runId,
        trigger,
        timestamp: new Date().toISOString(),
        passed,
        failed,
        total: results.length,
        avgResponseMs,
        results,
        bugTasksCreated,
        commitSha,
    };

    // Persist to Firestore
    try {
        await persistRun(run);
    } catch (err) {
        logger.error('[QA-Suite] Failed to persist run', { error: (err as Error).message });
    }

    // Post to Slack
    if (!skipSlack) {
        await postSlackSummary(run, trigger);
    }

    logger.info('[QA-Suite] Complete', { runId, passed, failed, bugTasks: bugTasksCreated.length });
    return run;
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const trigger = body.trigger || 'manual';
        const skipSlack = body.skipSlack === true;

        const run = await runQASuite(trigger, skipSlack);

        return NextResponse.json({ success: true, ...run });
    } catch (error) {
        logger.error('[QA-Suite] POST handler failed', { error: (error as Error).message });
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const trigger = request.nextUrl.searchParams.get('trigger') || 'manual-get';
        const skipSlack = request.nextUrl.searchParams.get('skipSlack') === 'true';

        const run = await runQASuite(trigger, skipSlack);

        return NextResponse.json({ success: true, ...run });
    } catch (error) {
        logger.error('[QA-Suite] GET handler failed', { error: (error as Error).message });
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
}
