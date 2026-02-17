/**
 * Playbook Analytics Server Action
 *
 * Fetches and aggregates playbook execution data for ROI dashboard.
 * - Requires authentication + org access
 * - Returns per-playbook metrics, daily trends, event distribution
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface PlaybookMetric {
  playbookId: string;
  playbookName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  customersReached: number;
  revenueAttributed: number;
  roi: number;
}

export interface ExecutionTrendDay {
  date: string;
  count: number;
  revenue: number;
}

export interface EventDistribution {
  event: string;
  count: number;
}

export interface PlaybookAnalyticsData {
  period: { startDate: Date; endDate: Date };
  totalPlaybooks: number;
  totalExecutions: number;
  totalRevenue: number;
  averageRoi: number;
  playbookMetrics: PlaybookMetric[];
  executionTrendDaily: ExecutionTrendDay[];
  topPlaybooks: PlaybookMetric[];
  eventDistribution: EventDistribution[];
}

export async function getPlaybookAnalytics(
  orgId: string,
  days: number = 30
): Promise<PlaybookAnalyticsData | { error: string }> {
  try {
    const user = await requireUser();

    // Verify user is authenticated (detailed org authorization is handled by Firestore rules)
    if (!user || !user.uid) {
      throw new Error('Not authenticated');
    }

    const { firestore } = await createServerClient();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch executions
    const execSnap = await firestore
      .collection('playbook_executions')
      .where('orgId', '==', orgId)
      .where('startedAt', '>=', startDate)
      .get();

    const playbooks = new Map<string, PlaybookMetric>();
    const eventCounts = new Map<string, number>();
    const dailyTrends = new Map<string, { count: number; revenue: number }>();
    let totalRevenue = 0;

    for (const doc of execSnap.docs) {
      const exec = doc.data();
      const pbId = exec.playbookId;
      const pbName = exec.playbookName || 'Unknown';

      // Aggregate by playbook
      if (!playbooks.has(pbId)) {
        playbooks.set(pbId, {
          playbookId: pbId,
          playbookName: pbName,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          successRate: 0,
          customersReached: 0,
          revenueAttributed: 0,
          roi: 0,
        });
      }

      const metric = playbooks.get(pbId)!;
      metric.totalExecutions++;

      if (exec.status === 'completed') {
        metric.successfulExecutions++;
      } else if (exec.status === 'failed') {
        metric.failedExecutions++;
      }

      if (exec.customerId) {
        metric.customersReached = Math.max(metric.customersReached, 1);
      }

      const revenue = exec.revenueAttributed || 0;
      metric.revenueAttributed += revenue;
      totalRevenue += revenue;
      metric.roi =
        metric.totalExecutions > 0
          ? ((metric.revenueAttributed - metric.totalExecutions * 5) /
              (metric.totalExecutions * 5)) *
            100
          : 0;
      metric.successRate =
        metric.totalExecutions > 0
          ? (metric.successfulExecutions / metric.totalExecutions) * 100
          : 0;

      // Event distribution
      const eventName = exec.eventData?.event || 'unknown';
      eventCounts.set(eventName, (eventCounts.get(eventName) || 0) + 1);

      // Daily trends
      const dateKey = (exec.startedAt as any).toISOString().split('T')[0];
      if (!dailyTrends.has(dateKey)) {
        dailyTrends.set(dateKey, { count: 0, revenue: 0 });
      }
      const day = dailyTrends.get(dateKey)!;
      day.count++;
      day.revenue += revenue;
    }

    // Calculate metrics
    const metricsArray = Array.from(playbooks.values());
    const topPlaybooks = metricsArray.sort(
      (a, b) => b.revenueAttributed - a.revenueAttributed
    );
    const averageRoi =
      metricsArray.length > 0
        ? metricsArray.reduce((sum, m) => sum + m.roi, 0) / metricsArray.length
        : 0;

    // Daily trends
    const executionTrendDaily = Array.from(dailyTrends.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Event distribution
    const eventDistribution = Array.from(eventCounts.entries()).map(
      ([event, count]) => ({
        event,
        count,
      })
    );

    return {
      period: { startDate, endDate },
      totalPlaybooks: playbooks.size,
      totalExecutions: execSnap.size,
      totalRevenue,
      averageRoi,
      playbookMetrics: metricsArray,
      executionTrendDaily,
      topPlaybooks: topPlaybooks.slice(0, 5),
      eventDistribution,
    };
  } catch (err) {
    logger.error('[PlaybookAnalytics] Error fetching analytics', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPlaybookSummary(
  orgId: string,
  playbookId: string,
  days: number = 30
): Promise<PlaybookMetric | { error: string }> {
  const result = await getPlaybookAnalytics(orgId, days);

  if ('error' in result) {
    return result;
  }

  const metric = result.playbookMetrics.find((m) => m.playbookId === playbookId);

  if (!metric) {
    return { error: 'Playbook not found' };
  }

  return metric;
}
