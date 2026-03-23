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

interface ProductSnapshot {
    id: string;
    name: string;
    category: string;
    inStock: boolean;
    inventoryCount?: number;
    updatedAt?: Date;
}

interface YieldAnomalySignal {
    totalProducts: number;
    outOfStock: ProductSnapshot[];
    staleCatalog: ProductSnapshot[];      // Not updated in 30+ days
    categoriesAffected: string[];
}

export interface YieldAnomalyWatchSummary {
    success: boolean;
    orgId: string;
    anomalyCount: number;
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

function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'toDate' in (value as object)) {
        return (value as { toDate: () => Date }).toDate();
    }
    return null;
}

function getSeverity(signal: YieldAnomalySignal): ProactiveSeverity {
    const outOfStockRate = signal.totalProducts > 0
        ? signal.outOfStock.length / signal.totalProducts
        : 0;

    if (outOfStockRate >= 0.5 || signal.outOfStock.length >= 10) return 'critical';
    if (outOfStockRate >= 0.25 || signal.outOfStock.length >= 5) return 'high';
    if (signal.outOfStock.length >= 2 || signal.staleCatalog.length >= 3) return 'medium';
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
        logger.warn('[YieldAnomalyWatch] Skipping invalid transition', { taskId, toStatus, event });
        return current;
    }
}

async function loadProductSnapshot(orgId: string): Promise<YieldAnomalySignal | null> {
    const db = getAdminFirestore();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const snap = await db
        .collection('products')
        .where('brandId', '==', orgId)
        .limit(200)
        .get();

    if (snap.empty) return null;

    const all: ProductSnapshot[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            name: typeof d.name === 'string' ? d.name : doc.id,
            category: typeof d.category === 'string' ? d.category : 'unknown',
            inStock: d.inStock !== false,
            inventoryCount: typeof d.inventoryCount === 'number' ? d.inventoryCount : undefined,
            updatedAt: toDate(d.updatedAt) ?? undefined,
        };
    });

    const outOfStock = all.filter(
        (p) => !p.inStock || (p.inventoryCount !== undefined && p.inventoryCount <= 0),
    );

    const staleCatalog = all.filter(
        (p) => p.inStock && p.updatedAt && p.updatedAt < thirtyDaysAgo,
    );

    const categoriesAffected = [...new Set([
        ...outOfStock.map((p) => p.category),
        ...staleCatalog.map((p) => p.category),
    ])].filter((c) => c !== 'unknown');

    return {
        totalProducts: all.length,
        outOfStock,
        staleCatalog,
        categoriesAffected,
    };
}

async function ensureYieldThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();
    const threadId = existingThreadId ?? createInboxThreadId();

    if (!existingThreadId) {
        await db.collection('inbox_threads').doc(threadId).set({
            id: threadId,
            orgId,
            type: 'yield_analysis',
            title: 'Yield Anomaly Watch',
            primaryAgent: 'pops',
            status: 'active',
            preview: 'Inventory anomalies detected in product catalog',
            tags: ['grower', 'yield', 'proactive'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    return threadId;
}

async function upsertYieldArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    severity: ProactiveSeverity;
    signal: YieldAnomalySignal;
    weekBucket: string;
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, severity, signal, weekBucket, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();

    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'yield_anomaly_watch',
        severity,
        evidence: [
            { label: 'Total products', value: String(signal.totalProducts) },
            { label: 'Out of stock', value: String(signal.outOfStock.length) },
            { label: 'Stale listings', value: String(signal.staleCatalog.length) },
        ],
        requiresApproval: false,
        nextActionLabel: 'Review inventory',
    };

    const outOfStockRate = signal.totalProducts > 0
        ? Math.round((signal.outOfStock.length / signal.totalProducts) * 100)
        : 0;

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'market_analysis',
        status: 'draft',
        data: {
            title: `Yield Anomaly Report — Week of ${weekBucket}`,
            summary: `${signal.outOfStock.length} product${signal.outOfStock.length === 1 ? '' : 's'} out of stock (${outOfStockRate}% of catalog). ${signal.staleCatalog.length} listing${signal.staleCatalog.length === 1 ? '' : 's'} not updated in 30+ days.`,
            totalProducts: signal.totalProducts,
            outOfStockCount: signal.outOfStock.length,
            outOfStockRate,
            staleCatalogCount: signal.staleCatalog.length,
            categoriesAffected: signal.categoriesAffected,
            outOfStockProducts: signal.outOfStock.slice(0, 10).map((p) => ({
                name: p.name,
                category: p.category,
            })),
            recommendations: buildRecommendations(signal),
        },
        rationale: 'Proactive yield anomaly watch — weekly scan of product catalog for stockouts and stale listings.',
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
        preview: `${signal.outOfStock.length} out-of-stock product${signal.outOfStock.length === 1 ? '' : 's'} detected`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

function buildRecommendations(signal: YieldAnomalySignal): string[] {
    const recs: string[] = [];

    if (signal.outOfStock.length > 0) {
        recs.push(`${signal.outOfStock.length} product${signal.outOfStock.length === 1 ? ' is' : 's are'} out of stock — review harvest schedule and restock timeline.`);
    }
    if (signal.staleCatalog.length > 0) {
        recs.push(`${signal.staleCatalog.length} listing${signal.staleCatalog.length === 1 ? ' has' : 's have'} not been updated in 30+ days — verify availability and refresh pricing.`);
    }
    if (signal.categoriesAffected.length > 0) {
        recs.push(`Affected categories: ${signal.categoriesAffected.slice(0, 4).join(', ')}. Prioritize restocking high-demand items first.`);
    }

    return recs;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runYieldAnomalyWatch(orgId: string): Promise<YieldAnomalyWatchSummary> {
    try {
        const enabled = await isProactiveWorkflowEnabled(orgId, 'yield_anomaly_watch');
        if (!enabled) {
            return { success: true, orgId, anomalyCount: 0, skipped: true, reason: 'workflow_disabled' };
        }

        const signal = await loadProductSnapshot(orgId);
        if (!signal) {
            return { success: true, orgId, anomalyCount: 0, skipped: true, reason: 'no_products' };
        }

        const anomalyCount = signal.outOfStock.length + signal.staleCatalog.length;
        if (anomalyCount === 0) {
            logger.info('[YieldAnomalyWatch] No anomalies detected', { orgId });
            return { success: true, orgId, anomalyCount: 0, skipped: true, reason: 'no_anomalies' };
        }

        const now = new Date();
        const weekBucket = getWeekBucket(now);
        const severity = getSeverity(signal);

        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'yield_anomaly_watch',
            agentKey: 'pops',
            title: `Yield anomaly report — week of ${weekBucket}`,
            summary: `${signal.outOfStock.length} products out of stock, ${signal.staleCatalog.length} stale listings detected.`,
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `yield_anomaly:${orgId}:${weekBucket}`,
            dueAt: new Date(now.getTime() + 3 * 86_400_000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task.id, 'triaged', 'anomalies_detected');
        task = await safelyTransitionTask(task.id, 'investigating', 'catalog_scanned');
        task = await safelyTransitionTask(task.id, 'draft_ready', 'report_ready');

        const threadId = await ensureYieldThread(orgId, task.threadId);
        const artifactId = await upsertYieldArtifact({
            orgId, threadId, taskId: task.id, severity, signal, weekBucket,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'yield_anomaly',
            refId: artifactId,
            payload: {
                weekBucket,
                totalProducts: signal.totalProducts,
                outOfStockCount: signal.outOfStock.length,
                staleCatalogCount: signal.staleCatalog.length,
                categoriesAffected: signal.categoriesAffected,
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'yield_anomaly_watch.draft_ready',
            businessObjectType: 'organization',
            businessObjectId: orgId,
            payload: { weekBucket, anomalyCount },
        });

        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'follow_up',
            title: 'Review stockouts and update catalog availability',
            dueAt: new Date(now.getTime() + 3 * 86_400_000),
            payload: { workflowKey: 'yield_anomaly_watch', outOfStockCount: signal.outOfStock.length },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'yield_anomaly_watch',
            outcomeType: 'opened',
            payload: { weekBucket, anomalyCount, artifactId },
        });

        logger.info('[YieldAnomalyWatch] Draft ready', { orgId, taskId: task.id, anomalyCount, severity });

        return {
            success: true, orgId, anomalyCount,
            taskId: task.id, threadId, artifactId,
        };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[YieldAnomalyWatch] Failed', { orgId, error });
        return { success: false, orgId, anomalyCount: 0, error };
    }
}
