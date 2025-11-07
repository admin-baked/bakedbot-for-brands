'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { CartItem, Location } from '@/lib/types';


const CheckoutSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(1, 'Please enter your full name.'),
  customerPhone: z.string().min(1, 'Please enter your phone number.'),
  locationId: z.string().min(1, 'Please select a pickup location.'),
  cartItems: z.string().min(1, 'Your cart is empty.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  // We'll pass the full list of locations to find the email
  locations: z.string(),
});

export async function submitOrder(prevState: any, formData: FormData) {
  const validatedFields = CheckoutSchema.safeParse({
    userId: formData.get('userId'),
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    locationId: formData.get('locationId'),
    cartItems: formData.get('cartItems'),
    totalAmount: formData.get('totalAmount'),
    locations: formData.get('locations'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { firestore } = await createServerClient();
  const { userId, cartItems: cartItemsJson, locations: locationsJson, ...orderData } = validatedFields.data;
  
  const cartItems: CartItem[] = JSON.parse(cartItemsJson);
  if (cartItems.length === 0) {
    return { message: 'Cannot submit an empty order.', error: true };
  }
  
  const allLocations: Location[] = JSON.parse(locationsJson);
  const selectedLocation = allLocations.find(loc => loc.id === orderData.locationId);
  const fulfillmentEmail = selectedLocation?.email;

  // A batch allows us to perform multiple writes as a single atomic unit.
  const batch = writeBatch(firestore);

  // 1. Create the main Order document
  const orderRef = doc(collection(firestore, 'users', userId, 'orders'));
  const fullOrderData = {
    ...orderData,
    userId: userId,
    orderDate: serverTimestamp(),
    status: 'pending',
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
    revalidatePath('/dashboard/menu');

    // --- NOTIFICATION SIMULATION ---
    // In a real app, you would use a service like Resend, SendGrid, or a Firebase Extension to send an email.
    // For this demo, we will log the intended action to the console.
    console.log('--- ORDER FULFILLMENT NOTIFICATION ---');
    console.log(`Simulating sending email to: ${fulfillmentEmail || 'No email configured'}`);
    console.log('Order Details:');
    console.log(`- Customer: ${orderData.customerName}`);
    console.log(`- Phone: ${orderData.customerPhone}`);
    console.log(`- Location: ${selectedLocation?.name || 'Unknown'}`);
    console.log(`- Total: $${orderData.totalAmount.toFixed(2)}`);
    console.log('- Items:');
    cartItems.forEach(item => {
        console.log(`  - ${item.name} (x${item.quantity})`);
    });
    console.log('------------------------------------');

    return {
      message: 'Order submitted successfully!',
      error: false,
    };
  } catch (serverError: any) {
    // Note: Emitting a rich error here is complex because a batch can fail
    // on any of its operations. For simplicity, we emit a more general error.
    const permissionError = new FirestorePermissionError({
        path: `users/${userId}/orders`, // General path for the operation
        operation: 'create',
        requestResourceData: { order: { ...fullOrderData, orderDate: 'SERVER_TIMESTAMP' }, items: cartItems.length }
    } satisfies SecurityRuleContext);
    
    errorEmitter.emit('permission-error', permissionError);

    console.error("Firestore batch commit failed:", serverError);
    return {
      message: `Failed to submit order: ${serverError.message}`,
      error: true,
    }
  }
}
