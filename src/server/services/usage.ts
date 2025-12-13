import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

export type UsageMetric =
    | 'chat_sessions'
    | 'agent_calls'
    | 'deebo_checks'
    | 'menu_pageviews'
    | 'menu_sync_jobs'
    | 'tracked_events'
    | 'messages_sent';

export interface DailyUsageStats {
    orgId: string;
    date: string; // YYYY-MM-DD
    metrics: Record<UsageMetric, number>;
    lastUpdated: Date;
}

export class UsageService {

    /**
     * Increment a usage metric for a specific organization for today
     */
    static async increment(orgId: string, metric: UsageMetric, count: number = 1): Promise<void> {
        if (!orgId) {
            logger.warn(`[UsageService] Attempted to increment ${metric} without orgId`);
            return;
        }

        try {
            const { firestore } = await createServerClient();
            const date = new Date().toISOString().split('T')[0];
            const docId = `${orgId}_${date}`;
            const ref = firestore.collection('usage_stats').doc(docId);

            await ref.set({
                orgId,
                date,
                metrics: {
                    [metric]: FieldValue.increment(count)
                },
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });

            logger.debug(`[UsageService] Incremented ${metric} by ${count} for ${orgId}`);
        } catch (error) {
            logger.error(`[UsageService] Failed to increment ${metric}`, { error, orgId });
            // Don't throw, usage tracking shouldn't block main flow
        }
    }

    /**
     * Get usage for a specific date range
     */
    static async getUsage(orgId: string, startDate: Date, endDate: Date): Promise<Record<UsageMetric, number>> {
        try {
            const { firestore } = await createServerClient();
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const snapshot = await firestore.collection('usage_stats')
                .where('orgId', '==', orgId)
                .where('date', '>=', startStr)
                .where('date', '<=', endStr)
                .get();

            const totals: Record<UsageMetric, number> = {
                chat_sessions: 0,
                agent_calls: 0,
                deebo_checks: 0,
                menu_pageviews: 0,
                menu_sync_jobs: 0,
                tracked_events: 0,
                messages_sent: 0
            };

            snapshot.forEach(doc => {
                const data = doc.data() as DailyUsageStats;
                if (data.metrics) {
                    Object.entries(data.metrics).forEach(([key, value]) => {
                        if (key in totals) {
                            totals[key as UsageMetric] += (value as number);
                        }
                    });
                }
            });

            return totals;
        } catch (error) {
            logger.error('[UsageService] Failed to get usage', { error, orgId });
            throw error;
        }
    }

    /**
     * Get aggregated usage for all organizations (Super User)
     */
    static async getAggregateUsage(startDate: Date, endDate: Date): Promise<{
        total: Record<UsageMetric, number>;
        byOrg: Record<string, Record<UsageMetric, number>>;
    }> {
        try {
            const { firestore } = await createServerClient();
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const snapshot = await firestore.collection('usage_stats')
                .where('date', '>=', startStr)
                .where('date', '<=', endStr)
                .get();

            const result = {
                total: {
                    chat_sessions: 0,
                    agent_calls: 0,
                    deebo_checks: 0,
                    menu_pageviews: 0,
                    menu_sync_jobs: 0,
                    tracked_events: 0,
                    messages_sent: 0
                } as Record<UsageMetric, number>,
                byOrg: {} as Record<string, Record<UsageMetric, number>>
            };

            snapshot.forEach(doc => {
                const data = doc.data() as DailyUsageStats;
                const orgId = data.orgId;

                if (!result.byOrg[orgId]) {
                    result.byOrg[orgId] = { ...result.total }; // Initialize with zeros
                }

                if (data.metrics) {
                    Object.entries(data.metrics).forEach(([key, value]) => {
                        const metric = key as UsageMetric;
                        if (value) {
                            result.total[metric] = (result.total[metric] || 0) + (value as number);
                            result.byOrg[orgId][metric] = (result.byOrg[orgId][metric] || 0) + (value as number);
                        }
                    });
                }
            });

            return result;
        } catch (error) {
            logger.error('[UsageService] Failed to get aggregates', { error });
            throw error;
        }
    }
}
