/**
 * API Route: Update Order Status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth, firestore } = await createServerClient();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { status } = await req.json();
        const { orderId } = params;

        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderDoc.data();

        // If completing order, deduct stock
        if (status === 'completed' && orderData?.status !== 'completed') {
            const { inventoryService } = await import('@/lib/inventory/inventory-service');

            // Validate first
            const validation = await inventoryService.validateStock(orderData?.items || []);
            if (!validation.valid) {
                return NextResponse.json({
                    error: 'Inventory validation failed',
                    details: validation.errors
                }, { status: 400 });
            }

            // Deduct stock
            await inventoryService.deductStock(orderData?.items || []);
        }

        await firestore.collection('orders').doc(orderId).update({
            status,
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating order:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update order' },
            { status: 500 }
        );
    }
}
