/**
 * QA Smoke Test Cron Endpoint
 *
 * Runs API-level smoke tests against the live application.
 * Called automatically after deploys (Cloud Scheduler) or manually.
 *
 * POST /api/cron/qa-smoke
 *   Authorization: Bearer $CRON_SECRET
 *   Body: { dryRun?: boolean, fileBugsOnFailure?: boolean }
 *
 * GET /api/cron/qa-smoke?secret=$CRON_SECRET
 *   Manual trigger for testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { reportBug } from '@/server/actions/qa';
import { notifyNewBug } from '@/server/services/qa-notifications';
import type { QASmokeResult, QASmokeRunSummary, QABugPriority, QABugArea } from '@/types/qa';

export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL
    || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ============================================================================
// SMOKE TEST SUITE (API-level, no browser)
// ============================================================================

interface SmokeTestDef {
    testId: string;
    name: string;
    area: QABugArea;
    url: string;
    method: 'GET' | 'POST';
    expectedStatus: number;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    validate?: (body: string, status: number) => boolean;
    priority: QABugPriority;
    skip?: boolean;
}

function buildSmokeTests(cronSecret: string): SmokeTestDef[] {
    return [
        // Auth / Security
        {
            testId: '7.8',
            name: 'Cron routes reject unauthenticated requests',
            area: 'cron_jobs',
            url: '/api/cron/pos-sync',
            method: 'GET',
            expectedStatus: 401,
            priority: 'P1',
        },
        {
            testId: null as unknown as string,
            name: 'Goals API rejects unauthenticated POST',
            area: 'auth',
            url: '/api/goals/suggest',
            method: 'POST',
            expectedStatus: 401,
            headers: { 'Content-Type': 'application/json' },
            body: {},
            priority: 'P1',
        },
        {
            testId: null as unknown as string,
            name: 'Campaign sender cron rejects unauthenticated',
            area: 'campaigns',
            url: '/api/cron/send-campaign',
            method: 'POST',
            expectedStatus: 401,
            headers: { 'Content-Type': 'application/json' },
            body: {},
            priority: 'P1',
        },

        // Public Pages
        {
            testId: '1.1',
            name: 'Thrive Syracuse brand menu loads',
            area: 'public_menu',
            url: '/thrivesyracuse',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P0',
            validate: (body) => body.length > 3000,
        },
        {
            testId: null as unknown as string,
            name: 'Dispensary menu page loads',
            area: 'public_menu',
            url: '/menu/thrive-syracuse',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P0',
            validate: (body) => body.length > 3000,
        },
        {
            testId: null as unknown as string,
            name: 'Landing page loads',
            area: 'firebase_deploy',
            url: '/',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P1',
            validate: (body) => body.length > 1000,
        },
        {
            testId: null as unknown as string,
            name: 'robots.txt serves correctly',
            area: 'firebase_deploy',
            url: '/robots.txt',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P2',
            validate: (body) => body.includes('User-agent'),
        },

        // AI / Agent Endpoints
        {
            testId: null as unknown as string,
            name: 'Agent JSON-LD API serves for thrivesyracuse',
            area: 'public_menu',
            url: '/api/agent/thrivesyracuse',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P2',
        },
        {
            testId: null as unknown as string,
            name: 'BakedBot llm.txt serves',
            area: 'firebase_deploy',
            url: '/llm.txt',
            method: 'GET',
            expectedStatus: 200,
            priority: 'P3',
        },

        // Infrastructure
        {
            testId: null as unknown as string,
            name: 'Non-existent route returns 404 (not 500)',
            area: 'firebase_deploy',
            url: '/api/this-route-does-not-exist-99999',
            method: 'GET',
            expectedStatus: 404,
            priority: 'P1',
            validate: (_, status) => status === 404,
        },
    ];
}

async function runSmokeTest(test: SmokeTestDef): Promise<QASmokeResult> {
    const start = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const options: RequestInit = {
            method: test.method,
            headers: {
                'User-Agent': 'BakedBot-QA-Smoke/1.0',
                ...test.headers,
            },
            signal: controller.signal,
        };

        if (test.body && test.method !== 'GET') {
            options.body = JSON.stringify(test.body);
        }

        const response = await fetch(`${BASE_URL}${test.url}`, options);
        clearTimeout(timeout);

        const body = await response.text().catch(() => '');
        const responseMs = Date.now() - start;

        const passed = test.validate
            ? test.validate(body, response.status)
            : response.status === test.expectedStatus;

        return {
            testId: test.testId || test.name,
            name: test.name,
            url: `${BASE_URL}${test.url}`,
            method: test.method,
            passed,
            statusCode: response.status,
            expectedStatus: test.expectedStatus,
            responseMs,
            error: passed ? undefined : `Status ${response.status} (expected ${test.expectedStatus})`,
        };
    } catch (error) {
        return {
            testId: test.testId || test.name,
            name: test.name,
            url: `${BASE_URL}${test.url}`,
            method: test.method,
            passed: false,
            statusCode: undefined,
            expectedStatus: test.expectedStatus,
            responseMs: Date.now() - start,
            error: (error as Error).message,
        };
    }
}

// ============================================================================
// HANDLERS
// ============================================================================

async function runSmokeSuite(
    cronSecret: string,
    options: { dryRun?: boolean; fileBugsOnFailure?: boolean } = {}
): Promise<QASmokeRunSummary> {
    const tests = buildSmokeTests(cronSecret);
    const runId = `smoke-${Date.now()}`;

    logger.info('[QA-Smoke] Starting smoke test suite', { runId, tests: tests.length });

    // Run all tests in parallel
    const results = await Promise.all(tests.map(t => runSmokeTest(t)));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    logger.info('[QA-Smoke] Suite complete', { runId, passed, failed });

    const bugsFiledIds: string[] = [];

    // File bugs for failures (if not dry run)
    if (options.fileBugsOnFailure && !options.dryRun && failed > 0) {
        const failedResults = results.filter(r => !r.passed);

        for (const result of failedResults) {
            const bugArea = (tests.find(t => t.testId === result.testId || t.name === result.name)?.area) || 'other';
            const bugPriority = (tests.find(t => t.testId === result.testId || t.name === result.name)?.priority) || 'P2';

            try {
                const bugResult = await reportBug({
                    title: `[Smoke] ${result.name}`,
                    steps: [
                        `${result.method} ${result.url}`,
                        `Expected HTTP ${result.expectedStatus}`,
                        `Got: ${result.statusCode || 'timeout/error'}`,
                    ],
                    expected: `HTTP ${result.expectedStatus} response`,
                    actual: result.error || `HTTP ${result.statusCode}`,
                    priority: bugPriority as QABugPriority,
                    area: bugArea as QABugArea,
                    environment: 'production',
                    testCaseId: result.testId?.includes('.') ? result.testId : undefined,
                    notes: `Auto-filed by QA smoke test runner. Run ID: ${runId}`,
                });

                if (bugResult.success && bugResult.bugId) {
                    bugsFiledIds.push(bugResult.bugId);
                    logger.info('[QA-Smoke] Bug filed for failure', { bugId: bugResult.bugId, test: result.name });
                }
            } catch (err) {
                logger.error('[QA-Smoke] Failed to file bug', { test: result.name, error: (err as Error).message });
            }
        }
    }

    return {
        runId,
        environment: BASE_URL.includes('localhost') ? 'staging' : 'production',
        timestamp: new Date().toISOString(),
        passed,
        failed,
        total: tests.length,
        results,
        bugsFiledIds: bugsFiledIds.length > 0 ? bugsFiledIds : undefined,
    };
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            logger.error('[QA-Smoke] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            logger.warn('[QA-Smoke] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { dryRun = false, fileBugsOnFailure = false } = body;

        const summary = await runSmokeSuite(cronSecret, { dryRun, fileBugsOnFailure });

        return NextResponse.json({
            success: true,
            ...summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[QA-Smoke] POST handler failed', { error: (error as Error).message });
        return NextResponse.json(
            { success: false, error: (error as Error).message, timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || secret !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dryRun = searchParams.get('dryRun') === 'true';
        const fileBugs = searchParams.get('fileBugs') === 'true';

        logger.info('[QA-Smoke] Manual trigger via GET');

        const summary = await runSmokeSuite(cronSecret, { dryRun, fileBugsOnFailure: fileBugs });

        return NextResponse.json({
            success: true,
            ...summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[QA-Smoke] GET handler failed', { error: (error as Error).message });
        return NextResponse.json(
            { success: false, error: (error as Error).message },
            { status: 500 }
        );
    }
}
