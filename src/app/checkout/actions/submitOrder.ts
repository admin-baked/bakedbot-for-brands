
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import type { Retailer, Product } from '@/firebase/converters';
import { makeProductRepo } from '@/server/repos/productRepo';
import { applyCoupon } from './applyCoupon';
import { redirect } from 'next/navigation';

export interface ClientOrderInput {
    items: {
        productId: string;
        cannmenusProductId?: string;
        name: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
    }[];
    customer: { name: string; email: string; phone: string; };
    retailerId: string;
    organizationId: string;
    couponCode?: string; // Coupon code is optional
}

export interface ServerOrderPayload {
    items: Array<{
      productId: string;
      name: string;
      qty: number;
      price: number;
    }>;
    customer: { name: string; email: string };
    retailerId: string;
    brandId: string;
    totals: {
        subtotal: number;
        tax: number;
        discount: number;
        fees: number;
        total: number;
    };
    coupon?: {
        code: string;
        discount: number;
    };
}

export async function submitOrder(clientPayload: ClientOrderInput) {
    const { auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    let userId = null;
    if (sessionCookie) {
        try {
            const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
            userId = decodedToken.uid;
        } catch (error) {
            // Not a valid session, but allow anonymous orders
            console.warn("Could not verify session for order, proceeding as anonymous.");
        }
    }

    const subtotal = clientPayload.items.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0
      );
    
    // TODO: real tax/fee calc
    const tax = 0;
    const fees = 0;
    const total = subtotal + tax + fees;

    const apiBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    try {
        const res = await fetch(
            `${apiBaseUrl}/api/checkout/smokey-pay`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
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
                items: clientPayload.items,
                subtotal,
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
        
          // If CannPay gives a hosted checkout URL, send user there
          if (json.checkoutUrl) {
            redirect(json.checkoutUrl);
          }
        
          // Otherwise, redirect to your own confirmation / status page,
          // where a client-side component will complete the CannPay flow with intentId.
          return { ok: true, orderId: json.orderId };

    } catch(e: any) {
        console.error("ORDER_SUBMISSION_FAILED:", e);
        return { ok: false, error: e.message || 'Could not submit order.' };
    }
}
