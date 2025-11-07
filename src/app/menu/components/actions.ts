
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { CartItem, Location } from '@/lib/types';


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

    // --- NOTIFICATION SIMULATION ---
    // In a real app, you would replace this console log with an actual email sending service call
    const brandOwners = ['jack@bakedbot.ai', 'martez@bakedbot.com'];
    console.log('--- SIMULATING ORDER FULFILLMENT NOTIFICATION ---');
    console.log(`To: ${fulfillmentEmail}`);
    console.log(`Bcc: ${brandOwners.join(', ')}`);
    console.log('Subject: New Online Order for Pickup!');
    console.log('---');
    console.log('Body:');
    console.log(`You have a new order for pickup from ${orderData.customerName}.`);
    console.log('Order Details:');
    console.log(`- Customer Name: ${orderData.customerName}`);
    console.log(`- Customer Email: ${orderData.customerEmail}`);
    console.log(`- Customer Phone: ${orderData.customerPhone}`);
    console.log(`- Pickup Location: ${selectedLocation?.name || 'Unknown'}`);
    console.log(`- Total: $${orderData.totalAmount.toFixed(2)}`);
    console.log('- Items:');
    cartItems.forEach(item => {
        console.log(`  - ${item.name} (x${item.quantity})`);
    });
    console.log(`- Official Order Link: ${orderPageUrl}`);
    console.log('--- END OF SIMULATION ---');

    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: orderRef.id,
    };
  } catch (serverError: any) {
    // This is a server action, so we can't use the client-side error emitter.
    // Log the error on the server for debugging and return a generic message.
    console.error("[submitOrder] Firestore batch commit failed:", serverError);
    
    // Return a user-friendly error message.
    // Avoid sending raw serverError.message to the client in production.
    return {
      message: "Failed to submit order due to a server error. Please try again.",
      error: true,
    }
  }
}
