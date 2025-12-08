/**
 * API Route: Create Payment Intent
 * Creates a Stripe PaymentIntent for the checkout flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/payments/stripe';
import { createServerClient } from '@/firebase/server-client';

import { logger } from '@/lib/logger';
export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth, firestore } = await createServerClient();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const body = await req.json();
        const { orderId, customerId } = body;

        // Verify order exists and belongs to user
        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderDoc.data();
        if (orderData?.customerId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // FAILSAFE: Use server-side total
        const amountToCharge = orderData?.total || orderData?.amount || 0;

        if (amountToCharge <= 0) {
            return NextResponse.json({ error: 'Invalid order total' }, { status: 400 });
        }

        const paymentIntent = await createPaymentIntent(Math.round(amountToCharge * 100), 'usd', {
            orderId,
            customerId,
            brandId: orderData?.brandId || '',
        });

        // Update order with payment intent ID
        await firestore.collection('orders').doc(orderId).update({
            paymentIntentId: paymentIntent.id,
            paymentStatus: 'pending',
            updatedAt: new Date(),
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
        });
    } catch (error: any) {
        logger.error('Payment Intent Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create payment intent' },
            { status: 500 }
        );
    }
}
