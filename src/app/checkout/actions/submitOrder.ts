
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import type { CartItem } from '@/types/domain';
import { applyCoupon } from './applyCoupon';
import type { ServerOrderPayload as ServerOrderPayloadType } from '@/types/domain';
import { FieldValue } from 'firebase-admin/firestore';

import { logger } from '@/lib/logger';
export interface ClientOrderInput {
  items: CartItem[];
  customer: { name: string; email: string; phone: string; };
  retailerId: string;
  organizationId: string; // This is the brandId
  couponCode?: string;
}

export type ServerOrderPayload = ServerOrderPayloadType;

export type SubmitOrderResult = {
  ok: boolean;
  error?: string;
  orderId?: string;
  userId?: string;
  checkoutUrl?: string;
};

const TRUSTED_EXTERNAL_CHECKOUT_HOSTS = new Set([
  'widget.canpayapp.com',
  'sandbox-widget.canpayapp.com',
  'remotepay.canpaydebit.com',
  'sandbox-remotepay.canpaydebit.com',
]);

export async function submitOrder(clientPayload: ClientOrderInput): Promise<SubmitOrderResult> {
  const { auth, firestore } = await createServerClient();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  let userId: string | null = null;
  if (sessionCookie) {
    try {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
      userId = decodedToken.uid;
    } catch (error) {
      // Not a valid session, but allow anonymous orders
      logger.warn("Could not verify session for order, proceeding as anonymous.");
    }
  }

  const subtotal = clientPayload.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  let discount = 0;
  let appliedCoupon: { couponId: string; code: string; discountAmount: number } | null = null;
  if (clientPayload.couponCode) {
    const couponResult = await applyCoupon(clientPayload.couponCode, { subtotal, brandId: clientPayload.organizationId });
    if (couponResult.success) {
      discount = couponResult.discountAmount;
      appliedCoupon = {
        couponId: couponResult.couponId,
        code: couponResult.code,
        discountAmount: couponResult.discountAmount,
      };
    } else {
      return {
        ok: false,
        error: couponResult.message,
      };
    }
  }

  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount > 0 ? subtotalAfterDiscount * 0.15 : 0;
  const fees = 0;
  const total = subtotalAfterDiscount + tax + fees;

  // The base URL of the application, used to construct API routes for fetch.
  const apiBaseUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';

  try {
    const res = await fetch(
      `${apiBaseUrl}/api/checkout/smokey-pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass cookies to the API route to maintain session context if needed
          Cookie: cookieStore.toString(),
        },
        body: JSON.stringify({
          organizationId: clientPayload.organizationId,
          dispensaryId: clientPayload.retailerId,
          pickupLocationId: clientPayload.retailerId,
          customer: {
            email: clientPayload.customer.email,
            name: clientPayload.customer.name,
            phone: clientPayload.customer.phone,
            uid: userId,
          },
          items: clientPayload.items.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
          subtotal: subtotalAfterDiscount,
          tax,
          fees,
          total,
          couponCode: appliedCoupon?.code,
          currency: "USD",
        }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to start Smokey Pay checkout");
    }

    if (appliedCoupon) {
      try {
        await firestore.collection('coupons').doc(appliedCoupon.couponId).update({
          uses: FieldValue.increment(1),
          updatedAt: new Date(),
        });
      } catch (couponError) {
        logger.warn('Order succeeded but failed to increment coupon usage', {
          couponId: appliedCoupon.couponId,
          error: couponError instanceof Error ? couponError.message : String(couponError),
        });
      }
    }

    let checkoutUrl: string | undefined;
    if (typeof json.checkoutUrl === 'string') {
      const candidate = json.checkoutUrl.trim();
      const isRelative = candidate.startsWith('/');

      let isAllowedExternal = false;
      if (!isRelative) {
        try {
          const parsed = new URL(candidate);
          isAllowedExternal =
            parsed.protocol === 'https:' &&
            TRUSTED_EXTERNAL_CHECKOUT_HOSTS.has(parsed.hostname);
        } catch {
          isAllowedExternal = false;
        }
      }

      if (isRelative || isAllowedExternal) {
        checkoutUrl = candidate;
      } else {
        logger.warn('submitOrder received an untrusted checkout URL, ignoring', {
          checkoutUrl: candidate,
          orderId: json.orderId,
        });
      }
    }

    return {
      ok: true,
      orderId: json.orderId,
      userId: userId || 'anonymous',
      checkoutUrl,
    };

  } catch (e: any) {
    logger.error("ORDER_SUBMISSION_FAILED:", e);
    return { ok: false, error: e.message || 'Could not submit order.' };
  }
}
