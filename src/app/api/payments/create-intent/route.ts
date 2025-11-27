/**
 * API Route: Create Payment Intent
 * Creates a Stripe PaymentIntent for the checkout flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/payments/stripe';
import { createServerClient } from '@/firebase/server-client';

export async function POST(req: NextRequest) {
    try {
        // Initialize server client if needed for auth verification
        // const { auth } = await createServerClient();

        const body = await req.json();
        const { amount, orderId, customerId } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // TODO: Fetch order from Firestore to verify amount matches
        // const order = await getOrder(orderId);
        // if (order.total !== amount) throw new Error('Amount mismatch');

        const paymentIntent = await createPaymentIntent(Math.round(amount * 100), 'usd', {
            orderId,
            customerId,
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
        });
    } catch (error: any) {
        console.error('Payment Intent Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create payment intent' },
            { status: 500 }
        );
    }
}
