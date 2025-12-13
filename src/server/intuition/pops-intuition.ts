/**
 * Intuition OS - Pops Intuition (Business Intelligence)
 * 
 * Focus: Metrics, Anomalies, Forecasting
 * 
 * Pops monitors the "heartbeat" of the business.
 * He logs daily stats and generates insights when patterns break.
 */

import {
    PopsInsight,
    DailyMetrics,
    InsightCategory,
    InsightSeverity,
    AgentEventType
} from './schema';
import { logAgentEvent } from './agent-events';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// --- Collection Paths ---

function getMetricsCollection(tenantId: string) {
    return `tenants/${tenantId}/dailyMetrics`;
}

function getInsightsCollection(tenantId: string) {
    return `tenants/${tenantId}/popsInsights`;
}

// --- Metrics Logging ---

/**
 * Logs a daily metric snapshot.
 * Ideally called via Cron/Scheduler at end of day or periodically.
 */
export async function logMetricSnapshot(
    tenantId: string,
    metrics: Omit<DailyMetrics, 'id' | 'createdAt'>,
    dateKey?: string // e.g. "20231027", defaults to today
): Promise<string> {
    const { firestore } = await createServerClient();
    const now = new Date();

    // Default YYYYMMDD
    const id = dateKey || now.toISOString().split('T')[0].replace(/-/g, '');

    const snapshot: DailyMetrics = {
        ...metrics,
        id,
        createdAt: now.toISOString(),
    };

    try {
        await firestore
            .collection(getMetricsCollection(tenantId))
            .doc(id)
            .set(snapshot, { merge: true });

        // Log to Event Stream (Loop 1)
        await logAgentEvent({
            id: uuidv4(),
            tenantId,
            agent: 'pops',
            sessionId: 'system_cron',
            type: 'metric_snapshot',
            payload: { date: id, totals: metrics.totalSales },
            systemMode: 'slow',
            createdAt: now.toISOString(),
        });

        logger.info(`[Pops] Logged metrics for ${id}`);
        return id;
    } catch (error) {
        logger.error(`[Pops] Failed to log metrics: ${error}`);
        throw error;
    }
}

/**
 * Retrieves metrics for a specific date range.
 */
export async function getMetricsRange(
    tenantId: string,
    startDate: string, // YYYYMMDD
    endDate: string
): Promise<DailyMetrics[]> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection(getMetricsCollection(tenantId))
            .where('id', '>=', startDate)
            .where('id', '<=', endDate)
            .orderBy('id', 'asc')
            .get();

        return snapshot.docs.map(doc => doc.data() as DailyMetrics);
    } catch (error) {
        logger.error(`[Pops] Failed to get metrics range: ${error}`);
        return [];
    }
}

// --- Insight Generation ---

/**
 * Creates and logs a new business insight.
 */
export async function saveInsight(
    tenantId: string,
    insight: Omit<PopsInsight, 'id' | 'tenantId' | 'createdAt' | 'acknowledged'>
): Promise<string> {
    const { firestore } = await createServerClient();
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullInsight: PopsInsight = {
        ...insight,
        id,
        tenantId,
        acknowledged: false,
        createdAt: now,
    };

    try {
        await firestore
            .collection(getInsightsCollection(tenantId))
            .doc(id)
            .set(fullInsight);

        // Emit Event (Loop 1) is NOT standard for Insights unless it triggers an alert,
        // but we can log 'insight_generated' if we add that type, or generic 'task_completed'.
        // For now, we rely on the collection write.

        // If high severity, maybe we trigger an alert event?
        if (insight.severity === 'high') {
            await logAgentEvent({
                id: uuidv4(),
                tenantId,
                agent: 'pops',
                sessionId: 'system_cron',
                type: 'alert_issued',
                payload: {
                    alertType: 'insight_high_severity',
                    title: insight.title,
                    description: insight.description
                },
                systemMode: 'slow',
                confidenceScore: 1.0,
                createdAt: now,
            });
        }

        logger.info(`[Pops] Generated insight: ${insight.title}`);
        return id;
    } catch (error) {
        logger.error(`[Pops] Failed to save insight: ${error}`);
        throw error;
    }
}

/**
 * Simple anomaly detection stub.
 * In production, this would use statistical methods (Z-score, IQR).
 */
export async function detectAnomalies(
    tenantId: string,
    currentMetrics: DailyMetrics
): Promise<void> {
    // 1. Get last 7 days
    // 2. Calculate average
    // 3. If current > avg * 1.5 -> Insight

    // Stub implementation
    const history = await getMetricsRange(
        tenantId,
        (Number(currentMetrics.id) - 7).toString(), // Very naive date math, fine for stub
        currentMetrics.id
    );

    if (history.length < 3) return;

    const avgSales = history.reduce((sum, m) => sum + m.totalSales, 0) / history.length;

    if (currentMetrics.totalSales > avgSales * 1.5) {
        await saveInsight(tenantId, {
            category: 'anomaly',
            severity: 'medium',
            title: 'Sales Spike Detected',
            description: `Sales are 50% higher than the 7-day average ($${currentMetrics.totalSales} vs $${avgSales.toFixed(2)}).`,
            possibleCauses: ['Promotion success', 'Holiday effect', 'Whale purchase'],
            suggestedActions: ['Check inventory levels', 'Send thank you emails'],
            linkedMetrics: ['totalSales'],
        });
    }
}
