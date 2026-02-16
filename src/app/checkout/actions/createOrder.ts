'use server';

// src/app/checkout/actions/createOrder.ts
/**
 * Server action to create an order in Firestore
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { applyCoupon } from './applyCoupon';


import { logger } from '@/lib/logger';
type CreateOrderInput = {
    items: any[];
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    retailerId: string;
    brandId?: string;
    couponCode?: string;
    paymentMethod: 'authorize_net' | 'cannpay' | 'cash' | 'smokey_pay'; // smokey_pay is legacy alias
    paymentData?: any;
    total: number;
    // Delivery fields (optional)
    fulfillmentType?: 'pickup' | 'delivery';
    deliveryAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    deliveryFee?: number;
    deliveryWindow?: { start: Date; end: Date };
    deliveryInstructions?: string;
};

export async function createOrder(input: CreateOrderInput) {
    try {
        const { firestore } = await createServerClient();
        let transactionId = null;
        let paymentStatus = 'pending';

        const normalizedItems = input.items.map((item) => ({
            productId: item.productId || item.id,
            name: item.name,
            qty: item.quantity || item.qty || 1,
            price: item.unitPrice || item.price || 0,
            category: item.category,
        }));

        const subtotal = Number(
            normalizedItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)
        );

        const inferredBrandId = input.brandId || input.items.find((item) => typeof item.brandId === 'string')?.brandId;
        let discount = 0;
        let appliedCoupon: { couponId: string; code: string; discountAmount: number } | null = null;

        if (input.couponCode) {
            if (!inferredBrandId) {
                return {
                    success: false,
                    error: 'Coupon validation requires a brand context.'
                };
            }

            const couponResult = await applyCoupon(input.couponCode, {
                subtotal,
                brandId: inferredBrandId,
            });

            if (!couponResult.success) {
                return {
                    success: false,
                    error: couponResult.message || 'Invalid coupon code.',
                };
            }

            discount = Number(couponResult.discountAmount.toFixed(2));
            appliedCoupon = {
                couponId: couponResult.couponId,
                code: couponResult.code,
                discountAmount: discount,
            };
        }

        const subtotalAfterDiscount = Number(Math.max(0, subtotal - discount).toFixed(2));
        const deliveryFee = Number((input.deliveryFee || 0).toFixed(2));
        const tax = Number((subtotalAfterDiscount * 0.15).toFixed(2));
        const serverTotal = Number((subtotalAfterDiscount + tax + deliveryFee).toFixed(2));

        if (Math.abs(input.total - serverTotal) > 0.01) {
            logger.warn('[createOrder] Client total mismatch, using server-calculated total', {
                clientTotal: input.total,
                serverTotal,
                retailerId: input.retailerId,
            });
        }

        // 1. Process Payment (if Authorize.net)
        if (input.paymentMethod === 'authorize_net' && input.paymentData) {
            logger.info('Processing Authorize.net payment for order');

            const paymentResult = await createTransaction({
                amount: serverTotal,
                // Support opaque data from client
                opaqueData: input.paymentData.opaqueData,
                // Or raw card data (if passed - be careful with logging!)
                cardNumber: input.paymentData.cardNumber,
                expirationDate: input.paymentData.expirationDate,
                cvv: input.paymentData.cvv,
                customer: {
                    email: input.customer.email,
                    firstName: input.customer.name.split(' ')[0],
                    lastName: input.customer.name.split(' ').slice(1).join(' '),
                },
                description: `Order for ${input.customer.email}`
            });

            if (!paymentResult.success) {
                logger.warn('Payment failed', { errors: paymentResult.errors });
                return {
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.'
                };
            }

            transactionId = paymentResult.transactionId;
            paymentStatus = 'paid';
            logger.info('Payment successful', { transactionId });
        } else if (input.paymentMethod === 'cannpay') {
            // CannPay flow - typically handled via redirect or external link
            // For now, we assume the client has initiated the flow or will do so
            paymentStatus = 'pending_cannpay';
            logger.info('Order placed with CannPay intent');
        } else {
            // Cash / Pay at Pickup
            paymentStatus = 'pay_at_pickup';
        }

        // 2. Create Order in Firestore
        const order = {
            items: normalizedItems,
            customer: input.customer,
            retailerId: input.retailerId,
            brandId: inferredBrandId || null,
            totals: {
                subtotal: subtotalAfterDiscount,
                tax,
                discount,
                deliveryFee,
                total: serverTotal,
            },
            coupon: appliedCoupon ? {
                code: appliedCoupon.code,
                discount: appliedCoupon.discountAmount,
            } : undefined,
            // Fulfillment fields
            fulfillmentType: input.fulfillmentType || 'pickup',
            shippingAddress: input.deliveryAddress || undefined,
            deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
            deliveryWindow: input.deliveryWindow ? {
                start: input.deliveryWindow.start,
                end: input.deliveryWindow.end,
            } : undefined,
            deliveryInstructions: input.deliveryInstructions || undefined,
            transactionId,
            status: 'submitted', // Initial status
            paymentStatus,
            paymentMethod: input.paymentMethod === 'authorize_net' ? 'credit_card' : input.paymentMethod,
            paymentProvider: input.paymentMethod === 'authorize_net'
                ? 'authorize_net'
                : input.paymentMethod === 'cannpay'
                    ? 'cannpay'
                    : null,
            mode: 'live' as const,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('orders').add(order);
        const orderId = docRef.id;

        if (appliedCoupon) {
            try {
                await firestore.collection('coupons').doc(appliedCoupon.couponId).update({
                    uses: FieldValue.increment(1),
                    updatedAt: new Date(),
                });
            } catch (couponError) {
                logger.warn('Order created but failed to increment coupon usage', {
                    orderId,
                    couponId: appliedCoupon.couponId,
                    error: couponError instanceof Error ? couponError.message : String(couponError),
                });
            }
        }

        // 3. Send Confirmation Email
        // Fetch retailer details for the email
        let retailerName = 'Dispensary';
        let pickupAddress = 'Pickup Location';

        try {
            const retailerDoc = await firestore.collection('dispensaries').doc(input.retailerId).get();
            if (retailerDoc.exists) {
                const data = retailerDoc.data();
                retailerName = data?.name || retailerName;
                pickupAddress = `${data?.address}, ${data?.city}, ${data?.state} ${data?.zip}`;
            }
        } catch (e) {
            logger.warn('Failed to fetch retailer for email', { retailerId: input.retailerId });
        }

        // Send email asynchronously (don't block response)
        sendOrderConfirmationEmail({
            orderId,
            customerName: input.customer.name,
            customerEmail: input.customer.email,
            total: serverTotal,
            items: normalizedItems.map(i => ({
                name: i.name,
                qty: i.qty,
                price: i.price,
            })),
            retailerName,
            pickupAddress
        }).catch(err => logger.error('Background email send failed', err));

        return { success: true, orderId };
    } catch (error: any) {
        logger.error('Failed to create order:', error);
        return { success: false, error: 'Failed to create order. Please try again.' };
    }
}
