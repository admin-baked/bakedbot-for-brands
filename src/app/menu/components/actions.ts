
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import type { CartItem, Product } from '@/lib/types';
import { sendOrderEmail } from '@/ai/flows/send-order-email';
import { demoLocations } from '@/lib/data'; // Import demo data as a fallback

const CheckoutSchema = z.object({
  userId: z.string(),
  customerName: z.string().min(1, 'Please enter your full name.'),
  customerEmail: z.string().email('Please enter a valid email address.'),
  customerPhone: z.string().min(1, 'Please enter your phone number.'),
  customerBirthDate: z.string().min(1, 'Please enter your date of birth.'),
  locationId: z.string().min(1, 'Please select a pickup location.'),
  cartItems: z.string().min(1, 'Your cart is empty.'),
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
    
    const clientCartItems: CartItem[] = JSON.parse(cartItemsJson);
    if (clientCartItems.length === 0) {
      return { message: 'Cannot submit an empty order.', error: true };
    }

    // --- SERVER-SIDE PRICE CALCULATION & LOCATION FETCH ---
    let serverCalculatedTotal = 0;
    const validatedCartItems: Omit<CartItem, 'description' | 'imageHint' | 'likes' | 'dislikes' | 'prices'>[] = [];

    // Fetch location details to get the fulfillment email
    const locationRef = doc(firestore, 'locations', orderData.locationId);
    const locationSnap = await getDoc(locationRef);
    const locationData = locationSnap.exists() ? locationSnap.data() : demoLocations.find(l => l.id === orderData.locationId);

    if (!locationData || !locationData.email) {
        throw new Error(`Fulfillment email for location ID ${orderData.locationId} not found.`);
    }

    for (const item of clientCartItems) {
        const productRef = doc(firestore, 'products', item.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            throw new Error(`Product with ID ${item.id} not found.`);
        }

        const productData = productSnap.data() as Product;
        const price = (orderData.locationId && productData.prices?.[orderData.locationId])
            ? productData.prices[orderData.locationId]
            : productData.price;
        
        serverCalculatedTotal += price * item.quantity;
        validatedCartItems.push({
            id: item.id,
            name: productData.name,
            category: productData.category,
            price: price,
            imageUrl: productData.imageUrl,
            quantity: item.quantity,
        });
    }
    const taxes = serverCalculatedTotal * 0.15;
    const finalTotal = serverCalculatedTotal + taxes;
    // --- END SERVER-SIDE CALCULATION ---


    const userDocRef = doc(firestore, 'users', userId);
    const batch = writeBatch(firestore);

    const ordersCollectionRef = collection(userDocRef, 'orders');
    const newOrderRef = doc(ordersCollectionRef);
    
    const fullOrderData = {
      ...orderData,
      totalAmount: finalTotal,
      orderDate: serverTimestamp(),
      status: 'pending' as const,
      idImageUrl: idImage.size > 0 ? 'placeholder/id_image.jpg' : '',
    };
    
    batch.set(newOrderRef, fullOrderData);

    const itemsCollectionRef = collection(newOrderRef, 'orderItems');
    validatedCartItems.forEach((item) => {
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

    // After successful order creation, send the email
    console.log('📧 Sending order confirmation email to:', locationData.email);
    await sendOrderEmail({
        to: locationData.email,
        orderId: newOrderRef.id,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        pickupLocationName: locationData.name,
        totalAmount: finalTotal,
        cartItems: validatedCartItems,
        orderPageUrl: `https://brands.bakedbot.ai/order-confirmation/${newOrderRef.id}?userId=${userId}`,
    });
    
    return {
      message: 'Order submitted successfully!',
      error: false,
      orderId: newOrderRef.id,
    };
  } catch (error: any) {
    console.error('❌ Order submission failed:', error);
    
    return {
      error: true,
      message: error.message || 'An unknown error occurred during order submission.',
    };
  }
}
