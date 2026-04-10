import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { QAGoldenSetEvalResult } from '@/types/qa';

export interface QAGoldenEvalRun extends QAGoldenSetEvalResult {
    createdAt: string;
    source: 'cron' | 'tool' | 'manual';
    orgId?: string | null;
}

// Golden eval output prefixes rows with an icon token, then the test id, then
// the failure summary. We key off the test id + trailing summary instead of the
// icon so the parser stays resilient to emoji or encoding differences.
const FAILURE_LINE_RE = /^\s*\S+\s+([A-Z0-9]+-\d+)(?:\s+\(\d+%\))?\s+(.+)$/;

export function extractQAGoldenEvalFailures(stdout: string): {
    failingTestIds: string[];
    failureSummaries: string[];
} {
    const failingTestIds: string[] = [];
    const failureSummaries: string[] = [];

    for (const rawLine of String(stdout || '').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;

        const match = line.match(FAILURE_LINE_RE);
        if (!match) continue;

        const testId = match[1]?.trim();
        const summary = match[2]?.trim() || 'Benchmark case failed';

        if (testId && failingTestIds.length < 10) {
            failingTestIds.push(testId);
        }
        if (failureSummaries.length < 10) {
            failureSummaries.push(testId ? `${testId}: ${summary}` : summary);
        }
    }

    return { failingTestIds, failureSummaries };
}

export async function recordQAGoldenEvalRun(
    result: QAGoldenSetEvalResult,
    options?: { source?: QAGoldenEvalRun['source']; orgId?: string | null }
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const createdAt = new Date().toISOString();
        const docRef = await db.collection('qa_golden_eval_runs').add({
            ...result,
            createdAt,
            source: options?.source || 'cron',
            orgId: options?.orgId || null,
            _agent: result.agent,
            _date: createdAt.split('T')[0],
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn('[QAGoldenEvalRuns] Failed to record golden eval run', {
            agent: result.agent,
            tier: result.tier,
            error: message,
        });
        return { success: false, error: message };
    }
}
