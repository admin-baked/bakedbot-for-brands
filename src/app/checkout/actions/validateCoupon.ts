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
        const { firestore } = await createServerClient();

        // Find the plan to calculate potential new price
        const plan = PRICING_PLANS.find(p => p.id === planId);
        if (!plan) {
            return { isValid: false, message: 'Invalid plan selected.' };
        }

        const basePrice = plan.price || 0;

        const normalizedCode = code.trim().toUpperCase();

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

        if (coupon.type === 'percentage') {
            newPrice = basePrice - (basePrice * (coupon.value / 100));
        } else if (coupon.type === 'fixed') {
            newPrice = Math.max(0, basePrice - coupon.value);
        }

        // Return number, not possibly null/undefined
        return {
            isValid: true,
            message: 'Coupon applied!',
            discountType: coupon.type,
            discountValue: coupon.value,
            couponId: couponDoc.id,
            newPrice: Math.max(0, Number(newPrice.toFixed(2)))
        };

    } catch (error: any) {
        logger.error('Error validating coupon:', error);
        return { isValid: false, message: 'Failed to validate coupon.' };
    }
}
