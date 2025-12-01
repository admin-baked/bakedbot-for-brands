// [AI-THREAD P0-SEC-STRIPE-CONFIG]
// [Dev1-Claude @ 2025-11-30]:
//   Changed to lazy initialization to prevent build-time errors.
//   Stripe instance is only created when actually needed at runtime.

/**
 * Stripe Server-Side Integration
 */

import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Lazy initialization - only create Stripe instance when actually needed
let stripeInstance: Stripe | null = null;

function getStripeInstance(): Stripe {
    if (!STRIPE_SECRET_KEY) {
 * Creates a Stripe PaymentIntent for a given amount.
 * @param amount Amount in cents(e.g., $10.00 = 1000)
            * @param currency Currency code(default: usd)
                * @param metadata Optional metadata to attach to the intent(orderId, customerId)
                    */
        export async function createPaymentIntent(
            amount: number,
            currency: string = 'usd',
            metadata: Record<string, string> = {}
        ): Promise<Stripe.PaymentIntent> {
            try {
                const stripe = getStripeInstance();
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
                const stripe = getStripeInstance();
                return await stripe.paymentIntents.retrieve(paymentIntentId);
            } catch (error) {
                logger.error('Error retrieving PaymentIntent:', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }

        // Export stripe instance getter for other uses
        export const stripe = new Proxy({} as Stripe, {
            get(target, prop) {
                const instance = getStripeInstance();
                return (instance as any)[prop];
            }
        });
