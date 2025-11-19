// src/app/dashboard/orders/actions.ts
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrderStatus, OrderDoc, Retailer } from '@/types/domain';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { retailerConverter } from '@/firebase/converters';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    submitted: ['confirmed', 'cancelled'],
    confirmed: ['ready', 'cancelled'],
    ready: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};

const StatusUpdateSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required.'),
  newStatus: z.enum(['confirmed', 'ready', 'completed', 'cancelled']),
});

export type FormState = {
  message: string;
  error: boolean;
};

export async function updateOrderStatus(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { auth, firestore } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return { error: true, message: 'Authentication required.' };
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch {
    return { error: true, message: 'Invalid session.' };
  }

  // 1. Authorization: Ensure user has the correct role and locationId
  const userRole = decodedToken.role;
  const userLocationId = decodedToken.locationId;

  if (userRole !== 'dispensary' || !userLocationId) {
    return { error: true, message: 'You are not authorized to update orders.' };
  }
  
  const validatedFields = StatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { message: 'Invalid data provided.', error: true };
  }
  
  const { orderId, newStatus } = validatedFields.data;
  const orderRef = firestore.collection('orders').doc(orderId);

  try {
    // 2. Transaction: Read and write atomically to prevent race conditions
    await firestore.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('Order not found.');
      }
      
      const order = orderDoc.data() as OrderDoc;

      // 3. Authorization part 2: Check if this manager can access this specific order
      if (order.retailerId !== userLocationId) {
        throw new Error("You do not have permission to modify this order.");
      }

      const currentStatus = order.status;
      
      // 4. State Machine: Validate the status transition
      if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'.`);
      }

      transaction.update(orderRef, {
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 5. Post-transaction: Send notification email
    const updatedOrderSnap = await orderRef.get();
    const updatedOrder = updatedOrderSnap.data() as OrderDoc;

    const retailerSnap = await firestore.collection('dispensaries').doc(updatedOrder.retailerId).withConverter(retailerConverter as any).get();
    const retailer = retailerSnap.data() as Retailer;

    if (retailer) {
      await sendOrderEmail({
        to: updatedOrder.customer.email,
        subject: `Your order #${orderId.substring(0, 7)} is now ${newStatus}!`,
        orderId: orderId,
        order: updatedOrder,
        retailer: retailer,
        recipientType: 'customer',
        updateInfo: { newStatus },
      });
    }

    revalidatePath('/dashboard/orders');
    return { message: `Order #${orderId.substring(0,7)} updated to '${newStatus}'.`, error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Update failed: ${errorMessage}`, error: true };
  }
}
