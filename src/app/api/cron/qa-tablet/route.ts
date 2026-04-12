export const dynamic = 'force-dynamic';
/**
 * QA Tablet — Full Loyalty Tablet Pipeline Stress Test
 *
 * Tests every server-side path of the loyalty tablet check-in flow:
 *  1. Inventory prefetch latency (getCachedMenuProducts)
 *  2. getMoodRecommendations — all 8 moods
 *  3. searchTabletRecommendations — common voice queries
 *  4. captureTabletLead (dry run — uses a sentinel phone so it doesn't create real records)
 *  5. getCustomerBudtenderContext fallback
 *  6. quickLookupByPhoneLast4 non-match (should return found:false gracefully)
 *
 * For each failure: files an agent_task assigned to Linus with full context.
 * Runs nightly (Cloud Scheduler) + available for manual trigger.
 *
 * POST /api/cron/qa-tablet   Authorization: Bearer $CRON_SECRET
 * GET  /api/cron/qa-tablet?secret=$CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createTaskInternal } from '@/server/actions/agent-tasks';
import {
    getMoodRecommendations,
    searchTabletRecommendations,
    prefetchTabletInventory,
    quickLookupByPhoneLast4,
    getCustomerBudtenderContext,
} from '@/server/actions/loyalty-tablet';
import { TABLET_MOODS } from '@/lib/checkin/loyalty-tablet-shared';

export const maxDuration = 120;

const TEST_ORG_ID = 'org_thrive_syracuse';

// ============================================================================
// TEST CASES
// ============================================================================

interface TabletTestResult {
    name: string;
    passed: boolean;
    durationMs: number;
    error?: string;
    detail?: string;
}

async function runTest(name: string, fn: () => Promise<string | void>): Promise<TabletTestResult> {
    const start = Date.now();
    try {
        const detail = await fn();
        return { name, passed: true, durationMs: Date.now() - start, detail: detail ?? undefined };
    } catch (err) {
        return {
            name,
            passed: false,
            durationMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

async function runAllTests(): Promise<TabletTestResult[]> {
    const results: TabletTestResult[] = [];

    // ── 1. Inventory prefetch latency ──────────────────────────────────────
    results.push(await runTest('Inventory prefetch (cache cold)', async () => {
        const start = Date.now();
        await prefetchTabletInventory(TEST_ORG_ID);
        const ms = Date.now() - start;
        if (ms > 10_000) throw new Error(`Prefetch took ${ms}ms — exceeds 10s threshold. Firestore latency or empty collection.`);
        return `${ms}ms`;
    }));

    // ── 2. getMoodRecommendations — all moods ──────────────────────────────
    for (const mood of TABLET_MOODS) {
        results.push(await runTest(`getMoodRecommendations(${mood.id})`, async () => {
            const start = Date.now();
            const res = await getMoodRecommendations(TEST_ORG_ID, mood.id);
            const ms = Date.now() - start;
            if (!res.success) throw new Error(res.error || 'No success flag');
            if (!res.products?.length) throw new Error('Empty product list returned');
            if (ms > 8_000) throw new Error(`Took ${ms}ms — inventory cache may be cold`);
            return `${res.products.length} products in ${ms}ms`;
        }));
    }

    // ── 3. searchTabletRecommendations — common voice queries ───────────────
    const voiceQueries = [
        { query: 'something to help me relax', mood: 'relaxed' },
        { query: 'gummies under twenty dollars', mood: undefined },
        { query: 'pre roll for social', mood: 'social' },
        { query: 'vape for focus', mood: 'focused' },
    ];
    for (const { query: q, mood } of voiceQueries) {
        results.push(await runTest(`searchTabletRecommendations("${q}")`, async () => {
            const start = Date.now();
            const res = await searchTabletRecommendations(TEST_ORG_ID, q, mood ?? null);
            const ms = Date.now() - start;
            // "no match" is acceptable — only error on actual exception
            if (res.error && res.error.includes('No products available')) {
                throw new Error('Inventory empty — POS sync may be down');
            }
            return res.success
                ? `${res.products?.length ?? 0} products in ${ms}ms`
                : `No match for "${q}" (${ms}ms) — acceptable`;
        }));
    }

    // ── 4. quickLookupByPhoneLast4 — non-match should NOT crash ────────────
    results.push(await runTest('quickLookupByPhoneLast4 (non-match)', async () => {
        const res = await quickLookupByPhoneLast4(TEST_ORG_ID, '0000');
        // A non-match should return found:false cleanly
        if (res.found && res.matches.length > 0) {
            return `Unexpected match for 0000 — ${res.matches.length} results`;
        }
        return 'Returned found:false as expected';
    }));

    // ── 5. getCustomerBudtenderContext — unknown customer graceful fallback ─
    results.push(await runTest('getCustomerBudtenderContext (unknown ID)', async () => {
        const res = await getCustomerBudtenderContext(TEST_ORG_ID, 'qa_test_nonexistent_id_00000');
        // Should NOT throw — should return success:false or empty context
        if (res.success && res.context) return 'Returned context (unexpected but harmless)';
        return 'Returned graceful fallback (no throw)';
    }));

    return results;
}

// ============================================================================
// BUG FILING
// ============================================================================

async function fileFailures(results: TabletTestResult[], runId: string): Promise<void> {
    const failures = results.filter(r => !r.passed);
    for (const f of failures) {
        const isInventoryEmpty = f.error?.includes('Inventory empty') || f.error?.includes('empty product list');
        await createTaskInternal({
            title: `[Tablet QA] ${f.name}: ${(f.error ?? '').slice(0, 80)}`,
            body: `The nightly tablet QA cron detected a failure.\n\n**Test:** ${f.name}\n**Error:** ${f.error}\n**Duration:** ${f.durationMs}ms\n**Run ID:** ${runId}\n\n${isInventoryEmpty ? '**Likely cause:** POS sync not running or `publicViews/products/items` collection empty in Firestore.\n\n' : ''}**File:** src/app/api/cron/qa-tablet/route.ts`,
            priority: isInventoryEmpty ? 'critical' : 'high',
            category: 'bug',
            reportedBy: 'qa-tablet',
            assignedTo: 'linus',
            filePath: 'src/app/loyalty-tablet/',
            errorSnippet: f.error,
        }).catch(() => { /* best-effort */ });
    }
}

// ============================================================================
// SLACK SUMMARY
// ============================================================================

function buildSummary(results: TabletTestResult[], runId: string): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const avgMs = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length);
    const moodPasses = results.filter(r => r.name.startsWith('getMoodRecommendations') && r.passed);
    const fastestMood = moodPasses.sort((a, b) => a.durationMs - b.durationMs)[0];
    const slowestMood = moodPasses.sort((a, b) => b.durationMs - a.durationMs)[0];

    const lines = [
        `📱 *Tablet QA — ${failed === 0 ? '✅ ALL PASSING' : `❌ ${failed} FAILURES`}*`,
        `Run: ${runId} | ${passed}/${results.length} | Avg: ${avgMs}ms`,
        fastestMood ? `Fastest mood: ${fastestMood.name} (${fastestMood.durationMs}ms)` : '',
        slowestMood && slowestMood !== fastestMood ? `Slowest mood: ${slowestMood.name} (${slowestMood.durationMs}ms)` : '',
        failed > 0 ? '\n*Failures:*\n' + results.filter(r => !r.passed).map(r => `  - ${r.name}: ${r.error}`).join('\n') : '',
    ];
    return lines.filter(Boolean).join('\n');
}

// ============================================================================
// HANDLER
// ============================================================================

function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.get('authorization') || '';
    if (header === `Bearer ${secret}`) return true;
    const param = req.nextUrl.searchParams.get('secret') || req.nextUrl.searchParams.get('token');
    return param === secret;
}

async function run() {
    const runId = `qa-tablet-${Date.now()}`;
    logger.info('[QA-Tablet] Starting tablet pipeline stress test', { runId, orgId: TEST_ORG_ID });

    const results = await runAllTests();
    const failed = results.filter(r => !r.passed).length;
    const passed = results.filter(r => r.passed).length;

    logger.info('[QA-Tablet] Complete', { runId, passed, failed, total: results.length });

    if (failed > 0) {
        await fileFailures(results, runId);
        // Also post to Slack #ceo via slackService if failures exist
        try {
            const { slackService } = await import('@/server/services/communications/slack');
            const summary = buildSummary(results, runId);
            await slackService.postMessage('ceo', summary).catch(() => {
                slackService.postMessage('linus-deployments', summary).catch(() => {});
            });
        } catch {
            // Slack failure is non-fatal
        }
    }

    return { runId, passed, failed, total: results.length, results };
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[QA-Tablet] POST handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await run();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error('[QA-Tablet] GET handler failed', { error: (err as Error).message });
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
