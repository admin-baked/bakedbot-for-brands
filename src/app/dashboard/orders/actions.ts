
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
import { callClaude } from '@/ai/claude';

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
    user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user']);
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
async function getOrdersFromAlleaves(
    orgId: string,
    firestore: FirebaseFirestore.Firestore,
    startDate?: string,
    endDate?: string,
): Promise<OrderDoc[]> {
    try {
        // Cache key includes date range if provided (date-filtered queries bypass default cache)
        const cacheKey = startDate || endDate
            ? `${cacheKeys.orders(orgId)}:${startDate || ''}:${endDate || ''}`
            : cacheKeys.orders(orgId);
        const cached = posCache.get<OrderDoc[]>(cacheKey);

        if (cached) {
            logger.info('[ORDERS] Using cached Alleaves orders', {
                orgId,
                count: cached.length,
            });
            return cached;
        }

        // Get location with Alleaves POS config
        // Query by orgId (primary) or brandId (fallback) since both may be used
        let locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        // Fallback: try brandId if orgId query returns empty
        if (locationsSnap.empty) {
            locationsSnap = await firestore.collection('locations')
                .where('brandId', '==', orgId)
                .limit(1)
                .get();
        }

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

        // Fetch orders from Alleaves with optional date range filter
        const alleavesOrders = await client.getAllOrders(10000, startDate, endDate);

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

        // Cache the result (1 minute TTL - reduced for fresher data)
        posCache.set(cacheKey, orders, 1 * 60 * 1000);

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
export interface GetOrdersParams {
    orgId?: string;
    brandId?: string;
    locationId?: string;
    limit?: number;
    startDate?: string; // YYYY-MM-DD filter for ALLeaves date range
    endDate?: string;   // YYYY-MM-DD filter for ALLeaves date range
}

export async function getOrders(params: GetOrdersParams | string = {}): Promise<{
    success: boolean;
    data?: OrderDoc[];
    error?: string;
}> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        // Handle legacy string parameter for backward compatibility
        const options: GetOrdersParams = typeof params === 'string'
            ? { orgId: params }
            : params;

        const limit = options.limit || 10000;

        // Determine orgId from params or user context
        let orgId = options.orgId || options.brandId;
        let locationId = options.locationId || user.locationId;

        // For brand users, use their brandId
        if (!orgId && (user.role === 'brand' || user.role === 'brand_admin' || user.role === 'brand_member')) {
            orgId = user.brandId || undefined;
        }

        // For dispensary users, use their orgId, currentOrgId, or locationId
        // Note: Claims may use either 'orgId' or 'currentOrgId' depending on setup
        if (!orgId && (user.role === 'dispensary' || user.role === 'dispensary_admin' || user.role === 'dispensary_staff' || user.role === 'budtender')) {
            orgId = (user as any).orgId || user.currentOrgId || user.locationId || undefined;
        }

        // 1. Try to get orders from POS (Alleaves) if configured
        const posOrders = orgId
            ? await getOrdersFromAlleaves(orgId, firestore, options.startDate, options.endDate)
            : [];

        // 2. Get orders from BakedBot collection (fallback or supplement)
        let query = firestore.collection('orders') as FirebaseFirestore.Query;

        if (user.role === 'customer') {
            // Customers can ONLY see their own orders
            query = query.where('userId', '==', user.uid);
            // Optional: Filter by brand context if provided
            if (orgId) query = query.where('brandId', '==', orgId);
        } else if (user.role === 'dispensary' || user.role === 'dispensary_admin' || user.role === 'dispensary_staff' || user.role === 'budtender') {
            // Dispensary roles see orders for their location
            // Priority: orgId (tenant-level) > locationId (legacy)
            const dispensaryId = orgId || locationId;
            if (!dispensaryId) {
                return { success: false, error: 'Dispensary ID not found' };
            }
            logger.info('[ORDERS] Querying orders for dispensary', { dispensaryId, orgId, locationId });
            query = query.where('retailerId', '==', dispensaryId);
        } else if (user.role === 'brand' || user.role === 'brand_admin' || user.role === 'brand_member') {
            // Brand roles see orders for their brand
            if (!orgId) {
                return { success: false, error: 'Brand ID not found' };
            }
            query = query.where('brandId', '==', orgId);
        } else if (user.role === 'super_user' || user.role === 'super_admin') {
            // Super users can see all orders (optionally filtered by orgId)
            if (orgId) {
                query = query.where('brandId', '==', orgId);
            }
        } else {
            return { success: false, error: 'Unauthorized' };
        }

        // Try query with orderBy first, fall back to simple query if index missing
        let snap: FirebaseFirestore.QuerySnapshot;
        let needsClientSort = false;
        try {
            snap = await query.orderBy('createdAt', 'desc').limit(limit).get();
        } catch (indexError: any) {
            // FAILED_PRECONDITION (9) = missing composite index
            if (indexError?.code === 9 || indexError?.message?.includes('FAILED_PRECONDITION')) {
                logger.warn('[ORDERS] Missing Firestore index, falling back to client-side sort', {
                    orgId,
                    error: indexError.message,
                });
                // Fall back to query without orderBy
                snap = await query.limit(limit).get();
                needsClientSort = true;
            } else {
                throw indexError;
            }
        }

        let bakedBotOrders = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as OrderDoc[];

        // Sort client-side if we couldn't use Firestore orderBy
        if (needsClientSort) {
            bakedBotOrders.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() ?? a.createdAt ?? new Date(0);
                const dateB = b.createdAt?.toDate?.() ?? b.createdAt ?? new Date(0);
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        }

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
        // Handle Date objects, Firestore Timestamps (.toDate()), strings, and numbers
        const toMs = (val: any): number => {
            if (!val) return 0;
            if (val instanceof Date) return val.getTime();
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            if (typeof val === 'string' || typeof val === 'number') return new Date(val).getTime();
            return 0;
        };
        const sortedOrders = Array.from(orderMap.values()).sort((a, b) => {
            return toMs(b.createdAt) - toMs(a.createdAt);
        });

        return { success: true, data: sortedOrders };
    } catch (error) {
        logger.error('[ORDERS_ACTION] Failed to fetch orders', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Manual refresh - Invalidate cache and force fresh data fetch
 * Returns timestamp of last refresh for UI display
 */
export async function refreshOrdersCache(orgId: string): Promise<{
    success: boolean;
    refreshedAt?: Date;
    error?: string;
}> {
    try {
        await requireUser();

        // Invalidate the cache
        const cacheKey = cacheKeys.orders(orgId);
        posCache.invalidate(cacheKey);

        logger.info('[ORDERS] Manual cache refresh requested', { orgId });

        // Revalidate the page to trigger fresh data fetch
        revalidatePath('/dashboard/orders');

        return {
            success: true,
            refreshedAt: new Date(),
        };
    } catch (error: any) {
        logger.error('[ORDERS] Manual refresh failed', { error });
        return {
            success: false,
            error: error.message || 'Failed to refresh orders',
        };
    }
}

/**
 * AI Order Insights - Analyze an order using Claude AI
 */
export async function analyzeOrderWithAI(orderId: string): Promise<{
    success: boolean;
    insights?: string;
    error?: string;
}> {
    try {
        await requireUser();
        const { firestore } = await createServerClient();

        // Get the order
        const orderDoc = await firestore.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data() as OrderDoc;

        // Get customer's order history for context
        const customerOrders = await firestore
            .collection('orders')
            .where('customer.email', '==', order.customer.email)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const orderHistory = customerOrders.docs.map(doc => doc.data() as OrderDoc);

        // Prepare context for AI
        const prompt = `Analyze this cannabis order and provide actionable insights:

**Current Order:**
- Order ID: ${order.id}
- Customer: ${order.customer.name} (${order.customer.email})
- Total: $${order.totals.total.toFixed(2)}
- Items: ${order.items.length}
- Status: ${order.status}
- Products: ${order.items.map(i => `${i.name} (${i.qty}x $${i.price})`).join(', ')}

**Customer History:**
- Total Orders: ${orderHistory.length}
- Average Order Value: $${(orderHistory.reduce((sum, o) => sum + o.totals.total, 0) / orderHistory.length).toFixed(2)}
- First Order Date: ${orderHistory[orderHistory.length - 1]?.createdAt ? new Date(orderHistory[orderHistory.length - 1].createdAt as any).toLocaleDateString() : 'N/A'}

Provide:
1. **Customer Segment** (New/Regular/VIP)
2. **Fraud Risk** (Low/Medium/High) and why
3. **Fulfillment Priority** (Standard/Rush/VIP)
4. **Upsell Opportunities** (specific product suggestions)
5. **Notes** (any anomalies or special considerations)

Be concise but actionable. Format as markdown.`;

        const insights = await callClaude({
            userMessage: prompt,
            temperature: 0.3,
            maxTokens: 1000,
        });

        logger.info('[AI_INSIGHTS] Order analyzed', { orderId, customerEmail: order.customer.email });

        return { success: true, insights };
    } catch (error) {
        logger.error('[AI_INSIGHTS] Failed to analyze order', { error, orderId });
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
