'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { logger } from '@/lib/logger';
import { PRICING_PLANS } from '@/lib/config/pricing';

type CreateSubscriptionInput = {
    planId: string;
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    paymentData?: any;
};

export async function createSubscription(input: CreateSubscriptionInput) {
    try {
        const { firestore } = await createServerClient();

        // 1. Validate Plan
        const plan = PRICING_PLANS.find(p => p.id === input.planId);
        if (!plan) {
            return { success: false, error: 'Invalid plan selected.' };
        }

        let transactionId = null;
        let subscriptionStatus = 'active'; // Default to active for free plans

        // 2. Process Initial Payment (if not free)
        if (plan.price && plan.price > 0 && input.paymentData) {
            logger.info('Processing subscription payment', { plan: plan.id, amount: plan.price });

            const paymentResult = await createTransaction({
                amount: plan.price,
                // Opaque Data from Accept.js
                opaqueData: input.paymentData.opaqueData,
                // Fallback for raw card data (testing/backend)
                cardNumber: input.paymentData.cardNumber,
                expirationDate: input.paymentData.expirationDate,
                cvv: input.paymentData.cvv,
                customer: {
                    email: input.customer.email,
                    firstName: input.customer.name.split(' ')[0],
                    lastName: input.customer.name.split(' ').slice(1).join(' '),
                    zip: input.paymentData.zip,
                },
                description: `Subscription: ${plan.name} Plan`
            });

            if (!paymentResult.success) {
                logger.warn('Subscription payment failed', { errors: paymentResult.errors });
                return {
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.'
                };
            }

            transactionId = paymentResult.transactionId;
            logger.info('Subscription initial payment successful', { transactionId });

            // TODO: In a real implementation with ARB, we would create the ARB subscription here using transactionId as ref
            // For now, we manually mark it for setup
            subscriptionStatus = 'active_manual_setup_required';
        }

        // 3. Create Subscription Record in Firestore
        const subscription = {
            planId: plan.id,
            planName: plan.name,
            price: plan.price,
            customer: input.customer,
            status: subscriptionStatus,
            transactionId: transactionId || 'free_plan',
            startDate: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('subscriptions').add(subscription);
        const subscriptionId = docRef.id;

        // 4. Send Confirmation (Log for now)
        logger.info('Subscription created', { subscriptionId, plan: plan.id });

        return { success: true, subscriptionId };
    } catch (error: any) {
        logger.error('Failed to create subscription:', error);
        return { success: false, error: 'Failed to process subscription. Please try again.' };
    }
}
