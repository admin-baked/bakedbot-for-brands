'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig, type ALLeavesOrder } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { CustomerProfile, calculateSegment, type CustomerSegment } from '@/types/customers';
import { isBrandRole, isDispensaryRole } from '@/types/roles';
import { mapSegmentToTier } from '@/lib/pricing/customer-tier-mapper';
import type { DynamicPricingRule, CustomerTier } from '@/types/dynamic-pricing';

// ==========================================
// Types
// ==========================================

export interface CustomerDetailData {
    customer: CustomerProfile | null;
    spending: {
        totalSpent: number;
        orderCount: number;
        avgOrderValue: number;
        lastOrderDate: string | null;
        firstOrderDate: string | null;
    } | null;
}

export interface CustomerOrder {
    id: string;
    orderNumber?: string;
    date: string;
    items: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: string;
    paymentMethod: string;
}

// ==========================================
// Helper: Resolve orgId from user
// ==========================================

async function resolveOrgId(): Promise<string> {
    const user = await requireUser([
        'brand', 'brand_admin', 'brand_member',
        'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
        'super_user',
    ]);

    const userRole = (user as any).role as string;
    let orgId: string | undefined;

    if (isBrandRole(userRole)) {
        orgId = (user as any).brandId;
    }
    if (isDispensaryRole(userRole)) {
        orgId = (user as any).orgId || (user as any).currentOrgId || (user as any).locationId;
    }

    return orgId || user.uid;
}

// ==========================================
// Helper: Initialize Alleaves client
// ==========================================

async function initAlleavesClient(orgId: string, firestore: FirebaseFirestore.Firestore): Promise<ALLeavesClient | null> {
    let locationsSnap = await firestore.collection('locations')
        .where('orgId', '==', orgId)
        .limit(1)
        .get();

    if (locationsSnap.empty) {
        locationsSnap = await firestore.collection('locations')
            .where('brandId', '==', orgId)
            .limit(1)
            .get();
    }

    if (locationsSnap.empty) return null;

    const locationData = locationsSnap.docs[0].data();
    const posConfig = locationData?.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
        return null;
    }

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

    return new ALLeavesClient(alleavesConfig);
}

// ==========================================
// Get Customer Detail
// ==========================================

/**
 * Fetch a single customer profile with spending data.
 * Tries cached spending first, then looks up in customer list.
 */
export async function getCustomerDetail(customerId: string): Promise<CustomerDetailData> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    logger.info('[CUSTOMER_DETAIL] Fetching customer', { customerId, orgId });

    // 1. Try to get spending data from cache
    const spendingCacheKey = `spending:${orgId}`;
    const cachedSpending = posCache.get<Record<string, {
        totalSpent: number;
        orderCount: number;
        lastOrderDate: string | null;
        firstOrderDate: string | null;
        avgOrderValue: number;
    }>>(spendingCacheKey);

    const spendingData = cachedSpending?.[customerId] ?? null;

    // 2. Try CRM collection first
    const crmDoc = await firestore.collection('customers').doc(customerId).get();
    if (crmDoc.exists && crmDoc.data()?.orgId === orgId) {
        const data = crmDoc.data()!;
        const customer: CustomerProfile = {
            id: crmDoc.id,
            orgId: data.orgId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.email,
            phone: data.phone,
            totalSpent: spendingData?.totalSpent ?? data.totalSpent ?? 0,
            orderCount: spendingData?.orderCount ?? data.orderCount ?? 0,
            avgOrderValue: spendingData?.avgOrderValue ?? data.avgOrderValue ?? 0,
            lastOrderDate: spendingData?.lastOrderDate ? new Date(spendingData.lastOrderDate) : data.lastOrderDate?.toDate?.(),
            firstOrderDate: spendingData?.firstOrderDate ? new Date(spendingData.firstOrderDate) : data.firstOrderDate?.toDate?.(),
            preferredCategories: data.preferredCategories || [],
            preferredProducts: data.preferredProducts || [],
            priceRange: data.priceRange || 'mid',
            segment: 'new',
            tier: 'bronze',
            points: data.points || 0,
            lifetimeValue: spendingData?.totalSpent ?? data.lifetimeValue ?? 0,
            customTags: data.customTags || [],
            birthDate: data.birthDate,
            preferences: data.preferences,
            source: data.source || 'manual',
            notes: data.notes,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        };
        customer.segment = calculateSegment(customer);
        customer.tier = customer.totalSpent > 2000 ? 'gold' : customer.totalSpent > 500 ? 'silver' : 'bronze';

        return {
            customer: JSON.parse(JSON.stringify(customer)),
            spending: spendingData,
        };
    }

    // 3. For Alleaves customers (alleaves_XXX format), build from cached customer list
    // and supplement with spending
    if (customerId.startsWith('alleaves_')) {
        // Try to find in cached customer data
        const customersCacheKey = cacheKeys.customers(orgId);
        const cachedCustomers = posCache.get<CustomerProfile[]>(customersCacheKey);

        let customer = cachedCustomers?.find(c => c.id === customerId) ?? null;

        if (!customer) {
            // Fetch fresh from Alleaves
            const client = await initAlleavesClient(orgId, firestore);
            if (client) {
                const allCustomers = await client.getAllCustomersPaginated(30);
                const numericId = customerId.replace('alleaves_', '');
                const ac = allCustomers.find((c: any) => String(c.id_customer || c.id) === numericId);

                if (ac) {
                    customer = {
                        id: customerId,
                        orgId,
                        email: ac.email?.toLowerCase() || `customer_${numericId}@alleaves.local`,
                        phone: ac.phone || '',
                        firstName: ac.name_first || '',
                        lastName: ac.name_last || '',
                        displayName: [ac.name_first, ac.name_last].filter(Boolean).join(' ') || ac.customer_name || ac.email || '',
                        totalSpent: spendingData?.totalSpent ?? 0,
                        orderCount: spendingData?.orderCount ?? 0,
                        avgOrderValue: spendingData?.avgOrderValue ?? 0,
                        lastOrderDate: spendingData?.lastOrderDate ? new Date(spendingData.lastOrderDate) : undefined,
                        firstOrderDate: spendingData?.firstOrderDate ? new Date(spendingData.firstOrderDate) : (ac.date_created ? new Date(ac.date_created) : undefined),
                        preferredCategories: [],
                        preferredProducts: [],
                        priceRange: 'mid',
                        segment: 'new',
                        tier: 'bronze',
                        points: parseInt(ac.loyalty_points || '0', 10),
                        lifetimeValue: spendingData?.totalSpent ?? 0,
                        customTags: [],
                        birthDate: ac.date_of_birth,
                        source: 'pos_dutchie',
                        createdAt: ac.date_created ? new Date(ac.date_created) : new Date(),
                        updatedAt: new Date(),
                    };
                }
            }
        }

        if (customer) {
            // Enrich with spending
            if (spendingData) {
                customer.totalSpent = spendingData.totalSpent;
                customer.orderCount = spendingData.orderCount;
                customer.avgOrderValue = spendingData.avgOrderValue;
                customer.lastOrderDate = spendingData.lastOrderDate ? new Date(spendingData.lastOrderDate) : customer.lastOrderDate;
                customer.firstOrderDate = spendingData.firstOrderDate ? new Date(spendingData.firstOrderDate) : customer.firstOrderDate;
                customer.lifetimeValue = spendingData.totalSpent;
                if (customer.lastOrderDate) {
                    customer.daysSinceLastOrder = Math.floor(
                        (Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                }
            }
            customer.segment = calculateSegment(customer);
            customer.tier = customer.totalSpent > 2000 ? 'gold' : customer.totalSpent > 500 ? 'silver' : 'bronze';

            return {
                customer: JSON.parse(JSON.stringify(customer)),
                spending: spendingData,
            };
        }
    }

    logger.warn('[CUSTOMER_DETAIL] Customer not found', { customerId, orgId });
    return { customer: null, spending: null };
}

// ==========================================
// Get Customer Orders
// ==========================================

/**
 * Fetch order history for a customer from Alleaves.
 * Tries per-customer endpoint first, falls back to filtering all orders.
 */
export async function getCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    logger.info('[CUSTOMER_ORDERS] Fetching orders', { customerId, orgId });

    // Extract numeric Alleaves ID
    const numericId = customerId.startsWith('alleaves_')
        ? customerId.replace('alleaves_', '')
        : customerId;

    const client = await initAlleavesClient(orgId, firestore);
    if (!client) {
        logger.info('[CUSTOMER_ORDERS] No Alleaves client available', { orgId });
        return [];
    }

    try {
        // Try per-customer endpoint first
        const orders = await client.getCustomerOrders(numericId);
        if (orders && orders.length > 0) {
            return orders.map(mapAleavesOrder);
        }
    } catch (err) {
        logger.warn('[CUSTOMER_ORDERS] Per-customer endpoint failed, falling back to all orders', {
            customerId,
            error: (err as Error).message,
        });
    }

    // Fallback: filter from cached all-orders or fetch limited set
    try {
        const ordersCacheKey = cacheKeys.orders(orgId);
        let allOrders = posCache.get<any[]>(ordersCacheKey);

        if (!allOrders) {
            // Fetch limited orders set (not 100k)
            allOrders = await client.getAllOrders(5000);
            posCache.set(ordersCacheKey, allOrders, 5 * 60 * 1000);
        }

        const customerOrders = allOrders.filter((o: any) =>
            String(o.id_customer) === numericId
        );

        return customerOrders
            .map((o: any) => ({
                id: String(o.id || o.id_order || o.order_number || ''),
                orderNumber: o.order_number || String(o.id_order || o.id || ''),
                date: o.date_created || o.created_at || '',
                items: (o.items || []).map((item: any) => ({
                    productName: item.product_name || item.item || item.name || 'Unknown Product',
                    quantity: item.quantity || 1,
                    unitPrice: item.unit_price || item.price || 0,
                    total: item.total || (item.quantity || 1) * (item.unit_price || item.price || 0),
                })),
                subtotal: o.subtotal || o.total || 0,
                tax: o.tax || 0,
                discount: o.discount || 0,
                total: o.total || 0,
                status: o.status || 'completed',
                paymentMethod: o.payment_method || 'unknown',
            }))
            .sort((a: CustomerOrder, b: CustomerOrder) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
    } catch (err) {
        logger.error('[CUSTOMER_ORDERS] Failed to fetch orders', {
            customerId,
            error: (err as Error).message,
        });
        return [];
    }
}

function mapAleavesOrder(order: ALLeavesOrder): CustomerOrder {
    return {
        id: order.id,
        orderNumber: order.external_id || order.id,
        date: order.created_at,
        items: order.items.map(item => ({
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        status: order.status,
        paymentMethod: order.payment_method,
    };
}

// ==========================================
// Update Customer Notes
// ==========================================

export async function updateCustomerNotes(customerId: string, notes: string): Promise<void> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    // Upsert into customers collection
    const existing = await firestore.collection('customers').doc(customerId).get();
    if (existing.exists && existing.data()?.orgId === orgId) {
        await firestore.collection('customers').doc(customerId).update({
            notes,
            updatedAt: new Date(),
        });
    } else {
        // Create a minimal CRM doc for this customer
        await firestore.collection('customers').doc(customerId).set({
            orgId,
            notes,
            createdAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });
    }
}

// ==========================================
// Update Customer Tags
// ==========================================

export async function updateCustomerTags(customerId: string, tags: string[]): Promise<void> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    await firestore.collection('customers').doc(customerId).set({
        orgId,
        customTags: tags,
        updatedAt: new Date(),
    }, { merge: true });
}

// ==========================================
// Get Applicable Pricing Rules
// ==========================================

export interface ApplicablePricingRule {
    id: string;
    name: string;
    description?: string;
    adjustmentType: string;
    adjustmentValue: number;
    customerTiers: CustomerTier[];
    isActive: boolean;
}

/**
 * Get dynamic pricing rules that apply to a customer based on their tier.
 */
export async function getCustomerPricingRules(
    customerSegment: CustomerSegment,
    customerTotalSpent: number,
): Promise<{ pricingTier: CustomerTier; rules: ApplicablePricingRule[] }> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    const pricingTier = mapSegmentToTier(customerSegment, customerTotalSpent);

    try {
        // Query pricing rules that include this customer's tier
        const rulesSnap = await firestore.collection('pricing_rules')
            .where('orgId', '==', orgId)
            .where('active', '==', true)
            .get();

        const rules: ApplicablePricingRule[] = [];

        rulesSnap.forEach(doc => {
            const data = doc.data() as DynamicPricingRule;
            const tierCondition = data.conditions?.customerTier;

            // Include if no tier restriction OR if this customer's tier matches
            if (!tierCondition || tierCondition.length === 0 || tierCondition.includes(pricingTier)) {
                rules.push({
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    adjustmentType: data.priceAdjustment?.type || 'percentage',
                    adjustmentValue: data.priceAdjustment?.value || 0,
                    customerTiers: tierCondition || [],
                    isActive: data.active,
                });
            }
        });

        return { pricingTier, rules };
    } catch (error) {
        logger.error('[CUSTOMER_PRICING] Failed to fetch pricing rules', {
            error: (error as Error).message,
            orgId,
        });
        return { pricingTier, rules: [] };
    }
}
