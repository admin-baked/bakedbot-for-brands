'use server';

/**
 * Server action to create a shipping order for hemp e-commerce
 * Handles credit card payment via Authorize.net.
 * Hardened to require account ownership + validated address.
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import type { BillingAddress, ShippingAddress, PurchaseModel } from '@/types/orders';
import { isShippingCheckoutEnabled } from '@/lib/feature-flags';

// States where hemp shipping is restricted
const RESTRICTED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];
const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

type CreateShippingOrderInput = {
    items: any[];
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
    shippingAddress: ShippingAddress;
    brandId: string;
    paymentMethod: 'authorize_net';
    paymentData?: any;
    subtotal?: number;
    tax?: number;
    total: number;
};

type ResolvedShippingItem = {
    id: string;
    name: string;
    quantity: number;
    price: number;
    category?: string;
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

function productBelongsToBrand(product: any, brandId: string): boolean {
    if (!product || typeof product !== 'object') return false;
    if (product.brandId === brandId) return true;
    if (product.orgId === brandId) return true;
    if (product.organizationId === brandId) return true;
    if (product.dispensaryId === brandId) return true;
    if (Array.isArray(product.retailerIds) && product.retailerIds.includes(brandId)) return true;
    return false;
}

export async function createShippingOrder(input: CreateShippingOrderInput) {
    try {
        if (!isShippingCheckoutEnabled()) {
            return { success: false, error: 'Shipping checkout is currently disabled.' };
        }

        let session;
        try {
            session = await requireUser();
        } catch {
            return { success: false, error: 'You must be signed in to complete checkout.' };
        }

        if ((session as any).email_verified === false || (session as any).emailVerified === false) {
            return { success: false, error: 'Please verify your email before placing a shipping order.' };
        }

        if (!Array.isArray(input.items) || input.items.length === 0 || !input.brandId) {
            return { success: false, error: 'Missing required checkout fields.' };
        }

        const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
        const requestEmail = input.customer.email.trim().toLowerCase();
        if (sessionEmail && requestEmail !== sessionEmail) {
            return { success: false, error: 'Customer email must match your signed-in account.' };
        }

        const normalizedShipping = normalizeAddress(input.shippingAddress);
        if (!normalizedShipping) {
            return { success: false, error: 'A valid shipping/billing address is required.' };
        }

        const { firestore } = await createServerClient();

        const resolvedItems: ResolvedShippingItem[] = [];
        for (const item of input.items) {
            const productId = typeof item?.id === 'string' ? item.id.trim() : '';
            const quantity = Number(item?.quantity || 1);

            if (!productId || !DOCUMENT_ID_REGEX.test(productId) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
                return { success: false, error: 'Invalid cart items provided.' };
            }

            const productDoc = await firestore.collection('products').doc(productId).get();
            if (!productDoc.exists) {
                return { success: false, error: `Product ${productId} is no longer available.` };
            }

            const productData = productDoc.data() || {};
            if (!productBelongsToBrand(productData, input.brandId)) {
                return { success: false, error: 'Cart contains products that do not belong to this brand.' };
            }

            if (productData.shippable === false) {
                return { success: false, error: `${productData.name || 'A product'} is not available for shipping.` };
            }

            const restrictedStates = Array.isArray(productData.shippingRestrictions)
                ? productData.shippingRestrictions.map((state: any) => String(state).toUpperCase())
                : [];
            if (restrictedStates.includes(normalizedShipping.state)) {
                return { success: false, error: `${productData.name || 'A product'} cannot be shipped to ${normalizedShipping.state}.` };
            }

            const serverPrice = Number(productData.price);
            if (!Number.isFinite(serverPrice) || serverPrice < 0) {
                return { success: false, error: `${productData.name || 'A product'} has an invalid price.` };
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

        const calculatedSubtotal = Number(resolvedItems.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0,
        ).toFixed(2));
        const calculatedTax = typeof input.tax === 'number' && input.tax >= 0
            ? Number(input.tax.toFixed(2))
            : Number((calculatedSubtotal * 0.15).toFixed(2));
        const calculatedTotal = Number((calculatedSubtotal + calculatedTax).toFixed(2));

        if (Math.abs(input.total - calculatedTotal) > 0.01) {
            logger.warn('[ShippingOrder] Client total mismatch, using server-calculated total', {
                clientTotal: input.total,
                serverTotal: calculatedTotal,
                brandId: input.brandId,
            });
        }

        if (RESTRICTED_STATES.includes(normalizedShipping.state)) {
            return {
                success: false,
                error: `Sorry, we cannot ship to ${normalizedShipping.state} due to state regulations.`,
            };
        }

        if (!input.paymentData) {
            return {
                success: false,
                error: 'Payment information is required for shipping orders.',
            };
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
                name: input.customer.name,
                email: normalizedCustomerEmail,
                phone: input.customer.phone,
            },
            brandId: input.brandId,
            retailerId: input.brandId,
            totals: {
                subtotal: calculatedSubtotal,
                tax: calculatedTax,
                shipping: 0,
                total: calculatedTotal,
            },
            billingAddress: normalizedShipping,
            transactionId: null as string | null,
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

        logger.info('[ShippingOrder] Processing Authorize.net payment', {
            orderId,
            brandId: input.brandId,
            total: calculatedTotal,
        });

        const nameParts = input.customer.name.split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || firstName;
        const paymentResult = await createTransaction({
            amount: calculatedTotal,
            orderId,
            opaqueData: input.paymentData.opaqueData,
            cardNumber: input.paymentData.cardNumber,
            expirationDate: input.paymentData.expirationDate,
            cvv: input.paymentData.cvv,
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

            logger.warn('[ShippingOrder] Payment failed', {
                orderId,
                errors: paymentResult.errors,
                message: paymentResult.message,
            });
            return {
                success: false,
                error: paymentResult.message || 'Payment declined. Please check your card details.',
            };
        }

        await orderRef.update({
            transactionId: paymentResult.transactionId || null,
            paymentStatus: 'paid',
            updatedAt: FieldValue.serverTimestamp(),
        });

        await firestore.collection('users').doc(session.uid).set({
            billingAddress: normalizedShipping,
            billingAddressUpdatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        const shippingAddressStr = `${normalizedShipping.street}${normalizedShipping.street2 ? ', ' + normalizedShipping.street2 : ''}, ${normalizedShipping.city}, ${normalizedShipping.state} ${normalizedShipping.zip}`;

        sendOrderConfirmationEmail({
            orderId,
            customerName: input.customer.name,
            customerEmail: normalizedCustomerEmail,
            total: calculatedTotal,
            items: resolvedItems.map(i => ({
                name: i.name,
                qty: i.quantity,
                price: i.price,
            })),
            retailerName: 'Ecstatic Edibles',
            pickupAddress: `Shipping to: ${shippingAddressStr}`,
        }).catch(err => logger.error('[ShippingOrder] Email send failed', err));

        return { success: true, orderId };
    } catch (error: any) {
        logger.error('[ShippingOrder] Failed to create order:', error);
        return { success: false, error: 'Failed to create order. Please try again.' };
    }
}
