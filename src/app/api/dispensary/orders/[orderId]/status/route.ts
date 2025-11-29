// [AI-THREAD P0-SEC-RBAC-API]
// [Dev1-Claude @ 2025-11-29]:
//   Added server-side role-based authorization.
//   Now requires 'dispensary' or 'owner' role and validates order access.

/**
 * API Route: Update Order Status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireRole, canAccessOrder } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { orderId: string } }
) {
    try {
        // Authenticate and authorize user
        const user = await getUserFromRequest(req);
        if (!user) {
            logger.warn('[P0-SEC-RBAC-API] Unauthorized request - no valid token', {
                path: req.nextUrl.pathname,
            });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Require dispensary or owner role
        try {
            requireRole(user, 'dispensary');
        } catch (error: any) {
            logger.error('[P0-SEC-RBAC-API] Forbidden - insufficient role', {
                path: req.nextUrl.pathname,
                userRole: user.role,
                requiredRole: 'dispensary',
                uid: user.uid,
            });
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const { status } = await req.json();
        const { orderId } = params;

        const { firestore } = await createServerClient();
        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderDoc.data();

        // Verify user can access this order
        if (!orderData || !canAccessOrder(user, orderData)) {
            logger.error('[P0-SEC-RBAC-API] Forbidden - cannot access order', {
                path: req.nextUrl.pathname,
                userRole: user.role,
                orderId,
                uid: user.uid,
            });
            return NextResponse.json({ error: 'Forbidden: cannot access this order' }, { status: 403 });
        }

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

            // Send completion email
            if (orderData?.customerEmail) {
                const { emailService } = await import('@/lib/notifications/email-service');
                await emailService.sendOrderCompleted(orderData, orderData.customerEmail);
            }
        }

        // Handle "Ready" status notifications
        if (status === 'ready' && orderData?.status !== 'ready') {
            const { emailService } = await import('@/lib/notifications/email-service');
            const { blackleafService } = await import('@/lib/notifications/blackleaf-service');

            // Send Email
            if (orderData?.customerEmail) {
                await emailService.sendOrderReady(orderData, orderData.customerEmail);
            }

            // Send SMS
            if (orderData?.customerPhone) {
                await blackleafService.sendOrderReady(orderData, orderData.customerPhone);
            }
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
