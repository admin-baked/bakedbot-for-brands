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
    paymentMethod: 'authorize_net';
    paymentData?: any;
    total: number;
};

export async function POST(req: NextRequest) {
    try {
        const body: ShippingOrderRequest = await req.json();
        const { items, customer, shippingAddress, brandId, paymentData, total } = body;

        // 1. Validate shipping state
        if (RESTRICTED_STATES.includes(shippingAddress.state)) {
            return NextResponse.json({
                success: false,
                error: `Sorry, we cannot ship to ${shippingAddress.state} due to state regulations.`
            }, { status: 400 });
        }

        let transactionId = null;
        let paymentStatus = 'pending';

        // 2. Process Payment via Authorize.net
        if (paymentData) {
            logger.info('[ShippingOrderAPI] Processing Authorize.net payment', {
                brandId,
                total,
                customerEmail: customer.email
            });

            const nameParts = customer.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || firstName;

            const paymentResult = await createTransaction({
                amount: total,
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
                    errors: paymentResult.errors,
                    brandId
                });
                return NextResponse.json({
                    success: false,
                    error: paymentResult.message || 'Payment declined. Please check your card details.'
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
        const { firestore } = await createServerClient();
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
                subtotal: total * 0.9, // Rough estimate
                tax: total * 0.1,
                shipping: 0, // Free shipping
                total,
            },
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

        // 4. Send Confirmation Email
        const shippingAddressStr = `${shippingAddress.street}${shippingAddress.street2 ? ', ' + shippingAddress.street2 : ''}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`;

        sendOrderConfirmationEmail({
            orderId,
            customerName: customer.name,
            customerEmail: customer.email,
            total,
            items: items.map(i => ({
                name: i.name,
                qty: i.quantity || 1,
                price: i.price
            })),
            retailerName: 'Ecstatic Edibles',
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
