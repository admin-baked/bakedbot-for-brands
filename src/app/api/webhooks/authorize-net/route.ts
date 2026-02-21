/**
 * Authorize.net Webhook Handler
 * POST /api/webhooks/authorize-net
 *
 * Handles payment lifecycle events from Authorize.net and keeps
 * Firestore subscription state in sync.
 *
 * Event types handled:
 *   net.authorize.customer.subscription.created   → mark active
 *   net.authorize.customer.subscription.updated   → update tier/amount
 *   net.authorize.customer.subscription.cancelled → mark canceled
 *   net.authorize.customer.subscription.suspended → mark past_due
 *   net.authorize.customer.subscription.terminated → mark canceled
 *   net.authorize.payment.authcapture.created      → successful payment → reset past_due
 *   net.authorize.payment.fraud.declined           → failed payment → past_due
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

// Authorize.net signs webhooks with HMAC-SHA512 using the notification key
// Signature header: X-ANET-Signature
async function verifySignature(body: string, signatureHeader: string): Promise<boolean> {
    const notifKey = process.env.AUTHNET_NOTIFICATION_KEY;

    // CRITICAL SECURITY: Fail hard in production if notification key is missing
    // Allows bypass only in development/sandbox for testing
    if (!notifKey) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('[AuthNet Webhook] AUTHNET_NOTIFICATION_KEY not configured in production — webhook verification FAILED');
            return false; // Reject all unsigned webhooks in production
        }
        // Allow in dev/sandbox for local testing
        logger.warn('[AuthNet Webhook] AUTHNET_NOTIFICATION_KEY not set — skipping verification (dev/sandbox only)');
        return true;
    }

    try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(notifKey);
        const msgData = encoder.encode(body);

        const cryptoKey = await crypto.subtle.importKey(
            'raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
        const computed = 'sha512=' + Buffer.from(signature).toString('hex').toUpperCase();

        return computed === signatureHeader;
    } catch (err) {
        logger.error('[AuthNet Webhook] Signature verification error', err as Record<string, unknown>);
        return false;
    }
}

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signatureHeader = req.headers.get('X-ANET-Signature') ?? '';

    const isValid = await verifySignature(body, signatureHeader);
    if (!isValid) {
        logger.warn('[AuthNet Webhook] Invalid signature — rejecting');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: { eventType: string; payload: Record<string, unknown> };
    try {
        event = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { eventType, payload } = event;
    logger.info('[AuthNet Webhook] Received event', { eventType });

    try {
        const firestore = getAdminFirestore();

        switch (eventType) {
            case 'net.authorize.customer.subscription.created': {
                await handleSubscriptionCreated(firestore, payload);
                break;
            }
            case 'net.authorize.customer.subscription.updated': {
                await handleSubscriptionUpdated(firestore, payload);
                break;
            }
            case 'net.authorize.customer.subscription.cancelled':
            case 'net.authorize.customer.subscription.terminated': {
                await handleSubscriptionCancelled(firestore, payload);
                break;
            }
            case 'net.authorize.customer.subscription.suspended': {
                await handleSubscriptionSuspended(firestore, payload);
                break;
            }
            case 'net.authorize.payment.authcapture.created': {
                await handlePaymentSuccess(firestore, payload);
                break;
            }
            case 'net.authorize.payment.fraud.declined': {
                await handlePaymentFailed(firestore, payload);
                break;
            }
            default:
                logger.info('[AuthNet Webhook] Unhandled event type', { eventType });
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error('[AuthNet Webhook] Handler error', { eventType, error: err });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function findSubscriptionByARBId(
    firestore: FirebaseFirestore.Firestore,
    arbSubscriptionId: string
) {
    const snap = await firestore
        .collection('subscriptions')
        .where('authorizeNetSubscriptionId', '==', arbSubscriptionId)
        .limit(1)
        .get();
    return snap.empty ? null : snap.docs[0];
}

async function handleSubscriptionCreated(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    const arbId = payload.id as string;
    if (!arbId) return;

    const doc = await findSubscriptionByARBId(firestore, arbId);
    if (doc) {
        await doc.ref.update({
            status: 'active',
            updatedAt: Timestamp.now(),
        });
        logger.info('[AuthNet Webhook] Subscription activated', { arbId, docId: doc.id });
    }
}

async function handleSubscriptionUpdated(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    const arbId = payload.id as string;
    if (!arbId) return;

    const doc = await findSubscriptionByARBId(firestore, arbId);
    if (doc) {
        await doc.ref.update({
            status: 'active',
            updatedAt: Timestamp.now(),
        });
        logger.info('[AuthNet Webhook] Subscription updated', { arbId });
    }
}

async function handleSubscriptionCancelled(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    const arbId = payload.id as string;
    if (!arbId) return;

    const doc = await findSubscriptionByARBId(firestore, arbId);
    if (doc) {
        await doc.ref.update({
            status: 'canceled',
            canceledAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        logger.info('[AuthNet Webhook] Subscription canceled', { arbId });
    }
}

async function handleSubscriptionSuspended(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    const arbId = payload.id as string;
    if (!arbId) return;

    const doc = await findSubscriptionByARBId(firestore, arbId);
    if (doc) {
        await doc.ref.update({
            status: 'past_due',
            updatedAt: Timestamp.now(),
        });
        logger.warn('[AuthNet Webhook] Subscription suspended (past_due)', { arbId });
    }
}

async function handlePaymentSuccess(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    // Payment succeeded — if subscription was past_due, restore to active
    const profileId = (payload.profile as Record<string, unknown>)?.customerProfileId as string;
    if (!profileId) return;

    const snap = await firestore
        .collection('subscriptions')
        .where('authorizeNetCustomerProfileId', '==', profileId)
        .where('status', '==', 'past_due')
        .limit(1)
        .get();

    if (!snap.empty) {
        await snap.docs[0].ref.update({
            status: 'active',
            updatedAt: Timestamp.now(),
        });
        logger.info('[AuthNet Webhook] Subscription restored to active after payment', { profileId });
    }
}

async function handlePaymentFailed(
    firestore: FirebaseFirestore.Firestore,
    payload: Record<string, unknown>
) {
    const profileId = (payload.profile as Record<string, unknown>)?.customerProfileId as string;
    if (!profileId) return;

    const snap = await firestore
        .collection('subscriptions')
        .where('authorizeNetCustomerProfileId', '==', profileId)
        .limit(1)
        .get();

    if (!snap.empty) {
        await snap.docs[0].ref.update({
            status: 'past_due',
            updatedAt: Timestamp.now(),
        });
        logger.warn('[AuthNet Webhook] Payment declined — subscription set to past_due', { profileId });
    }
}
