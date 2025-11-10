
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, addDoc, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { CartItem } from '@/hooks/use-cart';
import { sendOrderEmail } from '@/ai/flows/send-order-email';

// Schema for the input of the submitOrder action
const OrderSchema = z.object({
  userId: z.string().optional(), // User's UID, optional for guest checkout
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  customerBirthDate: z.string(),
  locationId: z.string(),
  locationName: z.string(),
  locationEmail: z.string().email(),
  cartItems: z.array(z.any()), // We trust the client on cart items for this demo
  totalAmount: z.number(),
});

export async function submitOrder(input: z.infer<typeof OrderSchema>) {
  const { firestore } = await createServerClient();

  const validatedData = OrderSchema.safeParse(input);

  if (!validatedData.success) {
    console.error('Order submission failed validation:', validatedData.error);
    return { error: 'Invalid order data.' };
  }
  
  const { cartItems, userId: authenticatedUserId, ...orderData } = validatedData.data;

  // Use the authenticated user's ID if available, otherwise mark as a 'guest' order.
  const finalUserId = authenticatedUserId || 'guest';

  const orderPayload = {
    ...orderData,
    userId: finalUserId,
    orderDate: serverTimestamp(),
    status: 'pending' as const,
  };
  
  try {
    const orderRef = await addDoc(collection(firestore, 'users', finalUserId, 'orders'), orderPayload);
    const orderId = orderRef.id;

    // Add order items to the subcollection
    const batch = writeBatch(firestore);
    cartItems.forEach((item: CartItem) => {
      const itemRef = doc(collection(orderRef, 'orderItems'));
      batch.set(itemRef, {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
      });
    });
    await batch.commit();

    const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    
    // After successfully saving the order, trigger the email flow
    await sendOrderEmail({
      to: orderData.locationEmail,
      orderId: orderId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      pickupLocationName: orderData.locationName,
      totalAmount: orderData.totalAmount,
      cartItems: cartItems as any, // Cast for now
      orderPageUrl: `${host}/order-confirmation/${orderId}?userId=${finalUserId}`,
    });

    return { orderId, userId: finalUserId };

  } catch (error) {
    console.error("Order submission error: ", error);
    // In a real app, you'd want more robust error handling and logging.
    return { error: 'Could not submit order. Please try again.' };
  }
}
