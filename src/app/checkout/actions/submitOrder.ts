
'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { z } from 'zod';

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
  locationId: z.string().nullable(),
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

export async function submitOrder(input: OrderInput) {
  // 1) Validate the input with Zod
  const validation = OrderInputSchema.safeParse(input);
  if (!validation.success) {
    console.error('Invalid order input:', validation.error.flatten());
    throw new Error('Invalid order data submitted.');
  }

  // 2) Resolve demo mode on the server (don’t trust client state)
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';

  const { firestore } = await createServerClient();

  // 3) Create the order doc first (authoritative write)
  const ordersRef = firestore.collection('orders');
  const orderDoc = await ordersRef.add({
    ...input,
    status: 'submitted',
    createdAt: FieldValue.serverTimestamp(),
    mode: isDemo ? 'demo' : 'live',
  });

  // 4) Try email — never break the order if email fails
  try {
    const to = isDemo ? 'martez@bakedbot.ai' : input?.customer?.email || 'orders@yourdomain.test'; // your live routing

    await sendOrderEmail({
      to,
      bcc: ['jack@bakedbot.ai'], // brand copy for demo
      subject: isDemo ? 'Demo order received' : 'New order',
      orderId: orderDoc.id,
      order: input,
    });
  } catch (err) {
    console.error('sendOrderEmail failed (non-blocking):', err);
    // Optionally mark order with an emailError flag
    const orderRef = firestore.doc(`orders/${orderDoc.id}`);
    // do not throw
  }

  return { ok: true, orderId: orderDoc.id };
}
