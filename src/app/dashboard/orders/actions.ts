'use server';

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/firebase/server-client";
import { z } from "zod";

const StatusSchema = z.enum(['submitted', 'pending', 'confirmed', 'ready', 'completed', 'cancelled']);

export async function updateOrderStatus(orderId: string, status: z.infer<typeof StatusSchema>, idToken: string) {
    
    if (!orderId || !status) {
        return { error: true, message: 'Order ID and status are required.' };
    }
    
    if (!idToken) {
        return { error: true, message: 'Authentication is required.' };
    }

    const validation = StatusSchema.safeParse(status);
    if (!validation.success) {
        return { error: true, message: 'Invalid status provided.' };
    }

    try {
        const { firestore, auth } = await createServerClient();
        
        // Securely verify the user's token and check their role
        const decodedToken = await auth.verifyIdToken(idToken);
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
        if (e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error') {
            return { error: true, message: 'Authentication session has expired. Please log in again.' };
        }
        return { error: true, message: e.message || "A server error occurred." };
    }
}
