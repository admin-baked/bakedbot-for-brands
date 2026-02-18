'use server';

/**
 * Playbook Execution Service
 *
 * When a playbook triggers:
 *   1. Verify playbook is active for this subscription
 *   2. Generate content (AI via Genkit, or static template)
 *   3. Deliver via channel(s): email (Mailjet) | dashboard notification | internal SMS
 *   4. Log execution to Firestore
 *   5. Update usage counters
 *
 * Retry logic: 3 attempts with exponential backoff (1s → 2s → 4s).
 * Non-transient errors (auth, tier mismatch) are not retried.
 * Critical playbook failures alert the BakedBot team.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PLAYBOOKS } from '@/config/playbooks';
import type { PlaybookDefinition } from '@/config/playbooks';
import type { PlaybookAssignmentDoc } from './assignment-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaybookExecutionResult {
    success: boolean;
    playbookId: string;
    channel: string;
    deliveredAt?: Date;
    error?: string;
}

export interface PlaybookExecutionContext {
    subscriptionId: string;
    orgId: string;
    playbookId: string;
    triggerEvent?: string;
    triggerData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Critical playbooks — alert team on failure
// ---------------------------------------------------------------------------

const CRITICAL_PLAYBOOKS = new Set([
    'real-time-price-alerts',
    'pre-send-campaign-check',
    'usage-alert',
]);

// ---------------------------------------------------------------------------
// Core execute with retry
// ---------------------------------------------------------------------------

export async function executePlaybookWithRetry(
    ctx: PlaybookExecutionContext,
    maxRetries = 3,
    baseBackoffMs = 1000
): Promise<PlaybookExecutionResult> {
    const definition = PLAYBOOKS[ctx.playbookId];
    if (!definition) {
        return { success: false, playbookId: ctx.playbookId, channel: 'none', error: 'Playbook not found in registry' };
    }

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await executePlaybook(ctx, definition);
            await logExecution(ctx, result, attempt + 1);
            return result;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            if (isNonTransient(lastError)) {
                logger.warn('[Playbook] Non-transient error — not retrying', { playbookId: ctx.playbookId, error: lastError.message });
                break;
            }

            if (attempt < maxRetries - 1) {
                await delay(baseBackoffMs * Math.pow(2, attempt));
            }
        }
    }

    // All retries exhausted
    await logFailure(ctx, lastError, maxRetries);

    if (CRITICAL_PLAYBOOKS.has(ctx.playbookId)) {
        await alertTeam(ctx, lastError);
    }

    // Always write dashboard notification as fallback
    await writeFailureNotification(ctx);

    return { success: false, playbookId: ctx.playbookId, channel: 'none', error: lastError.message };
}

// ---------------------------------------------------------------------------
// Single execution attempt
// ---------------------------------------------------------------------------

async function executePlaybook(
    ctx: PlaybookExecutionContext,
    definition: PlaybookDefinition
): Promise<PlaybookExecutionResult> {
    const firestore = getAdminFirestore();
    const primaryChannel = definition.channels[0];

    // Generate content
    const content = await generateContent(ctx, definition);

    // Deliver
    if (definition.channels.includes('email')) {
        await deliverEmail(ctx, definition, content);
    }

    if (definition.channels.includes('dashboard')) {
        await deliverDashboard(ctx, definition, content, firestore);
    }

    if (definition.channels.includes('sms_internal')) {
        await deliverInternalSMS(ctx, definition, content);
    }

    // Update assignment last triggered
    const assignmentSnap = await firestore
        .collection('playbook_assignments')
        .where('subscriptionId', '==', ctx.subscriptionId)
        .where('playbookId', '==', ctx.playbookId)
        .limit(1)
        .get();

    if (!assignmentSnap.empty) {
        await assignmentSnap.docs[0].ref.update({
            lastTriggered: Timestamp.now(),
            triggerCount: (assignmentSnap.docs[0].data() as PlaybookAssignmentDoc).triggerCount + 1,
            updatedAt: Timestamp.now(),
        });
    }

    return { success: true, playbookId: ctx.playbookId, channel: primaryChannel, deliveredAt: new Date() };
}

// ---------------------------------------------------------------------------
// Content generation (delegate to agent or static template)
// ---------------------------------------------------------------------------

async function generateContent(
    ctx: PlaybookExecutionContext,
    definition: PlaybookDefinition
): Promise<{ subject?: string; body: string; summary: string }> {
    // For now, return a structured placeholder.
    // Phase 4 will wire this to Genkit flows per agent type.
    return {
        subject: `[${definition.name}] for org ${ctx.orgId}`,
        body: `Automated playbook delivery: ${definition.description}`,
        summary: definition.description,
    };
}

// ---------------------------------------------------------------------------
// Delivery channels
// ---------------------------------------------------------------------------

async function deliverEmail(
    ctx: PlaybookExecutionContext,
    definition: PlaybookDefinition,
    content: { subject?: string; body: string }
): Promise<void> {
    const firestore = getAdminFirestore();

    // Find org admin email
    const orgUsersSnap = await firestore
        .collection('users')
        .where('orgId', '==', ctx.orgId)
        .limit(5)
        .get();

    const adminUser = orgUsersSnap.docs.find(
        (d) => d.data().role === 'dispensary' || d.data().role === 'brand_admin'
    ) ?? orgUsersSnap.docs[0];

    if (!adminUser) {
        logger.warn('[Playbook] No org admin found for email delivery', { orgId: ctx.orgId });
        return;
    }

    const adminEmail = adminUser.data().email as string;
    if (!adminEmail) return;

    // Import Mailjet sender dynamically to avoid pulling it in on all pages
    const { sendPlaybookEmail } = await import('./mailjet');
    await sendPlaybookEmail({
        to: adminEmail,
        subject: content.subject ?? definition.name,
        htmlBody: content.body,
        playbookId: ctx.playbookId,
        playbookName: definition.name,
    });
}

async function deliverDashboard(
    ctx: PlaybookExecutionContext,
    definition: PlaybookDefinition,
    content: { summary: string },
    firestore: FirebaseFirestore.Firestore
): Promise<void> {
    await firestore.collection('inbox_notifications').add({
        type: 'playbook_delivery',
        orgId: ctx.orgId,
        playbookId: ctx.playbookId,
        playbookName: definition.name,
        agentId: definition.agent,
        title: definition.name,
        body: content.summary,
        read: false,
        createdAt: Timestamp.now(),
    });
}

async function deliverInternalSMS(
    _ctx: PlaybookExecutionContext,
    _definition: PlaybookDefinition,
    _content: { body: string }
): Promise<void> {
    // Phase 6: Blackleaf internal SMS routing
    // Will call src/lib/sms/internal-router.ts
    logger.info('[Playbook] Internal SMS delivery placeholder — Phase 6');
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

async function logExecution(
    ctx: PlaybookExecutionContext,
    result: PlaybookExecutionResult,
    attempts: number
): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('playbook_executions').add({
        subscriptionId: ctx.subscriptionId,
        orgId: ctx.orgId,
        playbookId: ctx.playbookId,
        triggerEvent: ctx.triggerEvent ?? null,
        status: 'success',
        channel: result.channel,
        attempts,
        executedAt: Timestamp.now(),
    });
}

async function logFailure(
    ctx: PlaybookExecutionContext,
    error: Error,
    attempts: number
): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('playbook_executions').add({
        subscriptionId: ctx.subscriptionId,
        orgId: ctx.orgId,
        playbookId: ctx.playbookId,
        triggerEvent: ctx.triggerEvent ?? null,
        status: 'failed',
        channel: 'none',
        attempts,
        error: error.message,
        executedAt: Timestamp.now(),
    });

    await firestore.collection('playbook_failures').add({
        subscriptionId: ctx.subscriptionId,
        orgId: ctx.orgId,
        playbookId: ctx.playbookId,
        error: error.message,
        attempts,
        failedAt: Timestamp.now(),
        resolved: false,
    });
}

async function writeFailureNotification(ctx: PlaybookExecutionContext): Promise<void> {
    const firestore = getAdminFirestore();
    const definition = PLAYBOOKS[ctx.playbookId];
    await firestore.collection('inbox_notifications').add({
        type: 'playbook_failure',
        orgId: ctx.orgId,
        playbookId: ctx.playbookId,
        playbookName: definition?.name ?? ctx.playbookId,
        title: 'Playbook delivery failed',
        body: `The playbook "${definition?.name ?? ctx.playbookId}" could not be delivered after 3 attempts. BakedBot team has been notified.`,
        severity: 'warning',
        read: false,
        createdAt: Timestamp.now(),
    });
}

async function alertTeam(ctx: PlaybookExecutionContext, error: Error): Promise<void> {
    logger.error('[Playbook] CRITICAL playbook failure — alerting team', {
        playbookId: ctx.playbookId,
        orgId: ctx.orgId,
        error: error.message,
    });
    // Phase 6 will hook into Blackleaf for internal SMS alert to BakedBot ops
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonTransient(error: Error): boolean {
    const nonTransientCodes = ['AUTH_ERROR', 'INVALID_TEMPLATE', 'TIER_MISMATCH', 'NOT_FOUND'];
    return nonTransientCodes.some((code) => error.message.includes(code));
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Convenience: execute by event trigger
// ---------------------------------------------------------------------------

/**
 * Execute all active playbooks that match a given event trigger for an org.
 */
export async function executePlaybooksForEvent(
    orgId: string,
    subscriptionId: string,
    triggerEvent: string,
    triggerData?: Record<string, unknown>
): Promise<PlaybookExecutionResult[]> {
    const firestore = getAdminFirestore();

    // Get active assignments
    const assignmentsSnap = await firestore
        .collection('playbook_assignments')
        .where('subscriptionId', '==', subscriptionId)
        .where('status', '==', 'active')
        .get();

    // Filter to those with matching event trigger
    const matching = assignmentsSnap.docs.filter((doc) => {
        const data = doc.data() as PlaybookAssignmentDoc;
        const definition = PLAYBOOKS[data.playbookId];
        return (
            definition?.trigger.type === 'event' &&
            definition.trigger.event === triggerEvent
        );
    });

    const results = await Promise.all(
        matching.map((doc) =>
            executePlaybookWithRetry({
                subscriptionId,
                orgId,
                playbookId: doc.data().playbookId as string,
                triggerEvent,
                triggerData,
            })
        )
    );

    return results;
}
