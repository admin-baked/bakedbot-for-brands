/**
 * API Route: Stripe Webhooks
 * Handles asynchronous payment updates from Stripe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Initialize Firestore
const { firestore: db } = typeof window !== 'undefined'
    ? initializeFirebase()
    : { firestore: null as any }; // This is a server route, so we might need admin SDK or standard client

// Note: For webhooks in Next.js App Router, we need to read the raw body
// This helper reads the raw body as a buffer
async function getRawBody(req: NextRequest): Promise<Buffer> {
    const blob = await req.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
    const body = await req.text(); // Stripe needs the raw string body for signature verification
    const sig = req.headers.get('stripe-signature') as string;

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is missing');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await handlePaymentSuccess(paymentIntent);
                break;
            case 'payment_intent.payment_failed':
                const paymentFailed = event.data.object;
                await handlePaymentFailure(paymentFailed);
                break;
            default:
                // Unexpected event type
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (error) {
        console.error('Error handling webhook event:', error);
        return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: any) {
    const { orderId } = paymentIntent.metadata;
    if (!orderId) return;

    console.log(`Payment succeeded for Order ${orderId}`);

    const { firestore } = await import('@/firebase/server-client').then(m => m.createServerClient());
    await firestore.collection('orders').doc(orderId).update({
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(),
        updatedAt: new Date(),
    });
}

async function handlePaymentFailure(paymentIntent: any) {
    const { orderId } = paymentIntent.metadata;
    if (!orderId) return;

    console.log(`Payment failed for Order ${orderId}`);

    const { firestore } = await import('@/firebase/server-client').then(m => m.createServerClient());
    await firestore.collection('orders').doc(orderId).update({
        paymentStatus: 'failed',
        paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
        updatedAt: new Date(),
    });
}
