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
import {
    createProactiveApproval,
    resolveApprovalPolicy,
} from '@/server/services/proactive-approval-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailableProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    thcPercent?: number;
    cbdPercent?: number;
    inventoryCount?: number;
}

interface WholesaleReadinessSignal {
    totalAvailable: number;
    byCategory: Record<string, AvailableProduct[]>;
    topProducts: AvailableProduct[];         // Highest inventory / best value
    estimatedTotalUnits: number;
}

export interface WholesaleAvailabilityPrepSummary {
    success: boolean;
    orgId: string;
    availableSkus: number;
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

function getSeverity(signal: WholesaleReadinessSignal): ProactiveSeverity {
    // Higher severity = more inventory ready = higher urgency to act on it
    if (signal.totalAvailable >= 20) return 'medium';
    if (signal.totalAvailable >= 5) return 'low';
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
        logger.warn('[WholesaleAvailabilityPrep] Skipping invalid transition', { taskId, toStatus, event });
        return current;
    }
}

async function loadAvailableInventory(orgId: string): Promise<WholesaleReadinessSignal | null> {
    const db = getAdminFirestore();

    const snap = await db
        .collection('products')
        .where('brandId', '==', orgId)
        .where('inStock', '==', true)
        .limit(200)
        .get();

    if (snap.empty) return null;

    const products: AvailableProduct[] = snap.docs
        .map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                name: typeof d.name === 'string' ? d.name : doc.id,
                category: typeof d.category === 'string' ? d.category : 'General',
                price: typeof d.price === 'number' ? d.price : 0,
                thcPercent: typeof d.thcPercent === 'number' ? d.thcPercent : undefined,
                cbdPercent: typeof d.cbdPercent === 'number' ? d.cbdPercent : undefined,
                inventoryCount: typeof d.inventoryCount === 'number' ? d.inventoryCount : undefined,
            };
        })
        .filter((p) => p.name && p.price > 0);

    if (products.length === 0) return null;

    const byCategory: Record<string, AvailableProduct[]> = {};
    for (const p of products) {
        if (!byCategory[p.category]) byCategory[p.category] = [];
        byCategory[p.category].push(p);
    }

    const topProducts = [...products]
        .sort((a, b) => (b.inventoryCount ?? 0) - (a.inventoryCount ?? 0))
        .slice(0, 10);

    const estimatedTotalUnits = products.reduce((sum, p) => sum + (p.inventoryCount ?? 1), 0);

    return {
        totalAvailable: products.length,
        byCategory,
        topProducts,
        estimatedTotalUnits,
    };
}

function buildCategoryLines(signal: WholesaleReadinessSignal): string[] {
    return Object.entries(signal.byCategory)
        .sort(([, a], [, b]) => b.length - a.length)
        .slice(0, 6)
        .map(([cat, items]) => `${cat}: ${items.length} SKU${items.length === 1 ? '' : 's'}`);
}

function buildOutreachDraft(signal: WholesaleReadinessSignal): string {
    const topLine = signal.topProducts
        .slice(0, 5)
        .map((p) => {
            const thc = p.thcPercent ? ` (${p.thcPercent}% THC)` : '';
            return `• ${p.name}${thc} — $${p.price.toFixed(2)}`;
        })
        .join('\n');

    return [
        'Hi {{buyerName}},',
        '',
        "We have fresh inventory ready to ship this week. Here's a quick look at what's available:",
        '',
        topLine,
        '',
        `Total available: ${signal.totalAvailable} SKUs across ${Object.keys(signal.byCategory).length} categories.`,
        '',
        'Let me know if you\'d like a full order form or want to set up a call this week.',
        '',
        '{{senderName}}',
        '{{orgName}}',
    ].join('\n');
}

async function ensureWholesaleThread(orgId: string, existingThreadId?: string): Promise<string> {
    const db = getAdminFirestore();
    const threadId = existingThreadId ?? createInboxThreadId();

    if (!existingThreadId) {
        await db.collection('inbox_threads').doc(threadId).set({
            id: threadId,
            orgId,
            type: 'wholesale_inventory',
            title: 'Wholesale Availability Prep',
            primaryAgent: 'craig',
            status: 'active',
            preview: 'Weekly wholesale inventory brief ready for buyer outreach',
            tags: ['grower', 'wholesale', 'proactive'],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    return threadId;
}

async function upsertWholesaleArtifact(input: {
    orgId: string;
    threadId: string;
    taskId: string;
    severity: ProactiveSeverity;
    signal: WholesaleReadinessSignal;
    weekBucket: string;
    existingArtifactId?: string;
}): Promise<string> {
    const { orgId, threadId, taskId, severity, signal, weekBucket, existingArtifactId } = input;
    const db = getAdminFirestore();
    const artifactId = existingArtifactId ?? createInboxArtifactId();

    const proactive: InboxArtifactProactiveMetadata = {
        taskId,
        workflowKey: 'wholesale_availability_prep',
        severity,
        evidence: [
            { label: 'Available SKUs', value: String(signal.totalAvailable) },
            { label: 'Categories', value: String(Object.keys(signal.byCategory).length) },
            { label: 'Est. total units', value: String(signal.estimatedTotalUnits) },
        ],
        requiresApproval: true,
        nextActionLabel: 'Send to buyers',
    };

    const payload = {
        id: artifactId,
        threadId,
        orgId,
        type: 'outreach_draft',
        status: 'draft',
        data: {
            channel: 'email',
            subject: `Fresh inventory available — week of ${weekBucket}`,
            body: buildOutreachDraft(signal),
            targetSegments: ['wholesale_buyer'],
            estimatedRecipients: 0,
            sendStatus: 'idle',
            complianceStatus: 'pending',
            // Wholesale context for UI display
            wholesaleSummary: {
                title: `Wholesale Brief — Week of ${weekBucket}`,
                totalSkus: signal.totalAvailable,
                estimatedUnits: signal.estimatedTotalUnits,
                categories: buildCategoryLines(signal),
                topProducts: signal.topProducts.slice(0, 6).map((p) => ({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    thcPercent: p.thcPercent,
                })),
            },
        },
        rationale: 'Proactive wholesale availability prep — weekly scan of available inventory packaged as buyer outreach draft.',
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
        preview: `${signal.totalAvailable} SKUs ready for buyer outreach this week`,
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return artifactId;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runWholesaleAvailabilityPrep(orgId: string): Promise<WholesaleAvailabilityPrepSummary> {
    try {
        const enabled = await isProactiveWorkflowEnabled(orgId, 'wholesale_availability_prep');
        if (!enabled) {
            return { success: true, orgId, availableSkus: 0, skipped: true, reason: 'workflow_disabled' };
        }

        const signal = await loadAvailableInventory(orgId);
        if (!signal) {
            return { success: true, orgId, availableSkus: 0, skipped: true, reason: 'no_inventory' };
        }

        const now = new Date();
        const weekBucket = getWeekBucket(now);
        const severity = getSeverity(signal);

        let task = await createOrReuseProactiveTask({
            tenantId: orgId,
            organizationId: orgId,
            workflowKey: 'wholesale_availability_prep',
            agentKey: 'craig',
            title: `Wholesale availability brief — week of ${weekBucket}`,
            summary: `${signal.totalAvailable} SKUs available across ${Object.keys(signal.byCategory).length} categories.`,
            severity,
            businessObjectType: 'organization',
            businessObjectId: orgId,
            dedupeKey: `wholesale_prep:${orgId}:${weekBucket}`,
            dueAt: new Date(now.getTime() + 5 * 86_400_000),
            createdBy: 'system',
        });

        task = await safelyTransitionTask(task.id, 'triaged', 'inventory_loaded');
        task = await safelyTransitionTask(task.id, 'investigating', 'brief_generating');
        task = await safelyTransitionTask(task.id, 'draft_ready', 'brief_ready');

        const threadId = await ensureWholesaleThread(orgId, task.threadId);
        const artifactId = await upsertWholesaleArtifact({
            orgId, threadId, taskId: task.id, severity, signal, weekBucket,
            existingArtifactId: task.artifactId,
        });

        await linkTaskToInbox(task.id, { threadId, artifactId });

        // Create approval record and atomically back-link to task (batched write)
        const approvalPolicy = resolveApprovalPolicy('wholesale_availability_prep');
        await createProactiveApproval({
            taskId: task.id,
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            workflowKey: 'wholesale_availability_prep',
            artifactId,
            policyMode: approvalPolicy,
            severity,
            linkedTaskId: task.id,
            payload: { weekBucket, availableSkus: signal.totalAvailable, artifactId, threadId },
            ttlMs: 2 * 86_400_000, // 2-day window matches the commitment due date
        });

        task = await safelyTransitionTask(task.id, 'awaiting_approval', 'approval_record_created');

        await attachProactiveTaskEvidence(task.id, {
            taskId: task.id,
            tenantId: task.tenantId,
            evidenceType: 'wholesale_inventory',
            refId: artifactId,
            payload: {
                weekBucket,
                totalAvailable: signal.totalAvailable,
                categoryCount: Object.keys(signal.byCategory).length,
                estimatedTotalUnits: signal.estimatedTotalUnits,
            },
        });

        await appendProactiveEvent({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            actorType: 'system',
            eventType: 'wholesale_availability_prep.draft_ready',
            businessObjectType: 'organization',
            businessObjectId: orgId,
            payload: { weekBucket, availableSkus: signal.totalAvailable },
        });

        await upsertCommitment({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            commitmentType: 'approval_wait',
            title: 'Approve wholesale availability brief before sending to buyers',
            dueAt: new Date(now.getTime() + 2 * 86_400_000),
            payload: { workflowKey: 'wholesale_availability_prep', availableSkus: signal.totalAvailable },
        });

        await recordProactiveOutcome({
            tenantId: task.tenantId,
            organizationId: task.organizationId,
            taskId: task.id,
            workflowKey: 'wholesale_availability_prep',
            outcomeType: 'opened',
            payload: { weekBucket, availableSkus: signal.totalAvailable, artifactId },
        });

        logger.info('[WholesaleAvailabilityPrep] Draft ready', {
            orgId, taskId: task.id, availableSkus: signal.totalAvailable, severity,
        });

        return {
            success: true, orgId, availableSkus: signal.totalAvailable,
            taskId: task.id, threadId, artifactId,
        };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error('[WholesaleAvailabilityPrep] Failed', { orgId, error });
        return { success: false, orgId, availableSkus: 0, error };
    }
}
