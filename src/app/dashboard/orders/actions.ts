
'use server';

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/firebase/server-client";
import { z } from "zod";
import { cookies } from "next/headers";

const StatusSchema = z.enum(['submitted', 'pending', 'confirmed', 'ready', 'completed', 'cancelled']);

export async function updateOrderStatus(orderId: string, status: z.infer<typeof StatusSchema>) {
    
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
        const userDocRef = firestore.collection('users').doc(decodedToken.uid);
        const userDoc = await userDocRef.get();
        const userProfile = userDoc.data();

        if (!userProfile) {
            return { error: true, message: 'User profile not found.' };
        }

        const orderRef = firestore.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { error: true, message: 'Order not found.' };
        }
        
        const orderData = orderDoc.data();

        // --- SECURITY FIX: Verify Ownership ---
        // An owner can modify any order.
        // A dispensary manager can ONLY modify orders for their assigned location.
        if (userProfile.role === 'dispensary' && userProfile.locationId !== orderData?.locationId) {
            console.warn(`SECURITY ALERT: User ${decodedToken.uid} (dispensary) attempted to modify order ${orderId} for another location (${orderData?.locationId}).`);
            return { error: true, message: 'You are not authorized to modify this order.' };
        }
        
        // A brand role cannot modify any orders.
        if (userProfile.role !== 'dispensary' && userProfile.role !== 'owner') {
             return { error: true, message: 'You do not have permission to update orders.' };
        }
        
        await orderRef.update({ status: validation.data });

        // Revalidate the paths where this data is shown.
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
