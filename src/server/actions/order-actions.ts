'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrderStatus } from '@/types/orders';
import { sendOrderNotification } from './order-notifications';
import { BundleRedemptionService } from '@/server/services/bundle-redemption';
import { LoyaltySyncService } from '@/server/services/loyalty-sync';
import { TierAdvancementService } from '@/server/services/tier-advancement';
import type { LoyaltySettings } from '@/types/customers';

/**
 * Accept an order (dispensary confirms they will fulfill)
 */
export async function acceptOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const currentStatus = orderDoc.data()?.status as OrderStatus;
        if (currentStatus !== 'pending') {
            return { success: false, error: `Cannot accept order with status: ${currentStatus}` };
        }

        await orderRef.update({
            status: 'preparing' as OrderStatus,
            acceptedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Order accepted', { orderId });

        // Send notification to customer
        await sendOrderNotification(orderId, 'preparing');

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to accept order:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark order as ready for pickup
 */
export async function markOrderReady(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const currentStatus = orderDoc.data()?.status as OrderStatus;
        if (currentStatus !== 'preparing') {
            return { success: false, error: `Cannot mark ready from status: ${currentStatus}` };
        }

        await orderRef.update({
            status: 'ready' as OrderStatus,
            readyAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Order ready', { orderId });

        // Send "Ready for Pickup" notification to customer
        await sendOrderNotification(orderId, 'ready');

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to mark order ready:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark order as fulfilled/completed
 */
export async function fulfillOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const orderData = orderDoc.data();
        const currentStatus = orderData?.status as OrderStatus;
        if (!['ready', 'preparing'].includes(currentStatus)) {
            return { success: false, error: `Cannot fulfill order with status: ${currentStatus}` };
        }

        await orderRef.update({
            status: 'completed' as OrderStatus,
            fulfilledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Order fulfilled', { orderId });

        // Send completion notification
        await sendOrderNotification(orderId, 'completed');

        // Post-fulfillment tasks (non-blocking)
        // 1. Track bundle redemptions
        if (orderData?.bundleId && orderData?.customerId && orderData?.orgId) {
            const redemptionService = new BundleRedemptionService();
            const redemptionResult = await redemptionService.recordRedemption(
                orderData.bundleId,
                orderData.customerId,
                orderId,
                orderData.orgId
            );

            if (!redemptionResult.success) {
                logger.warn('Bundle redemption tracking failed (non-fatal)', {
                    orderId,
                    bundleId: orderData.bundleId,
                    error: redemptionResult.error,
                });
            }
        }

        // 2. Award loyalty points and check tier advancement
        if (orderData?.customerId && orderData?.orgId && orderData?.total) {
            try {
                // Fetch loyalty settings
                const loyaltySettingsDoc = await firestore
                    .collection('tenants')
                    .doc(orderData.orgId)
                    .collection('settings')
                    .doc('loyalty')
                    .get();

                if (loyaltySettingsDoc.exists) {
                    const loyaltySettings = loyaltySettingsDoc.data() as LoyaltySettings;

                    // Award points (uses transaction for atomic increment)
                    const loyaltySyncService = new LoyaltySyncService(
                        {} as any, // ALLeavesClient not needed for this method
                        undefined
                    );

                    const pointsResult = await loyaltySyncService.awardPointsForOrder(
                        orderData.customerId,
                        orderData.orgId,
                        orderData.total,
                        orderId,
                        loyaltySettings,
                        orderData.equityStatus || false
                    );

                    if (pointsResult.success) {
                        logger.info('Loyalty points awarded', {
                            orderId,
                            pointsAwarded: pointsResult.pointsAwarded,
                        });

                        // Check tier advancement (instant check after order)
                        const tierService = new TierAdvancementService();
                        const tierResult = await tierService.assignTierForCustomer(
                            orderData.customerId,
                            orderData.orgId,
                            loyaltySettings
                        );

                        if (tierResult && tierResult.promoted) {
                            logger.info('Customer promoted to new tier', {
                                orderId,
                                customerId: orderData.customerId,
                                from: tierResult.previousTier,
                                to: tierResult.newTier,
                            });
                        }
                    } else {
                        logger.warn('Loyalty points award failed (non-fatal)', {
                            orderId,
                            error: pointsResult.error,
                        });
                    }
                }
            } catch (loyaltyError: any) {
                logger.warn('Loyalty processing failed (non-fatal)', {
                    orderId,
                    error: loyaltyError.message,
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to fulfill order:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel an order
 */
export async function cancelOrder(
    orderId: string,
    reason: string,
    cancelledBy: 'dispensary' | 'customer'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const currentStatus = orderDoc.data()?.status as OrderStatus;
        if (['completed', 'cancelled'].includes(currentStatus)) {
            return { success: false, error: `Cannot cancel order with status: ${currentStatus}` };
        }

        await orderRef.update({
            status: 'cancelled' as OrderStatus,
            cancelledAt: FieldValue.serverTimestamp(),
            cancellationReason: reason,
            cancelledBy,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Order cancelled', { orderId, reason, cancelledBy });

        // Send cancellation notification
        await sendOrderNotification(orderId, 'cancelled');

        // TODO: Process refund if payment was made

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to cancel order:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get orders for a dispensary
 */
export async function getDispensaryOrders(
    retailerId: string,
    status?: OrderStatus,
    limit: number = 50
): Promise<{ orders: any[]; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        let query = firestore
            .collection('orders')
            .where('retailerId', '==', retailerId)
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            updatedAt: doc.data().updatedAt?.toDate?.() || null,
        }));

        return { orders };
    } catch (error: any) {
        logger.error('Failed to get dispensary orders:', error);
        return { orders: [], error: error.message };
    }
}

/**
 * Get order statistics for a dispensary
 */
export async function getOrderStats(retailerId: string): Promise<{
    pending: number;
    preparing: number;
    ready: number;
    completed: number;
    cancelled: number;
}> {
    try {
        const { firestore } = await createServerClient();

        const statuses: OrderStatus[] = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
        const results: Record<string, number> = {};

        await Promise.all(
            statuses.map(async (status) => {
                const snapshot = await firestore
                    .collection('orders')
                    .where('retailerId', '==', retailerId)
                    .where('status', '==', status)
                    .count()
                    .get();
                results[status] = snapshot.data().count;
            })
        );

        return {
            pending: results.pending || 0,
            preparing: results.preparing || 0,
            ready: results.ready || 0,
            completed: results.completed || 0,
            cancelled: results.cancelled || 0,
        };
    } catch (error: any) {
        logger.error('Failed to get order stats:', error);
        return { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    }
}
