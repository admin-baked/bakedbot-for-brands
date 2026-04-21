
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
  
  // CRITICAL FIX: To handle the difference between `brandId` and `orgId` across the system,
  // we check if it matches either field (or we can just fetch the code if it's the document ID).
  // Ideally, coupon codes are unique across the collection anyway.
  const query = couponsRef
    .where('code', '==', normalizedCode)
    .limit(10); // Fetch up to 10 in case of collisions and filter in memory

  const snapshot = await query.get();

  if (snapshot.empty) {
    return { success: false, message: 'This coupon code is not valid.' };
  }

  // Find the exact coupon matching the given brandId or orgId
  const validDoc = snapshot.docs.find(doc => {
    const data = doc.data() as any;
    return data.brandId === brandId || data.orgId === brandId;
  });

  if (!validDoc) {
     return { success: false, message: 'This coupon code is not valid for this brand.' };
  }

  const coupon = validDoc.data() as Coupon;
  const couponDocRef = validDoc.ref;

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
