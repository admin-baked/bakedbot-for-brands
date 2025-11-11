
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import type { CartItem } from '@/hooks/use-cart';
import { sendOrderEmail } from '@/ai/flows/send-order-email';
import { cookies } from 'next/headers';

// Schema for the input of the submitOrder action
const OrderSchema = z.object({
  userId: z.string().optional(), // User's UID, optional for guest checkout
  customerName: z.string().min(1, 'Customer name is required.'),
  customerEmail: z.string().email('Invalid email address.'),
  customerPhone: z.string().min(1, 'Phone number is required.'),
  customerBirthDate: z.string().min(1, 'Date of birth is required.'),
  locationId: z.string().min(1, 'Location is required.'),
  locationName: z.string().min(1, 'Location name is required.'),
  locationEmail: z.string().email('Location email is invalid.').optional(), // Make optional as we might override it
  cartItems: z.array(z.any()).min(1, 'Cart cannot be empty.'),
  totalAmount: z.number().positive('Total amount must be positive.'),
});

export async function submitOrder(input: unknown) {
  const validatedData = OrderSchema.safeParse(input);

  if (!validatedData.success) {
    console.error('Order submission failed validation:', validatedData.error.flatten());
    return { error: 'Invalid order data provided.' };
  }
  
  const { cartItems, userId: authenticatedUserId, ...orderData } = validatedData.data;

  // Use the authenticated user's ID if available, otherwise mark as a 'guest' order.
  const finalUserId = authenticatedUserId || 'guest';
  
  try {
    const { firestore } = await createServerClient();

    const orderPayload = {
      ...orderData,
      userId: finalUserId,
      orderDate: FieldValue.serverTimestamp(),
      status: 'pending' as const,
    };

    const orderCollectionRef = firestore.collection('users').doc(finalUserId).collection('orders');
    const orderRef = await orderCollectionRef.add(orderPayload);
    const orderId = orderRef.id;

    // Add order items to the subcollection
    const batch = firestore.batch();
    const itemsCollectionRef = orderRef.collection('orderItems');
    cartItems.forEach((item: CartItem) => {
      const itemRef = itemsCollectionRef.doc(); // Auto-generate ID
      batch.set(itemRef, {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
      });
    });
    await batch.commit();

    const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    
    const isDemoMode = cookies().get('isUsingDemoData')?.value === '1';
    
    // For demo orders, always send to Martez. Otherwise, use the location's email.
    const fulfillmentEmail = isDemoMode ? 'martez@bakedbot.ai' : orderData.locationEmail;

    if (!fulfillmentEmail) {
        console.error(`CRITICAL: No fulfillment email for order ${orderId}. Is demo mode: ${isDemoMode}`);
        // The order is saved, but we can't notify. Return success to the user but log the error.
        return { orderId, userId: finalUserId };
    }

    // After successfully saving the order, trigger the email flow
    await sendOrderEmail({
      to: fulfillmentEmail,
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
