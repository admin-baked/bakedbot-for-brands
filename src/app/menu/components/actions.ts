
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
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
  cartItems: z.string().min(1, 'Your cart is empty.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  locations: z.string(),
  // For now, we'll make the image optional on the server-side
  // as we are not handling file uploads yet.
  idImage: z.any().optional(),
});

export async function submitOrder(prevState: any, formData: FormData) {
  const validatedFields = CheckoutSchema.safeParse({
    userId: formData.get('userId'),
    customerName: formData.get('customerName'),
    customerEmail: formData.get('customerEmail'),
    customerPhone: formData.get('customerPhone'),
    customerBirthDate: formData.get('customerBirthDate'),
    locationId: formData.get('locationId'),
    cartItems: formData.get('cartItems'),
    totalAmount: formData.get('totalAmount'),
    locations: formData.get('locations'),
    idImage: formData.get('idImage'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = await createServerClient();
  const { userId, cartItems: cartItemsJson, locations: locationsJson, idImage, ...orderData } = validatedFields.data;
  
  const cartItems: CartItem[] = JSON.parse(cartItemsJson);
  if (cartItems.length === 0) {
    return { message: 'Cannot submit an empty order.', error: true };
  }
  
  const allLocations: Location[] = JSON.parse(locationsJson);
  const selectedLocation = allLocations.find(loc => loc.id === orderData.locationId);
  const fulfillmentEmail = selectedLocation?.email || 'martezandco@gmail.com'; // Default for testing

  // A batch allows us to perform multiple writes as a single atomic unit.
  const batch = writeBatch(firestore);

  // 1. Create the main Order document
  const orderRef = doc(collection(firestore, 'users', userId, 'orders'));
  const fullOrderData = {
    ...orderData,
    userId: userId,
    orderDate: serverTimestamp(),
    status: 'pending' as const,
     // TODO: Handle the actual image upload to Firebase Storage and get URL
    idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
  };
  batch.set(orderRef, fullOrderData);

  // 2. Create an OrderItem document for each item in the cart
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
    // Commit the batch
    await batch.commit();

    // Revalidate paths to show fresh data
    revalidatePath('/dashboard/orders');
    revalidatePath('/menu');

    // Get the base URL for constructing links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const orderPageUrl = `${baseUrl}/order/${orderRef.id}`;
    const brandOwners = ['jack@bakedbot.ai', 'martez@bakedbot.com', 'vip@bakedbot.ai'];

    // Send the fulfillment email using the Genkit flow
    await sendOrderEmail({
      to: fulfillmentEmail,
      bcc: brandOwners,
      orderId: orderRef.id,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      pickupLocationName: selectedLocation?.name || 'Unknown',
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
    // This is a server action, so we can't use the client-side error emitter.
    // Log the error on the server for debugging and return a generic message.
    console.error("[submitOrder] Firestore batch commit or email sending failed:", serverError);
    
    // Return a user-friendly error message.
    // Avoid sending raw serverError.message to the client in production.
    return {
      message: "Failed to submit order due to a server error. Please try again.",
      error: true,
    }
  }
}
