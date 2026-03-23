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

interface NarrativeSignal {
    trends: string[];
    recommendations: string[];
    competitorCount: number;
    topDeals: Array<{ competitorName: string; dealName: string; price: number }>;
    weekStart: string;
    weekEnd: string;
}

export interface MarketNarrativeWatchSummary {
    success: boolean;
    orgId: string;
    trendCount: number;
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

function getSeverity(signal: NarrativeSignal): ProactiveSeverity {
    if (signal.trends.length >= 4 || signal.recommendations.length >= 3) return 'medium';
    if (signal.trends.length >= 2) return 'low';
    return 'low';
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
        logger.warn('[MarketNarrativeWatch] Skipping invalid transition', { taskId, toStatus, event });
        return current;
    }
}

async function loadLatestWeeklyReport(orgId: string): Promise<NarrativeSignal | null> {
    const db = getAdminFirestore();

    // Check for a persisted weekly report first
    const snap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('weekly_reports')
        .orderBy('generatedAt', 'desc')
        .limit(1)
        .get();

    if (!snap.empty) {
        const doc = snap.docs[0].data();
        const generatedAt = doc.generatedAt?.toDate?.() ?? new Date(0);
        const ageHours = (Date.now() - generatedAt.getTime()) / 3_600_000;

        // Use the cached report if it's less than 8 days old
        if (ageHours < 192 && doc.insights) {
            return {
                trends: Array.isArray(doc.insights.marketTrends) ? doc.insights.marketTrends : [],
                recommendations: Array.isArray(doc.insights.recommendations) ? doc.insights.recommendations : [],
                competitorCount: Array.isArray(doc.competitors) ? doc.competitors.length : 0,
                topDeals: Array.isArray(doc.insights.topDeals) ? doc.insights.topDeals.slice(0, 5) : [],
                weekStart: doc.weekStart?.toDate?.()?.toISOString().slice(0, 10) ?? '',
                weekEnd: doc.weekEnd?.toDate?.()?.toISOString().slice(0, 10) ?? '',
            };
        }
    }

    // Fall back: query competitor count from the competitors subcollection
    const competitorsSnap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('competitors')
        .where('active', '==', true)
        .limit(20)
        .get();

    if (competitorsSnap.empty) {
        return null;
    }

    // No fresh report but we have competitors — return a minimal signal so the
    // workflow can prompt the operator to generate a fresh report
    return {
        trends: ['Market intelligence data is available but a fresh weekly report has not been generated yet.'],
        recommendations: ['Generate a weekly competitive intel report to get market trends and pricing insights.'],
        competitorCount: competitorsSnap.size,
        topDeals: [],
        weekStart: '',
        weekEnd: '',
    };
}

async function ensureNarrativeThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();
    const threadId = existingThreadId ?? createInboxThreadId();

    if (!existingThreadId) {
        await db.collection('inbox_threads').doc(threadId).set({
            id: threadId,
            orgId,
            type: 'market_intel',
            title: 'Market Narrative Watch',
            primaryAgent: 'ezal',
            status: 'active',
            preview: 'Weekly market trends and competitive intelligence summary',
            tags: ['market', 'proactive', 'narrative'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    return threadId;
}

async function upsertNarrativeArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    severity: ProactiveSeverity;
    signal: NarrativeSignal;
    weekBucket: string;
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, severity, signal, weekBucket, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();

    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'market_narrative_watch',
        severity,
        evidence: [
            { label: 'Market trends', value: String(signal.trends.length) },
            { label: 'Competitors tracked', value: String(signal.competitorCount) },
            { label: 'Recommendations', value: String(signal.recommendations.length) },
        ],
        requiresApproval: false,
        nextActionLabel: 'Review trends',
    };

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'market_analysis',
        status: 'draft',
        data: {
            title: `Market Narrative — Week of ${weekBucket}`,
            summary: `${signal.trends.length} market trend${signal.trends.length === 1 ? '' : 's'} identified across ${signal.competitorCount} competitor${signal.competitorCount === 1 ? '' : 's'}.`,
            trends: signal.trends,
            recommendations: signal.recommendations,
            topDeals: signal.topDeals,
            competitorCount: signal.competitorCount,
            weekStart: signal.weekStart,
            weekEnd: signal.weekEnd,
        },
        rationale: 'Proactive market narrative watch — weekly aggregation of competitive trends and strategic recommendations.',
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
        preview: `${signal.trends.length} market trend${signal.trends.length === 1 ? '' : 's'} identified this week`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMarketNarrativeWatch(orgId: string): Promise<MarketNarrativeWatchSummary> {
    try {
        const enabled = await isProactiveWorkflowEnabled(orgId, 'market_narrative_watch');
        if (!enabled) {
            return { success: true, orgId, trendCount: 0, skipped: true, reason: 'workflow_disabled' };
        }

        const signal = await loadLatestWeeklyReport(orgId);
        if (!signal || signal.trends.length === 0) {
            logger.info('[MarketNarrativeWatch] No market intel data available', { orgId });
            return { success: true, orgId, trendCount: 0, skipped: true, reason: 'no_data' };
        }

        const now = new Date();
        const weekBucket = getWeekBucket(now);
        const severity = getSeverity(signal);

        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'market_narrative_watch',
            agentKey: 'ezal',
            title: `Market narrative summary — week of ${weekBucket}`,
            summary: `${signal.trends.length} market trend${signal.trends.length === 1 ? '' : 's'} identified this week across ${signal.competitorCount} competitors.`,
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `market_narrative:${orgId}:${weekBucket}`,
            dueAt: new Date(now.getTime() + 7 * 86_400_000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task.id, 'triaged', 'report_loaded');
        task = await safelyTransitionTask(task.id, 'investigating', 'analysis_started');
        task = await safelyTransitionTask(task.id, 'draft_ready', 'narrative_ready');

        const threadId = await ensureNarrativeThread(orgId, task.threadId);
        const artifactId = await upsertNarrativeArtifact({
            orgId,
            threadId,
            taskId: task.id,
            severity,
            signal,
            weekBucket,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'market_narrative',
            refId: artifactId,
            payload: {
                weekBucket,
                trendCount: signal.trends.length,
                competitorCount: signal.competitorCount,
                recommendationCount: signal.recommendations.length,
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'market_narrative_watch.draft_ready',
            businessObjectType: 'organization',
            businessObjectId: orgId,
            payload: { weekBucket, trendCount: signal.trends.length },
        });

        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: 'Review market narrative and update brand positioning if needed',
            dueAt: new Date(now.getTime() + 7 * 86_400_000),
            payload: { workflowKey: 'market_narrative_watch', trendCount: signal.trends.length },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'market_narrative_watch',
            outcomeType: 'opened',
            payload: { weekBucket, trendCount: signal.trends.length, artifactId },
        });

        logger.info('[MarketNarrativeWatch] Draft ready', {
            orgId,
            taskId: task.id,
            trendCount: signal.trends.length,
            severity,
        });

        return {
            success: true,
            orgId,
            trendCount: signal.trends.length,
            taskId: task.id,
            threadId,
            artifactId,
        };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[MarketNarrativeWatch] Failed', { orgId, error });
        return { success: false, orgId, trendCount: 0, error };
    }
}
