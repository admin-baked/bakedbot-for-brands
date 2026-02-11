
'use server';

import { createServerClient } from '@/firebase/server-client';
import { couponConverter } from '@/firebase/converters';
import type { Coupon } from '@/types/domain';

type ApplyCouponInput = {
    subtotal: number;
    brandId: string;
};

type ApplyCouponResult = 
  | { success: true; couponId: string; code: string; discountAmount: number; message: string; }
  | { success: false; message: string; };

export async function applyCoupon(code: string, { subtotal, brandId }: ApplyCouponInput): Promise<ApplyCouponResult> {
  if (!code || !brandId) {
    return { success: false, message: 'Coupon code and brand ID are required.' };
  }

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { success: false, message: 'Coupon code and brand ID are required.' };
  }

  const { firestore } = await createServerClient();
  const couponsRef = firestore.collection('coupons').withConverter(couponConverter as any);
  
  const query = couponsRef
    .where('code', '==', normalizedCode)
    .where('brandId', '==', brandId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    return { success: false, message: 'This coupon code is not valid.' };
  }

  const coupon = snapshot.docs[0].data() as Coupon;
  const couponDocRef = snapshot.docs[0].ref;

  if ((coupon as any).active === false) {
    return { success: false, message: 'This coupon is inactive.' };
  }

  // Check expiration
  const expiresAt = coupon.expiresAt
    ? (typeof (coupon.expiresAt as any).toDate === 'function'
      ? (coupon.expiresAt as any).toDate()
      : new Date(coupon.expiresAt as any))
    : null;
  if (expiresAt && expiresAt < new Date()) {
    return { success: false, message: 'This coupon has expired.' };
  }

  // Check usage limits
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
    return { success: false, message: 'This coupon has reached its maximum number of uses.' };
  }

  if ((coupon.type !== 'fixed' && coupon.type !== 'percentage') || typeof coupon.value !== 'number' || coupon.value <= 0) {
    return { success: false, message: 'This coupon has an invalid configuration.' };
  }
  
  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === 'fixed') {
    discountAmount = coupon.value;
  } else if (coupon.type === 'percentage') {
    discountAmount = subtotal * (coupon.value / 100);
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Number(Math.min(discountAmount, subtotal).toFixed(2));
  
  return {
    success: true,
    couponId: couponDocRef.id,
    code: coupon.code,
    discountAmount,
    message: 'Coupon validated successfully.',
  };
}
