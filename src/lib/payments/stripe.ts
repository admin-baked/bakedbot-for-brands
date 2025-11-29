// [AI-THREAD P0-SEC-STRIPE-CONFIG]
// [Dev1-Claude @ 2025-11-29]:
//   Removed dummy key fallback. Now fails fast if STRIPE_SECRET_KEY is missing.
//   This prevents production errors where Stripe operations would silently fail.

/**
 * Stripe Server-Side Integration
 */

import Stripe from 'stripe';

import { logger } from '@/lib/logger';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    throw new Error('[P0-SEC-STRIPE-CONFIG] CRITICAL: STRIPE_SECRET_KEY is not configured. Stripe features are disabled.');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
    typescript: true,
});

/**
 * Creates a Stripe PaymentIntent for a given amount.
 * @param amount Amount in cents (e.g., $10.00 = 1000)
 * @param currency Currency code (default: usd)
 * @param metadata Optional metadata to attach to the intent (orderId, customerId)
 */
export async function createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        return paymentIntent;
    } catch (error) {
        logger.error('Error creating PaymentIntent:', error);
        throw error;
    }
}

/**
 * Retrieves a PaymentIntent by ID.
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
        return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
        logger.error('Error retrieving PaymentIntent:', error);
        throw error;
    }
}
