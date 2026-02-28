
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import type { CartItem } from '@/types/domain';
import { applyCoupon } from './applyCoupon';
import type { ServerOrderPayload as ServerOrderPayloadType } from '@/types/domain';
import { FieldValue } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';

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

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

type ResolvedOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

function isValidDocumentId(value: unknown): value is string {
  return typeof value === 'string' && DOCUMENT_ID_REGEX.test(value);
}

function productMatchesCheckoutContext(
  product: any,
  organizationId: string,
  retailerId: string,
): boolean {
  if (!product || typeof product !== 'object') return false;

  const matchesOrg =
    product.brandId === organizationId ||
    product.orgId === organizationId ||
    product.organizationId === organizationId;

  const matchesRetailer =
    product.dispensaryId === retailerId ||
    product.retailerId === retailerId ||
    (Array.isArray(product.retailerIds) && product.retailerIds.includes(retailerId));

  const hasContextFields =
    typeof product.brandId === 'string' ||
    typeof product.orgId === 'string' ||
    typeof product.organizationId === 'string' ||
    typeof product.dispensaryId === 'string' ||
    typeof product.retailerId === 'string' ||
    Array.isArray(product.retailerIds);

  if (!hasContextFields) return true;
  return matchesOrg || matchesRetailer;
}

const TRUSTED_EXTERNAL_CHECKOUT_HOSTS = new Set([
  'widget.canpayapp.com',
  'sandbox-widget.canpayapp.com',
  'remotepay.canpaydebit.com',
  'sandbox-remotepay.canpaydebit.com',
]);

export async function submitOrder(clientPayload: ClientOrderInput): Promise<SubmitOrderResult> {
  if (!Array.isArray(clientPayload.items) || clientPayload.items.length === 0) {
    return { ok: false, error: 'Cart items are required.' };
  }
  if (!isValidDocumentId(clientPayload.organizationId) || !isValidDocumentId(clientPayload.retailerId)) {
    return { ok: false, error: 'Invalid organization or retailer context.' };
  }

  let session;
  try {
    session = await requireUser();
  } catch {
    return { ok: false, error: 'You must be signed in to complete checkout.' };
  }

  const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
  const requestEmail = clientPayload.customer.email.trim().toLowerCase();
  if (sessionEmail && requestEmail !== sessionEmail) {
    return { ok: false, error: 'Customer email must match your signed-in account.' };
  }

  const { firestore } = await createServerClient();
  const cookieStore = await cookies();
  const userId = session.uid;

  const resolvedItems: ResolvedOrderItem[] = [];
  for (const item of clientPayload.items) {
    const productId = typeof item?.id === 'string' ? item.id.trim() : '';
    const quantity = Number(item?.quantity ?? 1);

    if (!isValidDocumentId(productId) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
      return { ok: false, error: 'Invalid cart items provided.' };
    }

    const productDoc = await firestore.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return { ok: false, error: `Product ${productId} is no longer available.` };
    }

    const productData = productDoc.data() || {};
    if (!productMatchesCheckoutContext(productData, clientPayload.organizationId, clientPayload.retailerId)) {
      return { ok: false, error: 'Cart contains products that do not belong to this checkout context.' };
    }

    const serverPrice = Number(productData.price);
    if (!Number.isFinite(serverPrice) || serverPrice < 0) {
      return { ok: false, error: `${productData.name || 'A product'} has an invalid price.` };
    }

    resolvedItems.push({
      productId,
      name: typeof productData.name === 'string' && productData.name.trim().length > 0
        ? productData.name
        : (typeof item?.name === 'string' ? item.name : 'Product'),
      quantity,
      price: Number(serverPrice.toFixed(2)),
    });
  }

  const subtotal = Number(resolvedItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  ).toFixed(2));

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
            email: sessionEmail || requestEmail,
            name: clientPayload.customer.name,
            phone: clientPayload.customer.phone,
            uid: userId,
          },
          items: resolvedItems.map(item => ({
            productId: item.productId,
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
      userId,
      checkoutUrl,
    };

  } catch (e: any) {
    logger.error("ORDER_SUBMISSION_FAILED:", e);
    return { ok: false, error: e.message || 'Could not submit order.' };
  }
}
