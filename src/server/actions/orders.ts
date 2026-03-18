'use server';

// src/server/actions/orders.ts
// Server actions for dispensary order management dashboard.

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type { OrderDoc, OrderStatus } from '@/types/orders';

/**
 * Fetch all orders for the authenticated user's org, newest first.
 */
export async function getOrgOrders(): Promise<OrderDoc[]> {
    const session = await requireUser();
    const { firestore } = await createServerClient();

    try {
        const snap = await firestore
            .collection('orders')
            .where('brandId', '==', session.orgId)
            .orderBy('createdAt', 'desc')
            .limit(200)
            .get();

        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as OrderDoc));
    } catch (err) {
        logger.error('[orders] getOrgOrders failed', { orgId: session.orgId, err });
        return [];
    }
}

/**
 * Update an order's status. Only org members can update their own orders.
 */
export async function updateOrderStatus(
    orderId: string,
    status: Extract<OrderStatus, 'accepted' | 'ready' | 'fulfilled' | 'cancelled'>
): Promise<{ success: boolean; error?: string }> {
    const session = await requireUser();
    const { firestore } = await createServerClient();

    try {
        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data() as OrderDoc;
        if (order.brandId !== session.orgId) {
            return { success: false, error: 'Forbidden' };
        }

        await orderRef.update({
            status,
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('[orders] status updated', { orderId, status, orgId: session.orgId });
        return { success: true };
    } catch (err) {
        logger.error('[orders] updateOrderStatus failed', { orderId, status, err });
        return { success: false, error: 'Failed to update order status' };
    }
}
