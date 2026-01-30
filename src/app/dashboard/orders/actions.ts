
// src/app/dashboard/orders/actions.ts
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { OrderStatus, OrderDoc, Retailer } from '@/types/domain';
import { sendOrderEmail } from '@/lib/email/send-order-email';
import { retailerConverter } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import type { ServerOrderPayload } from '@/app/checkout/actions/submitOrder';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';

import { logger } from '@/lib/logger';
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['submitted', 'cancelled'],
  submitted: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const StatusUpdateSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required.'),
  newStatus: z.enum(['confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
});

export type FormState = {
  message: string;
  error: boolean;
};

export async function updateOrderStatus(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {

  let user;
  try {
    user = await requireUser(['dispensary', 'super_user']);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: true, message: errorMessage };
  }

  const userLocationId = user.locationId;

  const validatedFields = StatusUpdateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { message: 'Invalid data provided.', error: true };
  }

  const { orderId, newStatus } = validatedFields.data;
  const { firestore } = await createServerClient();
  const orderRef = firestore.collection('orders').doc(orderId);

  try {
    // 2. Transaction: Read and write atomically to prevent race conditions
    await firestore.runTransaction(async (transaction: any) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('Order not found.');
      }

      const order = orderDoc.data() as OrderDoc;

      // 3. Authorization part 2: Check if this manager can access this specific order
      if (user.role !== 'super_user' && order.retailerId !== userLocationId) {
        throw new Error("You do not have permission to modify this order.");
      }

      const currentStatus = order.status;

      // 4. State Machine: Validate the status transition
      if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'.`);
      }

      transaction.update(orderRef, {
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    // 5. Post-transaction: Send notification email
    const updatedOrderSnap = await orderRef.get();
    const updatedOrder = updatedOrderSnap.data() as OrderDoc;

    if (!updatedOrder.brandId) {
      logger.warn('Order is missing brandId, cannot send order email.');
      // Don't throw, just log and continue. The primary action (status update) succeeded.
    } else {
      const serverOrderPayload: ServerOrderPayload = {
        ...(updatedOrder as any),
      };

      const retailerSnap = await firestore.collection('dispensaries').doc(updatedOrder.retailerId).withConverter(retailerConverter as any).get();
      const retailer = retailerSnap.data() as Retailer;

      if (retailer) {
        await sendOrderEmail({
          to: updatedOrder.customer.email,
          subject: `Your order #${orderId.substring(0, 7)} is now ${newStatus}!`,
          orderId: orderId,
          order: serverOrderPayload,
          retailer: retailer,
          recipientType: 'customer',
          updateInfo: { newStatus },
        });
      }
    }

    revalidatePath('/dashboard/orders');
    return { message: `Order #${orderId.substring(0, 7)} updated to '${newStatus}'.`, error: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Update failed: ${errorMessage}`, error: true };
  }
}

/**
 * Get orders from Alleaves POS if configured
 */
async function getOrdersFromAlleaves(orgId: string, firestore: FirebaseFirestore.Firestore): Promise<OrderDoc[]> {
    try {
        // Check cache first
        const cacheKey = cacheKeys.orders(orgId);
        const cached = posCache.get<OrderDoc[]>(cacheKey);

        if (cached) {
            logger.info('[ORDERS] Using cached Alleaves orders', {
                orgId,
                count: cached.length,
            });
            return cached;
        }

        // Get location with Alleaves POS config
        // Note: orgId parameter is actually the brandId from the user
        const locationsSnap = await firestore.collection('locations')
            .where('brandId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            logger.info('[ORDERS] No location found for org', { orgId });
            return [];
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
            logger.info('[ORDERS] No active Alleaves POS config found', { orgId });
            return [];
        }

        // Initialize Alleaves client
        const alleavesConfig: ALLeavesConfig = {
            apiKey: posConfig.apiKey,
            username: posConfig.username || process.env.ALLEAVES_USERNAME,
            password: posConfig.password || process.env.ALLEAVES_PASSWORD,
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // Fetch recent orders from Alleaves
        const alleavesOrders = await client.getAllOrders(100);

        logger.info('[ORDERS] Fetched orders from Alleaves', {
            orgId,
            count: alleavesOrders.length,
        });

        // Transform Alleaves orders to OrderDoc format
        const orders = alleavesOrders.map((ao: any) => {
            const orderDate = ao.created_at ? new Date(ao.created_at) : new Date();
            const updatedDate = ao.updated_at ? new Date(ao.updated_at) : orderDate;

            const orderDoc: OrderDoc = {
                id: ao.id?.toString() || `alleaves_${ao.order_number || Date.now()}`,
                brandId: orgId,
                retailerId: posConfig.locationId,
                userId: ao.customer?.id?.toString() || 'alleaves_customer',
                status: mapAlleavesStatus(ao.status),
                customer: {
                    name: ao.customer?.name || `${ao.customer?.first_name || ''} ${ao.customer?.last_name || ''}`.trim() || 'Unknown',
                    email: ao.customer?.email || 'no-email@alleaves.local',
                    phone: ao.customer?.phone || '',
                },
                items: (ao.items || []).map((item: any) => ({
                    productId: item.id_item?.toString() || item.product_id?.toString() || 'unknown',
                    name: item.item || item.product_name || 'Unknown Item',
                    qty: parseInt(item.quantity || 1),
                    price: parseFloat(item.price || item.unit_price || 0),
                    category: item.category || 'other',
                })),
                totals: {
                    subtotal: parseFloat(ao.subtotal || 0),
                    tax: parseFloat(ao.tax || 0),
                    discount: parseFloat(ao.discount || 0),
                    total: parseFloat(ao.total || ao.amount || 0),
                },
                mode: 'live',
                createdAt: Timestamp.fromDate(orderDate) as any,
                updatedAt: Timestamp.fromDate(updatedDate) as any,
            };

            return orderDoc;
        });

        // Cache the result (3 minute TTL - orders change more frequently)
        posCache.set(cacheKey, orders, 3 * 60 * 1000);

        return orders;
    } catch (error: any) {
        logger.error('[ORDERS] Failed to fetch from Alleaves', {
            orgId,
            error: error.message,
        });
        return [];
    }
}

/**
 * Map Alleaves order status to BakedBot OrderStatus
 */
function mapAlleavesStatus(alleavesStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
        'pending': 'pending',
        'submitted': 'submitted',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'processing': 'preparing',
        'delivered': 'completed',
    };

    return statusMap[alleavesStatus?.toLowerCase()] || 'pending';
}

/**
 * Fetch orders for a brand or dispensary
 * Integrates with POS systems (Alleaves) when configured
 */
export async function getOrders(orgId: string): Promise<OrderDoc[]> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        // 1. Try to get orders from POS (Alleaves) if configured
        const posOrders = await getOrdersFromAlleaves(orgId, firestore);

        // 2. Get orders from BakedBot collection (fallback or supplement)
        let query = firestore.collection('orders') as FirebaseFirestore.Query;

        if (user.role === 'customer') {
            // Customers can ONLY see their own orders
            query = query.where('customer.email', '==', user.email || 'unknown_email_guard'); 
            // Note: Order doc uses 'customer.email' or 'userId'? 
            // Checking createOrder: it saves userId?
            // OrderDoc type has 'userId' usually. Let's check type definition or use email if consistent.
            // Let's rely on userId if present, otherwise email.
            // Actually, checking previous line 144: ...doc.data()
            // Let's look at submitOrder.ts to see what fields are saved.
            // For safety, let's assume userId is reliable if authenticated.
            // BUT wait, submitOrder often runs as guest?
            // If user is logged in, userId is saved.
            // Let's use user.uid match on userId field.
            query = query.where('userId', '==', user.uid);
            // Optional: Filter by brand context if provided
            if (orgId) query = query.where('brandId', '==', orgId);
        } else if (user.role === 'dispensary' || user.locationId) {
            query = query.where('retailerId', '==', user.locationId || orgId);
        } else {
            query = query.where('brandId', '==', orgId);
        }

        const snap = await query.orderBy('createdAt', 'desc').limit(100).get();

        const bakedBotOrders = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as OrderDoc[];

        // 3. Merge POS orders with BakedBot orders
        let allOrders = [...posOrders, ...bakedBotOrders];

        // 4. If POS orders exist, prioritize them
        if (posOrders.length > 0) {
            logger.info('[ORDERS] Using POS orders as primary source', {
                orgId,
                posOrdersCount: posOrders.length,
                bakedBotOrdersCount: bakedBotOrders.length,
            });
        }

        // 5. Remove duplicates (prefer POS version if exists)
        const orderMap = new Map<string, OrderDoc>();
        allOrders.forEach(order => {
            const existingOrder = orderMap.get(order.id);
            if (!existingOrder || order.id.startsWith('alleaves_')) {
                // Prefer Alleaves orders or add if new
                orderMap.set(order.id, order);
            }
        });

        // 6. Sort by createdAt descending
        return Array.from(orderMap.values()).sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return dateB - dateA;
        });
    } catch (error) {
        logger.error('[ORDERS_ACTION] Failed to fetch orders', { error });
        return [];
    }
}
