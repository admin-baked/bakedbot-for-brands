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

        // Query coupon by code using Admin SDK fluent API
        const couponsSnap = await firestore.collection('coupons')
            .where('code', '==', code.toUpperCase())
            .limit(1)
            .get();

        if (couponsSnap.empty) {
            return { isValid: false, message: 'Invalid coupon code.' };
        }

        const couponDoc = couponsSnap.docs[0];
        const coupon = couponDoc.data();

        // Check if coupon is active/valid (add more checks as needed)
        // For now, we assume existence = validity

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
            newPrice
        };

    } catch (error: any) {
        logger.error('Error validating coupon:', error);
        return { isValid: false, message: 'Failed to validate coupon.' };
    }
}
