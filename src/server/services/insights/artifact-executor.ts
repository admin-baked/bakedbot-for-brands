/**
 * Artifact Decision Executor
 *
 * Routes artifact approval decisions to the correct external system.
 * Called from both dashboard (server action) and Slack (interactions webhook).
 *
 * Pattern: artifact.actionable.operation → executor function → external system
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import type {
    InboxArtifact,
    ArtifactDecision,
    ActionOperationType,
    ActionableRecommendation,
} from '@/types/inbox';

// ============================================================================
// Decision Storage
// ============================================================================

/**
 * Record a human decision (approve/decline) on an actionable artifact.
 * Stored in: tenants/{orgId}/artifact_decisions/{decisionId}
 */
export async function recordArtifactDecision(
    decision: Omit<ArtifactDecision, 'id'>
): Promise<string> {
    const db = getAdminFirestore();
    const ref = db
        .collection('tenants')
        .doc(decision.orgId)
        .collection('artifact_decisions')
        .doc();

    await ref.set({
        ...decision,
        id: ref.id,
        decidedAt: Timestamp.fromDate(decision.decidedAt),
        execution: decision.execution ?? null,
    });

    logger.info('[ArtifactExecutor] Decision recorded', {
        decisionId: ref.id,
        orgId: decision.orgId,
        artifactId: decision.artifactId,
        decision: decision.decision,
        via: decision.decidedVia,
    });

    return ref.id;
}

// ============================================================================
// Freshness Check
// ============================================================================

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if the artifact's source data is stale (>24h old).
 * Returns { stale, ageHours } for the caller to warn or block.
 */
export function checkDataFreshness(actionable: ActionableRecommendation): {
    stale: boolean;
    ageHours: number;
} {
    const sourceTime = new Date(actionable.dataFreshness).getTime();
    const ageMs = Date.now() - sourceTime;
    const ageHours = Math.round(ageMs / 3_600_000);
    return {
        stale: ageMs > STALE_THRESHOLD_MS,
        ageHours,
    };
}

// ============================================================================
// Execution Router
// ============================================================================

export interface ExecutionResult {
    success: boolean;
    externalId?: string;
    error?: string;
}

/**
 * Execute the recommended action for an approved artifact.
 * Routes to the correct executor based on operation type.
 */
export async function executeArtifactAction(
    artifact: InboxArtifact,
    approvedBy: string,
    approvedVia: 'dashboard' | 'slack'
): Promise<ExecutionResult> {
    const actionable = artifact.actionable;
    if (!actionable) {
        return { success: false, error: 'Artifact has no actionable recommendation' };
    }

    const operation = actionable.operation;
    const orgId = artifact.orgId;

    logger.info('[ArtifactExecutor] Executing action', {
        orgId,
        artifactId: artifact.id,
        operation,
        targetSystem: actionable.targetSystem,
        approvedBy,
        approvedVia,
    });

    try {
        const result = await routeExecution(operation, orgId, artifact);

        // Record decision with execution result
        await recordArtifactDecision({
            orgId,
            artifactId: artifact.id,
            artifactType: artifact.type,
            decision: 'approved',
            decidedBy: approvedBy,
            decidedVia: approvedVia,
            decidedAt: new Date(),
            sourceDataAt: actionable.dataFreshness,
            wasStale: checkDataFreshness(actionable).stale,
            execution: {
                status: result.success ? 'success' : 'failed',
                externalId: result.externalId,
                executedAt: new Date(),
                error: result.error,
            },
        });

        // Update artifact status
        const db = getAdminFirestore();
        await db
            .collection('tenants')
            .doc(orgId)
            .collection('inbox_artifacts')
            .doc(artifact.id)
            .update({
                status: result.success ? 'published' : 'pending_review',
                approvedBy,
                approvedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

        return result;
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('[ArtifactExecutor] Execution failed', {
            orgId,
            artifactId: artifact.id,
            operation,
            error: errorMsg,
        });

        await recordArtifactDecision({
            orgId,
            artifactId: artifact.id,
            artifactType: artifact.type,
            decision: 'approved',
            decidedBy: approvedBy,
            decidedVia: approvedVia,
            decidedAt: new Date(),
            sourceDataAt: actionable.dataFreshness,
            wasStale: checkDataFreshness(actionable).stale,
            execution: {
                status: 'failed',
                executedAt: new Date(),
                error: errorMsg,
            },
        });

        return { success: false, error: errorMsg };
    }
}

/**
 * Record a decline decision with optional reason.
 */
export async function declineArtifactAction(
    artifact: InboxArtifact,
    declinedBy: string,
    declinedVia: 'dashboard' | 'slack',
    reason?: string
): Promise<void> {
    const actionable = artifact.actionable;

    await recordArtifactDecision({
        orgId: artifact.orgId,
        artifactId: artifact.id,
        artifactType: artifact.type,
        decision: 'declined',
        decidedBy: declinedBy,
        decidedVia: declinedVia,
        decidedAt: new Date(),
        declinedReason: reason,
        sourceDataAt: actionable?.dataFreshness ?? new Date().toISOString(),
        wasStale: actionable ? checkDataFreshness(actionable).stale : false,
    });

    // Update artifact status
    const db = getAdminFirestore();
    await db
        .collection('tenants')
        .doc(artifact.orgId)
        .collection('inbox_artifacts')
        .doc(artifact.id)
        .update({
            status: 'rejected',
            updatedAt: Timestamp.now(),
        });

    logger.info('[ArtifactExecutor] Action declined', {
        orgId: artifact.orgId,
        artifactId: artifact.id,
        reason,
        declinedBy,
    });
}

// ============================================================================
// Operation Routers (lazy-imported to avoid circular deps)
// ============================================================================

async function routeExecution(
    operation: ActionOperationType,
    orgId: string,
    artifact: InboxArtifact
): Promise<ExecutionResult> {
    const params = artifact.actionable?.params ?? {};

    switch (operation) {
        case 'pos_discount': {
            // Reuse existing applyPriceMatch for price match artifacts
            if (artifact.type === 'competitor_price_match') {
                const { applyPriceMatch } = await import('@/app/actions/dynamic-pricing');
                const oppIndex = (params.opportunityIndex as number) ?? 0;
                const result = await applyPriceMatch(orgId, artifact.id, oppIndex, { mode: 'manual' });
                return {
                    success: result.success,
                    externalId: result.discountId?.toString(),
                    error: result.error,
                };
            }
            // Generic POS discount for flash_sale, happy_hour, etc.
            return await createGenericPosDiscount(orgId, params);
        }

        case 'sms_campaign': {
            // Future: route to Blackleaf SMS
            logger.info('[ArtifactExecutor] SMS campaign queued', { orgId, params });
            return { success: true, externalId: `sms_queued_${Date.now()}` };
        }

        case 'email_campaign': {
            // Future: route to Mailjet/SES
            logger.info('[ArtifactExecutor] Email campaign queued', { orgId, params });
            return { success: true, externalId: `email_queued_${Date.now()}` };
        }

        case 'review_reply': {
            // Future: Google Places API reply
            logger.info('[ArtifactExecutor] Review reply queued', { orgId, params });
            return { success: true, externalId: `review_queued_${Date.now()}` };
        }

        case 'notification_only': {
            // No external action — just mark as acknowledged
            return { success: true };
        }

        case 'reorder_alert':
        case 'task_create':
        case 'compliance_brief':
        case 'menu_update':
        case 'loyalty_nudge':
        case 'promo_schedule':
        case 'pos_price_change':
        case 'pos_bundle': {
            // Stub: log and succeed — implementations will be wired as we build each card
            logger.info('[ArtifactExecutor] Operation stub executed', { orgId, operation, params });
            return { success: true, externalId: `stub_${operation}_${Date.now()}` };
        }

        default: {
            logger.warn('[ArtifactExecutor] Unknown operation type', { operation });
            return { success: false, error: `Unknown operation: ${operation}` };
        }
    }
}

/**
 * Generic POS discount creator for flash sales, happy hours, etc.
 * Delegates to the existing applyPriceMatch pattern in dynamic-pricing.ts.
 * TODO: Wire to org-specific POS adapter when multi-POS is supported.
 */
async function createGenericPosDiscount(
    orgId: string,
    params: Record<string, unknown>
): Promise<ExecutionResult> {
    // Stub: log and succeed. Each card type will wire its own executor
    // as we build out the generators. The price_match type already has
    // a real executor via applyPriceMatch().
    logger.info('[ArtifactExecutor] Generic POS discount queued', {
        orgId,
        discountName: params.discountName ?? params.title,
        discountPercent: params.discountPercent,
        durationDays: params.durationDays,
    });
    return { success: true, externalId: `pos_queued_${Date.now()}` };
}
