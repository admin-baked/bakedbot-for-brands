'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, doc, writeBatch, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import type { CartItem } from '@/lib/types';
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
  idImage: z.any().optional(),
});

export async function submitOrder(prevState: any, formData: FormData) {
  console.log('🚀 START submitOrder');
  console.log('📋 FormData:', Object.fromEntries(formData));

  const { firestore } = await createServerClient();
  const userId = (formData.get('userId') as string) || 'guest';
  console.log('👤 User ID:', userId);

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
    console.log('📍 Will write to path:', userDocRef.path);
    
    const batch = writeBatch(firestore);
    console.log('💾 Creating batch...');

    const ordersCollectionRef = collection(userDocRef, 'orders');
    const newOrderRef = doc(ordersCollectionRef);
    console.log('📍 Order path:', newOrderRef.path);
    
    const fullOrderData = {
      ...orderData,
      orderDate: serverTimestamp(),
      status: 'pending' as const,
      idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
    };
    
    console.log('📝 Adding order to batch');
    batch.set(newOrderRef, fullOrderData);

    const itemsCollectionRef = collection(newOrderRef, 'orderItems');
    console.log('📦 Adding items to batch');
    cartItems.forEach((item, index) => {
        const itemRef = doc(itemsCollectionRef);
        const itemData = {
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
        };
        batch.set(itemRef, itemData);
    });

    console.log('🔥 About to commit batch');
    await batch.commit();
    console.log('✅ SUCCESS! Order created:', newOrderRef.id);
    
    // Temporarily disabled until SendGrid is configured
    // try {
    //   const locationDoc = await getDoc(doc(firestore, 'locations', orderData.locationId));
    //   const locationData = locationDoc.data();
    //   if (locationData?.email) {
    //      await sendOrderEmail({
    //         to: locationData.email,
    //         orderId: newOrderRef.id,
    //         customerName: orderData.customerName,
    //         customerEmail: orderData.customerEmail,
    //         pickupLocationName: locationData.name,
    //         totalAmount: orderData.totalAmount,
    //         cartItems: cartItems,
    //         orderPageUrl: `https://brands.bakedbot.ai/order/${newOrderRef.id}?userId=${userId}`
    //      });
    //   }
    // } catch (emailError) {
    //     console.error("📧 Failed to send order email, but order was saved:", emailError);
    //     // Don't block the UI, just log the error.
    // }

    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: newOrderRef.id,
    };
  } catch (error: any) {
    console.error('❌ FAILED at:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    
    return {
      error: true,
      message: `${error.code || 'ERROR'}: ${error.message}`,
    };
  }
}
