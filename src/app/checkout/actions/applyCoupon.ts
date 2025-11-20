
'use server';

import { createServerClient } from '@/firebase/server-client';
import { couponConverter } from '@/firebase/converters';
import type { Coupon } from '@/types/domain';

type ApplyCouponInput = {
    subtotal: number;
    brandId: string;
};

type ApplyCouponResult = 
  | { success: true; code: string; discountAmount: number; message: string; }
  | { success: false; message: string; };

export async function applyCoupon(code: string, { subtotal, brandId }: ApplyCouponInput): Promise<ApplyCouponResult> {
  if (!code || !brandId) {
    return { success: false, message: 'Coupon code and brand ID are required.' };
  }

  const { firestore } = await createServerClient();
  const couponsRef = firestore.collection('coupons').withConverter(couponConverter as any);
  
  const query = couponsRef
    .where('code', '==', code.toUpperCase())
    .where('brandId', '==', brandId)
    .limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    return { success: false, message: 'This coupon code is not valid.' };
  }

  const coupon = snapshot.docs[0].data() as Coupon;
  const couponDocRef = snapshot.docs[0].ref;

  // Check expiration
  if (coupon.expiresAt && coupon.expiresAt.toDate() < new Date()) {
    return { success: false, message: 'This coupon has expired.' };
  }

  // Check usage limits
  if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
    return { success: false, message: 'This coupon has reached its maximum number of uses.' };
  }
  
  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === 'fixed') {
    discountAmount = coupon.value;
  } else if (coupon.type === 'percentage') {
    discountAmount = subtotal * (coupon.value / 100);
  }

  // Ensure discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  
  // It's generally better to increment usage when the order is *completed*,
  // but for this implementation, we'll increment it on application.
  // A more robust system would handle this in a transaction during order submission.
  await couponDocRef.update({ uses: (coupon.uses || 0) + 1 });

  return {
    success: true,
    code: coupon.code,
    discountAmount,
    message: 'Coupon applied successfully!',
  };
}
