
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, writeBatch, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { CartItem, Location } from '@/lib/types';
import { sendOrderEmail } from '@/ai/flows/send-order-email';

const CheckoutSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(1, 'Please enter your full name.'),
  customerEmail: z.string().email('Please enter a valid email address.'),
  customerPhone: z.string().min(1, 'Please enter your phone number.'),
  customerBirthDate: z.string().min(1, 'Please enter your date of birth.'),
  locationId: z.string().min(1, 'Please select a pickup location.'),
  locationName: z.string().optional(),
  cartItems: z.string().min(1, 'Your cart is empty.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  idImage: z.any().optional(),
});

export async function submitOrder(prevState: any, formData: FormData) {
  console.log('Server action called');
  
  const validatedFields = CheckoutSchema.safeParse({
    userId: formData.get('userId'),
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    customerBirthDate: formData.get('customerBirthDate'),
    locationId: formData.get('locationId'),
    locationName: formData.get('locationName'),
    cartItems: formData.get('cartItems'),
    totalAmount: formData.get('totalAmount'),
    idImage: formData.get('idImage'),
  });

  if (!validatedFields.success) {
    console.error('Validation failed:', validatedFields.error);
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = await createServerClient();
  const { userId, cartItems: cartItemsJson, idImage, locationName, ...orderData } = validatedFields.data;
  
  const cartItems: CartItem[] = JSON.parse(cartItemsJson);
  if (cartItems.length === 0) {
    return { message: 'Cannot submit an empty order.', error: true };
  }
  
  const fulfillmentEmail = 'martezandco@gmail.com';

  const batch = writeBatch(firestore);

  // CRITICAL FIX: Use the correct path based on user login status.
  const orderCollectionPath = userId === 'guest' 
    ? 'users/guest/orders'
    : `users/${userId}/orders`;
  const orderRef = doc(collection(firestore, orderCollectionPath));
  
  const fullOrderData = {
    ...orderData,
    userId: userId,
    orderDate: serverTimestamp(),
    status: 'pending' as const,
    idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
  };
  batch.set(orderRef, fullOrderData);

  // CRITICAL FIX: Create order items in the correct subcollection.
  for (const item of cartItems) {
    const orderItemRef = doc(collection(orderRef, 'orderItems'));
    const itemData = {
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
    };
    batch.set(orderItemRef, itemData);
  }

  try {
    await batch.commit();

    revalidatePath('/dashboard/orders');
    revalidatePath('/menu');

    // This part is for sending an email and can be adjusted
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const orderPageUrl = `${baseUrl}/order/${orderRef.id}`;
    const brandOwners = ['jack@bakedbot.ai', 'martez@bakedbot.com', 'vip@bakedbot.ai'];

    await sendOrderEmail({
      to: fulfillmentEmail,
      bcc: brandOwners,
      orderId: orderRef.id,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      pickupLocationName: locationName || 'Unknown',
      totalAmount: orderData.totalAmount,
      cartItems: cartItems,
      orderPageUrl: orderPageUrl,
    });

    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: orderRef.id,
    };
  } catch (serverError: any) {
    console.error("[submitOrder] Firestore batch commit or email sending failed:", serverError);
    return {
      message: "Failed to submit order due to a server error. Please try again.",
      error: true,
    }
  }
}
