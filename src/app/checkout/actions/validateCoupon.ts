'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { PRICING_PLANS } from '@/lib/config/pricing';

export type ValidateCouponResult = {
    isValid: boolean;
    message?: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    couponId?: string;
    newPrice?: number;
};

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function validateCoupon(code: string, planId: string): Promise<ValidateCouponResult> {
    if (!code) {
        return { isValid: false, message: 'Please enter a coupon code.' };
    }

    try {
        let firestore: any = null;
        const localDevNoFirestore =
            process.env.NODE_ENV !== 'production' &&
            process.env.LOCAL_CHECKOUT_USE_FIREBASE !== 'true';

        if (!localDevNoFirestore) {
            const serverClient = await createServerClient();
            firestore = serverClient.firestore;
        }

        // Find the plan to calculate potential new price
        const plan = PRICING_PLANS.find(p => p.id === planId);
        if (!plan) {
            return { isValid: false, message: 'Invalid plan selected.' };
        }

        const basePrice = plan.price || 0;
        if (basePrice <= 0) {
            return { isValid: false, message: 'Coupon can only be applied to paid plans.' };
        }

        const normalizedCode = code.trim().toUpperCase();

        // Local/dev fallback: allow rapid testing without Firestore.
        if (localDevNoFirestore && normalizedCode === 'LAUNCH25') {
            const newPrice = 25;
            const discountValue = Math.max(0, Number((basePrice - newPrice).toFixed(2)));
            return {
                isValid: true,
                message: 'Coupon applied!',
                discountType: 'fixed',
                discountValue,
                couponId: 'local_launch25',
                newPrice,
            };
        }

        // Query coupon by code using Admin SDK fluent API
        const couponsSnap = await firestore.collection('coupons')
            .where('code', '==', normalizedCode)
            .limit(1)
            .get();

        if (couponsSnap.empty) {
            return { isValid: false, message: 'Invalid coupon code.' };
        }

        const couponDoc = couponsSnap.docs[0];
        const coupon = couponDoc.data();
        const now = new Date();

        if (coupon.active === false) {
            return { isValid: false, message: 'This coupon is inactive.' };
        }

        const expiresAt = asDate(coupon.expiresAt);
        if (expiresAt && expiresAt < now) {
            return { isValid: false, message: 'This coupon has expired.' };
        }

        if (coupon.maxUses && (coupon.uses || 0) >= coupon.maxUses) {
            return { isValid: false, message: 'This coupon has reached its maximum number of uses.' };
        }

        if (coupon.type !== 'percentage' && coupon.type !== 'fixed') {
            return { isValid: false, message: 'Invalid coupon configuration.' };
        }

        if (typeof coupon.value !== 'number' || coupon.value <= 0) {
            return { isValid: false, message: 'Invalid coupon value.' };
        }

        // Calculate new price
        let newPrice = basePrice;
        let discountType: 'percentage' | 'fixed' = coupon.type;
        let discountValue: number = coupon.value;

        // Override mode: force paid plans to a specific monthly amount (e.g. $25/mo)
        if (typeof coupon.overridePrice === 'number' && coupon.overridePrice >= 0) {
            newPrice = Number(coupon.overridePrice.toFixed(2));
            discountType = 'fixed';
            discountValue = Math.max(0, Number((basePrice - newPrice).toFixed(2)));
        } else {
            if (coupon.type === 'percentage') {
                newPrice = basePrice - (basePrice * (coupon.value / 100));
            } else if (coupon.type === 'fixed') {
                newPrice = Math.max(0, basePrice - coupon.value);
            }
        }

        newPrice = Math.max(0, Number(newPrice.toFixed(2)));

        // Return number, not possibly null/undefined
        return {
            isValid: true,
            message: 'Coupon applied!',
            discountType,
            discountValue,
            couponId: couponDoc.id,
            newPrice
        };

    } catch (error: any) {
        logger.error('Error validating coupon:', error);
        return { isValid: false, message: 'Failed to validate coupon.' };
    }
}
