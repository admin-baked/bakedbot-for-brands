/**
 * Stripe Server-Side Integration
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY is missing. Stripe features will not work.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
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
        console.error('Error creating PaymentIntent:', error);
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
        console.error('Error retrieving PaymentIntent:', error);
        throw error;
    }
}
