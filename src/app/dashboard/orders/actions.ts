
'use server';

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/firebase/server-client";
import { z } from "zod";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";

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
        const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
        const userRole = userDoc.data()?.role;

        // This is a server-side admin write, so it bypasses security rules.
        // We still check for role here as a server-side authorization check.
        if (userRole !== 'dispensary' && userRole !== 'owner') {
            return { error: true, message: 'You do not have permission to update orders.' };
        }

        const orderRef = firestore.collection('orders').doc(orderId);
        
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
