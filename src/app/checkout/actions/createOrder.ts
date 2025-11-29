'use server';

// src/app/checkout/actions/createOrder.ts
/**
 * Server action to create an order in Firestore
 */

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { createTransaction } from '@/lib/authorize-net';
import { sendOrderConfirmationEmail } from '@/lib/email/sendgrid';
import { logger } from '@/lib/monitoring';

import { logger } from '@/lib/logger';
type CreateOrderInput = {
    items: any[];
    customer: {
        name: string;
        email: string;
        phone: string;
    };
    retailerId: string;
    paymentMethod: 'authorize_net' | 'cannpay' | 'cash' | 'smokey_pay'; // smokey_pay is legacy alias
    paymentData?: any;
    total: number;
};

export async function createOrder(input: CreateOrderInput) {
    try {
        const { firestore } = await createServerClient();
        let transactionId = null;
        let paymentStatus = 'pending';

        // 1. Process Payment (if Authorize.net)
        if (input.paymentMethod === 'authorize_net' && input.paymentData) {
            logger.info('Processing Authorize.net payment for order');

            const paymentResult = await createTransaction({
                amount: input.total,
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
            ...input,
            // Remove sensitive payment data from storage
            paymentData: null,
            transactionId,
            status: 'submitted', // Initial status
            paymentStatus,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('orders').add(order);
        const orderId = docRef.id;

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
            total: input.total,
            items: input.items.map(i => ({
                name: i.name,
                qty: i.quantity || i.qty || 1, // Handle different item structures
                price: i.unitPrice || i.price || 0
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
