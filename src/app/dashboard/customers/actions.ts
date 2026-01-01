'use server';

import { createServerClient } from '@/firebase/server-client';
import { orderConverter, type OrderDoc } from '@/firebase/converters';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
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
// Main Customer Retrieval (from Orders)
// ==========================================

/**
 * Get customers derived from orders data
 * This is the primary data source before POS integration
 */
export async function getCustomers(brandId: string): Promise<CustomersData> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
    const orgId = user.brandId || user.uid;

    // For brand users, ensure they access their own data
    if (user.role === 'brand' && user.brandId !== brandId) {
        throw new Error('Forbidden');
    }

    const { firestore } = await createServerClient();
    const locationId = user.locationId;

    // 1. Get customers from orders
    let ordersQuery = firestore.collection('orders') as FirebaseFirestore.Query;
    
    if (locationId) {
        ordersQuery = ordersQuery.where('dispensaryId', '==', locationId);
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

    // 2. Also get any manually added customers from CRM collection
    const crmSnap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    const crmCustomers = new Map<string, any>();
    crmSnap.forEach(doc => {
        const data = doc.data();
        crmCustomers.set(data.email?.toLowerCase(), { id: doc.id, ...data });
    });

    // 3. Build customer profiles from orders
    const customerMap = new Map<string, CustomerProfile>();

    orders.forEach(order => {
        const email = order.customer?.email?.toLowerCase();
        if (!email) return;

        const orderDate = order.createdAt?.toDate?.() || new Date();
        const orderTotal = order.totals?.total || 0;

        const existing = customerMap.get(email);

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

            customerMap.set(email, {
                id: crmData?.id || email,
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

    // 4. Add CRM-only customers (no orders yet)
    crmCustomers.forEach((crmData, email) => {
        if (!customerMap.has(email)) {
            customerMap.set(email, {
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

    // 5. Calculate segments and stats
    const segmentBreakdown: Record<CustomerSegment, number> = {
        vip: 0, loyal: 0, new: 0, at_risk: 0, slipping: 0, churned: 0, high_value: 0, frequent: 0
    };

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

    return { customers, stats };
}

// ==========================================
// Single Customer Operations
// ==========================================

/**
 * Get a single customer by ID or email
 */
export async function getCustomer(customerId: string): Promise<CustomerProfile | null> {
    const user = await requireUser(['brand', 'dispensary', 'owner']);
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
    const user = await requireUser(['brand', 'dispensary', 'owner']);
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
    const user = await requireUser(['brand', 'dispensary', 'owner']);
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
    const user = await requireUser(['brand', 'dispensary', 'owner']);
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
 */
export async function getSuggestedSegments(brandId: string): Promise<SegmentSuggestion[]> {
    const data = await getCustomers(brandId);
    const stats = data.stats;
    const suggestions: SegmentSuggestion[] = [];

    if (stats.atRiskCount > 3) {
        suggestions.push({
            name: 'Win-Back Campaign Targets',
            description: 'Customers who haven\'t ordered in 30+ days',
            filters: [{ field: 'segment', operator: 'in', value: ['at_risk', 'slipping'] }],
            estimatedCount: stats.atRiskCount,
            reasoning: `You have ${stats.atRiskCount} at-risk customers. A win-back campaign could recover lost revenue.`
        });
    }

    if (stats.vipCount > 0) {
        suggestions.push({
            name: 'VIP Appreciation',
            description: 'Your top customers deserving special treatment',
            filters: [{ field: 'segment', operator: 'equals', value: 'vip' }],
            estimatedCount: stats.vipCount,
            reasoning: `These ${stats.vipCount} VIP customers drive significant revenue.`
        });
    }

    if (stats.newThisMonth > 2) {
        suggestions.push({
            name: 'New Customer Nurture',
            description: 'Recent signups who need onboarding',
            filters: [{ field: 'segment', operator: 'equals', value: 'new' }],
            estimatedCount: stats.newThisMonth,
            reasoning: `${stats.newThisMonth} new customers this month. Early engagement increases retention.`
        });
    }

    return suggestions;
}

// ==========================================
// Segment Helpers (exported for UI)
// ==========================================


