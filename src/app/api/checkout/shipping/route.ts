// src/app/api/checkout/shipping/route.ts
/**
 * API Route for Hemp E-Commerce Shipping Orders
 * Hardened for authenticated, order-bound card charges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import type { BillingAddress, ShippingAddress, PurchaseModel } from '@/types/orders';
import { isShippingCheckoutEnabled } from '@/lib/feature-flags';

const RESTRICTED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];
const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

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

type ResolvedLineItem = {
    id: string;
    name: string;
    quantity: number;
    price: number;
    category?: string;
};

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeAddress(address: any): BillingAddress | null {
    if (!address || typeof address !== 'object') return null;

    const street = typeof address.street === 'string' ? address.street.trim() : '';
    const street2 = typeof address.street2 === 'string' ? address.street2.trim() : undefined;
    const city = typeof address.city === 'string' ? address.city.trim() : '';
    const state = typeof address.state === 'string' ? address.state.trim().toUpperCase() : '';
    const zip = typeof address.zip === 'string' ? address.zip.trim() : '';
    const countryRaw = typeof address.country === 'string' ? address.country.trim().toUpperCase() : 'US';
    const country = countryRaw || 'US';

    if (!street || !city || !state || !zip) return null;
    if (state.length !== 2) return null;
    if (!/^\d{5}(-\d{4})?$/.test(zip)) return null;

    return {
        street,
        ...(street2 ? { street2 } : {}),
        city,
        state,
        zip,
        country,
    };
}

function productBelongsToBrand(product: any, brandId: string): boolean {
    if (!product || typeof product !== 'object') return false;
    if (product.brandId === brandId) return true;
    if (product.orgId === brandId) return true;
    if (product.organizationId === brandId) return true;
    if (product.dispensaryId === brandId) return true;
    if (Array.isArray(product.retailerIds) && product.retailerIds.includes(brandId)) return true;
    return false;
}

export async function POST(req: NextRequest) {
    try {
        if (!isShippingCheckoutEnabled()) {
            return NextResponse.json({
                success: false,
                error: 'Shipping checkout is currently disabled.',
            }, { status: 503 });
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return NextResponse.json({
                success: false,
                error: 'Authentication required for checkout.',
            }, { status: 401 });
        }

        if ((session as any).email_verified === false || (session as any).emailVerified === false) {
            return NextResponse.json({
                success: false,
                error: 'Please verify your email before placing a shipping order.',
            }, { status: 403 });
        }

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

        const normalizedShipping = normalizeAddress(shippingAddress);
        if (!normalizedShipping) {
            return NextResponse.json({
                success: false,
                error: 'A valid shipping address is required.',
            }, { status: 400 });
        }

        if (RESTRICTED_STATES.includes(normalizedShipping.state)) {
            return NextResponse.json({
                success: false,
                error: `Sorry, we cannot ship to ${normalizedShipping.state} due to state regulations.`,
            }, { status: 400 });
        }

        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = customer.email.trim().toLowerCase();
        if (sessionEmail && requestEmail !== sessionEmail) {
            return NextResponse.json({
                success: false,
                error: 'Customer email must match authenticated account.',
            }, { status: 403 });
        }

        const { firestore } = await createServerClient();

        const resolvedItems: ResolvedLineItem[] = [];
        for (const item of items) {
            const productId = typeof item?.id === 'string' ? item.id.trim() : '';
            const quantity = Number(item?.quantity ?? 1);

            if (!productId || !DOCUMENT_ID_REGEX.test(productId) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid cart items provided.',
                }, { status: 400 });
            }

            const productDoc = await firestore.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                return NextResponse.json({
                    success: false,
                    error: `Product ${productId} is no longer available.`,
                }, { status: 400 });
            }

            const productData = productDoc.data() || {};
            if (!productBelongsToBrand(productData, brandId)) {
                return NextResponse.json({
                    success: false,
                    error: 'Cart contains products that do not belong to this brand.',
                }, { status: 403 });
            }

            if (productData.shippable === false) {
                return NextResponse.json({
                    success: false,
                    error: `${productData.name || 'A product'} is not available for shipping.`,
                }, { status: 400 });
            }

            const restrictedStates = Array.isArray(productData.shippingRestrictions)
                ? productData.shippingRestrictions.map((state: any) => String(state).toUpperCase())
                : [];
            if (restrictedStates.includes(normalizedShipping.state)) {
                return NextResponse.json({
                    success: false,
                    error: `${productData.name || 'A product'} cannot be shipped to ${normalizedShipping.state}.`,
                }, { status: 400 });
            }

            const serverPrice = Number(productData.price);
            if (!Number.isFinite(serverPrice) || serverPrice < 0) {
                return NextResponse.json({
                    success: false,
                    error: `${productData.name || 'A product'} has an invalid price configuration.`,
                }, { status: 400 });
            }

            resolvedItems.push({
                id: productId,
                name: typeof productData.name === 'string' && productData.name.trim().length > 0
                    ? productData.name
                    : (typeof item?.name === 'string' ? item.name : 'Product'),
                quantity,
                price: Number(serverPrice.toFixed(2)),
                category: typeof productData.category === 'string' ? productData.category : undefined,
            });
        }

        const rawSubtotal = Number(resolvedItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0,
        ).toFixed(2));

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

        if (!paymentData) {
            return NextResponse.json({
                success: false,
                error: 'Payment information is required for shipping orders.',
            }, { status: 400 });
        }

        const normalizedCustomerEmail = sessionEmail || requestEmail;
        const orderDraft = {
            userId: session.uid,
            items: resolvedItems.map(item => ({
                productId: item.id,
                name: item.name,
                qty: item.quantity,
                price: item.price,
                category: item.category,
            })),
            customer: {
                name: customer.name,
                email: normalizedCustomerEmail,
                phone: customer.phone,
            },
            brandId,
            retailerId: brandId,
            totals: {
                subtotal: calculatedSubtotal,
                tax: calculatedTax,
                discount,
                shipping: 0,
                total: calculatedTotal,
            },
            coupon: appliedCoupon ? {
                code: appliedCoupon.code,
                discount: appliedCoupon.discountAmount,
            } : undefined,
            billingAddress: normalizedShipping,
            paymentMethod: 'credit_card',
            paymentProvider: 'authorize_net',
            paymentStatus: 'pending',
            status: 'submitted',
            mode: 'live' as const,
            purchaseModel: 'online_only' as PurchaseModel,
            shippingAddress: normalizedShipping,
            fulfillmentStatus: 'pending' as const,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const orderRef = await firestore.collection('orders').add(orderDraft);
        const orderId = orderRef.id;

        logger.info('[ShippingOrderAPI] Processing Authorize.net payment', {
            orderId,
            brandId,
            total: calculatedTotal,
            customerEmail: normalizedCustomerEmail,
        });

        const nameParts = customer.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const paymentResult = await createTransaction({
            amount: calculatedTotal,
            orderId,
            opaqueData: paymentData.opaqueData,
            cardNumber: paymentData.cardNumber,
            expirationDate: paymentData.expirationDate,
            cvv: paymentData.cvv,
            customer: {
                email: normalizedCustomerEmail,
                firstName,
                lastName,
                address: normalizedShipping.street,
                city: normalizedShipping.city,
                state: normalizedShipping.state,
                zip: normalizedShipping.zip,
            },
            description: `Hemp order for ${normalizedCustomerEmail}`,
        });

        if (!paymentResult.success) {
            await orderRef.update({
                paymentStatus: 'failed',
                updatedAt: FieldValue.serverTimestamp(),
            });

            logger.warn('[ShippingOrderAPI] Payment failed', {
                orderId,
                message: paymentResult.message,
                errors: paymentResult.errors,
                responseCode: paymentResult.responseCode,
                brandId,
                total: calculatedTotal,
            });
            return NextResponse.json({
                success: false,
                error: paymentResult.message || 'Payment declined. Please check your card details.',
                details: paymentResult.errors,
                orderId,
            }, { status: 400 });
        }

        await orderRef.update({
            transactionId: paymentResult.transactionId || null,
            paymentStatus: 'paid',
            updatedAt: FieldValue.serverTimestamp(),
        });

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

        await firestore.collection('users').doc(session.uid).set({
            billingAddress: normalizedShipping,
            billingAddressUpdatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        logger.info('[ShippingOrderAPI] Payment successful and order updated', {
            orderId,
            transactionId: paymentResult.transactionId,
            brandId,
        });

        const shippingAddressStr = `${normalizedShipping.street}${normalizedShipping.street2 ? ', ' + normalizedShipping.street2 : ''}, ${normalizedShipping.city}, ${normalizedShipping.state} ${normalizedShipping.zip}`;
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
            customerEmail: normalizedCustomerEmail,
            total: calculatedTotal,
            items: resolvedItems.map(i => ({
                name: i.name,
                qty: i.quantity,
                price: i.price,
            })),
            retailerName: brandName,
            pickupAddress: `Shipping to: ${shippingAddressStr}`,
        }).catch(err => logger.error('[ShippingOrderAPI] Email send failed', { error: err.message }));

        return NextResponse.json({ success: true, orderId });
    } catch (error: any) {
        logger.error('[ShippingOrderAPI] Failed to create order', {
            error: error.message,
            stack: error.stack,
        });

        return NextResponse.json({
            success: false,
            error: 'Failed to create order. Please try again.',
        }, { status: 500 });
    }
}
