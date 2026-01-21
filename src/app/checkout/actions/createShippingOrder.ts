'use server';

/**
 * Server action to create a shipping order for hemp e-commerce
 * Handles credit card payment via Authorize.net
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/dispatcher';
import { logger } from '@/lib/logger';
import type { ShippingAddress, PurchaseModel } from '@/types/orders';

// States where hemp shipping is restricted
const RESTRICTED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];

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
    total: number;
};

export async function createShippingOrder(input: CreateShippingOrderInput) {
    try {
        const { firestore } = await createServerClient();

        // 1. Validate shipping state
        if (RESTRICTED_STATES.includes(input.shippingAddress.state)) {
            return {
                success: false,
                error: `Sorry, we cannot ship to ${input.shippingAddress.state} due to state regulations.`
            };
        }

        let transactionId = null;
        let paymentStatus = 'pending';

        // 2. Process Payment via Authorize.net
        if (input.paymentData) {
            logger.info('[ShippingOrder] Processing Authorize.net payment');

            const nameParts = input.customer.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || firstName;

            const paymentResult = await createTransaction({
                amount: input.total,
                opaqueData: input.paymentData.opaqueData,
                cardNumber: input.paymentData.cardNumber,
                expirationDate: input.paymentData.expirationDate,
                cvv: input.paymentData.cvv,
                customer: {
                    email: input.customer.email,
                    firstName,
                    lastName,
                    // Use shipping address as billing address
                    address: input.shippingAddress.street,
                    city: input.shippingAddress.city,
                    state: input.shippingAddress.state,
                    zip: input.shippingAddress.zip,
                },
                description: `Hemp order for ${input.customer.email}`
            });

            if (!paymentResult.success) {
                logger.warn('[ShippingOrder] Payment failed', { errors: paymentResult.errors });
                return {
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.'
                };
            }

            transactionId = paymentResult.transactionId;
            paymentStatus = 'paid';
            logger.info('[ShippingOrder] Payment successful', { transactionId });
        } else {
            return {
                success: false,
                error: 'Payment information is required for shipping orders.'
            };
        }

        // 3. Create Order in Firestore
        const order = {
            items: input.items.map(item => ({
                productId: item.id,
                name: item.name,
                qty: item.quantity || 1,
                price: item.price,
                category: item.category,
            })),
            customer: {
                name: input.customer.name,
                email: input.customer.email,
                phone: input.customer.phone,
            },
            brandId: input.brandId,
            retailerId: input.brandId, // For shipping orders, brand is the "retailer"
            totals: {
                subtotal: input.total * 0.9, // Rough estimate (actual should come from cart)
                tax: input.total * 0.1,
                shipping: 0, // Free shipping
                total: input.total,
            },
            transactionId,
            paymentMethod: 'credit_card',
            paymentProvider: 'authorize_net',
            paymentStatus,
            status: 'submitted',
            mode: 'live' as const,

            // Shipping-specific fields
            purchaseModel: 'online_only' as PurchaseModel,
            shippingAddress: input.shippingAddress,
            fulfillmentStatus: 'pending' as const,

            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('orders').add(order);
        const orderId = docRef.id;

        logger.info('[ShippingOrder] Order created', { orderId, brandId: input.brandId });

        // 4. Send Confirmation Email
        const shippingAddressStr = `${input.shippingAddress.street}${input.shippingAddress.street2 ? ', ' + input.shippingAddress.street2 : ''}, ${input.shippingAddress.city}, ${input.shippingAddress.state} ${input.shippingAddress.zip}`;

        sendOrderConfirmationEmail({
            orderId,
            customerName: input.customer.name,
            customerEmail: input.customer.email,
            total: input.total,
            items: input.items.map(i => ({
                name: i.name,
                qty: i.quantity || 1,
                price: i.price
            })),
            retailerName: 'Ecstatic Edibles', // TODO: Fetch brand name
            pickupAddress: `Shipping to: ${shippingAddressStr}`,
        }).catch(err => logger.error('[ShippingOrder] Email send failed', err));

        return { success: true, orderId };
    } catch (error: any) {
        logger.error('[ShippingOrder] Failed to create order:', error);
        return { success: false, error: 'Failed to create order. Please try again.' };
    }
}
