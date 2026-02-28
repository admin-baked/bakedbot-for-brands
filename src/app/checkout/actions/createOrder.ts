'use server';

// src/app/checkout/actions/createOrder.ts
/**
 * Server action to create an order in Firestore
 * Hardened for account-bound, address-validated card checkout.
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { applyCoupon } from './applyCoupon';
import { createDelivery, autoAssignDriver } from '@/server/actions/delivery';
import { requireUser } from '@/server/auth/auth';
import type { BillingAddress } from '@/types/orders';

import { logger } from '@/lib/logger';
const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

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
    paymentMethod: 'authorize_net' | 'cannpay' | 'cash' | 'smokey_pay';
    paymentData?: any;
    total: number;
    billingAddress?: BillingAddress;
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

type ResolvedOrderItem = {
    productId: string;
    name: string;
    qty: number;
    price: number;
    category?: string;
    brandId?: string;
};

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

function splitName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    if (!trimmed) {
        return { firstName: 'Customer', lastName: 'Checkout' };
    }
    const parts = trimmed.split(/\s+/);
    return {
        firstName: parts[0] || 'Customer',
        lastName: parts.slice(1).join(' ') || parts[0] || 'Checkout',
    };
}

function productMatchesCheckoutContext(
    product: any,
    retailerId: string,
    brandId?: string,
): boolean {
    if (!product || typeof product !== 'object') return false;

    const matchesRetailer =
        product.dispensaryId === retailerId ||
        product.retailerId === retailerId ||
        (Array.isArray(product.retailerIds) && product.retailerIds.includes(retailerId));

    const matchesBrand =
        !!brandId && (
            product.brandId === brandId ||
            product.orgId === brandId ||
            product.organizationId === brandId
        );

    const hasContextFields =
        typeof product.dispensaryId === 'string' ||
        typeof product.retailerId === 'string' ||
        Array.isArray(product.retailerIds) ||
        typeof product.brandId === 'string' ||
        typeof product.orgId === 'string' ||
        typeof product.organizationId === 'string';

    if (!hasContextFields) return true;
    return matchesRetailer || matchesBrand;
}

export async function createOrder(input: CreateOrderInput) {
    try {
        let session;
        try {
            session = await requireUser();
        } catch {
            return { success: false, error: 'You must be signed in to complete checkout.' };
        }

        if ((session as any).email_verified === false || (session as any).emailVerified === false) {
            return { success: false, error: 'Please verify your email before placing an order.' };
        }

        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = input.customer.email.trim().toLowerCase();
        if (sessionEmail && requestEmail !== sessionEmail) {
            return { success: false, error: 'Customer email must match your signed-in account.' };
        }

        const { firestore } = await createServerClient();

        const resolvedItems: ResolvedOrderItem[] = [];
        for (const item of input.items) {
            const productId = typeof (item.productId || item.id) === 'string'
                ? String(item.productId || item.id).trim()
                : '';
            const qty = Number(item.quantity || item.qty || 1);

            if (!productId || !DOCUMENT_ID_REGEX.test(productId) || !Number.isInteger(qty) || qty <= 0 || qty > 100) {
                return { success: false, error: 'Invalid cart items provided.' };
            }

            const productDoc = await firestore.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                return { success: false, error: `Product ${productId} is no longer available.` };
            }

            const productData = productDoc.data() || {};
            if (!productMatchesCheckoutContext(productData, input.retailerId, input.brandId)) {
                return { success: false, error: 'Cart contains products that do not belong to this retailer.' };
            }

            const serverPrice = Number(productData.price);
            if (!Number.isFinite(serverPrice) || serverPrice < 0) {
                return { success: false, error: `${productData.name || 'A product'} has an invalid price.` };
            }

            resolvedItems.push({
                productId,
                name: typeof productData.name === 'string' && productData.name.trim().length > 0
                    ? productData.name
                    : (typeof item.name === 'string' ? item.name : 'Product'),
                qty,
                price: Number(serverPrice.toFixed(2)),
                category: typeof productData.category === 'string' ? productData.category : undefined,
                brandId: typeof productData.brandId === 'string' ? productData.brandId : undefined,
            });
        }

        const subtotal = Number(
            resolvedItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2),
        );

        const inferredBrandId = input.brandId || resolvedItems.find((item) => typeof item.brandId === 'string')?.brandId;
        let discount = 0;
        let appliedCoupon: { couponId: string; code: string; discountAmount: number } | null = null;

        if (input.couponCode) {
            if (!inferredBrandId) {
                return {
                    success: false,
                    error: 'Coupon validation requires a brand context.',
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

        const normalizedBillingAddress =
            normalizeAddress(input.billingAddress) ||
            normalizeAddress(input.deliveryAddress);

        if (input.paymentMethod === 'authorize_net' && !normalizedBillingAddress) {
            return {
                success: false,
                error: 'A valid billing address is required for credit card payment.',
            };
        }

        const normalizedCustomerEmail = sessionEmail || requestEmail;
        const order = {
            userId: session.uid,
            items: resolvedItems,
            customer: {
                ...input.customer,
                email: normalizedCustomerEmail,
            },
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
            fulfillmentType: input.fulfillmentType || 'pickup',
            shippingAddress: input.deliveryAddress || undefined,
            billingAddress: normalizedBillingAddress || undefined,
            deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
            deliveryWindow: input.deliveryWindow ? {
                start: input.deliveryWindow.start,
                end: input.deliveryWindow.end,
            } : undefined,
            deliveryInstructions: input.deliveryInstructions || undefined,
            transactionId: null as string | null,
            status: 'submitted',
            paymentStatus:
                input.paymentMethod === 'authorize_net'
                    ? 'pending'
                    : input.paymentMethod === 'cannpay'
                        ? 'pending_cannpay'
                        : 'pay_at_pickup',
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

        let paymentSuccessful = true;
        let transactionId: string | null = null;

        if (input.paymentMethod === 'authorize_net') {
            if (!input.paymentData) {
                await docRef.update({
                    paymentStatus: 'failed',
                    updatedAt: FieldValue.serverTimestamp(),
                });
                return {
                    success: false,
                    error: 'Payment details are required for credit card checkout.',
                };
            }

            const { firstName, lastName } = splitName(input.customer.name);
            const paymentResult = await createTransaction({
                amount: serverTotal,
                orderId,
                opaqueData: input.paymentData.opaqueData,
                cardNumber: input.paymentData.cardNumber,
                expirationDate: input.paymentData.expirationDate,
                cvv: input.paymentData.cvv,
                customer: {
                    email: normalizedCustomerEmail,
                    firstName,
                    lastName,
                    address: normalizedBillingAddress!.street,
                    city: normalizedBillingAddress!.city,
                    state: normalizedBillingAddress!.state,
                    zip: normalizedBillingAddress!.zip,
                },
                description: `Order for ${normalizedCustomerEmail}`,
            });

            if (!paymentResult.success) {
                paymentSuccessful = false;
                await docRef.update({
                    paymentStatus: 'failed',
                    updatedAt: FieldValue.serverTimestamp(),
                });
                logger.warn('Payment failed', { orderId, errors: paymentResult.errors });
                return {
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.',
                };
            }

            transactionId = paymentResult.transactionId || null;
            await docRef.update({
                transactionId,
                paymentStatus: 'paid',
                updatedAt: FieldValue.serverTimestamp(),
            });

            await firestore.collection('users').doc(session.uid).set({
                billingAddress: normalizedBillingAddress,
                billingAddressUpdatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }

        if (appliedCoupon && paymentSuccessful) {
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

        let retailerName = 'Dispensary';
        let pickupAddress = 'Pickup Location';

        try {
            const retailerDoc = await firestore.collection('dispensaries').doc(input.retailerId).get();
            if (retailerDoc.exists) {
                const data = retailerDoc.data();
                retailerName = data?.name || retailerName;
                pickupAddress = `${data?.address}, ${data?.city}, ${data?.state} ${data?.zip}`;
            }
        } catch {
            logger.warn('Failed to fetch retailer for email', { retailerId: input.retailerId });
        }

        let deliveryId: string | undefined;
        if (input.fulfillmentType === 'delivery' && input.deliveryAddress && input.deliveryWindow) {
            try {
                const deliveryResult = await createDelivery({
                    orderId,
                    locationId: `loc_${input.retailerId}`,
                    deliveryAddress: {
                        ...input.deliveryAddress,
                        country: input.deliveryAddress.country || 'US',
                        phone: input.customer.phone,
                    },
                    deliveryWindow: {
                        start: input.deliveryWindow.start as any,
                        end: input.deliveryWindow.end as any,
                        type: 'scheduled',
                    },
                    deliveryFee,
                    zoneId: 'zone_default',
                });

                if (deliveryResult.success && deliveryResult.delivery) {
                    deliveryId = deliveryResult.delivery.id;
                    autoAssignDriver(deliveryId, `loc_${input.retailerId}`)
                        .catch(err => logger.warn('Auto-assign driver failed', { orderId, error: err }));
                }
            } catch (deliveryError) {
                logger.error('Failed to create delivery record', { orderId, error: deliveryError });
            }
        }

        sendOrderConfirmationEmail({
            orderId,
            customerName: input.customer.name,
            customerEmail: normalizedCustomerEmail,
            total: serverTotal,
            items: resolvedItems.map(i => ({
                name: i.name,
                qty: i.qty,
                price: i.price,
            })),
            retailerName,
            pickupAddress,
        }).catch(err => logger.error('Background email send failed', err));

        return {
            success: true,
            orderId,
            deliveryId,
            trackingUrl: deliveryId ? `/track/${deliveryId}` : undefined,
        };
    } catch (error: any) {
        logger.error('Failed to create order:', error);
        return { success: false, error: 'Failed to create order. Please try again.' };
    }
}
