
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { redirect } from 'next/navigation';
import type { CartItem } from '@/types/domain';
import { applyCoupon } from './applyCoupon';
import type { ServerOrderPayload as ServerOrderPayloadType } from '@/types/domain';

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
};

export async function submitOrder(clientPayload: ClientOrderInput): Promise<SubmitOrderResult> {
  const { auth } = await createServerClient();
  const sessionCookie = (await cookies()).get('__session')?.value;
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
  if (clientPayload.couponCode) {
    const couponResult = await applyCoupon(clientPayload.couponCode, { subtotal, brandId: clientPayload.organizationId });
    if (couponResult.success) {
      discount = couponResult.discountAmount;
    }
  }

  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount > 0 ? subtotalAfterDiscount * 0.15 : 0;
  const fees = 0;
  const total = subtotalAfterDiscount + tax + fees;

  // The base URL of the application, used to construct API routes for fetch.
  const apiBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';

  try {
    const res = await fetch(
      `${apiBaseUrl}/api/checkout/smokey-pay`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass cookies to the API route to maintain session context if needed
          Cookie: cookies().toString(),
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
          currency: "USD",
        }),
      }
    );

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to start Smokey Pay checkout");
    }

    // If CannPay provides a hosted checkout URL, redirect the user to it.
    if (json.checkoutUrl) {
      redirect(json.checkoutUrl);
    }

    // Fallback redirect to our confirmation page.
    redirect(`/order-confirmation/${json.orderId}`);

    // This part is now unreachable due to the redirect, but we keep the shape
    // for type consistency in case the redirect logic changes.
    return { ok: true, orderId: json.orderId, userId: userId || 'anonymous' }

  } catch (e: any) {
    logger.error("ORDER_SUBMISSION_FAILED:", e);
    return { ok: false, error: e.message || 'Could not submit order.' };
  }
}
