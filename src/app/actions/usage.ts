'use server';

import { UsageService, UsageMetric } from '@/server/services/usage';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';

export async function trackUsageAction(orgId: string, metric: UsageMetric, count: number = 1) {
    if (!orgId) return;

    try {
        await UsageService.increment(orgId, metric, count);
    } catch (error) {
        logger.error('Failed to track usage action', { error, orgId, metric });
        // Fail silently to client
    }
}

export async function getUsageStatsAction(timeframe: 'today' | 'month' = 'month') {
    try {
        await requireUser(['super_user']);
        const endDate = new Date();
        const startDate = new Date();

        if (timeframe === 'month') {
            startDate.setDate(1); // Start of month
        }
        // else 'today' is just today

        return await UsageService.getAggregateUsage(startDate, endDate);
    } catch (error) {
        logger.error('Failed to get usage stats', { error });
        throw new Error('Failed to fetch usage stats');
    }
}
