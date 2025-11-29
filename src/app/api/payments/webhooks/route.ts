// [AI-THREAD P0-SEC-STRIPE-CONFIG]
// [Dev1-Claude @ 2025-11-29]:
//   Enhanced Stripe webhook handler with structured logging and improved error handling.
//   Matches security pattern from CannPay webhook implementation.

/**
 * API Route: Stripe Webhooks
 * Handles asynchronous payment updates from Stripe.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.text(); // Stripe needs the raw string body for signature verification
        const sig = req.headers.get('stripe-signature');

        // Fail fast if webhook secret is not configured
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.critical('[P0-SEC-STRIPE-CONFIG] STRIPE_WEBHOOK_SECRET not configured');
            return NextResponse.json(
                { error: 'Payment gateway configuration error' },
                { status: 500 }
            );
        }

        if (!sig) {
            logger.error('[P0-SEC-STRIPE-CONFIG] SECURITY: Missing stripe-signature header');
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 403 }
            );
        }

        // Verify webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        } catch (err: any) {
            logger.error('[P0-SEC-STRIPE-CONFIG] SECURITY: Invalid signature detected', {
                error: err?.message,
            });
            return NextResponse.json(
                { error: `Webhook signature verification failed: ${err.message}` },
                { status: 403 }
            );
        }

        // Handle the event
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
                // Log unhandled event types for debugging
                logger.debug('[P0-SEC-STRIPE-CONFIG] Unhandled event type:', { type: event.type });
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        logger.error('[P0-SEC-STRIPE-CONFIG] Webhook processing failed', {
            error: err?.message,
            stack: err?.stack,
        });
        return NextResponse.json(
            { error: err?.message || 'Webhook processing error' },
            { status: 500 }
        );
    }
}

async function handlePaymentSuccess(paymentIntent: any) {
    const { orderId } = paymentIntent.metadata;
    if (!orderId) {
        logger.warn('[P0-SEC-STRIPE-CONFIG] Payment succeeded but no orderId in metadata', {
            paymentIntentId: paymentIntent.id,
        });
        return;
    }

    logger.info('[P0-SEC-STRIPE-CONFIG] Payment succeeded', {
        orderId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
    });

    const { firestore } = await import('@/firebase/server-client').then(m => m.createServerClient());
    await firestore.collection('orders').doc(orderId).update({
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date(),
        updatedAt: new Date(),
        stripe: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
        },
    });
}

async function handlePaymentFailure(paymentIntent: any) {
    const { orderId } = paymentIntent.metadata;
    if (!orderId) {
        logger.warn('[P0-SEC-STRIPE-CONFIG] Payment failed but no orderId in metadata', {
            paymentIntentId: paymentIntent.id,
        });
        return;
    }

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
    logger.error('[P0-SEC-STRIPE-CONFIG] Payment failed', {
        orderId,
        paymentIntentId: paymentIntent.id,
        error: errorMessage,
    });

    const { firestore } = await import('@/firebase/server-client').then(m => m.createServerClient());
    await firestore.collection('orders').doc(orderId).update({
        paymentIntentId: paymentIntent.id,
        paymentStatus: 'failed',
        paymentError: errorMessage,
        updatedAt: new Date(),
        stripe: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            lastError: paymentIntent.last_payment_error,
        },
    });
}
