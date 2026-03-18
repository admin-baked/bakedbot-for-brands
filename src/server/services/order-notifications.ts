/**
 * Order Notifications Service
 *
 * Sends SMS (Blackleaf) and Slack notifications at order lifecycle events:
 *   - Order created → customer SMS + dispensary Slack alert
 *   - Order accepted → customer SMS ("being prepared")
 *   - Order ready → customer SMS ("ready for pickup")
 *   - Order cancelled → customer SMS
 *
 * All callers should use setImmediate() — notifications never block order writes.
 * Fails silently when credentials are not configured.
 */

import { logger } from '@/lib/logger';
import { createServerClient } from '@/firebase/server-client';
import type { OrderDoc } from '@/types/orders';

const BLACKLEAF_BASE_URL = process.env.BLACKLEAF_BASE_URL || 'https://api.blackleaf.io';
const BLACKLEAF_API_KEY = process.env.BLACKLEAF_API_KEY;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_ORDERS_CHANNEL = process.env.SLACK_ORDERS_CHANNEL || '#orders';

// ── Internal helpers ──────────────────────────────────────────────────────────

async function sendSms(to: string, message: string): Promise<void> {
    if (!BLACKLEAF_API_KEY) {
        logger.warn('[order-notifications] BLACKLEAF_API_KEY not configured — SMS skipped', { to });
        return;
    }

    const phone = to.replace(/\D/g, '');
    if (phone.length < 10) return;

    try {
        const res = await fetch(`${BLACKLEAF_BASE_URL}/api/v1/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${BLACKLEAF_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: phone, message }),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            logger.warn('[order-notifications] SMS failed', { status: res.status, text });
        }
    } catch (err) {
        logger.error('[order-notifications] sendSms error', { err, to: phone });
    }
}

async function slackAlert(text: string): Promise<void> {
    if (!SLACK_BOT_TOKEN) return;

    try {
        await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ channel: SLACK_ORDERS_CHANNEL, text }),
            signal: AbortSignal.timeout(8000),
        });
    } catch (err) {
        logger.error('[order-notifications] slackAlert error', { err });
    }
}

async function loadOrder(orderId: string): Promise<OrderDoc | null> {
    try {
        const { firestore } = await createServerClient();
        const doc = await firestore.collection('orders').doc(orderId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as OrderDoc;
    } catch (err) {
        logger.error('[order-notifications] loadOrder failed', { orderId, err });
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Called immediately after a new order is created via SmokeyPay.
 */
export async function notifyOrderCreated(orderId: string, orgId: string): Promise<void> {
    const order = await loadOrder(orderId);
    if (!order) return;

    const customerPhone = order.customer?.phone;
    const customerName = order.customer?.name ?? 'there';
    const shortId = orderId.slice(-6).toUpperCase();

    // Customer SMS
    if (customerPhone) {
        await sendSms(
            customerPhone,
            `Hi ${customerName}! Your order #${shortId} has been received. ` +
            `We'll text you when it's ready for pickup. 🌿 — Powered by SmokeyPay`
        );
    }

    // Dispensary Slack alert
    await slackAlert(
        `:new: *New SmokeyPay Order* #${shortId}\n` +
        `Customer: ${order.customer?.name ?? 'Guest'} · ${order.customer?.email ?? ''}\n` +
        `Items: ${order.items?.length ?? 0} · Total: $${order.totals?.total?.toFixed(2) ?? '?'}\n` +
        `Org: ${orgId}`
    );

    logger.info('[order-notifications] notifyOrderCreated sent', { orderId, orgId });
}

/**
 * Called when dispensary updates order status.
 */
export async function notifyOrderStatusChanged(
    orderId: string,
    newStatus: string
): Promise<void> {
    const order = await loadOrder(orderId);
    if (!order) return;

    const customerPhone = order.customer?.phone;
    if (!customerPhone) return;

    const shortId = orderId.slice(-6).toUpperCase();

    const messages: Record<string, string> = {
        accepted:
            `Your order #${shortId} has been accepted and is being prepared. ` +
            `We'll let you know when it's ready! 🛒`,
        ready:
            `Your order #${shortId} is ready for pickup! ` +
            `Please head to the store with your ID. ✅`,
        cancelled:
            `Your order #${shortId} has been cancelled. ` +
            `Please contact us if you have questions. 💚`,
    };

    const message = messages[newStatus];
    if (message) {
        await sendSms(customerPhone, message);
        logger.info('[order-notifications] status SMS sent', { orderId, newStatus });
    }
}
