/**
 * Authorize.net Webhook Receiver
 *
 * Receives recurring billing notifications from Authorize.net ARB (Automated Recurring Billing).
 * Updates org subscription status in Firestore based on payment outcome.
 *
 * Security: Validates HMAC-SHA512 signature using AUTHNET_SIGNATURE_KEY.
 * Authorize.net sends: X-Anet-Signature: sha512=<HMAC-SHA512(rawBody, signatureKey)>
 *
 * Register this URL in Authorize.net portal:
 *   Account -> Webhooks -> Add Endpoint -> https://bakedbot.ai/api/billing/authorize-net-webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Authorize.net ARB event types relevant to subscription lifecycle
const SUBSCRIPTION_ACTIVE_EVENTS = new Set([
    'net.authorize.payment.authcapture.created',
    'net.authorize.payment.capture.created',
    'net.authorize.payment.fraud.approved',
    'net.authorize.subscription.created',
]);

const SUBSCRIPTION_FAILED_EVENTS = new Set([
    'net.authorize.payment.declined',
    'net.authorize.payment.fraud.declined',
    'net.authorize.payment.void.created',
]);

const SUBSCRIPTION_SUSPENDED_EVENTS = new Set([
    'net.authorize.subscription.suspended',
]);

const SUBSCRIPTION_TERMINATED_EVENTS = new Set([
    'net.authorize.subscription.terminated',
    'net.authorize.subscription.cancelled',
    'net.authorize.subscription.expired',
]);

function asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function extractProfile(payload: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    const profile = payload?.profile;
    return profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : undefined;
}

function buildForensicsRecord(
    webhookRoot: Record<string, unknown>,
    webhookPayload: Record<string, unknown> | undefined,
    eventType: string,
    orgId: string | null,
    reason: 'missing_org_mapping' | 'unhandled_event_type',
) {
    const profile = extractProfile(webhookPayload);
    const payment = webhookPayload?.payment as Record<string, unknown> | undefined;
    const transaction = webhookPayload?.transaction as Record<string, unknown> | undefined;

    const transactionId =
        asString(webhookPayload?.id) ||
        asString(transaction?.id) ||
        asString(payment?.id);

    const amount =
        asNumber(webhookPayload?.authAmount) ??
        asNumber(webhookPayload?.amount) ??
        asNumber(payment?.amount);

    return {
        provider: 'authorize_net',
        source: 'billing_authorize_net_webhook',
        reason,
        eventType,
        orgId: orgId || null,
        webhookId: asString(webhookRoot.webhookId),
        notificationId: asString(webhookRoot.notificationId),
        eventDate: asString(webhookRoot.eventDate),
        transactionId,
        authCode: asString(webhookPayload?.authCode),
        responseCode: asString(webhookPayload?.responseCode),
        entityName: asString(webhookPayload?.entityName),
        merchantReferenceId: asString(webhookPayload?.merchantReferenceId),
        merchantCustomerId: asString(profile?.merchantCustomerId),
        customerProfileId: asString(profile?.customerProfileId),
        amount,
        observedAt: FieldValue.serverTimestamp(),
    };
}

async function recordForensics(
    db: FirebaseFirestore.Firestore,
    record: Record<string, unknown>,
) {
    try {
        await db.collection('payment_forensics').add(record);
    } catch (error) {
        logger.warn('[BILLING:WEBHOOK] Failed to persist forensics record', {
            reason: record.reason,
            eventType: record.eventType,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export async function POST(request: NextRequest) {
    // Read raw body for signature validation (must be done before any JSON parsing)
    const rawBody = await request.text();

    const signatureKey = process.env.AUTHNET_SIGNATURE_KEY;
    if (!signatureKey) {
        logger.error('[BILLING:WEBHOOK] AUTHNET_SIGNATURE_KEY not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Validate Authorize.net HMAC-SHA512 signature
    const sigHeader = request.headers.get('X-Anet-Signature') || '';
    const sigValue = sigHeader.replace(/^sha512=/i, '').toUpperCase();

    if (!sigValue) {
        logger.warn('[BILLING:WEBHOOK] Missing X-Anet-Signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const expected = crypto
        .createHmac('sha512', signatureKey)
        .update(rawBody)
        .digest('hex')
        .toUpperCase();

    // Use timing-safe comparison to prevent timing attacks
    let sigValid = false;
    try {
        sigValid = crypto.timingSafeEqual(
            Buffer.from(sigValue.padEnd(expected.length, '0')),
            Buffer.from(expected.padEnd(sigValue.length, '0')),
        ) && sigValue.length === expected.length;
    } catch {
        sigValid = false;
    }

    if (!sigValid) {
        logger.warn('[BILLING:WEBHOOK] Invalid signature - possible replay or spoofed request');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and process event
    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
        logger.error('[BILLING:WEBHOOK] Failed to parse JSON body');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = payload?.eventType as string | undefined;
    const webhookPayload = payload?.payload as Record<string, unknown> | undefined;

    // Extract orgId from merchantReferenceId (set during subscription creation)
    const orgId = (webhookPayload?.merchantReferenceId as string | undefined)
        ?? (webhookPayload?.profile as Record<string, unknown> | undefined)?.merchantCustomerId as string | undefined;

    logger.info('[BILLING:WEBHOOK] Received event', {
        eventType,
        orgId: orgId || 'unknown',
        webhookId: payload?.webhookId,
    });

    if (!eventType) {
        // Acknowledge ping/test events
        return NextResponse.json({ received: true });
    }

    const db = getAdminFirestore();

    if (!orgId) {
        logger.warn('[BILLING:WEBHOOK] No orgId in webhook payload - cannot update subscription', {
            eventType,
            webhookId: payload?.webhookId,
        });
        await recordForensics(
            db,
            buildForensicsRecord(payload, webhookPayload, eventType, null, 'missing_org_mapping'),
        );
        // Return 200 to prevent Authorize.net retries for structurally unprocessable events
        return NextResponse.json({ received: true, warning: 'No orgId' });
    }

    try {
        const subscriptionRef = db
            .collection('organizations')
            .doc(orgId)
            .collection('subscription')
            .doc('current');

        const historyRef = db
            .collection('organizations')
            .doc(orgId)
            .collection('subscriptionHistory')
            .doc();

        let newStatus: string | null = null;

        if (SUBSCRIPTION_ACTIVE_EVENTS.has(eventType)) {
            newStatus = 'active';
        } else if (SUBSCRIPTION_FAILED_EVENTS.has(eventType)) {
            newStatus = 'payment_failed';
        } else if (SUBSCRIPTION_SUSPENDED_EVENTS.has(eventType)) {
            newStatus = 'suspended';
        } else if (SUBSCRIPTION_TERMINATED_EVENTS.has(eventType)) {
            newStatus = 'cancelled';
        }

        if (newStatus) {
            await subscriptionRef.set(
                {
                    status: newStatus,
                    updatedAt: FieldValue.serverTimestamp(),
                    lastWebhookEvent: eventType,
                    lastWebhookAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
            );

            await historyRef.set({
                event: 'webhook_status_update',
                status: newStatus,
                webhookEventType: eventType,
                orgId,
                at: FieldValue.serverTimestamp(),
            });

            logger.info('[BILLING:WEBHOOK] Subscription status updated', {
                orgId,
                eventType,
                newStatus,
            });

            // Alert on payment failure so the team can follow up
            if (newStatus === 'payment_failed' || newStatus === 'suspended') {
                const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
                if (slackWebhookUrl) {
                    await fetch(slackWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: `:warning: *BakedBot Billing Alert*\nOrg \`${orgId}\` subscription is now \`${newStatus}\` - triggered by Authorize.net event \`${eventType}\`.\nCheck Firestore: \`organizations/${orgId}/subscription/current\``,
                        }),
                    }).catch(err => logger.warn('[BILLING:WEBHOOK] Slack alert failed', { error: String(err) }));
                }
            }
        } else {
            logger.info('[BILLING:WEBHOOK] Unhandled event type (no status change)', { eventType, orgId });
            await recordForensics(
                db,
                buildForensicsRecord(payload, webhookPayload, eventType, orgId, 'unhandled_event_type'),
            );
        }

        return NextResponse.json({ received: true, processed: !!newStatus });
    } catch (err) {
        logger.error('[BILLING:WEBHOOK] Failed to update subscription', {
            orgId,
            eventType,
            error: (err as Error).message,
        });
        // Return 500 so Authorize.net retries delivery
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
