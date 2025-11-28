/**
 * API Route: Get Dispensary Orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth, firestore } = await createServerClient();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const userDoc = await firestore.collection('users').doc(userId).get();
        const dispensaryId = userDoc.data()?.dispensaryId;

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
