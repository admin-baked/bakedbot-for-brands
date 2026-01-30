/**
 * Alleaves Webhook Handler
 *
 * Receives real-time updates from Alleaves POS when:
 * - New customer is created
 * - Customer information is updated
 * - New order is placed
 * - Order status changes
 *
 * This enables instant dashboard updates without waiting for cron sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { logger } from '@/lib/logger';
import * as crypto from 'crypto';

export const maxDuration = 30;

interface AlleavesWebhookPayload {
    event: 'customer.created' | 'customer.updated' | 'order.created' | 'order.updated';
    data: {
        id: string | number;
        orgId?: string;
        locationId?: string;
        [key: string]: any;
    };
    timestamp: string;
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Handle webhook POST request
 */
export async function POST(request: NextRequest) {
    try {
        // Read raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get('x-alleaves-signature');

        // Get webhook secret from environment or Firestore
        const webhookSecret = process.env.ALLEAVES_WEBHOOK_SECRET || '';

        // Verify signature (skip in development)
        if (process.env.NODE_ENV === 'production' && webhookSecret) {
            const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

            if (!isValid) {
                logger.warn('[WEBHOOK] Invalid Alleaves webhook signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
        }

        // Parse payload
        const payload: AlleavesWebhookPayload = JSON.parse(rawBody);

        logger.info('[WEBHOOK] Received Alleaves webhook', {
            event: payload.event,
            dataId: payload.data.id,
            timestamp: payload.timestamp,
        });

        // Determine orgId from payload or lookup
        let orgId = payload.data.orgId;

        if (!orgId && payload.data.locationId) {
            // Lookup orgId from locationId
            const { firestore } = await createServerClient();
            const locationDoc = await firestore
                .collection('locations')
                .doc(payload.data.locationId.toString())
                .get();

            if (locationDoc.exists) {
                orgId = locationDoc.data()?.orgId;
            }
        }

        if (!orgId) {
            logger.warn('[WEBHOOK] Could not determine orgId from webhook payload');
            return NextResponse.json(
                { error: 'Missing orgId' },
                { status: 400 }
            );
        }

        // Handle different webhook events
        switch (payload.event) {
            case 'customer.created':
            case 'customer.updated':
                await handleCustomerEvent(orgId, payload.data);
                break;

            case 'order.created':
            case 'order.updated':
                await handleOrderEvent(orgId, payload.data);
                break;

            default:
                logger.warn('[WEBHOOK] Unknown event type', { event: payload.event });
        }

        return NextResponse.json({
            success: true,
            received: true,
            event: payload.event,
        });
    } catch (error: any) {
        logger.error('[WEBHOOK] Webhook processing failed', {
            error: error.message,
        });

        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

/**
 * Handle customer webhook events
 */
async function handleCustomerEvent(orgId: string, customerData: any) {
    logger.info('[WEBHOOK] Processing customer event', {
        orgId,
        customerId: customerData.id,
    });

    // Invalidate customer cache to force refresh
    posCache.invalidate(cacheKeys.customers(orgId));

    // Optional: Update specific customer in cache
    // This could be enhanced to update just this one customer
    // instead of invalidating the entire cache

    logger.debug('[WEBHOOK] Invalidated customer cache', { orgId });
}

/**
 * Handle order webhook events
 */
async function handleOrderEvent(orgId: string, orderData: any) {
    logger.info('[WEBHOOK] Processing order event', {
        orgId,
        orderId: orderData.id,
    });

    // Invalidate orders cache to force refresh
    posCache.invalidate(cacheKeys.orders(orgId));

    // Also invalidate customers cache since order affects customer stats
    posCache.invalidate(cacheKeys.customers(orgId));

    logger.debug('[WEBHOOK] Invalidated order and customer caches', { orgId });

    // Optional: Send real-time notification to dashboard
    // This could use Server-Sent Events or WebSockets
}

/**
 * GET endpoint for webhook verification/testing
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');

    // Webhook verification (used by some providers)
    if (challenge) {
        return NextResponse.json({ challenge });
    }

    return NextResponse.json({
        status: 'ready',
        endpoint: '/api/webhooks/alleaves',
        events: [
            'customer.created',
            'customer.updated',
            'order.created',
            'order.updated',
        ],
    });
}
