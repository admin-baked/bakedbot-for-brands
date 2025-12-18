'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { retailerConverter } from '@/firebase/converters';
import type { OrderStatus, OrderDoc, Retailer } from '@/types/domain';
import type { ServerOrderPayload } from '@/app/checkout/actions/submitOrder';

/**
 * Send order status notification to customer
 * Currently supports email, with SMS hooks for future implementation
 */
export async function sendOrderNotification(
    orderId: string,
    newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        // 1. Fetch the order
        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data() as OrderDoc;

        // 2. Fetch the retailer
        const retailerDoc = await firestore
            .collection('dispensaries')
            .doc(order.retailerId)
            .withConverter(retailerConverter as any)
            .get();

        const retailer = retailerDoc.data() as Retailer | undefined;

        if (!retailer) {
            logger.warn('Retailer not found for notification', { orderId, retailerId: order.retailerId });
            // Still send notification, just without retailer details
        }

        // 3. Build server order payload for email
        const serverOrderPayload: ServerOrderPayload = {
            items: order.items,
            customer: order.customer,
            retailerId: order.retailerId,
            totals: order.totals,
        };

        // 4. Determine subject based on status
        const statusLabels: Record<OrderStatus, string> = {
            pending: 'Received',
            submitted: 'Submitted',
            confirmed: 'Confirmed',
            preparing: 'Being Prepared',
            ready: 'Ready for Pickup',
            completed: 'Complete',
            cancelled: 'Cancelled',
        };

        const subject = `Order #${orderId.substring(0, 7)}: ${statusLabels[newStatus]}`;

        // 5. Send email notification
        await sendOrderEmail({
            to: order.customer.email,
            subject,
            orderId,
            order: serverOrderPayload,
            retailer: retailer || {
                id: order.retailerId,
                name: 'Your Dispensary',
                address: '',
                city: '',
                state: '',
                zip: '',
            },
            recipientType: 'customer',
            updateInfo: { newStatus },
        });

        logger.info('Order notification sent', { orderId, newStatus, email: order.customer.email });

        // 6. TODO: Add SMS notification
        // if (order.customer.phone) {
        //     await sendSmsNotification(order.customer.phone, message);
        // }

        return { success: true };
    } catch (error: any) {
        logger.error('Failed to send order notification:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to dispensary about new order
 */
export async function sendDispensaryNotification(
    orderId: string,
    dispensaryEmail?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data() as OrderDoc;

        const retailerDoc = await firestore
            .collection('dispensaries')
            .doc(order.retailerId)
            .withConverter(retailerConverter as any)
            .get();

        const retailer = retailerDoc.data() as Retailer | undefined;

        // Get dispensary email from retailer doc or use provided one
        const email = dispensaryEmail || retailer?.email;

        if (!email) {
            logger.warn('No dispensary email found for notification', { orderId });
            return { success: false, error: 'No dispensary email configured' };
        }

        const serverOrderPayload: ServerOrderPayload = {
            items: order.items,
            customer: order.customer,
            retailerId: order.retailerId,
            totals: order.totals,
        };

        await sendOrderEmail({
            to: email,
            subject: `New Order #${orderId.substring(0, 7)} - ${order.customer.name}`,
            orderId,
            order: serverOrderPayload,
            retailer: retailer || {
                id: order.retailerId,
                name: 'Your Dispensary',
                address: '',
                city: '',
                state: '',
                zip: '',
            },
            recipientType: 'dispensary',
        });

        logger.info('Dispensary notification sent', { orderId, email });
        return { success: true };
    } catch (error: any) {
        logger.error('Failed to send dispensary notification:', error);
        return { success: false, error: error.message };
    }
}
