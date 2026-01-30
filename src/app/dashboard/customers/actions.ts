'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { inferPreferencesFromAlleaves } from '@/lib/analytics/customer-preferences';
import {
    CustomerProfile,
    CustomerSegment,
    CRMStats,
    calculateSegment,
    getSegmentInfo,
    SegmentSuggestion,
    LegacySegment,
    segmentLegacyMap
} from '@/types/customers';

// ==========================================
// Types
// ==========================================

export interface CustomersData {
    customers: CustomerProfile[];
    stats: CRMStats;
}

export interface GetCustomersParams {
    segment?: CustomerSegment;
    search?: string;
    sortBy?: 'displayName' | 'totalSpent' | 'lastOrderDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

// ==========================================
// POS Integration Helpers
// ==========================================

/**
 * Get customers from Alleaves POS if configured
 */
async function getCustomersFromAlleaves(orgId: string, firestore: FirebaseFirestore.Firestore): Promise<CustomerProfile[]> {
    try {
        // Debug: Log what we received
        logger.info('[CUSTOMERS] getCustomersFromAlleaves called', {
            orgId,
            orgIdType: typeof orgId,
            orgIdValue: String(orgId),
        });

        // Check cache first
        const cacheKey = cacheKeys.customers(orgId);
        const cached = posCache.get<CustomerProfile[]>(cacheKey);

        if (cached) {
            logger.info('[CUSTOMERS] Using cached Alleaves customers', {
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

        logger.info('[CUSTOMERS] Location query result', {
            orgId,
            empty: locationsSnap.empty,
            size: locationsSnap.size,
        });

        if (locationsSnap.empty) {
            logger.info('[CUSTOMERS] No location found for org', { orgId });
            return [];
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') {
            logger.info('[CUSTOMERS] No active Alleaves POS config found', { orgId });
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

        // Fetch all customers from Alleaves
        logger.info('[CUSTOMERS] Starting customer fetch from Alleaves', { orgId });
        const alleavesCustomers = await client.getAllCustomersPaginated(30); // Max 30 pages = 3000 customers

        logger.info('[CUSTOMERS] Fetched customers from Alleaves', {
            orgId,
            count: alleavesCustomers.length,
            expected: '2527',
        });

        // Transform Alleaves customers to CustomerProfile format
        const customers = alleavesCustomers.map((ac: any, index: number) => {
            const email = ac.email?.toLowerCase() || `customer_${ac.id}@alleaves.local`;
            const firstName = ac.first_name || '';
            const lastName = ac.last_name || '';
            const displayName = [firstName, lastName].filter(Boolean).join(' ') || email;

            const totalSpent = parseFloat(ac.total_spent || 0);
            const orderCount = parseInt(ac.total_orders || 0);
            const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

            const lastOrderDate = ac.last_order_date ? new Date(ac.last_order_date) : undefined;
            const firstOrderDate = ac.created_at ? new Date(ac.created_at) : undefined;

            // Infer preferences from Alleaves data
            const preferences = inferPreferencesFromAlleaves(ac);

            // Generate truly unique ID: Use Alleaves ID if available, otherwise create unique ID
            const customerId = ac.id ? `alleaves_${ac.id}` : `${orgId}_${email}_${index}`;

            const profile: CustomerProfile = {
                id: customerId,
                orgId,
                email,
                phone: ac.phone || '',
                firstName,
                lastName,
                displayName,
                totalSpent,
                orderCount,
                avgOrderValue,
                lastOrderDate,
                firstOrderDate,
                daysSinceLastOrder: lastOrderDate
                    ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
                    : undefined,
                preferredCategories: preferences.preferredCategories || [],
                preferredProducts: preferences.preferredProducts || [],
                priceRange: preferences.priceRange || 'mid',
                segment: 'new', // Will be calculated later
                tier: 'bronze', // Will be calculated later
                points: parseInt(ac.loyalty_points || 0),
                lifetimeValue: totalSpent,
                customTags: [],
                birthDate: ac.birth_date,
                source: 'pos_dutchie', // Alleaves integration treated as POS source
                createdAt: firstOrderDate || new Date(),
                updatedAt: new Date(),
            };

            return profile;
        });

        // Cache the result (5 minute TTL)
        posCache.set(cacheKey, customers, 5 * 60 * 1000);

        return customers;
    } catch (error: any) {
        logger.error('[CUSTOMERS] Failed to fetch from Alleaves', {
            orgId,
            error: error.message,
        });
        return [];
    }
}

// ==========================================
// Main Customer Retrieval (from Orders)
// ==========================================

/**
 * Get customers derived from orders data
 * Integrates with POS systems (Alleaves) when configured
 */
export async function getCustomers(brandId: string): Promise<CustomersData> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    // Use the brandId parameter passed from the page (already validated)
    // instead of recalculating from user object
    const orgId = brandId;

    logger.info('[CUSTOMERS] getCustomers called', {
        brandId,
        brandIdType: typeof brandId,
        userRole: user.role,
        userEmail: user.email,
    });

    // For brand users, ensure they access their own data
    if (user.role === 'brand' && user.brandId !== brandId) {
        throw new Error('Forbidden');
    }

    const { firestore } = await createServerClient();
    const locationId = user.locationId;

    // 1. Try to get customers from POS (Alleaves) if configured
    const posCustomers = await getCustomersFromAlleaves(orgId, firestore);

    // 2. Get customers from BakedBot orders (fallback or supplement)
    let ordersQuery = firestore.collection('orders') as FirebaseFirestore.Query;
    
    if (locationId) {
        ordersQuery = ordersQuery.where('retailerId', '==', locationId);
    } else {
        ordersQuery = ordersQuery.where('brandId', '==', brandId);
    }

    const ordersSnap = await ordersQuery.get();

    const orders = ordersSnap.docs.map((doc: any) => {
        const data = doc.data();
        return {
            ...data,
            createdAt: data.createdAt,
            customer: data.customer || {},
            totals: data.totals || { total: 0 }
        };
    });

    // 3. Get any manually added customers from CRM collection
    const crmSnap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    const crmCustomers = new Map<string, any>();
    crmSnap.forEach(doc => {
        const data = doc.data();
        crmCustomers.set(data.email?.toLowerCase(), { id: doc.id, ...data });
    });

    // 3. Build customer profiles - start with POS customers if available
    const customerMap = new Map<string, CustomerProfile>();
    const emailToIdMap = new Map<string, string>(); // Secondary lookup: email -> customer ID

    // Add POS customers first (primary source)
    if (posCustomers.length > 0) {
        logger.info('[CUSTOMERS] Using POS customers as primary source', {
            orgId,
            count: posCustomers.length,
        });

        posCustomers.forEach(customer => {
            // Use customer ID as key (not email) to preserve all unique customers
            // Many customers may share email addresses (families, etc.)
            customerMap.set(customer.id, customer);

            // Build secondary email lookup (for matching orders)
            // Note: If multiple customers share an email, this will point to the last one
            emailToIdMap.set(customer.email.toLowerCase(), customer.id);
        });

        logger.info('[CUSTOMERS] CustomerMap after adding POS customers', {
            orgId,
            mapSize: customerMap.size,
        });
    }

    // 4. Merge/supplement with BakedBot orders
    orders.forEach(order => {
        const email = order.customer?.email?.toLowerCase();
        if (!email) return;

        const orderDate = order.createdAt?.toDate?.() || new Date();
        const orderTotal = order.totals?.total || 0;

        // Try to find existing customer by email
        const customerId = emailToIdMap.get(email);
        const existing = customerId ? customerMap.get(customerId) : undefined;

        if (existing) {
            existing.orderCount = (existing.orderCount || 0) + 1;
            existing.totalSpent = (existing.totalSpent || 0) + orderTotal;

            const currentLast = existing.lastOrderDate;
            if (!currentLast || orderDate > currentLast) {
                existing.lastOrderDate = orderDate;
            }
            if (!existing.firstOrderDate || orderDate < existing.firstOrderDate) {
                existing.firstOrderDate = orderDate;
            }
        } else {
            // Check if customer exists in CRM collection
            const crmData = crmCustomers.get(email);

            const newCustomerId = crmData?.id || email;
            customerMap.set(newCustomerId, {
                id: newCustomerId,
                orgId: orgId,
                email: email,
                firstName: crmData?.firstName || order.customer?.name?.split(' ')[0],
                lastName: crmData?.lastName || order.customer?.name?.split(' ').slice(1).join(' '),
                displayName: crmData?.displayName || order.customer?.name || email,
                phone: crmData?.phone || order.customer?.phone || '',
                orderCount: 1,
                totalSpent: orderTotal,
                avgOrderValue: orderTotal,
                lastOrderDate: orderDate,
                firstOrderDate: orderDate,
                preferredCategories: crmData?.preferredCategories || [],
                preferredProducts: crmData?.preferredProducts || [],
                priceRange: crmData?.priceRange || 'mid',
                segment: 'new',
                tier: 'bronze',
                points: crmData?.points || 0,
                lifetimeValue: orderTotal,
                customTags: crmData?.customTags || [],
                birthDate: crmData?.birthDate,
                preferences: crmData?.preferences,
                source: crmData?.source || 'brand_page',
                notes: crmData?.notes,
                createdAt: crmData?.createdAt?.toDate?.() || orderDate,
                updatedAt: new Date(),
            });
        }
    });

    // 5. Add CRM-only customers (no orders yet, not in POS)
    crmCustomers.forEach((crmData, email) => {
        // Check if this customer already exists (by ID, not email)
        if (!customerMap.has(crmData.id)) {
            customerMap.set(crmData.id, {
                id: crmData.id,
                orgId: orgId,
                email: email,
                firstName: crmData.firstName,
                lastName: crmData.lastName,
                displayName: crmData.displayName || email,
                phone: crmData.phone,
                orderCount: 0,
                totalSpent: 0,
                avgOrderValue: 0,
                preferredCategories: crmData.preferredCategories || [],
                preferredProducts: crmData.preferredProducts || [],
                priceRange: crmData.priceRange || 'mid',
                segment: 'new',
                tier: 'bronze',
                points: crmData.points || 0,
                lifetimeValue: 0,
                customTags: crmData.customTags || [],
                birthDate: crmData.birthDate,
                preferences: crmData.preferences,
                source: crmData.source || 'manual',
                notes: crmData.notes,
                createdAt: crmData.createdAt?.toDate?.() || new Date(),
                updatedAt: new Date(),
            });
        }
    });

    // 6. Calculate segments and stats
    const segmentBreakdown: Record<CustomerSegment, number> = {
        vip: 0, loyal: 0, new: 0, at_risk: 0, slipping: 0, churned: 0, high_value: 0, frequent: 0
    };

    logger.info('[CUSTOMERS] Converting map to array', {
        orgId,
        mapSize: customerMap.size,
    });

    const customers = Array.from(customerMap.values()).map(c => {
        // Calculate average order value
        if (c.orderCount > 0) {
            c.avgOrderValue = c.totalSpent / c.orderCount;
        }

        // Calculate days since last order
        if (c.lastOrderDate) {
            c.daysSinceLastOrder = Math.floor((Date.now() - c.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Calculate segment
        c.segment = calculateSegment(c);

        // Calculate tier
        if (c.totalSpent > 2000) c.tier = 'gold';
        else if (c.totalSpent > 500) c.tier = 'silver';
        else c.tier = 'bronze';

        // Calculate points and LTV
        c.points = Math.floor(c.totalSpent);
        c.lifetimeValue = c.totalSpent;

        // Update breakdown
        segmentBreakdown[c.segment]++;

        return c;
    }).sort((a, b) => (b.lastOrderDate?.getTime() || 0) - (a.lastOrderDate?.getTime() || 0));

    logger.info('[CUSTOMERS] After map and sort', {
        orgId,
        customersLength: customers.length,
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: CRMStats = {
        totalCustomers: customers.length,
        newThisWeek: customers.filter(c => c.createdAt && c.createdAt >= weekAgo).length,
        newThisMonth: customers.filter(c => c.createdAt && c.createdAt >= monthAgo).length,
        atRiskCount: segmentBreakdown.at_risk + segmentBreakdown.slipping,
        vipCount: segmentBreakdown.vip,
        avgLifetimeValue: customers.length > 0
            ? customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length
            : 0,
        segmentBreakdown,
    };

    // CRITICAL: Use aggressive serialization for React Server Components
    // RSC cannot serialize Date objects, functions, or other non-JSON data
    // Using JSON.parse(JSON.stringify()) ensures ALL data is serializable
    const serializedCustomers = JSON.parse(JSON.stringify(customers)) as CustomerProfile[];

    logger.info('[CUSTOMERS] Returning customers to client', {
        orgId,
        count: serializedCustomers.length,
        beforeSerialization: customers.length,
        serialized: true,
    });

    return { customers: serializedCustomers, stats };
}

// ==========================================
// Single Customer Operations
// ==========================================

/**
 * Get a single customer by ID or email
 */
export async function getCustomer(customerId: string): Promise<CustomerProfile | null> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const orgId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    // Try CRM collection first
    const doc = await firestore.collection('customers').doc(customerId).get();
    if (doc.exists && doc.data()?.orgId === orgId) {
        const data = doc.data()!;
        return {
            id: doc.id,
            orgId: data.orgId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.email,
            phone: data.phone,
            totalSpent: data.totalSpent || 0,
            orderCount: data.orderCount || 0,
            avgOrderValue: data.avgOrderValue || 0,
            lastOrderDate: data.lastOrderDate?.toDate?.(),
            firstOrderDate: data.firstOrderDate?.toDate?.(),
            preferredCategories: data.preferredCategories || [],
            preferredProducts: data.preferredProducts || [],
            priceRange: data.priceRange || 'mid',
            segment: data.segment || 'new',
            tier: data.tier || 'bronze',
            points: data.points || 0,
            lifetimeValue: data.lifetimeValue || 0,
            customTags: data.customTags || [],
            birthDate: data.birthDate,
            preferences: data.preferences,
            source: data.source || 'manual',
            notes: data.notes,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as CustomerProfile;
    }

    // If not found, try getting from orders by email
    const allData = await getCustomers(orgId);
    return allData.customers.find(c => c.id === customerId || c.email === customerId) || null;
}

/**
 * Create or update a customer in CRM collection
 */
export async function upsertCustomer(
    profile: Partial<CustomerProfile> & { email: string }
): Promise<CustomerProfile> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const orgId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    // Check for existing
    const existing = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .where('email', '==', profile.email.toLowerCase())
        .limit(1)
        .get();

    const segment = calculateSegment(profile);

    const customerData = {
        orgId,
        email: profile.email.toLowerCase(),
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        displayName: profile.displayName || null,
        phone: profile.phone || null,
        totalSpent: profile.totalSpent || 0,
        orderCount: profile.orderCount || 0,
        avgOrderValue: profile.avgOrderValue || 0,
        preferredCategories: profile.preferredCategories || [],
        preferredProducts: profile.preferredProducts || [],
        priceRange: profile.priceRange || 'mid',
        segment,
        tier: profile.tier || 'bronze',
        points: profile.points || 0,
        lifetimeValue: profile.lifetimeValue || 0,
        customTags: profile.customTags || [],
        birthDate: profile.birthDate || null,
        preferences: profile.preferences || null,
        source: profile.source || 'manual',
        notes: profile.notes || null,
        updatedAt: FieldValue.serverTimestamp(),
    };

    let docId: string;

    if (!existing.empty) {
        docId = existing.docs[0].id;
        await firestore.collection('customers').doc(docId).update(customerData);
    } else {
        const docRef = await firestore.collection('customers').add({
            ...customerData,
            createdAt: FieldValue.serverTimestamp(),
        });
        docId = docRef.id;
    }

    return {
        ...profile,
        id: docId,
        orgId,
        segment,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as CustomerProfile;
}

/**
 * Add a tag to a customer
 */
export async function addCustomerTag(customerId: string, tag: string): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const orgId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const doc = await firestore.collection('customers').doc(customerId).get();
    if (!doc.exists || doc.data()?.orgId !== orgId) {
        throw new Error('Customer not found or access denied');
    }

    await firestore.collection('customers').doc(customerId).update({
        customTags: FieldValue.arrayUnion(tag),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Add a note to a customer
 */
export async function addCustomerNote(customerId: string, note: string): Promise<void> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);
    const orgId = user.brandId || user.uid;
    const { firestore } = await createServerClient();

    const doc = await firestore.collection('customers').doc(customerId).get();
    if (!doc.exists || doc.data()?.orgId !== orgId) {
        throw new Error('Customer not found or access denied');
    }

    await firestore.collection('customers').doc(customerId).update({
        notes: note,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

// ==========================================
// AI Suggestions
// ==========================================

/**
 * Get AI-suggested customer segments
 * References Craig (campaign manager) and Mrs. Parker (email specialist) agents
 */
export async function getSuggestedSegments(brandId: string): Promise<SegmentSuggestion[]> {
    const data = await getCustomers(brandId);
    const stats = data.stats;
    const suggestions: SegmentSuggestion[] = [];

    // Always show New Customer Nurture first if there are new customers
    if (stats.newThisMonth > 0) {
        suggestions.push({
            name: 'New Customer Welcome',
            description: 'Fresh signups ready for your welcome sequence',
            filters: [{ field: 'segment', operator: 'equals', value: 'new' }],
            estimatedCount: stats.newThisMonth,
            reasoning: `Craig has automatically added these ${stats.newThisMonth} customers to your new customer welcome list. Mrs. Parker will now send personalized, segmented emails. Good stuff.`
        });
    }

    if (stats.atRiskCount > 3) {
        suggestions.push({
            name: 'Win-Back Campaign',
            description: 'Customers who haven\'t ordered recently',
            filters: [{ field: 'segment', operator: 'in', value: ['at_risk', 'slipping'] }],
            estimatedCount: stats.atRiskCount,
            reasoning: `Craig spotted ${stats.atRiskCount} customers slipping away. Mrs. Parker can send them a re-engagement sequence with a special offer.`
        });
    }

    if (stats.vipCount > 0) {
        suggestions.push({
            name: 'VIP Appreciation',
            description: 'Your top customers deserving VIP treatment',
            filters: [{ field: 'segment', operator: 'equals', value: 'vip' }],
            estimatedCount: stats.vipCount,
            reasoning: `Craig flagged ${stats.vipCount} VIP customers for exclusive treatment. These high-spenders drive your revenue.`
        });
    }

    return suggestions;
}

// ==========================================
// Segment Helpers (exported for UI)
// ==========================================


