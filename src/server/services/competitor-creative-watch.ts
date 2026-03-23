import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InboxArtifactProactiveMetadata } from '@/types/inbox';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';
import type {
    ProactiveSeverity,
    ProactiveTaskRecord,
} from '@/types/proactive';
import {
    attachProactiveTaskEvidence,
    createOrReuseProactiveTask,
    linkTaskToInbox,
} from '@/server/services/proactive-task-service';
import { appendProactiveEvent } from '@/server/services/proactive-event-log';
import { upsertCommitment } from '@/server/services/proactive-commitment-service';
import { recordProactiveOutcome } from '@/server/services/proactive-outcome-service';
import { isProactiveWorkflowEnabled } from '@/server/services/proactive-settings';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreativeAlert {
    id: string;
    competitorId: string;
    competitorName: string;
    type: string;
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
}

export interface CompetitorCreativeWatchSummary {
    success: boolean;
    orgId: string;
    alertCount: number;
    skipped?: boolean;
    reason?: string;
    taskId?: string;
    threadId?: string;
    artifactId?: string;
    error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekBucket(now: Date): string {
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() - day + 1);
    return utc.toISOString().slice(0, 10);
}

function getSeverity(alerts: CreativeAlert[]): ProactiveSeverity {
    const hasNewLaunch = alerts.some((a) => a.type === 'new_product_launch');
    const hasStrategyChange = alerts.some((a) => a.type === 'pricing_strategy_change');

    if (alerts.length >= 5 || (hasNewLaunch && hasStrategyChange)) return 'high';
    if (alerts.length >= 3 || hasNewLaunch || hasStrategyChange) return 'medium';
    return 'low';
}

function buildBulletPoints(alerts: CreativeAlert[]): string[] {
    return alerts.slice(0, 8).map((a) => {
        const label = a.type.replace(/_/g, ' ');
        return `${a.competitorName}: ${label} — ${a.title.replace(/^[^\w]+/, '')}`;
    });
}

function buildRecommendations(alerts: CreativeAlert[]): string[] {
    const recs: string[] = [];
    const hasNewLaunch = alerts.some((a) => a.type === 'new_product_launch');
    const hasMajorDrop = alerts.some((a) => a.type === 'price_drop_major');
    const hasStrategyChange = alerts.some((a) => a.type === 'pricing_strategy_change');

    if (hasNewLaunch) {
        recs.push('Review new competitor product launches and assess if counter-launches or positioning updates are needed.');
    }
    if (hasMajorDrop) {
        recs.push('Competitors are running deep discounts — consider a temporary counter-promotion or value messaging campaign.');
    }
    if (hasStrategyChange) {
        recs.push('A competitor shifted pricing strategy. Review your own strategy alignment before next pricing cycle.');
    }
    if (recs.length === 0) {
        recs.push('Monitor competitor activity and brief Craig on any messaging adjustments for the week.');
    }
    return recs;
}

async function safelyTransitionTask(
    taskId: string,
    toStatus: ProactiveTaskRecord['status'],
    event: string,
): Promise<ProactiveTaskRecord> {
    const { getProactiveTask, transitionProactiveTask } = await import('@/server/services/proactive-task-service');
    const current = await getProactiveTask(taskId);
    if (!current) throw new Error(`Task ${taskId} not found`);
    try {
        return await transitionProactiveTask(taskId, toStatus);
    } catch {
        logger.warn('[CompetitorCreativeWatch] Skipping invalid transition', { taskId, toStatus, event });
        return current;
    }
}

async function loadRecentCreativeAlerts(orgId: string, sinceHours = 168): Promise<CreativeAlert[]> {
    const db = getAdminFirestore();
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

    const snap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('competitor_alerts')
        .where('type', 'in', ['new_product_launch', 'pricing_strategy_change', 'price_drop_major'])
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    return snap.docs
        .map((doc) => {
            const d = doc.data();
            const createdAt = d.createdAt instanceof Date
                ? d.createdAt
                : (d.createdAt?.toDate?.() ?? new Date(0));
            return { id: doc.id, ...d, createdAt } as CreativeAlert;
        })
        .filter((a) => a.createdAt >= since);
}

async function ensureCreativeWatchThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();
    const threadId = existingThreadId ?? createInboxThreadId();

    if (!existingThreadId) {
        await db.collection('inbox_threads').doc(threadId).set({
            id: threadId,
            orgId,
            type: 'market_intel',
            title: 'Competitor Creative Watch',
            primaryAgent: 'ezal',
            status: 'active',
            preview: 'Competitor product and positioning activity detected this week',
            tags: ['competitor', 'proactive', 'creative'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    return threadId;
}

async function upsertCreativeArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    severity: ProactiveSeverity;
    alerts: CreativeAlert[];
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, severity, alerts, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();

    const competitorNames = [...new Set(alerts.map((a) => a.competitorName))];
    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'competitor_creative_watch',
        severity,
        evidence: [
            { label: 'Alerts this week', value: String(alerts.length) },
            { label: 'Competitors active', value: String(competitorNames.length) },
            { label: 'Alert types', value: [...new Set(alerts.map((a) => a.type.replace(/_/g, ' ')))].slice(0, 3).join(', ') },
        ],
        requiresApproval: false,
        nextActionLabel: 'Brief Craig',
    };

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'market_analysis',
        status: 'draft',
        data: {
            title: `Competitor Activity — Week of ${getWeekBucket(new Date())}`,
            summary: `${alerts.length} competitor signal${alerts.length === 1 ? '' : 's'} detected across ${competitorNames.length} competitor${competitorNames.length === 1 ? '' : 's'}.`,
            competitors: competitorNames,
            bulletPoints: buildBulletPoints(alerts),
            recommendations: buildRecommendations(alerts),
            alertCount: alerts.length,
            alertTypes: [...new Set(alerts.map((a) => a.type))],
        },
        rationale: 'Proactive competitor creative watch — weekly scan of product launches, pricing shifts, and strategy changes.',
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
        preview: `${alerts.length} competitor signal${alerts.length === 1 ? '' : 's'} detected this week`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runCompetitorCreativeWatch(orgId: string): Promise<CompetitorCreativeWatchSummary> {
    try {
        const enabled = await isProactiveWorkflowEnabled(orgId, 'competitor_creative_watch');
        if (!enabled) {
            return { success: true, orgId, alertCount: 0, skipped: true, reason: 'workflow_disabled' };
        }

        const alerts = await loadRecentCreativeAlerts(orgId);
        if (alerts.length === 0) {
            logger.info('[CompetitorCreativeWatch] No new creative alerts this week', { orgId });
            return { success: true, orgId, alertCount: 0, skipped: true, reason: 'no_signals' };
        }

        const now = new Date();
        const weekBucket = getWeekBucket(now);
        const severity = getSeverity(alerts);

        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'competitor_creative_watch',
            agentKey: 'ezal',
            title: `Competitor creative activity — week of ${weekBucket}`,
            summary: `${alerts.length} competitor signal${alerts.length === 1 ? '' : 's'} detected this week.`,
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `competitor_creative:${orgId}:${weekBucket}`,
            dueAt: new Date(now.getTime() + 3 * 86_400_000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task.id, 'triaged', 'signals_identified');
        task = await safelyTransitionTask(task.id, 'investigating', 'analysis_started');
        task = await safelyTransitionTask(task.id, 'draft_ready', 'analysis_complete');

        const threadId = await ensureCreativeWatchThread(orgId, task.threadId);
        const artifactId = await upsertCreativeArtifact({
            orgId,
            threadId,
            taskId: task.id,
            severity,
            alerts,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'competitor_alerts',
            refId: artifactId,
            payload: {
                weekBucket,
                alertCount: alerts.length,
                alertTypes: [...new Set(alerts.map((a) => a.type))],
                competitors: [...new Set(alerts.map((a) => a.competitorName))],
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'competitor_creative_watch.draft_ready',
            businessObjectType: 'organization',
            businessObjectId: orgId,
            payload: { weekBucket, alertCount: alerts.length },
        });

        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: 'Review competitor activity and brief Craig if messaging update needed',
            dueAt: new Date(now.getTime() + 3 * 86_400_000),
            payload: { workflowKey: 'competitor_creative_watch', alertCount: alerts.length },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'competitor_creative_watch',
            outcomeType: 'opened',
            payload: { weekBucket, alertCount: alerts.length, artifactId },
        });

        logger.info('[CompetitorCreativeWatch] Draft ready', {
            orgId,
            taskId: task.id,
            alertCount: alerts.length,
            severity,
        });

        return {
            success: true,
            orgId,
            alertCount: alerts.length,
            taskId: task.id,
            threadId,
            artifactId,
        };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[CompetitorCreativeWatch] Failed', { orgId, error });
        return { success: false, orgId, alertCount: 0, error };
    }
}
