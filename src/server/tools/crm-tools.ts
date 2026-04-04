/**
 * CRM Tools for Agent Use
 *
 * Provides customer lookup, order history, segment analysis, and communication
 * history tools that agents can call during conversations.
 *
 * Pattern: Zod schemas (toolDefs) + exported async implementations.
 * Implementations use admin Firestore directly (no requireUser) since they
 * run inside the agent harness context.
 */

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import {
    isPlaceholderCustomerEmail,
    isPlaceholderCustomerIdentity,
    resolveCustomerDisplayName,
} from '@/lib/customers/profile-derivations';
import { isNormalizedPhone, normalizePhone } from '@/lib/customer-import/column-mapping';
import { calculateSegment, getSegmentInfo, type CustomerSegment } from '@/types/customers';
import { mapSegmentToTier } from '@/lib/pricing/customer-tier-mapper';
import { logger } from '@/lib/logger';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';
import { getTopCustomers as getDomainTopCustomers } from '@/server/agents/tools/domain/crm';

// =============================================================================
// TOOL DEFINITIONS (Zod schemas for agent toolsDef arrays)
// =============================================================================

const lookupCustomerDef = {
    name: 'lookupCustomer',
    description: `Look up a customer by ID, email, or phone number. Returns profile with segment, spending metrics, tier, loyalty points, preferences, and tags. Use this when you need details about a specific customer.`,
    schema: z.object({
        identifier: z.string().describe('Customer ID (e.g. alleaves_123), email address, or phone number'),
        orgId: z.string().describe('Organization/tenant ID'),
    }),
};

const getCustomerHistoryDef = {
    name: 'getCustomerHistory',
    description: `Get order history for a specific customer from the POS system. Returns recent orders with items, totals, and dates. Use this to understand purchase patterns and product preferences.`,
    schema: z.object({
        customerId: z.string().describe('Customer ID (e.g. alleaves_123)'),
        orgId: z.string().describe('Organization/tenant ID'),
        limit: z.number().optional().default(10).describe('Max number of orders to return'),
    }),
};

const getSegmentSummaryDef = {
    name: 'getSegmentSummary',
    description: `Get a summary of all customer segments for an organization. Returns segment counts, average spend, total LTV, and growth opportunities. Use this for strategic analysis of the customer base.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
    }),
};

const getCustomerEmailCoverageDef = {
    name: 'getCustomerEmailCoverage',
    description: `Count how many synced customer profiles have an email address on file. Use this whenever the user asks how many customers have emails, what the email capture rate is, or how many profiles are missing email.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
    }),
};

const getTopCustomersDef = {
    name: 'getTopCustomers',
    description: `Find the highest-value customers in an organization. Returns the top customers ranked by spend or order count. Use this for VIP outreach, concierge treatment, and answering "who are our top customers?"`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        limit: z.number().optional().default(5).describe('Max customers to return'),
        sortBy: z.enum(['totalSpent', 'orderCount', 'lifetimeValue']).optional().default('totalSpent').describe('How to rank the customers'),
    }),
};

const getAtRiskCustomersDef = {
    name: 'getAtRiskCustomers',
    description: `Find at-risk and slipping customers sorted by lifetime value. These are customers who haven't ordered in 30+ days. Use this to identify win-back campaign targets.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        limit: z.number().optional().default(20).describe('Max customers to return'),
        includeSlipping: z.boolean().optional().default(true).describe('Include slipping (30-60 days) in addition to at_risk (60+)'),
    }),
};

const getUpcomingBirthdaysDef = {
    name: 'getUpcomingBirthdays',
    description: `Find customers with upcoming birthdays within a specified number of days. Use this to plan birthday campaigns and personalized offers.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        daysAhead: z.number().optional().default(7).describe('Number of days ahead to look'),
    }),
};

const getCustomerCommsDef = {
    name: 'getCustomerComms',
    description: `Get communication history (emails, SMS) for a customer. Shows what messages have been sent, opened, or clicked. Use this to avoid over-messaging and to review engagement.`,
    schema: z.object({
        customerEmail: z.string().describe('Customer email address'),
        orgId: z.string().describe('Organization/tenant ID'),
        limit: z.number().optional().default(20).describe('Max communications to return'),
        channel: z.enum(['email', 'sms', 'push']).optional().describe('Filter by channel'),
    }),
};

/** All CRM tool definitions */
export const crmToolDefs = [
    lookupCustomerDef,
    getCustomerHistoryDef,
    getSegmentSummaryDef,
    getCustomerEmailCoverageDef,
    getTopCustomersDef,
    getAtRiskCustomersDef,
    getUpcomingBirthdaysDef,
    getCustomerCommsDef,
];

/** Per-agent subsets */
export const craigCrmToolDefs = [lookupCustomerDef, getAtRiskCustomersDef, getCustomerCommsDef, getSegmentSummaryDef];
export const mrsParkerCrmToolDefs = [lookupCustomerDef, getCustomerEmailCoverageDef, getTopCustomersDef, getUpcomingBirthdaysDef, getCustomerCommsDef, getAtRiskCustomersDef];
export const smokeyCrmToolDefs = [lookupCustomerDef, getCustomerHistoryDef];
export const moneyMikeCrmToolDefs = [lookupCustomerDef, getSegmentSummaryDef, getCustomerHistoryDef];

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

async function initAlleavesClientForOrg(orgId: string): Promise<ALLeavesClient | null> {
    const firestore = getAdminFirestore();

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

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

/**
 * Look up a customer by ID, email, or phone.
 * Returns formatted summary with CRM marker for inline rendering.
 */
export async function lookupCustomer(
    identifier: string,
    orgId: string,
): Promise<{ summary: string; customer: Record<string, unknown> | null }> {
    logger.info('[crm-tools] lookupCustomer', { identifier, orgId });
    const firestore = getAdminFirestore();

    // Try direct doc lookup if it looks like a customer ID
    if (identifier.startsWith('alleaves_') || !identifier.includes('@')) {
        const docId = identifier;
        const doc = await firestore.collection('customers').doc(docId).get();
        if (doc.exists && doc.data()?.orgId === orgId) {
            return formatCustomerResult(doc.id, doc.data()!, orgId);
        }
    }

    // Search by email
    if (identifier.includes('@')) {
        const snap = await firestore.collection('customers')
            .where('orgId', '==', orgId)
            .where('email', '==', identifier.toLowerCase())
            .limit(1)
            .get();
        if (!snap.empty) {
            return formatCustomerResult(snap.docs[0].id, snap.docs[0].data(), orgId);
        }
    }

    // Search by phone
    if (/^\+?[\d\s\-()]{10,}$/.test(identifier)) {
        const normalized = normalizePhone(identifier);
        if (isNormalizedPhone(normalized)) {
            const snap = await firestore.collection('customers')
                .where('orgId', '==', orgId)
                .where('phone', '==', normalized)
                .limit(1)
                .get();
            if (!snap.empty) {
                return formatCustomerResult(snap.docs[0].id, snap.docs[0].data(), orgId);
            }
        }
    }

    // Try spending cache for Alleaves customers
    const spendingCacheKey = `spending:${orgId}`;
    const cachedSpending = await posCache.get<Record<string, { totalSpent: number; orderCount: number }>>(spendingCacheKey);
    if (cachedSpending && cachedSpending[identifier]) {
        return {
            summary: `Found spending data for ${identifier} but no full profile. Total spent: $${cachedSpending[identifier].totalSpent.toFixed(2)}, Orders: ${cachedSpending[identifier].orderCount}.`,
            customer: null,
        };
    }

    return {
        summary: `No customer found matching "${identifier}" in organization ${orgId}.`,
        customer: null,
    };
}

async function getCachedCustomerProfile(id: string, orgId: string): Promise<Record<string, unknown> | null> {
    const cachedCustomers = await posCache.get<Record<string, unknown>[]>(cacheKeys.customers(orgId));
    if (!Array.isArray(cachedCustomers)) {
        return null;
    }

    return cachedCustomers.find((candidate) => (
        candidate
        && typeof candidate === 'object'
        && typeof candidate.id === 'string'
        && candidate.id === id
    )) ?? null;
}

function preferCachedString(
    currentValue: unknown,
    cachedValue: unknown,
    shouldReplace?: (value: string) => boolean,
): string | undefined {
    const current = typeof currentValue === 'string' ? currentValue.trim() : '';
    const cached = typeof cachedValue === 'string' ? cachedValue.trim() : '';

    if (!cached) {
        return current || undefined;
    }

    if (!current) {
        return cached;
    }

    return shouldReplace?.(current) ? cached : current;
}

function preferCachedArray(currentValue: unknown, cachedValue: unknown): unknown[] | undefined {
    if (Array.isArray(currentValue) && currentValue.length > 0) {
        return currentValue;
    }

    if (Array.isArray(cachedValue) && cachedValue.length > 0) {
        return cachedValue;
    }

    return Array.isArray(currentValue) ? currentValue : undefined;
}

function mergeCustomerDocWithCachedProfile(
    id: string,
    data: FirebaseFirestore.DocumentData,
    orgId: string,
): FirebaseFirestore.DocumentData {
    const cachedCustomer = getCachedCustomerProfile(id, orgId);
    if (!cachedCustomer) {
        return data;
    }

    const email = preferCachedString(
        data.email,
        cachedCustomer.email,
        (value) => isPlaceholderCustomerEmail(value),
    );

    return {
        ...data,
        displayName: preferCachedString(
            data.displayName,
            cachedCustomer.displayName,
            (value) => isPlaceholderCustomerIdentity(value, {
                email,
                fallbackId: id,
            }),
        ) ?? data.displayName,
        firstName: preferCachedString(data.firstName, cachedCustomer.firstName) ?? data.firstName,
        lastName: preferCachedString(data.lastName, cachedCustomer.lastName) ?? data.lastName,
        email: email ?? data.email,
        phone: preferCachedString(data.phone, cachedCustomer.phone) ?? data.phone,
        birthDate: data.birthDate ?? cachedCustomer.birthDate ?? null,
        points: data.points ?? cachedCustomer.points ?? data.points,
        totalSpent: data.totalSpent ?? cachedCustomer.totalSpent ?? data.totalSpent,
        orderCount: data.orderCount ?? cachedCustomer.orderCount ?? data.orderCount,
        avgOrderValue: data.avgOrderValue ?? cachedCustomer.avgOrderValue ?? data.avgOrderValue,
        lastOrderDate: data.lastOrderDate ?? cachedCustomer.lastOrderDate ?? data.lastOrderDate,
        preferredCategories: preferCachedArray(data.preferredCategories, cachedCustomer.preferredCategories) ?? [],
        preferredProducts: preferCachedArray(data.preferredProducts, cachedCustomer.preferredProducts) ?? [],
        priceRange: data.priceRange ?? cachedCustomer.priceRange ?? data.priceRange,
        customTags: preferCachedArray(data.customTags, cachedCustomer.customTags) ?? [],
        notes: data.notes ?? cachedCustomer.notes ?? null,
        source: data.source ?? cachedCustomer.source ?? data.source,
    };
}

function formatCustomerResult(
    id: string,
    data: FirebaseFirestore.DocumentData,
    orgId: string,
): { summary: string; customer: Record<string, unknown> } {
    const resolvedData = mergeCustomerDocWithCachedProfile(id, data, orgId);
    const totalSpent = resolvedData.totalSpent || 0;
    const orderCount = resolvedData.orderCount || 0;
    const avgOrderValue = resolvedData.avgOrderValue || (orderCount > 0 ? totalSpent / orderCount : 0);
    const daysSinceLastOrder = resolvedData.lastOrderDate
        ? Math.floor((Date.now() - (resolvedData.lastOrderDate?.toDate?.()?.getTime?.() || new Date(resolvedData.lastOrderDate).getTime())) / (1000 * 60 * 60 * 24))
        : undefined;

    const segment = calculateSegment({ totalSpent, orderCount, avgOrderValue, daysSinceLastOrder, lifetimeValue: totalSpent });
    const tier = mapSegmentToTier(segment, totalSpent);
    const segInfo = getSegmentInfo(segment);
    const displayName = resolveCustomerDisplayName({
        displayName: resolvedData.displayName,
        firstName: resolvedData.firstName,
        lastName: resolvedData.lastName,
        email: resolvedData.email,
        fallbackId: id,
    });

    const customer: Record<string, unknown> = {
        id,
        orgId,
        displayName,
        email: resolvedData.email,
        phone: resolvedData.phone || null,
        firstName: resolvedData.firstName,
        lastName: resolvedData.lastName,
        segment,
        segmentLabel: segInfo.label,
        tier,
        totalSpent,
        orderCount,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        lastOrderDate: resolvedData.lastOrderDate?.toDate?.()?.toISOString?.() || resolvedData.lastOrderDate || null,
        daysSinceLastOrder,
        lifetimeValue: totalSpent,
        points: resolvedData.points || Math.floor(totalSpent),
        preferredCategories: resolvedData.preferredCategories || [],
        preferredProducts: resolvedData.preferredProducts || [],
        priceRange: resolvedData.priceRange || 'mid',
        customTags: resolvedData.customTags || [],
        notes: resolvedData.notes || null,
        birthDate: resolvedData.birthDate || null,
        source: resolvedData.source || 'unknown',
    };

    const lastOrder = customer.lastOrderDate ? new Date(customer.lastOrderDate as string).toLocaleDateString() : 'Never';

    const summary = `**${displayName}** (${segInfo.label} | ${tier} tier)
- Email: ${resolvedData.email || 'N/A'} | Phone: ${resolvedData.phone || 'N/A'}
- LTV: $${totalSpent.toLocaleString()} | Orders: ${orderCount} | AOV: $${avgOrderValue.toFixed(2)}
- Last Order: ${lastOrder}${daysSinceLastOrder !== undefined ? ` (${daysSinceLastOrder} days ago)` : ''}
- Points: ${customer.points} | Tags: ${(customer.customTags as string[]).join(', ') || 'None'}
:::crm:customer:${displayName}
${JSON.stringify(customer)}
:::`;

    return { summary, customer };
}

/**
 * Get order history for a customer from Alleaves POS.
 */
export async function getCustomerHistory(
    customerId: string,
    orgId: string,
    limit: number = 10,
): Promise<{ summary: string; orders: Record<string, unknown>[] }> {
    logger.info('[crm-tools] getCustomerHistory', { customerId, orgId, limit });

    const numericId = customerId.startsWith('alleaves_')
        ? customerId.replace('alleaves_', '')
        : customerId;

    const client = await initAlleavesClientForOrg(orgId);
    if (!client) {
        return { summary: `No POS connection available for ${orgId}. Cannot fetch order history.`, orders: [] };
    }

    // Try per-customer endpoint
    try {
        const orders = await client.getCustomerOrders(numericId);
        if (orders && orders.length > 0) {
            const limited = orders.slice(0, limit);
            const totalSpent = limited.reduce((sum, o) => sum + (o.total || 0), 0);

            const summary = `**Order History for ${customerId}** (showing ${limited.length} of ${orders.length})
Total spent in shown orders: $${totalSpent.toFixed(2)}

${limited.map((o, i) => `${i + 1}. **${o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Unknown date'}** - $${(o.total || 0).toFixed(2)} (${o.items?.length || 0} items) - ${o.status || 'completed'}`).join('\n')}`;

            return {
                summary,
                orders: limited.map(o => ({
                    id: o.id,
                    date: o.created_at,
                    total: o.total,
                    items: o.items?.map((item: any) => ({
                        name: item.product_name,
                        quantity: item.quantity,
                        price: item.unit_price,
                        total: item.total,
                    })) || [],
                    status: o.status,
                })),
            };
        }
    } catch (err) {
        logger.warn('[crm-tools] Per-customer orders failed, trying fallback', { error: (err as Error).message });
    }

    // Fallback: filter from cached all-orders
    try {
        const ordersCacheKey = cacheKeys.orders(orgId);
        let allOrders = await posCache.get<any[]>(ordersCacheKey);

        if (!allOrders) {
            allOrders = await client.getAllOrders(5000);
            await posCache.set(ordersCacheKey, allOrders, 300);
        }

        const customerOrders = allOrders
            .filter((o: any) => String(o.id_customer) === numericId)
            .sort((a: any, b: any) => new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime())
            .slice(0, limit);

        if (customerOrders.length === 0) {
            return { summary: `No orders found for customer ${customerId}.`, orders: [] };
        }

        const totalSpent = customerOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        const summary = `**Order History for ${customerId}** (${customerOrders.length} orders)
Total: $${totalSpent.toFixed(2)}

${customerOrders.map((o: any, i: number) => `${i + 1}. **${o.date_created ? new Date(o.date_created).toLocaleDateString() : 'Unknown'}** - $${(o.total || 0).toFixed(2)} (${o.items?.length || 0} items)`).join('\n')}`;

        return {
            summary,
            orders: customerOrders.map((o: any) => ({
                id: String(o.id || o.id_order || ''),
                date: o.date_created || o.created_at,
                total: o.total || 0,
                items: (o.items || []).map((item: any) => ({
                    name: item.product_name || item.name || 'Unknown',
                    quantity: item.quantity || 1,
                    price: item.unit_price || item.price || 0,
                    total: item.total || 0,
                })),
                status: o.status || 'completed',
            })),
        };
    } catch (err) {
        logger.error('[crm-tools] Failed to fetch order history', { error: (err as Error).message });
        return { summary: `Error fetching orders: ${(err as Error).message}`, orders: [] };
    }
}

/**
 * Get segment breakdown for the organization.
 */
export async function getSegmentSummary(
    orgId: string,
): Promise<{ summary: string; segments: Record<string, unknown> }> {
    logger.info('[crm-tools] getSegmentSummary', { orgId });
    return withCache(
        CachePrefix.CRM_SEGMENTS,
        orgId,
        async () => {
            const firestore = getAdminFirestore();

            const snap = await firestore.collection('customers')
                .where('orgId', '==', orgId)
                .get();

            if (snap.empty) {
                return { summary: `No customers found for organization ${orgId}.`, segments: {} };
            }

            const segments: Record<CustomerSegment, { count: number; totalSpent: number; avgSpend: number; recentActiveCount: number }> = {
                vip: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                loyal: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                frequent: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                high_value: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                new: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                slipping: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                at_risk: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
                churned: { count: 0, totalSpent: 0, avgSpend: 0, recentActiveCount: 0 },
            };

            let totalCustomers = 0;
            let totalLTV = 0;

            snap.docs.forEach(doc => {
                const data = doc.data();
                const spent = data.totalSpent || 0;
                const orders = data.orderCount || 0;
                const avgOV = orders > 0 ? spent / orders : 0;
                const daysSince = data.lastOrderDate
                    ? Math.floor((Date.now() - (data.lastOrderDate?.toDate?.()?.getTime?.() || new Date(data.lastOrderDate).getTime())) / (1000 * 60 * 60 * 24))
                    : undefined;

                const seg = data.segment || calculateSegment({ totalSpent: spent, orderCount: orders, avgOrderValue: avgOV, daysSinceLastOrder: daysSince, lifetimeValue: spent });

                if (segments[seg as CustomerSegment]) {
                    segments[seg as CustomerSegment].count++;
                    segments[seg as CustomerSegment].totalSpent += spent;
                    if (daysSince !== undefined && daysSince < 30) {
                        segments[seg as CustomerSegment].recentActiveCount++;
                    }
                }

                totalCustomers++;
                totalLTV += spent;
            });

            // Calculate averages
            for (const seg of Object.keys(segments) as CustomerSegment[]) {
                if (segments[seg].count > 0) {
                    segments[seg].avgSpend = Math.round(segments[seg].totalSpent / segments[seg].count);
                }
            }

            const avgLTV = totalCustomers > 0 ? Math.round(totalLTV / totalCustomers) : 0;
            const activeSegments = (Object.keys(segments) as CustomerSegment[]).filter(s => segments[s].count > 0);

            // Fetch last campaign date per segment (for Craig to know when each was last contacted)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let lastCampaignBySegment: Record<string, string> = {};
            try {
                const recentCampaignsSnap = await firestore.collection('campaigns')
                    .where('orgId', '==', orgId)
                    .where('status', '==', 'sent')
                    .orderBy('sentAt', 'desc')
                    .limit(20)
                    .get();
                for (const doc of recentCampaignsSnap.docs) {
                    const c = doc.data();
                    const sentDate = c.sentAt?.toDate?.() || new Date(c.sentAt);
                    const segs: string[] = c.audience?.segments || [];
                    for (const seg of segs) {
                        if (!lastCampaignBySegment[seg]) {
                            const daysAgo = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                            lastCampaignBySegment[seg] = daysAgo === 0 ? 'today' : `${daysAgo}d ago`;
                        }
                    }
                }
            } catch {
                // Non-fatal: campaigns index may not exist yet
            }

            const summary = `**Customer Segment Analysis** (${totalCustomers} total, avg LTV: $${avgLTV})

| Segment | Count | % | Avg Spend | Total LTV | Last Campaign |
|---------|-------|---|-----------|-----------|---------------|
${activeSegments.map(seg => {
    const s = segments[seg];
    const info = getSegmentInfo(seg);
    const pct = ((s.count / totalCustomers) * 100).toFixed(1);
    const lastCampaign = lastCampaignBySegment[seg] || 'Never';
    return `| ${info.label} | ${s.count} | ${pct}% | $${s.avgSpend.toLocaleString()} | $${Math.round(s.totalSpent).toLocaleString()} | ${lastCampaign} |`;
}).join('\n')}

**Key Insights:**
- At-risk revenue: $${Math.round(segments.at_risk.totalSpent + segments.slipping.totalSpent).toLocaleString()} across ${segments.at_risk.count + segments.slipping.count} customers
- VIP concentration: ${segments.vip.count} VIPs account for $${Math.round(segments.vip.totalSpent).toLocaleString()} (${totalLTV > 0 ? ((segments.vip.totalSpent / totalLTV) * 100).toFixed(1) : 0}% of total tracked customer LTV); ${segments.vip.recentActiveCount} ordered in the last 30 days
- Dedup window: 30 days (customers contacted in last 30 days for same campaign type are automatically excluded)`;

            return { summary, segments: segments as unknown as Record<string, unknown> };
        },
        CacheTTL.CRM_SEGMENTS
    );
}

/**
 * Count customer profiles with contact data on file.
 */
export async function getCustomerEmailCoverage(
    orgId: string,
): Promise<{ summary: string; metrics: Record<string, unknown> }> {
    logger.info('[crm-tools] getCustomerEmailCoverage', { orgId });
    const firestore = getAdminFirestore();

    const snap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .select('email', 'phone')
        .get();

    if (snap.empty) {
        return {
            summary: `No synced customer profiles found for organization ${orgId}.`,
            metrics: {
                totalCustomers: 0,
                customersWithEmail: 0,
                customersWithoutEmail: 0,
                emailCoveragePct: 0,
                customersWithPhone: 0,
                phoneCoveragePct: 0,
            },
        };
    }

    let customersWithEmail = 0;
    let customersWithPhone = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        const email = typeof data.email === 'string' ? data.email.trim() : '';
        const phone = typeof data.phone === 'string' ? data.phone.trim() : '';

        if (email.length > 0) {
            customersWithEmail++;
        }

        if (phone.length > 0) {
            customersWithPhone++;
        }
    }

    const totalCustomers = snap.size;
    const customersWithoutEmail = totalCustomers - customersWithEmail;
    const emailCoveragePct = Number(((customersWithEmail / totalCustomers) * 100).toFixed(1));
    const phoneCoveragePct = Number(((customersWithPhone / totalCustomers) * 100).toFixed(1));

    const summary = `**Customer Contact Coverage**
- Customers with email: ${customersWithEmail.toLocaleString()} of ${totalCustomers.toLocaleString()} (${emailCoveragePct}%)
- Missing email: ${customersWithoutEmail.toLocaleString()}
- Customers with phone: ${customersWithPhone.toLocaleString()} of ${totalCustomers.toLocaleString()} (${phoneCoveragePct}%)`;

    return {
        summary,
        metrics: {
            totalCustomers,
            customersWithEmail,
            customersWithoutEmail,
            emailCoveragePct,
            customersWithPhone,
            phoneCoveragePct,
        },
    };
}

/**
 * Get the top customers using the canonical CRM ranking logic.
 */
export async function getTopCustomers(
    orgId: string,
    limit: number = 5,
    sortBy: 'totalSpent' | 'orderCount' | 'lifetimeValue' = 'totalSpent',
): Promise<{ summary: string; customers: Record<string, unknown>[] }> {
    logger.info('[crm-tools] getTopCustomers', { orgId, limit, sortBy });

    const result = await getDomainTopCustomers(orgId, { limit, sortBy });
    if (result.customers.length === 0) {
        return {
            summary: `No tracked customers found for organization ${orgId}.`,
            customers: [],
        };
    }

    const rankedCustomers = result.customers.map((customer) => ({
        ...customer,
        lifetimeValue: customer.totalSpent,
    })) as Record<string, unknown>[];

    const summary = `**Top Customers** (${sortBy === 'orderCount' ? 'ranked by order count' : 'ranked by spend'})

${result.customers.map((customer, index) => (
        `${index + 1}. **${customer.displayName || customer.email}** — $${customer.totalSpent.toLocaleString()} LTV, ${customer.orderCount} orders, ${customer.segment}`
    )).join('\n')}

${result.insight}`;

    return {
        summary,
        customers: rankedCustomers,
    };
}

/**
 * Get at-risk and slipping customers sorted by LTV.
 */
export async function getAtRiskCustomers(
    orgId: string,
    limit: number = 20,
    includeSlipping: boolean = true,
): Promise<{ summary: string; customers: Record<string, unknown>[] }> {
    logger.info('[crm-tools] getAtRiskCustomers', { orgId, limit, includeSlipping });
    return withCache(
        CachePrefix.CRM_AT_RISK,
        `${orgId}:${limit}:${includeSlipping}`,
        async () => {
            const firestore = getAdminFirestore();

            const targetSegments = includeSlipping
                ? ['at_risk', 'slipping', 'churned']
                : ['at_risk', 'churned'];

            // Query customers and filter by segment
            const snap = await firestore.collection('customers')
                .where('orgId', '==', orgId)
                .get();

            const atRiskCustomers: Array<{
                id: string;
                name: string;
                email: string;
                segment: string;
                totalSpent: number;
                orderCount: number;
                lastOrderDate: string | null;
                daysSinceLastOrder: number | undefined;
                retentionScore: number | undefined;
                retentionTier: string | undefined;
                scoreTrend: string | undefined;
                churnProbability: number | undefined;
            }> = [];

            snap.docs.forEach(doc => {
                const data = doc.data();
                const spent = data.totalSpent || 0;
                const orders = data.orderCount || 0;
                const avgOV = orders > 0 ? spent / orders : 0;
                const lastDate = data.lastOrderDate?.toDate?.() || (data.lastOrderDate ? new Date(data.lastOrderDate) : null);
                const daysSince = lastDate
                    ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                    : undefined;

                const seg = data.segment || calculateSegment({ totalSpent: spent, orderCount: orders, avgOrderValue: avgOV, daysSinceLastOrder: daysSince, lifetimeValue: spent });

                if (targetSegments.includes(seg)) {
                    atRiskCustomers.push({
                        id: doc.id,
                        name: resolveCustomerDisplayName({
                            displayName: data.displayName,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            email: data.email,
                            fallbackId: doc.id,
                        }),
                        email: data.email || '',
                        segment: seg,
                        totalSpent: spent,
                        orderCount: orders,
                        lastOrderDate: lastDate?.toISOString() || null,
                        daysSinceLastOrder: daysSince,
                        retentionScore: data.retentionScore,
                        retentionTier: data.retentionTier,
                        scoreTrend: data.scoreTrend,
                        churnProbability: data.churnProbability,
                    });
                }
            });

            // Sort by LTV descending (highest value at risk first)
            atRiskCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
            const limited = atRiskCustomers.slice(0, limit);

            if (limited.length === 0) {
                return { summary: `No at-risk customers found for ${orgId}. All customers are active!`, customers: [] };
            }

            const totalAtRiskLTV = atRiskCustomers.reduce((sum, c) => sum + c.totalSpent, 0);

            const summary = `**At-Risk Customers** (${atRiskCustomers.length} total, $${Math.round(totalAtRiskLTV).toLocaleString()} LTV at risk)

Top ${limited.length} by lifetime value:

${limited.map((c, i) => {
    const segInfo = getSegmentInfo(c.segment as CustomerSegment);
    const retScore = c.retentionScore !== undefined ? ` | Score: ${c.retentionScore}/100 (${c.retentionTier ?? '?'})` : '';
    const trend = c.scoreTrend && c.scoreTrend !== 'stable' ? ` ${c.scoreTrend === 'falling' ? '↓' : '↑'}` : '';
    return `${i + 1}. **${c.name}** (${segInfo.label}) - $${c.totalSpent.toLocaleString()} LTV, ${c.orderCount} orders${c.daysSinceLastOrder ? `, ${c.daysSinceLastOrder}d inactive` : ''}${retScore}${trend}`;
}).join('\n')}

**Recommended actions:** Target the top customers with personalized win-back offers. Higher-LTV customers should get premium incentives.`;

            return { summary, customers: limited as unknown as Record<string, unknown>[] };
        },
        CacheTTL.CRM_AT_RISK
    );
}

/**
 * Find customers with upcoming birthdays.
 */
export async function getUpcomingBirthdays(
    orgId: string,
    daysAhead: number = 7,
): Promise<{ summary: string; customers: Record<string, unknown>[] }> {
    logger.info('[crm-tools] getUpcomingBirthdays', { orgId, daysAhead });
    const firestore = getAdminFirestore();

    const snap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    const now = new Date();
    const birthdays: Array<{
        id: string;
        name: string;
        email: string;
        birthday: string;
        daysAway: number;
        segment: string;
        totalSpent: number;
    }> = [];

    snap.docs.forEach(doc => {
        const data = doc.data();
        const birthDate = data.birthDate || data.date_of_birth;
        if (!birthDate) return;

        try {
            const bday = new Date(birthDate);
            const bdayMonth = bday.getMonth();
            const bdayDay = bday.getDate();

            const thisYearBday = new Date(now.getFullYear(), bdayMonth, bdayDay);
            if (thisYearBday < now) {
                thisYearBday.setFullYear(now.getFullYear() + 1);
            }
            const daysAway = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysAway <= daysAhead) {
                birthdays.push({
                    id: doc.id,
                    name: resolveCustomerDisplayName({
                        displayName: data.displayName,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        email: data.email,
                        fallbackId: doc.id,
                    }),
                    email: data.email || '',
                    birthday: `${bdayMonth + 1}/${bdayDay}`,
                    daysAway,
                    segment: data.segment || 'new',
                    totalSpent: data.totalSpent || 0,
                });
            }
        } catch { /* skip invalid dates */ }
    });

    birthdays.sort((a, b) => a.daysAway - b.daysAway);

    if (birthdays.length === 0) {
        return { summary: `No customer birthdays found in the next ${daysAhead} days.`, customers: [] };
    }

    const summary = `**Upcoming Birthdays** (${birthdays.length} in next ${daysAhead} days)

${birthdays.map((b, i) => {
    const segInfo = getSegmentInfo(b.segment as CustomerSegment);
    const timing = b.daysAway === 0 ? 'TODAY!' : b.daysAway === 1 ? 'Tomorrow' : `in ${b.daysAway} days`;
    return `${i + 1}. **${b.name}** - ${b.birthday} (${timing}) | ${segInfo.label} | $${b.totalSpent.toLocaleString()} LTV`;
}).join('\n')}

**Recommended:** Send personalized birthday messages with a special discount or loyalty bonus points.`;

    return { summary, customers: birthdays as unknown as Record<string, unknown>[] };
}

/**
 * Get communication history for a customer.
 */
export async function getCustomerComms(
    customerEmail: string,
    orgId: string,
    limit: number = 20,
    channel?: 'email' | 'sms' | 'push',
): Promise<{ summary: string; communications: Record<string, unknown>[] }> {
    logger.info('[crm-tools] getCustomerComms', { customerEmail, orgId, limit, channel });
    const firestore = getAdminFirestore();

    let query: FirebaseFirestore.Query = firestore.collection('customer_communications')
        .where('customerEmail', '==', customerEmail.toLowerCase())
        .where('orgId', '==', orgId)
        .orderBy('createdAt', 'desc');

    if (channel) {
        query = query.where('channel', '==', channel);
    }

    query = query.limit(limit);

    const snap = await query.get();

    if (snap.empty) {
        return {
            summary: `No communications found for ${customerEmail}${channel ? ` on ${channel} channel` : ''}.`,
            communications: [],
        };
    }

    const comms = snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            channel: data.channel,
            type: data.type,
            subject: data.subject,
            preview: data.preview,
            status: data.status,
            sentAt: data.sentAt?.toDate?.()?.toISOString?.() || null,
            openedAt: data.openedAt?.toDate?.()?.toISOString?.() || null,
            clickedAt: data.clickedAt?.toDate?.()?.toISOString?.() || null,
            agentName: data.agentName,
            campaignId: data.campaignId,
        };
    });

    const totalSent = comms.length;
    const opened = comms.filter(c => c.openedAt).length;
    const clicked = comms.filter(c => c.clickedAt).length;
    const openRate = totalSent > 0 ? ((opened / totalSent) * 100).toFixed(1) : '0';
    const clickRate = totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(1) : '0';

    const summary = `**Communication History for ${customerEmail}** (${totalSent} messages)
Open rate: ${openRate}% | Click rate: ${clickRate}%

${comms.slice(0, 10).map((c, i) => {
    const date = c.sentAt ? new Date(c.sentAt).toLocaleDateString() : 'Unknown';
    const statusIcon = c.clickedAt ? 'clicked' : c.openedAt ? 'opened' : c.status;
    return `${i + 1}. [${c.channel}] ${date} - "${c.subject || c.type}" (${statusIcon})${c.agentName ? ` via ${c.agentName}` : ''}`;
}).join('\n')}`;

    return { summary, communications: comms as unknown as Record<string, unknown>[] };
}

/**
 * Count check-ins for an org since the start of today (midnight local time).
 */
export async function getTodayCheckins(orgId: string): Promise<number> {
    const db = getAdminFirestore();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const snap = await db.collection('checkin_visits')
        .where('orgId', '==', orgId)
        .where('visitedAt', '>=', todayStart)
        .count()
        .get();
    return snap.data().count;
}
