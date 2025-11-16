
'use server';

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/firebase/server-client";
import { z } from "zod";
import { cookies } from "next/headers";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import type { OrderDoc, Retailer } from "@/firebase/converters";

const StatusSchema = z.enum(['submitted', 'pending', 'confirmed', 'ready', 'completed', 'cancelled']);
export type OrderStatus = z.infer<typeof StatusSchema>;

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    
    if (!orderId || !status) {
        return { error: true, message: 'Order ID and status are required.' };
    }
    
    const validation = StatusSchema.safeParse(status);
    if (!validation.success) {
        return { error: true, message: 'Invalid status provided.' };
    }

    try {
        const { firestore, auth } = await createServerClient();
        const sessionCookie = cookies().get('__session')?.value;
        if (!sessionCookie) {
           return { error: true, message: 'You must be logged in to perform this action.' };
        }
        
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        const userClaims = decodedToken;

        if (!userClaims) {
            return { error: true, message: 'User profile not found.' };
        }

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { error: true, message: 'Order not found.' };
        }
        
        const orderData = orderDoc.data() as OrderDoc;

        // --- SECURITY FIX: Verify Ownership ---
        if (userClaims.role === 'dispensary' && userClaims.locationId !== orderData?.retailerId) {
            console.warn(`SECURITY ALERT: User ${decodedToken.uid} (dispensary) attempted to modify order ${orderId} for another location (${orderData?.retailerId}).`);
            return { error: true, message: 'You are not authorized to modify this order.' };
        }
        
        if (userClaims.role !== 'dispensary' && userClaims.role !== 'owner' && userClaims.role !== 'brand') {
             return { error: true, message: 'You do not have permission to update orders.' };
        }
        
        // Update the document in Firestore
        await orderRef.update({ status: validation.data });

        // --- NEW: Send status update email ---
        try {
            const retailerSnap = await firestore.collection('dispensaries').doc(orderData.retailerId).get();
            if (retailerSnap.exists) {
                const retailerData = retailerSnap.data() as Retailer;
                await sendOrderEmail({
                    to: orderData.customer.email,
                    subject: `Update on your BakedBot Order #${orderId.substring(0,7)}`,
                    orderId: orderId,
                    order: orderData,
                    retailer: retailerData,
                    recipientType: 'customer',
                    updateInfo: {
                        newStatus: validation.data,
                    }
                });
            }
        } catch (emailError) {
            console.error(`Failed to send status update email for order ${orderId}:`, emailError);
            // Non-fatal error, do not block the success response.
        }

        // Revalidate paths to update UI
        revalidatePath('/dashboard/orders');
        revalidatePath(`/order-confirmation/${orderId}`);

        return { error: false, message: `Order status updated to ${status}.` };

    } catch (e: any) {
        console.error("Failed to update order status:", e);
        if (e.code === 'auth/session-cookie-expired' || e.code === 'auth/argument-error') {
            return { error: true, message: 'Authentication session has expired. Please log in again.' };
        }
        return { error: true, message: e.message || "A server error occurred." };
    }
}
