/**
 * Skill Metrics Rollup Cron
 *
 * Daily cron that aggregates skill outcome events into SkillAggregateMetrics
 * records and auto-expires pending approvals past TTL.
 *
 * Endpoint: POST /api/cron/skill-metrics-rollup
 * Auth: CRON_SECRET via Authorization header
 * Frequency: Daily at 3 AM UTC (configure in Cloud Scheduler)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { rollupSkillMetrics } from '@/server/services/skill-outcome-tracker';
import { autoExpireSkillApprovals } from '@/server/services/skill-policy-gate';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(req, 'skill-metrics-rollup');
    if (authError) return authError;

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        logger.info('[skill-metrics-rollup] starting', { date: dateStr });

        const [metrics, expiredCount] = await Promise.all([
            rollupSkillMetrics(dateStr),
            autoExpireSkillApprovals(),
        ]);

        logger.info('[skill-metrics-rollup] complete', {
            date: dateStr,
            skillsRolledUp: metrics.length,
            approvalsExpired: expiredCount,
        });

        return NextResponse.json({
            success: true,
            date: dateStr,
            skillsRolledUp: metrics.length,
            approvalsExpired: expiredCount,
            metrics: metrics.map(m => ({
                skillName: m.skillName,
                sampleCount: m.sampleCount,
                approvalCount: m.approvalCount,
                rejectionCount: m.rejectionCount,
                editRate: m.editRate,
            })),
        });
    } catch (err) {
        logger.error('[skill-metrics-rollup] failed', { err });
        return NextResponse.json({ success: false, error: 'Rollup failed' }, { status: 500 });
    }
}

// Cloud Scheduler sends POST — delegate to GET handler
export async function POST(req: NextRequest): Promise<NextResponse> {
    return GET(req);
}
