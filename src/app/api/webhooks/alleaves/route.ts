/**
 * Alleaves Webhook Handler
 *
 * Receives real-time updates from Alleaves POS when:
 * - New customer is created
 * - Customer information is updated
 * - New order is placed
 * - Order status changes
 * - Inventory levels change (product.updated, inventory.updated, inventory.low_stock, product.deleted)
 *
 * This enables instant dashboard updates without waiting for cron sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import * as crypto from 'crypto';

export const maxDuration = 30;

interface AlleavesWebhookPayload {
    event:
        | 'customer.created' | 'customer.updated'
        | 'order.created' | 'order.updated'
        | 'inventory.updated' | 'inventory.low_stock'
        | 'product.updated' | 'product.deleted';
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

            case 'inventory.updated':
            case 'product.updated':
                await handleInventoryUpdateEvent(orgId, payload.data);
                break;

            case 'inventory.low_stock':
                await handleLowStockEvent(orgId, payload.data);
                break;

            case 'product.deleted':
                await handleProductDeletedEvent(orgId, payload.data);
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
 * Handle inventory update events (inventory.updated, product.updated)
 * Updates product quantity in Firestore publicViews and invalidates cache
 */
async function handleInventoryUpdateEvent(orgId: string, productData: any) {
    logger.info('[WEBHOOK] Processing inventory update event', {
        orgId,
        productId: productData.id,
        quantity: productData.quantity,
        name: productData.name,
    });

    // Invalidate the orders cache (order history reflects inventory)
    posCache.invalidate(cacheKeys.orders(orgId));

    // Update product in Firestore publicViews if we have enough data
    if (productData.id && (productData.quantity !== undefined || productData.stock !== undefined)) {
        try {
            const { firestore } = await createServerClient();
            const productRef = firestore
                .collection('publicViews')
                .doc(orgId)
                .collection('products')
                .doc('menu')
                .collection('items')
                .doc(productData.id.toString());

            const updateData: Record<string, any> = {
                updatedAt: new Date(),
            };

            if (productData.quantity !== undefined) updateData.quantity = productData.quantity;
            if (productData.stock !== undefined) updateData.stock = productData.stock;
            if (productData.price !== undefined) updateData.price = productData.price;
            if (productData.name !== undefined) updateData.name = productData.name;
            if (productData.category !== undefined) updateData.category = productData.category;

            // Only update if document exists
            const doc = await productRef.get();
            if (doc.exists) {
                await productRef.update(updateData);
                logger.info('[WEBHOOK] Updated product in publicViews', {
                    orgId,
                    productId: productData.id,
                });
            }
        } catch (updateError: any) {
            logger.warn('[WEBHOOK] Could not update product in publicViews', {
                orgId,
                productId: productData.id,
                error: updateError.message,
            });
        }
    }

    // Revalidate menu pages so Next.js serves fresh data
    try {
        revalidatePath('/menu');
        revalidatePath('/dashboard/pricing');
    } catch (_) {
        // Revalidation is best-effort outside of a request context
    }

    logger.debug('[WEBHOOK] Inventory update processed', { orgId, productId: productData.id });
}

/**
 * Handle low stock alerts
 * Creates a heartbeat notification for dispensary dashboard
 */
async function handleLowStockEvent(orgId: string, productData: any) {
    logger.info('[WEBHOOK] Low stock alert received', {
        orgId,
        productId: productData.id,
        productName: productData.name,
        quantity: productData.quantity,
        threshold: productData.low_stock_threshold,
    });

    // Create a heartbeat notification for the dispensary
    try {
        const { firestore } = await createServerClient();
        await firestore
            .collection('heartbeat_notifications')
            .add({
                orgId,
                type: 'low_stock',
                priority: 'high',
                title: `Low Stock: ${productData.name || `Product #${productData.id}`}`,
                message: `Only ${productData.quantity} units remaining${productData.low_stock_threshold ? ` (threshold: ${productData.low_stock_threshold})` : ''}`,
                metadata: {
                    productId: productData.id?.toString(),
                    productName: productData.name,
                    quantity: productData.quantity,
                    threshold: productData.low_stock_threshold,
                },
                createdAt: new Date(),
                read: false,
                notified: false,
            });

        logger.info('[WEBHOOK] Created low stock notification', {
            orgId,
            productId: productData.id,
        });
    } catch (notifyError: any) {
        logger.warn('[WEBHOOK] Could not create low stock notification', {
            error: notifyError.message,
        });
    }

    // Also invalidate product cache
    posCache.invalidateOrg(orgId);
}

/**
 * Handle product deletion events
 * Marks product as deleted or removes from publicViews
 */
async function handleProductDeletedEvent(orgId: string, productData: any) {
    logger.info('[WEBHOOK] Product deleted event received', {
        orgId,
        productId: productData.id,
    });

    if (!productData.id) return;

    try {
        const { firestore } = await createServerClient();
        const productRef = firestore
            .collection('publicViews')
            .doc(orgId)
            .collection('products')
            .doc('menu')
            .collection('items')
            .doc(productData.id.toString());

        const doc = await productRef.get();
        if (doc.exists) {
            // Soft delete: mark as deleted rather than removing
            await productRef.update({
                deleted: true,
                deletedAt: new Date(),
                stock: 0,
                quantity: 0,
            });

            logger.info('[WEBHOOK] Soft-deleted product in publicViews', {
                orgId,
                productId: productData.id,
            });

            // Revalidate menu
            try {
                revalidatePath('/menu');
            } catch (_) {
                // Best effort
            }
        }
    } catch (deleteError: any) {
        logger.warn('[WEBHOOK] Could not soft-delete product', {
            orgId,
            productId: productData.id,
            error: deleteError.message,
        });
    }
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
            'inventory.updated',
            'inventory.low_stock',
            'product.updated',
            'product.deleted',
        ],
    });
}
