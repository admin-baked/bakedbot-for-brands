// [AI-THREAD P0-SEC-STRIPE-CONFIG]
// [Dev1-Claude @ 2025-11-29]:
//   Removed dummy key fallback. Now fails fast if STRIPE_SECRET_KEY is missing.
//   This prevents production errors where Stripe operations would silently fail.
// [Dev4-Orchestrator @ 2025-12-01]:
//   Switched Stripe client to lazy initialization so Firebase builds without secrets
//   don't crash, while runtime still fails fast when the key is missing.

/**
 * Stripe Server-Side Integration
 */

import Stripe from 'stripe';

import { logger } from '@/lib/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripeClient: Stripe | null = null;

/**
 * Lazily initializes Stripe to avoid build-time failures when env vars
 * are not injected (Firebase App Hosting builds without secrets by default).
 *
 * Runtime behavior still fails fast if STRIPE_SECRET_KEY is missing.
 */
export function getStripeClient(): Stripe {
    if (stripeClient) {
        return stripeClient;
    }

    if (!STRIPE_SECRET_KEY) {
        const error = new Error(
            '[P0-SEC-STRIPE-CONFIG] CRITICAL: STRIPE_SECRET_KEY is not configured. Stripe features are disabled.',
        );
        logger.error(error.message);
        throw error;
    }

    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
        typescript: true,
    });

    return stripeClient;
}

/**
 * Creates a Stripe PaymentIntent for a given amount.
 * @param amount Amount in cents (e.g., $10.00 = 1000)
 * @param currency Currency code (default: usd)
 * @param metadata Optional metadata to attach to the intent (orderId, customerId)
 */
export async function createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {},
): Promise<Stripe.PaymentIntent> {
    try {
        const stripe = getStripeClient();
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
        logger.error('Error creating PaymentIntent:', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

/**
 * Retrieves a PaymentIntent by ID.
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
        const stripe = getStripeClient();
        return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
        logger.error('Error retrieving PaymentIntent:', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
