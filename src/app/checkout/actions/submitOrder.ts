
'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { z } from 'zod';
import type { Location } from '@/firebase/converters';
import { demoLocations } from '@/lib/data';

const OrderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const TotalsSchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
});

const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required.'),
  email: z.string().email('Invalid email format.'),
});

const OrderInputSchema = z.object({
  items: z.array(OrderItemSchema),
  totals: TotalsSchema,
  customer: CustomerSchema,
  locationId: z.string(), // Now required
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

async function getLocationData(locationId: string): Promise<Location | undefined> {
    try {
        const { firestore } = await createServerClient();
        const locationsSnap = await firestore.collection('dispensaries').get();
        if (!locationsSnap.empty) {
            const liveLocations = locationsSnap.docs.map(d => ({id: d.id, ...d.data()})) as Location[];
            return liveLocations.find(l => l.id === locationId);
        }
        return demoLocations.find(l => l.id === locationId);
    } catch (e) {
        console.error("Could not fetch location data, falling back to demo.", e);
        return demoLocations.find(l => l.id === locationId);
    }
}


export async function submitOrder(input: OrderInput) {
  // 1) Validate the input with Zod
  const validation = OrderInputSchema.safeParse(input);
  if (!validation.success) {
    console.error('Invalid order input:', validation.error.flatten());
    return { ok: false, error: 'Invalid order data submitted.' };
  }
  
  const { locationId, customer } = validation.data;

  // 2) Resolve demo mode on the server & get location details
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  const location = await getLocationData(locationId);

  if (!location) {
      return { ok: false, error: 'Selected dispensary location could not be found.' };
  }

  const { firestore } = await createServerClient();

  // 3) Create the order doc first (authoritative write)
  const ordersRef = firestore.collection('orders');
  const orderDoc = await ordersRef.add({
    ...validation.data,
    status: 'submitted',
    createdAt: FieldValue.serverTimestamp(),
    mode: isDemo ? 'demo' : 'live',
  });
  
  const orderId = orderDoc.id;

  // 4) Send emails - never break the order if email fails
  try {
    // Email to customer
    await sendOrderEmail({
      to: customer.email,
      subject: `Your BakedBot Order #${orderId.substring(0,7)} is Confirmed!`,
      orderId: orderId,
      order: validation.data,
      recipientType: 'customer',
      location: location,
    });

    // Email to dispensary for fulfillment
    const fulfillmentEmail = location.email;
    if (fulfillmentEmail) {
        await sendOrderEmail({
            to: fulfillmentEmail,
            bcc: isDemo ? ['jack@bakedbot.ai'] : undefined, // BCC for demo purposes
            subject: `New Online Order #${orderId.substring(0,7)} from BakedBot`,
            orderId: orderId,
            order: validation.data,
            recipientType: 'dispensary',
            location: location,
        });
    } else {
         console.warn(`No fulfillment email found for location ${location.name} (${location.id}). Skipping dispensary notification.`);
    }

  } catch (err) {
    console.error(`sendOrderEmail failed for order ${orderId} (non-blocking):`, err);
    // Optionally mark order with an emailError flag
    // Do not re-throw, as the order was successfully created.
  }

  return { ok: true, orderId: orderId };
}
