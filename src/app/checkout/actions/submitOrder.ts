
'use server';

import type { CartItem } from '@/hooks/use-store';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import type { Retailer, Product } from '@/firebase/converters';
import { makeProductRepo } from '@/server/repos/productRepo';


export interface ClientOrderInput {
    items: { productId: string; qty: number }[];
    customer: { name: string; email: string; };
    retailerId: string;
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
    brandId: string; // Added brandId
    totals: { subtotal: number; tax: number; total: number };
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

        // Determine the brandId from the first product in the cart.
        // This assumes all items in a single order belong to the same brand.
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

        const tax = subtotal * 0.15;
        const total = subtotal + tax;

        const serverPayload: ServerOrderPayload = {
            ...clientPayload,
            brandId, // Include brandId in the payload
            items: finalItems,
            totals: { subtotal, tax, total },
        };
        
        const orderRef = firestore.collection('orders').doc();
        await orderRef.set({
            ...serverPayload,
            userId,
            createdAt: FieldValue.serverTimestamp(),
            status: 'submitted',
            mode: clientPayload.items.some(item => item.productId.startsWith('demo-')) ? 'demo' : 'live',
        });
        
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
