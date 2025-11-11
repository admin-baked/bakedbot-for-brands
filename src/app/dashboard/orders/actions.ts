
'use server';

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/firebase/server-client";
import { z } from "zod";

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
        const { firestore } = await createServerClient();
        const orderRef = firestore.collection('orders').doc(orderId);
        
        await orderRef.update({ status: validation.data });

        // Revalidate the paths where this data is shown.
        revalidatePath('/dashboard/orders');
        revalidatePath(`/order-confirmation/${orderId}`);

        return { error: false, message: `Order status updated to ${status}.` };

    } catch (e: any) {
        console.error("Failed to update order status:", e);
        return { error: true, message: e.message || "A server error occurred." };
    }
}
