'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue, DocumentReference, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PRICING_PLANS } from '@/lib/config/pricing';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { requireUser } from '@/server/auth/auth';
import type { BillingAddress } from '@/types/orders';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

type CreateSubscriptionInput = {
    planId: string;
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    paymentData?: any;
    couponCode?: string;
    billingAddress?: BillingAddress;
};

function getEmergencyOverrideCoupon(normalizedCode: string, basePrice: number) {
    const enabled = process.env.ENABLE_EMERGENCY_LAUNCH25_COUPON !== 'false';
    const couponCode = (process.env.EMERGENCY_LAUNCH25_CODE || 'LAUNCH25').trim().toUpperCase();
    const overridePrice = Number(process.env.EMERGENCY_LAUNCH25_PRICE || '25');

    if (!enabled) return null;
    if (!Number.isFinite(overridePrice) || overridePrice < 0) return null;
    if (basePrice <= 0) return null;
    if (normalizedCode !== couponCode) return null;

    const finalPrice = Number(overridePrice.toFixed(2));
    return {
        finalPrice,
        discountApplied: {
            code: couponCode,
            type: 'fixed' as const,
            value: Math.max(0, Number((basePrice - finalPrice).toFixed(2))),
            originalPrice: basePrice,
        },
    };
}

function normalizeExpiry(expirationDate?: string): string | undefined {
    if (!expirationDate) return undefined;
    const trimmed = expirationDate.trim();

    // Already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

    // Convert MM/YY -> YYYY-MM for Authorize.Net
    const mmYy = trimmed.match(/^(\d{2})\/(\d{2})$/);
    if (mmYy) {
        const month = mmYy[1];
        const year = `20${mmYy[2]}`;
        return `${year}-${month}`;
    }

    return trimmed;
}

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeBillingAddress(address: any): BillingAddress | null {
    if (!address || typeof address !== 'object') return null;

    const street = typeof address.street === 'string' ? address.street.trim() : '';
    const street2 = typeof address.street2 === 'string' ? address.street2.trim() : undefined;
    const city = typeof address.city === 'string' ? address.city.trim() : '';
    const state = typeof address.state === 'string' ? address.state.trim().toUpperCase() : '';
    const zip = typeof address.zip === 'string' ? address.zip.trim() : '';
    const countryRaw = typeof address.country === 'string' ? address.country.trim().toUpperCase() : 'US';
    const country = countryRaw || 'US';

    if (!street || !city || !state || !zip) return null;
    if (state.length !== 2) return null;
    if (!/^\d{5}(-\d{4})?$/.test(zip)) return null;

    return {
        street,
        ...(street2 ? { street2 } : {}),
        city,
        state,
        zip,
        country,
    };
}

export async function createSubscription(input: CreateSubscriptionInput) {
    try {
        if (!isCompanyPlanCheckoutEnabled()) {
            return { success: false, error: 'Subscription checkout is currently disabled. Please contact sales.' };
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return { success: false, error: 'You must be signed in to create a subscription.' };
        }

        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = input.customer.email.trim().toLowerCase();
        if (sessionEmail && requestEmail !== sessionEmail) {
            return { success: false, error: 'Customer email must match your signed-in account.' };
        }

        let firestore: any = null;
        // In local/dev we default to bypassing Firebase Admin unless explicitly enabled.
        // Set LOCAL_CHECKOUT_USE_FIREBASE=true to force real Firestore writes locally.
        let localDevNoFirestore =
            process.env.NODE_ENV !== 'production' &&
            process.env.LOCAL_CHECKOUT_USE_FIREBASE !== 'true';

        if (!localDevNoFirestore) {
            try {
                const serverClient = await createServerClient();
                firestore = serverClient.firestore;
            } catch (firebaseError) {
                // Local/dev fallback: allow checkout flow testing without Firebase Admin credentials.
                if (process.env.NODE_ENV !== 'production') {
                    localDevNoFirestore = true;
                    logger.warn('createSubscription: Firebase unavailable in local/dev, using mock subscription fallback', {
                        error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
                    });
                } else {
                    throw firebaseError;
                }
            }
        }

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

        if (input.couponCode && !localDevNoFirestore) {
            const normalizedCode = input.couponCode.toUpperCase().trim();

            const emergencyCoupon = getEmergencyOverrideCoupon(normalizedCode, plan.price);
            if (emergencyCoupon) {
                finalPrice = emergencyCoupon.finalPrice;
                discountApplied = emergencyCoupon.discountApplied;
            } else {
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
            if (typeof coupon.overridePrice === 'number' && coupon.overridePrice >= 0 && plan.price > 0) {
                finalPrice = Number(coupon.overridePrice.toFixed(2));
            } else if (coupon.type === 'percentage') {
                finalPrice = finalPrice - (finalPrice * (coupon.value / 100));
            } else {
                finalPrice = Math.max(0, finalPrice - coupon.value);
            }

            finalPrice = Number(finalPrice.toFixed(2));
            couponRef = couponDoc.ref;
            discountApplied = {
                code: coupon.code,
                type: coupon.type,
                value: (typeof coupon.overridePrice === 'number' && coupon.overridePrice >= 0 && plan.price > 0)
                    ? Math.max(0, Number((plan.price - finalPrice).toFixed(2)))
                    : coupon.value,
                originalPrice: plan.price,
            };
            }
        } else if (input.couponCode && localDevNoFirestore) {
            const normalizedCode = input.couponCode.toUpperCase().trim();
            if (normalizedCode === 'LAUNCH25' && plan.price > 0) {
                finalPrice = 25;
                discountApplied = {
                    code: normalizedCode,
                    type: 'fixed',
                    value: Math.max(0, Number((plan.price - finalPrice).toFixed(2))),
                    originalPrice: plan.price,
                };
            } else {
                return { success: false, error: 'Invalid coupon code.' };
            }
        }

        const subscriptionRef = localDevNoFirestore
            ? { id: `local_sub_${Date.now()}` }
            : firestore.collection('subscriptions').doc();

        let transactionId = null;
        let providerSubscriptionId: string | null = null;
        let customerProfileId: string | null = null;
        let customerPaymentProfileId: string | null = null;
        let subscriptionStartDate: string | null = null;
        let subscriptionStatus = 'active';
        const normalizedBillingAddress = normalizeBillingAddress(input.billingAddress);

        // 2. Process Initial Payment (if price > 0)
        if (finalPrice > 0 && !input.paymentData) {
            return { success: false, error: 'Payment information is required for paid plans.' };
        }
        if (finalPrice > 0 && !normalizedBillingAddress) {
            return { success: false, error: 'A valid billing address is required for paid plans.' };
        }

        if (finalPrice > 0 && input.paymentData) {
            logger.info('Processing recurring subscription setup', { plan: plan.id, amount: finalPrice });

            const hasAuthNetCreds = !!(process.env.AUTHNET_API_LOGIN_ID && process.env.AUTHNET_TRANSACTION_KEY);
            const isProduction = process.env.NODE_ENV === 'production';
            const forceMockRequested = process.env.AUTHNET_FORCE_MOCK === 'true';
            const shouldMock = !isProduction && (forceMockRequested || !hasAuthNetCreds);

            if (isProduction && forceMockRequested) {
                logger.warn('Ignoring AUTHNET_FORCE_MOCK in production');
            }

            if (shouldMock) {
                providerSubscriptionId = `mock_sub_${Date.now()}`;
                transactionId = providerSubscriptionId;
                subscriptionStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                logger.warn('Using mock recurring subscription (non-production)', {
                    plan: plan.id,
                    amount: finalPrice,
                    providerSubscriptionId,
                });
            } else {
                const firstName = input.customer.name.split(' ')[0] || input.customer.name;
                const lastName = input.customer.name.split(' ').slice(1).join(' ') || '';
                const billTo = {
                    firstName,
                    lastName,
                    address: normalizedBillingAddress?.street,
                    city: normalizedBillingAddress?.city,
                    state: normalizedBillingAddress?.state,
                    zip: normalizedBillingAddress?.zip || input.paymentData.zip,
                    country: normalizedBillingAddress?.country,
                };

                const paymentProfile = {
                    cardNumber: input.paymentData.cardNumber,
                    expirationDate: normalizeExpiry(input.paymentData.expirationDate),
                    cardCode: input.paymentData.cvv,
                    opaqueData: input.paymentData.opaqueData,
                };

                const profile = await createCustomerProfile(
                    subscriptionRef.id,
                    input.customer.email,
                    billTo,
                    paymentProfile,
                    `Subscription: ${plan.name} Plan`
                );

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                subscriptionStartDate = tomorrow.toISOString().slice(0, 10);

                const recurring = await createSubscriptionFromProfile(
                    {
                        name: `BakedBot ${plan.name} (${subscriptionRef.id})`,
                        amount: finalPrice,
                        startDate: subscriptionStartDate,
                        intervalMonths: 1,
                    },
                    profile.customerProfileId,
                    profile.customerPaymentProfileId,
                    subscriptionRef.id
                );

                customerProfileId = profile.customerProfileId;
                customerPaymentProfileId = profile.customerPaymentProfileId;
                providerSubscriptionId = recurring.subscriptionId;
                transactionId = recurring.subscriptionId;
                logger.info('Recurring subscription created', {
                    providerSubscriptionId,
                    plan: plan.id,
                    amount: finalPrice,
                });
            }
        }

        // 3. Create Subscription Record in Firestore
        const subscription = {
            userId: session.uid,
            planId: plan.id,
            planName: plan.name,
            price: finalPrice,
            originalPrice: plan.price,
            discount: discountApplied,
            customer: input.customer,
            billingAddress: normalizedBillingAddress || undefined,
            status: subscriptionStatus,
            transactionId: transactionId || 'free_plan',
            providerSubscriptionId,
            customerProfileId,
            customerPaymentProfileId,
            subscriptionStartDate,
            startDate: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (couponRef && !localDevNoFirestore) {
            try {
                await firestore.runTransaction(async (transaction: Transaction) => {
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
        } else if (!localDevNoFirestore) {
            await subscriptionRef.set(subscription);
        }

        const subscriptionId = subscriptionRef.id;

        if (!localDevNoFirestore && normalizedBillingAddress) {
            await firestore.collection('users').doc(session.uid).set({
                billingAddress: normalizedBillingAddress,
                billingAddressUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }

        // 4. Send Confirmation (Log for now)
        logger.info('Subscription created', { subscriptionId, plan: plan.id, mocked: localDevNoFirestore });

        return { success: true, subscriptionId };
    } catch (error: any) {
        logger.error('Failed to create subscription:', error);
        const message = error instanceof Error ? error.message : 'Failed to process subscription. Please try again.';
        return { success: false, error: message };
    }
}
