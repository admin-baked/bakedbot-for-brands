// src/app/api/checkout/shipping/route.ts
/**
 * API Route for Hemp E-Commerce Shipping Orders
 * Replaces server action for better production reliability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import type { ShippingAddress, PurchaseModel } from '@/types/orders';

// States where hemp shipping is restricted
const RESTRICTED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];

type ShippingOrderRequest = {
    items: any[];
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    shippingAddress: ShippingAddress;
    brandId: string;
    couponCode?: string;
    paymentMethod: 'authorize_net';
    paymentData?: any;
    subtotal?: number;
    tax?: number;
    total: number;
};

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(req: NextRequest) {
    try {
        const body: ShippingOrderRequest = await req.json();
        const { items, customer, shippingAddress, brandId, paymentData, couponCode, total } = body;

        if (!brandId || !Array.isArray(items) || items.length === 0 || !customer?.name || !customer?.email || !shippingAddress?.state) {
            return NextResponse.json({
                success: false,
                error: 'Missing required checkout fields.',
            }, { status: 400 });
        }

        if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid total amount.',
            }, { status: 400 });
        }

        const rawSubtotal = Number(items.reduce(
            (sum, item) => sum + ((item.price || 0) * (item.quantity || 1)),
            0
        ).toFixed(2));

        // 1. Validate shipping state
        if (RESTRICTED_STATES.includes(shippingAddress.state)) {
            return NextResponse.json({
                success: false,
                error: `Sorry, we cannot ship to ${shippingAddress.state} due to state regulations.`
            }, { status: 400 });
        }

        const { firestore } = await createServerClient();

        let discount = 0;
        let appliedCoupon: { couponId: string; code: string; discountAmount: number } | null = null;
        const normalizedCouponCode = couponCode?.trim().toUpperCase();

        if (normalizedCouponCode) {
            const couponSnap = await firestore.collection('coupons')
                .where('code', '==', normalizedCouponCode)
                .where('brandId', '==', brandId)
                .limit(1)
                .get();

            if (couponSnap.empty) {
                return NextResponse.json({
                    success: false,
                    error: 'This coupon code is not valid.',
                }, { status: 400 });
            }

            const couponDoc = couponSnap.docs[0];
            const coupon = couponDoc.data();

            if (coupon.active === false) {
                return NextResponse.json({
                    success: false,
                    error: 'This coupon is inactive.',
                }, { status: 400 });
            }

            const expiresAt = asDate(coupon.expiresAt);
            if (expiresAt && expiresAt < new Date()) {
                return NextResponse.json({
                    success: false,
                    error: 'This coupon has expired.',
                }, { status: 400 });
            }

            if (coupon.maxUses && (coupon.uses || 0) >= coupon.maxUses) {
                return NextResponse.json({
                    success: false,
                    error: 'This coupon has reached its maximum number of uses.',
                }, { status: 400 });
            }

            if ((coupon.type !== 'fixed' && coupon.type !== 'percentage') || typeof coupon.value !== 'number' || coupon.value <= 0) {
                return NextResponse.json({
                    success: false,
                    error: 'This coupon has an invalid configuration.',
                }, { status: 400 });
            }

            if (coupon.type === 'fixed') {
                discount = coupon.value;
            } else {
                discount = rawSubtotal * (coupon.value / 100);
            }

            discount = Number(Math.min(discount, rawSubtotal).toFixed(2));
            appliedCoupon = {
                couponId: couponDoc.id,
                code: normalizedCouponCode,
                discountAmount: discount,
            };
        }

        const calculatedSubtotal = Number(Math.max(0, rawSubtotal - discount).toFixed(2));
        const calculatedTax = Number((calculatedSubtotal * 0.15).toFixed(2));
        const calculatedTotal = Number((calculatedSubtotal + calculatedTax).toFixed(2));

        if (Math.abs(total - calculatedTotal) > 0.01) {
            logger.warn('[ShippingOrderAPI] Client total mismatch, using server-calculated total', {
                clientTotal: total,
                serverTotal: calculatedTotal,
                brandId,
                discount,
            });
        }

        let transactionId = null;
        let paymentStatus = 'pending';

        // 2. Process Payment via Authorize.net
        if (paymentData) {
            logger.info('[ShippingOrderAPI] Processing Authorize.net payment', {
                brandId,
                total: calculatedTotal,
                customerEmail: customer.email
            });

            const nameParts = customer.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || firstName;

            const paymentResult = await createTransaction({
                amount: calculatedTotal,
                opaqueData: paymentData.opaqueData,
                cardNumber: paymentData.cardNumber,
                expirationDate: paymentData.expirationDate,
                cvv: paymentData.cvv,
                customer: {
                    email: customer.email,
                    firstName,
                    lastName,
                    address: shippingAddress.street,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    zip: shippingAddress.zip,
                },
                description: `Hemp order for ${customer.email}`
            });

            if (!paymentResult.success) {
                logger.warn('[ShippingOrderAPI] Payment failed', {
                    message: paymentResult.message,
                    errors: paymentResult.errors,
                    responseCode: paymentResult.responseCode,
                    brandId,
                    total: calculatedTotal
                });
                return NextResponse.json({
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.',
                    details: paymentResult.errors
                }, { status: 400 });
            }

            transactionId = paymentResult.transactionId;
            paymentStatus = 'paid';
            logger.info('[ShippingOrderAPI] Payment successful', { transactionId, brandId });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Payment information is required for shipping orders.'
            }, { status: 400 });
        }

        // 3. Create Order in Firestore
        const order = {
            items: items.map(item => ({
                productId: item.id,
                name: item.name,
                qty: item.quantity || 1,
                price: item.price,
                category: item.category,
            })),
            customer: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
            },
            brandId,
            retailerId: brandId, // For shipping orders, brand is the "retailer"
            totals: {
                subtotal: calculatedSubtotal,
                tax: calculatedTax,
                discount,
                shipping: 0, // Free shipping
                total: calculatedTotal,
            },
            coupon: appliedCoupon ? {
                code: appliedCoupon.code,
                discount: appliedCoupon.discountAmount,
            } : undefined,
            transactionId,
            paymentMethod: 'credit_card',
            paymentProvider: 'authorize_net',
            paymentStatus,
            status: 'submitted',
            mode: 'live' as const,

            // Shipping-specific fields
            purchaseModel: 'online_only' as PurchaseModel,
            shippingAddress,
            fulfillmentStatus: 'pending' as const,

            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('orders').add(order);
        const orderId = docRef.id;

        logger.info('[ShippingOrderAPI] Order created', { orderId, brandId });

        if (appliedCoupon) {
            try {
                await firestore.collection('coupons').doc(appliedCoupon.couponId).update({
                    uses: FieldValue.increment(1),
                    updatedAt: new Date(),
                });
            } catch (couponError) {
                logger.warn('[ShippingOrderAPI] Failed to increment coupon usage after order creation', {
                    orderId,
                    couponId: appliedCoupon.couponId,
                    error: couponError instanceof Error ? couponError.message : String(couponError),
                });
            }
        }

        // 4. Send Confirmation Email
        const shippingAddressStr = `${shippingAddress.street}${shippingAddress.street2 ? ', ' + shippingAddress.street2 : ''}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`;
        let brandName = 'Ecstatic Edibles';
        try {
            const brandDoc = await firestore.collection('brands').doc(brandId).get();
            if (brandDoc.exists) {
                brandName = brandDoc.data()?.name || brandName;
            }
        } catch (brandError) {
            logger.warn('[ShippingOrderAPI] Could not fetch brand for confirmation email', {
                brandId,
                error: brandError instanceof Error ? brandError.message : String(brandError),
            });
        }

        sendOrderConfirmationEmail({
            orderId,
            customerName: customer.name,
            customerEmail: customer.email,
            total: calculatedTotal,
            items: items.map(i => ({
                name: i.name,
                qty: i.quantity || 1,
                price: i.price
            })),
            retailerName: brandName,
            pickupAddress: `Shipping to: ${shippingAddressStr}`,
        }).catch(err => logger.error('[ShippingOrderAPI] Email send failed', { error: err.message }));

        return NextResponse.json({ success: true, orderId });

    } catch (error: any) {
        logger.error('[ShippingOrderAPI] Failed to create order', {
            error: error.message,
            stack: error.stack
        });

        return NextResponse.json({
            success: false,
            error: 'Failed to create order. Please try again.'
        }, { status: 500 });
    }
}
