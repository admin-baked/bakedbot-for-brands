'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, doc, writeBatch, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';

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
  console.log('🚀 Server action: submitOrder called');
  
  const { firestore } = await createServerClient();
  const userId = (formData.get('userId') as string) || 'guest';

  try {
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
      console.error('❌ Validation failed:', validatedFields.error.flatten());
      return {
        message: 'Invalid form data. Please check your inputs.',
        error: true,
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { cartItems: cartItemsJson, idImage, locationName, ...orderData } = validatedFields.data;
    
    const cartItems: CartItem[] = JSON.parse(cartItemsJson);
    if (cartItems.length === 0) {
      return { message: 'Cannot submit an empty order.', error: true };
    }

    const userDocRef = doc(firestore, 'users', userId);
    console.log('📍 User doc path:', userDocRef.path);

    const batch = writeBatch(firestore);
    
    const ordersCollectionRef = collection(userDocRef, 'orders');
    const newOrderRef = doc(ordersCollectionRef);
    console.log('📍 Order path:', newOrderRef.path);
    
    const fullOrderData = {
      ...orderData,
      orderDate: serverTimestamp(),
      status: 'pending' as const,
      idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
    };
    batch.set(newOrderRef, fullOrderData);
    console.log('📝 Order document prepared');

    const itemsCollectionRef = collection(newOrderRef, 'orderItems');
    cartItems.forEach((item, index) => {
        const itemRef = doc(itemsCollectionRef);
        const itemData = {
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
        };
        batch.set(itemRef, itemData);
        console.log(`📦 Item ${index + 1} prepared:`, item.name);
    });

    console.log('💾 Committing batch write...');
    await batch.commit();
    console.log('✅ Batch committed successfully! Order ID:', newOrderRef.id);
    
    // NOTE: Email sending disabled - configure SendGrid to enable
    // await sendOrderEmail({ orderId: newOrderRef.id, ... });

    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: newOrderRef.id,
    };
  } catch (error: any) {
    console.error('❌ Order submission error:', error);
    
    return {
      error: true,
      message: error.message || 'Failed to submit order',
    };
  }
}
