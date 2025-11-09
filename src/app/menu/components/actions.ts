
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const CheckoutSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(1, 'Please enter your full name.'),
  customerEmail: z.string().email('Please enter a valid email address.'),
  customerPhone: z.string().min(1, 'Please enter your phone number.'),
  customerBirthDate: z.string().min(1, 'Please enter your date of birth.'),
  locationId: z.string().min(1, 'Please select a pickup location.'),
  cartItems: z.string().min(1, 'Your cart is empty.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  idImage: z.any().optional(),
});

export async function submitOrder(prevState: any, formData: FormData) {
  const { firestore } = await createServerClient();
  const userId = (formData.get('userId') as string) || 'guest';
  console.log('🚀 START submitOrder for user:', userId);

  try {
    const validatedFields = CheckoutSchema.safeParse({
      userId: formData.get('userId'),
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail'),
      customerPhone: formData.get('customerPhone'),
      customerBirthDate: formData.get('customerBirthDate'),
      locationId: formData.get('locationId'),
      cartItems: formData.get('cartItems'),
      totalAmount: formData.get('totalAmount'),
      idImage: formData.get('idImage'),
    });

    if (!validatedFields.success) {
      console.error('❌ Validation failed:', validatedFields.error.flatten());
      return {
        message: 'Invalid form data. Please check your inputs.',
        error: true,
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { cartItems: cartItemsJson, idImage, ...orderData } = validatedFields.data;
    
    const cartItems: CartItem[] = JSON.parse(cartItemsJson);
    if (cartItems.length === 0) {
      return { message: 'Cannot submit an empty order.', error: true };
    }

    const userDocRef = doc(firestore, 'users', userId);
    const batch = writeBatch(firestore);

    const ordersCollectionRef = collection(userDocRef, 'orders');
    const newOrderRef = doc(ordersCollectionRef);
    
    const fullOrderData = {
      ...orderData,
      orderDate: serverTimestamp(),
      status: 'pending' as const,
      // In a real app, this would be a URL from Firebase Storage
      idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
    };
    
    batch.set(newOrderRef, fullOrderData);

    const itemsCollectionRef = collection(newOrderRef, 'orderItems');
    cartItems.forEach((item) => {
        const itemRef = doc(itemsCollectionRef);
        const itemData = {
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
        };
        batch.set(itemRef, itemData);
    });

    console.log('🔥 Committing batch for order:', newOrderRef.id);
    await batch.commit();
    console.log('✅ SUCCESS! Order created:', newOrderRef.id);
    
    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: newOrderRef.id,
    };
  } catch (error: any) {
    console.error('❌ Order submission failed:', error);
    
    // This is a generic way to handle potential permission errors
    // during the batch commit, though more specific path info might be lost.
    if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: `users/${userId}/orders`,
            operation: 'create',
            requestResourceData: { details: 'Batch write failed.'}
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    
    return {
      error: true,
      message: error.message || 'An unknown error occurred during order submission.',
    };
  }
}
