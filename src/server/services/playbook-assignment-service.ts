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
import { runHandler } from '@/server/playbooks/handler-registry';

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

    // Fire-and-forget: welcome email for brand-new customers with email.
    // Non-blocking — check-in flow does not wait for email generation.
    if (ctx.isNewCustomer && ctx.email) {
        fireWelcomeEmail(ctx).catch(err =>
            logger.warn('[PlaybookAssignment] Welcome email fire failed', {
                orgId: ctx.orgId,
                err: String(err),
            })
        );
    }
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

// ---------------------------------------------------------------------------
// Welcome email (new customers only)
// ---------------------------------------------------------------------------

async function fireWelcomeEmail(ctx: PlaybookAssignmentContext): Promise<void> {
    const db = getAdminFirestore();

    // Find the welcome custom playbook assignment for this org
    const assignmentsSnap = await db.collection('playbook_assignments')
        .where('orgId', '==', ctx.orgId)
        .get();

    const welcomeDoc = assignmentsSnap.docs.find((d) => {
        const name = ((d.data().config?.playbookName ?? d.data().intentDescription ?? '') as string).toLowerCase();
        return name.includes('welcome');
    });

    if (!welcomeDoc) return;

    const data = welcomeDoc.data();

    await runHandler(data.handler as string, {
        assignmentId: welcomeDoc.id,
        orgId: ctx.orgId,
        playbookId: (data.config?.customPlaybookId ?? welcomeDoc.id) as string,
        config: {
            ...(data.config ?? {}),
            // Override audience to send to this specific new customer
            audienceType: 'new_customer_welcome',
            customerEmail: ctx.email,
            customerName: ctx.firstName ?? '',
        } as Record<string, unknown>,
        firestore: db,
    });

    logger.info('[PlaybookAssignment] Welcome email fired', {
        orgId: ctx.orgId,
        customerId: ctx.customerId,
        assignmentId: welcomeDoc.id,
    });
}
