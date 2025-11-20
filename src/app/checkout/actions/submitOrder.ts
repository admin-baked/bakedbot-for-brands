
'use server';

import type { CartItem } from '@/hooks/use-store';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import type { Retailer, Product } from '@/firebase/converters';
import { makeProductRepo } from '@/server/repos/productRepo';
import { applyCoupon } from './applyCoupon';

export interface ClientOrderInput {
    items: { productId: string; qty: number }[];
    customer: { name: string; email: string; };
    retailerId: string;
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
        total: number;
    };
    coupon?: {
        code: string;
        discount: number;
    };
}

export async function submitOrder(clientPayload: ClientOrderInput) {
    const { firestore, auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    let userId = 'anonymous';

    if (sessionCookie) {
        try {
            const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
            userId = decodedToken.uid;
        } catch (error) {
            // Not a valid session, but allow anonymous orders
            console.warn("Could not verify session for order, proceeding as anonymous.");
        }
    }

    try {
        const retailerSnap = await firestore.collection('dispensaries').doc(clientPayload.retailerId).get();
        if (!retailerSnap.exists) {
            throw new Error('Selected retailer not found.');
        }
        const retailer = { id: retailerSnap.id, ...retailerSnap.data() } as Retailer;

        const productRepo = makeProductRepo(firestore);
        const productIds = clientPayload.items.map(item => item.productId);
        
        const productSnaps = await firestore.getAll(...productIds.map(id => productRepo.getRef(id)));
        
        const productsById = new Map<string, Product>();
        productSnaps.forEach(snap => {
            if (snap.exists) {
                productsById.set(snap.id, { id: snap.id, ...snap.data() } as Product);
            }
        });

        if (productsById.size === 0) {
            throw new Error('No valid products found for the items in the cart.');
        }

        const firstProduct = productsById.get(clientPayload.items[0].productId);
        if (!firstProduct) {
             throw new Error('Could not identify product to determine brand.');
        }
        const brandId = firstProduct.brandId;

        let subtotal = 0;
        const finalItems = clientPayload.items.map(item => {
            const product = productsById.get(item.productId);
            if (!product) {
                throw new Error(`Product with ID ${item.productId} not found during order processing.`);
            }
            if (product.brandId !== brandId) {
                throw new Error('All items in an order must belong to the same brand.');
            }
            const price = product.prices?.[clientPayload.retailerId] ?? product.price;
            subtotal += price * item.qty;
            return {
                productId: item.productId,
                name: product.name,
                qty: item.qty,
                price: price,
            };
        });
        
        let discount = 0;
        let couponResult;
        if (clientPayload.couponCode) {
            couponResult = await applyCoupon(clientPayload.couponCode, { subtotal, brandId });
            if (couponResult.success) {
                discount = couponResult.discountAmount;
            } else {
                // Return an error to the client if the coupon is invalid
                return { ok: false, error: couponResult.message };
            }
        }

        const totalBeforeTax = subtotal - discount;
        const tax = totalBeforeTax * 0.15;
        const total = totalBeforeTax + tax;

        const serverPayload: ServerOrderPayload = {
            ...clientPayload,
            brandId,
            items: finalItems,
            totals: { subtotal, tax, discount, total },
            ...(couponResult?.success && {
                coupon: { code: couponResult.code, discount: couponResult.discountAmount }
            })
        };
        
        const orderRef = firestore.collection('orders').doc();
        
        const orderData = {
            ...serverPayload,
            userId,
            createdAt: FieldValue.serverTimestamp(),
            status: 'submitted' as const,
            mode: clientPayload.items.some(item => item.productId.startsWith('demo-')) ? 'demo' as const : 'live' as const,
        };
        // Remove undefined coupon field if it exists
        if (!orderData.coupon) {
            delete (orderData as any).coupon;
        }

        await orderRef.set(orderData);
        
        await Promise.all([
             sendOrderEmail({
                to: clientPayload.customer.email,
                subject: `Your Order #${orderRef.id.substring(0, 7)} is Confirmed!`,
                orderId: orderRef.id,
                order: serverPayload,
                retailer: retailer,
                recipientType: 'customer',
            }),
             sendOrderEmail({
                to: retailer.email!,
                subject: `New Online Order #${orderRef.id.substring(0, 7)}`,
                orderId: orderRef.id,
                order: serverPayload,
                retailer: retailer,
                recipientType: 'dispensary',
            }),
        ]);

        return { ok: true, orderId: orderRef.id, userId: userId };
    } catch (e: any) {
        console.error("ORDER_SUBMISSION_FAILED:", e);
        return { ok: false, error: e.message || 'Could not submit order.' };
    }
}
