// [AI-THREAD P0-SEC-RBAC-API]
// [Dev1-Claude @ 2025-11-29]:
//   Added server-side role-based authorization using existing auth helpers.
//   Now requires 'dispensary' or 'owner' role to access dispensary orders.

/**
 * API Route: Get Dispensary Orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireRole } from '@/server/auth/rbac';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

        const { firestore } = await createServerClient();
        const dispensaryId = user.locationId;

        if (!dispensaryId) {
            return NextResponse.json({ error: 'Dispensary ID not found' }, { status: 404 });
        }

        const ordersSnapshot = await firestore
            .collection('orders')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', 'in', ['confirmed', 'preparing', 'ready'])
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const orders = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
        }));

        return NextResponse.json({ orders });
    } catch (error: any) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
