/**
 * Playbook Assignment Service
 *
 * Enrolls customers in event-triggered playbooks and the weekly campaign list.
 * Called after every check-in — idempotent for all operations.
 *
 * Two enrollment paths:
 *   1. Event-triggered (welcome sequence, etc.): fires customer.signup or customer.checkin
 *      → playbook-event-dispatcher picks up any active listeners for this org
 *   2. Weekly campaign subscription: adds to weekly_campaign_subscribers (email-gated)
 */

import { createHash } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { dispatchPlaybookEvent } from './playbook-event-dispatcher';

export interface PlaybookAssignmentContext {
    orgId: string;
    customerId: string;
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    isNewCustomer: boolean;
    emailConsent: boolean;
    priorVisits?: number;
    source?: string;
    cartProductIds?: string[];
    mood?: string | null;
}

/**
 * Enroll a customer in all applicable playbooks after check-in.
 * Safe to call multiple times — all writes are idempotent.
 */
export async function enrollCustomerInPlaybooks(ctx: PlaybookAssignmentContext): Promise<void> {
    await Promise.all([
        dispatchEventPlaybooks(ctx),
        enrollWeeklyCampaign(ctx),
    ]);
}

// ---------------------------------------------------------------------------
// Event-triggered playbooks
// ---------------------------------------------------------------------------

function dispatchEventPlaybooks(ctx: PlaybookAssignmentContext): Promise<void> {
    const eventName = ctx.isNewCustomer ? 'customer.signup' : 'customer.checkin';

    return dispatchPlaybookEvent(ctx.orgId, eventName, {
        customerId: ctx.customerId,
        customerEmail: ctx.email ?? undefined,
        customerPhone: ctx.phone ?? undefined,
        customerName: ctx.firstName ?? undefined,
        eventName,
        priorVisits: ctx.isNewCustomer ? 0 : (ctx.priorVisits ?? 1),
        source: ctx.source,
        cartProductIds: ctx.cartProductIds?.length ? ctx.cartProductIds : undefined,
        mood: ctx.mood ?? undefined,
    }).catch((err) => {
        logger.warn('[PlaybookAssignment] Failed to dispatch event', {
            orgId: ctx.orgId,
            customerId: ctx.customerId,
            eventName,
            err,
        });
    });
}

// ---------------------------------------------------------------------------
// Weekly campaign subscription
// ---------------------------------------------------------------------------

async function enrollWeeklyCampaign(ctx: PlaybookAssignmentContext): Promise<void> {
    // Any customer who provides an email is enrolled. Providing an email to
    // a dispensary constitutes implicit consent for marketing communications
    // under standard cannabis industry practice.
    if (!ctx.email) return;

    const subId = `wsub_${createHash('sha256').update(ctx.email + ctx.orgId).digest('hex').slice(0, 16)}`;
    const db = getAdminFirestore();

    try {
        const subRef = db.collection('weekly_campaign_subscribers').doc(subId);
        const snap = await subRef.get();
        if (!snap.exists) {
            await subRef.set({
                orgId: ctx.orgId,
                customerId: ctx.customerId,
                email: ctx.email,
                firstName: ctx.firstName ?? null,
                enrolledAt: new Date(),
                lastSentAt: null,
                status: 'active',
                source: ctx.source ?? 'checkin',
            });
            logger.info('[PlaybookAssignment] Enrolled in weekly campaign', {
                orgId: ctx.orgId,
                customerId: ctx.customerId,
            });
        }
    } catch (err) {
        logger.warn('[PlaybookAssignment] Failed to enroll in weekly campaign', {
            orgId: ctx.orgId,
            customerId: ctx.customerId,
            err,
        });
    }
}
