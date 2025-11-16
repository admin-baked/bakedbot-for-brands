
'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { z } from 'zod';
import type { Retailer, Product } from '@/firebase/converters';
import { demoRetailers, demoProducts } from '@/lib/data';
import { makeProductRepo } from '@/server/repos/productRepo';

// The client now only sends the ID and quantity. The server handles the rest.
const OrderItemSchema = z.object({
  productId: z.string(),
  qty: z.number().int().positive(),
});

// We no longer trust totals from the client.
const CustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required.'),
  email: z.string().email('Invalid email format.'),
});

// The input schema is now much simpler and more secure.
const OrderInputSchema = z.object({
  items: z.array(OrderItemSchema),
  customer: CustomerSchema,
  retailerId: z.string(),
});

export type ClientOrderInput = z.infer<typeof OrderInputSchema>;

// This is the full, secure order type constructed on the server.
export type ServerOrderPayload = {
    items: Array<{
        productId: string;
        name: string;
        qty: number;
        price: number;
    }>;
    totals: {
        subtotal: number;
        tax: number;
        total: number;
    };
    customer: {
        name: string;
        email: string;
    };
    retailerId: string;
}

async function getRetailerData(retailerId: string): Promise<Retailer | undefined> {
    try {
        const { firestore } = await createServerClient();
        const retailersSnap = await firestore.collection('dispensaries').get();
        if (!retailersSnap.empty) {
            const liveRetailers = retailersSnap.docs.map(d => ({id: d.id, ...d.data()})) as Retailer[];
            return liveRetailers.find(l => l.id === retailerId);
        }
        return demoRetailers.find(l => l.id === retailerId);
    } catch (e) {
        console.error("Could not fetch retailer data, falling back to demo.", e);
        return demoRetailers.find(l => l.id === retailerId);
    }
}


export async function submitOrder(input: ClientOrderInput) {
  // 1) Validate the INCOMING input from the client with Zod
  const validation = OrderInputSchema.safeParse(input);
  if (!validation.success) {
    console.error('Invalid order input:', validation.error.flatten());
    return { ok: false, error: 'Invalid order data submitted.' };
  }
  
  const { retailerId, customer, items: clientItems } = validation.data;

  // 2) Resolve demo mode on the server & get retailer details
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  const retailer = await getRetailerData(retailerId);

  if (!retailer || !retailer.email) {
      return { ok: false, error: 'Selected dispensary location could not be found or is missing a fulfillment email.' };
  }

  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  
  // 3) --- SECURITY FIX: Construct the authoritative order payload on the server ---
  const serverOrderPayload: ServerOrderPayload = {
    items: [],
    totals: { subtotal: 0, tax: 0, total: 0 },
    customer,
    retailerId,
  };

  for (const clientItem of clientItems) {
      let product: Product | null = null;
      if (isDemo) {
        product = demoProducts.find(p => p.id === clientItem.productId) || null;
      } else {
        product = await productRepo.getById(clientItem.productId);
      }

      if (!product) {
          return { ok: false, error: `Product with ID ${clientItem.productId} not found.` };
      }
      
      // Use the authoritative price from the database.
      const price = product.prices?.[retailerId] ?? product.price;

      serverOrderPayload.items.push({
          ...clientItem,
          name: product.name,
          price: price, // Secure price
      });
  }
  
  // 4) --- SECURITY FIX: Recalculate totals on the server ---
  const subtotal = serverOrderPayload.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const tax = subtotal * 0.15; // Assuming a flat 15% tax rate
  const total = subtotal + tax;
  serverOrderPayload.totals = { subtotal, tax, total };


  // 5) Create the order doc first (authoritative write)
  const ordersRef = firestore.collection('orders');
  const orderDoc = await ordersRef.add({
    ...serverOrderPayload,
    status: 'submitted',
    createdAt: FieldValue.serverTimestamp(),
    mode: isDemo ? 'demo' : 'live',
  });
  
  const orderId = orderDoc.id;

  // 6) Send emails - never break the order if email fails
  try {
    // Email to customer
    await sendOrderEmail({
      to: customer.email,
      subject: `Your BakedBot Order #${orderId.substring(0,7)} is Confirmed!`,
      orderId: orderId,
      order: serverOrderPayload, // Use the secure server-generated payload
      recipientType: 'customer',
      retailer: retailer,
    });

    // Email to dispensary for fulfillment
    await sendOrderEmail({
        to: retailer.email,
        bcc: isDemo ? ['jack@bakedbot.ai'] : undefined, // BCC for demo purposes
        subject: `New Online Order #${orderId.substring(0,7)} from BakedBot`,
        orderId: orderId,
        order: serverOrderPayload, // Use the secure server-generated payload
        recipientType: 'dispensary',
        retailer: retailer,
    });

  } catch (err) {
    console.error(`sendOrderEmail failed for order ${orderId} (non-blocking):`, err);
    // Optionally mark order with an emailError flag
    // Do not re-throw, as the order was successfully created.
  }

  return { ok: true, orderId: orderId };
}

    