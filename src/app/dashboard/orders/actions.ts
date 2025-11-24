
// src/app/dashboard/orders/actions.ts
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import type { OrderStatus, OrderDoc, Retailer } from '@/types/domain';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { retailerConverter } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import type { ServerOrderPayload } from '@/app/checkout/actions/submitOrder';

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
  
  let user;
  try {
      user = await requireUser(['dispensary', 'owner']);
  } catch(error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { error: true, message: errorMessage };
  }
  
  const userLocationId = user.locationId;
  
  const validatedFields = StatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { message: 'Invalid data provided.', error: true };
  }
  
  const { orderId, newStatus } = validatedFields.data;
  const { firestore } = await createServerClient();
  const orderRef = firestore.collection('orders').doc(orderId);

  try {
    // 2. Transaction: Read and write atomically to prevent race conditions
    await firestore.runTransaction(async (transaction: any) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('Order not found.');
      }
      
      const order = orderDoc.data() as OrderDoc;

      // 3. Authorization part 2: Check if this manager can access this specific order
      if (user.role !== 'owner' && order.retailerId !== userLocationId) {
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

    if (!updatedOrder.brandId) {
        console.warn('Order is missing brandId, cannot send order email.');
        // Don't throw, just log and continue. The primary action (status update) succeeded.
    } else {
        const serverOrderPayload: ServerOrderPayload = {
          ...(updatedOrder as any),
        };

        const retailerSnap = await firestore.collection('dispensaries').doc(updatedOrder.retailerId).withConverter(retailerConverter as any).get();
        const retailer = retailerSnap.data() as Retailer;

        if (retailer) {
          await sendOrderEmail({
            to: updatedOrder.customer.email,
            subject: `Your order #${orderId.substring(0, 7)} is now ${newStatus}!`,
            orderId: orderId,
            order: serverOrderPayload,
            retailer: retailer,
            recipientType: 'customer',
            updateInfo: { newStatus },
          });
        }
    }

    revalidatePath('/dashboard/orders');
    return { message: `Order #${orderId.substring(0,7)} updated to '${newStatus}'.`, error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Update failed: ${errorMessage}`, error: true };
  }
}
