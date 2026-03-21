import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { PricingAlert } from '@/server/services/pricing-alerts';
import type { InboxArtifactProactiveMetadata } from '@/types/inbox';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';
import type {
    ProactiveSeverity,
    ProactiveTaskRecord,
    ProactiveTaskStatus,
} from '@/types/proactive';
import {
    attachProactiveTaskEvidence,
    createOrReuseProactiveTask,
    linkTaskToInbox,
    transitionProactiveTask,
} from '@/server/services/proactive-task-service';
import { appendProactiveEvent } from '@/server/services/proactive-event-log';
import { upsertCommitment } from '@/server/services/proactive-commitment-service';
import { recordProactiveOutcome } from '@/server/services/proactive-outcome-service';

export interface CompetitorPricingWatchSummary {
    success: boolean;
    orgId: string;
    alertCount: number;
    taskId?: string;
    threadId?: string;
    artifactId?: string;
    error?: string;
}

function getHourBucket(now: Date): string {
    return now.toISOString().slice(0, 13);
}

function getSeverity(alerts: PricingAlert[]): ProactiveSeverity {
    const maxGap = alerts.reduce((max, alert) => Math.max(max, Math.abs(alert.priceGapPercent)), 0);
    const hasCompetitiveDrop = alerts.some((alert) => alert.alertType === 'price_decrease');

    if (maxGap >= 30 || (hasCompetitiveDrop && alerts.length >= 3)) {
        return 'critical';
    }
    if (maxGap >= 20 || alerts.length >= 3) {
        return 'high';
    }
    if (maxGap >= 10 || alerts.length >= 2) {
        return 'medium';
    }
    return 'low';
}

function getRecommendation(alert: PricingAlert): string {
    if (alert.alertType === 'price_decrease' && alert.priceGapPercent > 0) {
        return 'Competitors moved down while we remain above market. Review a temporary price match or stronger value messaging.';
    }

    if (alert.alertType === 'price_increase' && alert.priceGapPercent < 0) {
        return 'Market prices moved up while we are still below average. Review whether a small increase is available without hurting conversion.';
    }

    if (alert.alertType === 'price_gap') {
        return alert.priceGapPercent > 0
            ? 'We are priced above the market average. Review ceiling, promo coverage, and menu positioning before traffic softens.'
            : 'We are priced below market. Protect margin first and confirm the discount is still necessary.';
    }

    return 'Review the competitor movement and decide whether to hold, match, or message the change.';
}

function buildEvidence(alerts: PricingAlert[]): Array<{ label: string; value: string }> {
    const topGap = alerts.reduce((max, alert) => Math.max(max, Math.abs(alert.priceGapPercent)), 0);
    return [
        { label: 'Alerts detected', value: String(alerts.length) },
        { label: 'Largest price gap', value: `${topGap.toFixed(1)}%` },
        { label: 'Primary trigger', value: alerts[0]?.alertType.replace(/_/g, ' ') ?? 'market shift' },
    ];
}

function buildArtifactData(alerts: PricingAlert[], emailsSent: number): Record<string, unknown> {
    return {
        title: `Competitor pricing watch: ${alerts.length} alert${alerts.length === 1 ? '' : 's'}`,
        generatedAt: new Date().toISOString(),
        summary: alerts.length === 1
            ? '1 pricing alert needs review.'
            : `${alerts.length} pricing alerts need review.`,
        emailsSent,
        alerts: alerts.slice(0, 10).map((alert) => ({
            productId: alert.productId,
            productName: alert.productName,
            alertType: alert.alertType,
            oldPrice: alert.oldPrice ?? null,
            newPrice: alert.newPrice ?? null,
            marketAvg: alert.marketAvg,
            ourPrice: alert.ourPrice,
            priceGapPercent: Number(alert.priceGapPercent.toFixed(1)),
            competitorCount: alert.competitorCount,
            recommendation: getRecommendation(alert),
            triggeredAt: alert.triggeredAt.toISOString(),
        })),
    };
}

async function safelyTransitionTask(
    task: ProactiveTaskRecord,
    nextStatus: ProactiveTaskStatus,
    reason: string
): Promise<ProactiveTaskRecord> {
    try {
        return await transitionProactiveTask(task.id, nextStatus, reason);
    } catch (error) {
        logger.warn('[CompetitorPricingWatch] Proactive task transition skipped', {
            taskId: task.id,
            nextStatus,
            reason,
            error: error instanceof Error ? error.message : String(error),
        });
        return task;
    }
}

async function ensurePricingThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();

    if (existingThreadId) {
        const existingThread = await db.collection('inbox_threads').doc(existingThreadId).get();
        if (existingThread.exists) {
            return existingThreadId;
        }
    }

    const orgThreads = await db
        .collection('inbox_threads')
        .where('orgId', '==', orgId)
        .limit(50)
        .get();

    const existing = orgThreads.docs.find(
        (doc) => doc.data()?.metadata?.proactiveWorkflowKey === 'competitor_pricing_watch'
    );
    if (existing) {
        return existing.id;
    }

    const threadId = createInboxThreadId();
    await db.collection('inbox_threads').doc(threadId).set({
        id: threadId,
        orgId,
        userId: 'system',
        type: 'market_intel',
        status: 'active',
        title: 'Competitor Pricing Watch',
        preview: 'Ezal and Money Mike are monitoring market moves',
        primaryAgent: 'ezal',
        assignedAgents: ['ezal', 'money_mike'],
        artifactIds: [],
        messages: [],
        metadata: {
            proactiveWorkflowKey: 'competitor_pricing_watch',
            isProactiveThread: true,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    });

    return threadId;
}

async function upsertPricingArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    alerts: PricingAlert[];
    severity: ProactiveSeverity;
    emailsSent: number;
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, alerts, severity, emailsSent, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();
    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'competitor_pricing_watch',
        severity,
        evidence: buildEvidence(alerts),
        nextActionLabel: 'Review pricing watch',
    };

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'market_analysis',
        status: 'approved',
        data: buildArtifactData(alerts, emailsSent),
        rationale: 'Proactive competitor and pricing watch triggered by live market shifts.',
        proactive,
        createdBy: 'system',
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (existingArtifactId) {
        await db.collection('inbox_artifacts').doc(artifactId).update(payload);
    } else {
        await db.collection('inbox_artifacts').doc(artifactId).set({
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
        });
    }

    await db.collection('inbox_threads').doc(threadId).set({
        artifactIds: FieldValue.arrayUnion(artifactId),
        status: 'active',
        preview: `${alerts.length} competitor pricing alert${alerts.length === 1 ? '' : 's'} detected`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

export async function syncCompetitorPricingWatch(input: {
    orgId: string;
    alerts: PricingAlert[];
    emailsSent: number;
}): Promise<CompetitorPricingWatchSummary> {
    const { orgId, alerts, emailsSent } = input;

    try {
        if (alerts.length === 0) {
            return {
                success: true,
                orgId,
                alertCount: 0,
            };
        }

        const now = new Date();
        const hourBucket = getHourBucket(now);
        const severity = getSeverity(alerts);
        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'competitor_pricing_watch',
            agentKey: 'money_mike',
            title: `Competitor pricing watch ${hourBucket}:00`,
            summary: `${alerts.length} pricing alert${alerts.length === 1 ? '' : 's'} detected across monitored products.`,
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `competitor_pricing:${orgId}:${hourBucket}`,
            dueAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task, 'triaged', 'alerts_detected');
        task = await safelyTransitionTask(task, 'investigating', 'recommendations_ready');

        const threadId = await ensurePricingThread(orgId, task.threadId);
        const artifactId = await upsertPricingArtifact({
            orgId,
            threadId,
            taskId: task.id,
            alerts,
            severity,
            emailsSent,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'pricing_alerts',
            refId: artifactId,
            payload: {
                emailsSent,
                alerts: alerts.map((alert) => ({
                    id: alert.id,
                    productId: alert.productId,
                    productName: alert.productName,
                    alertType: alert.alertType,
                    oldPrice: alert.oldPrice ?? null,
                    newPrice: alert.newPrice ?? null,
                    marketAvg: alert.marketAvg,
                    ourPrice: alert.ourPrice,
                    priceGapPercent: alert.priceGapPercent,
                })),
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'competitor_pricing.alerts_detected',
            businessObjectType: task.businessObjectType,
            businessObjectId: task.businessObjectId,
            payload: {
                artifactId,
                threadId,
                alertCount: alerts.length,
                emailsSent,
            },
        });

        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: `Review competitor pricing watch ${hourBucket}:00`,
            dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
            payload: {
                artifactId,
                threadId,
                alertCount: alerts.length,
                emailsSent,
            },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'competitor_pricing_watch',
            outcomeType: 'executed',
            payload: {
                artifactId,
                threadId,
                alertCount: alerts.length,
                emailsSent,
            },
        });

        logger.info('[CompetitorPricingWatch] Synced proactive runtime state', {
            orgId,
            taskId: task.id,
            threadId,
            artifactId,
            alertCount: alerts.length,
            emailsSent,
        });

        return {
            success: true,
            orgId,
            alertCount: alerts.length,
            taskId: task.id,
            threadId,
            artifactId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[CompetitorPricingWatch] Failed to sync proactive state', {
            orgId,
            error: message,
        });
        return {
            success: false,
            orgId,
            alertCount: alerts.length,
            error: message,
        };
    }
}
