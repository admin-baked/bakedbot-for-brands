'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue, DocumentReference, type DocumentData } from 'firebase-admin/firestore';
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
    couponCode?: string;
};

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createSubscription(input: CreateSubscriptionInput) {
    try {
        const { firestore } = await createServerClient();

        // 1. Validate Plan
        const plan = PRICING_PLANS.find(p => p.id === input.planId);
        if (!plan) {
            return { success: false, error: 'Invalid plan selected.' };
        }
        if (plan.price === null) {
            return { success: false, error: 'This plan requires a custom quote. Please contact sales.' };
        }

        // 0. Handle Coupon Logic (validate first, redeem atomically with subscription write)
        let finalPrice = plan.price;
        let discountApplied: {
            code: string;
            type: 'percentage' | 'fixed';
            value: number;
            originalPrice: number | null;
        } | null = null;
        let couponRef: DocumentReference<DocumentData> | null = null;

        if (input.couponCode) {
            const normalizedCode = input.couponCode.toUpperCase().trim();
            // Admin SDK uses fluent API: collection().where().limit().get()
            const couponsSnap = await firestore.collection('coupons')
                .where('code', '==', normalizedCode)
                .limit(1)
                .get();

            if (couponsSnap.empty) {
                return { success: false, error: 'Invalid coupon code.' };
            }

            const couponDoc = couponsSnap.docs[0];
            const coupon = couponDoc.data();

            if (coupon.active === false) {
                return { success: false, error: 'This coupon is inactive.' };
            }

            const expiresAt = asDate(coupon.expiresAt);
            if (expiresAt && expiresAt < new Date()) {
                return { success: false, error: 'This coupon has expired.' };
            }

            if (coupon.maxUses && (coupon.uses || 0) >= coupon.maxUses) {
                return { success: false, error: 'This coupon has reached its maximum number of uses.' };
            }

            if (coupon.type !== 'percentage' && coupon.type !== 'fixed') {
                return { success: false, error: 'Invalid coupon configuration.' };
            }

            if (typeof coupon.value !== 'number' || coupon.value <= 0) {
                return { success: false, error: 'Invalid coupon value.' };
            }

            // Calculate discounted price
            if (coupon.type === 'percentage') {
                finalPrice = finalPrice - (finalPrice * (coupon.value / 100));
            } else {
                finalPrice = Math.max(0, finalPrice - coupon.value);
            }

            finalPrice = Number(finalPrice.toFixed(2));
            couponRef = couponDoc.ref;
            discountApplied = {
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                originalPrice: plan.price,
            };
        }

        let transactionId = null;
        let subscriptionStatus = 'active'; // Default to active for free plans

        // 2. Process Initial Payment (if price > 0)
        if (finalPrice > 0 && !input.paymentData) {
            return { success: false, error: 'Payment information is required for paid plans.' };
        }

        if (finalPrice > 0 && input.paymentData) {
            logger.info('Processing subscription payment', { plan: plan.id, amount: finalPrice });

            const paymentResult = await createTransaction({
                amount: finalPrice,
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
            subscriptionStatus = 'active_manual_setup_required';
        }

        // 3. Create Subscription Record in Firestore
        const subscription = {
            planId: plan.id,
            planName: plan.name,
            price: finalPrice,
            originalPrice: plan.price,
            discount: discountApplied,
            customer: input.customer,
            status: subscriptionStatus,
            transactionId: transactionId || 'free_plan',
            startDate: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const subscriptionRef = firestore.collection('subscriptions').doc();

        if (couponRef) {
            try {
                await firestore.runTransaction(async (transaction) => {
                    const liveCouponSnap = await transaction.get(couponRef!);
                    if (!liveCouponSnap.exists) {
                        throw new Error('Coupon no longer exists.');
                    }

                    const liveCoupon = liveCouponSnap.data() as any;
                    if (liveCoupon.active === false) {
                        throw new Error('This coupon is inactive.');
                    }

                    const liveExpiresAt = asDate(liveCoupon.expiresAt);
                    if (liveExpiresAt && liveExpiresAt < new Date()) {
                        throw new Error('This coupon has expired.');
                    }

                    if (liveCoupon.maxUses && (liveCoupon.uses || 0) >= liveCoupon.maxUses) {
                        throw new Error('This coupon has reached its maximum number of uses.');
                    }

                    transaction.update(couponRef!, {
                        uses: FieldValue.increment(1),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    transaction.set(subscriptionRef, subscription);
                });
            } catch (couponError) {
                return {
                    success: false,
                    error: couponError instanceof Error ? couponError.message : 'Failed to redeem coupon.',
                };
            }
        } else {
            await subscriptionRef.set(subscription);
        }

        const subscriptionId = subscriptionRef.id;

        // 4. Send Confirmation (Log for now)
        logger.info('Subscription created', { subscriptionId, plan: plan.id });

        return { success: true, subscriptionId };
    } catch (error: any) {
        logger.error('Failed to create subscription:', error);
        return { success: false, error: 'Failed to process subscription. Please try again.' };
    }
}
