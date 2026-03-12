'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { analyzeCustomerPreferences } from '@/lib/analytics/customer-preferences';
import {
    buildAutoCustomerTags,
    mergeCustomerTags,
    resolveCustomerDisplayName,
} from '@/lib/customers/profile-derivations';
import {
    buildLifecyclePlaybookStatuses,
    type CustomerLifecyclePlaybookStatus,
} from '@/lib/customers/lifecycle-playbooks';
import { ALLeavesClient, type ALLeavesConfig, type ALLeavesOrder } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { getCustomerCommunications, getUpcomingCommunications } from '@/server/actions/customer-communications';
import { getDispensaryPlaybookAssignments } from '@/server/actions/dispensary-playbooks';
import { CustomerProfile, calculateSegment, type CustomerSegment } from '@/types/customers';
import type { CustomerCommunication, ScheduledCommunication } from '@/types/customer-communications';
import { isBrandRole, isDispensaryRole } from '@/types/roles';
import { mapSegmentToTier } from '@/lib/pricing/customer-tier-mapper';
import type { DynamicPricingRule, CustomerTier } from '@/types/dynamic-pricing';
import { getCustomers } from '../actions';

export interface CustomerSpendingData {
    totalSpent: number;
    orderCount: number;
    avgOrderValue: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
}

export interface CustomerDetailData {
    customer: CustomerProfile | null;
    spending: CustomerSpendingData | null;
    orgName: string;
    communications: CustomerCommunication[];
    upcoming: ScheduledCommunication[];
    playbooks: CustomerLifecyclePlaybookStatus[];
}

export interface CustomerOrder {
    id: string;
    orderNumber?: string;
    createdAt: Date;
    items: Array<{
        name: string;
        quantity?: number;
        price?: number;
        total?: number;
        category?: string;
        productId?: string;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: string;
    paymentMethod: string;
}

export interface CustomerOrderData {
    orders: CustomerOrder[];
    preferences: {
        categories: string[];
        products: string[];
        strains: string[];
        brands: string[];
    };
    autoTags: string[];
    source: 'customer_endpoint' | 'all_orders_cache' | 'all_orders_live' | 'no_client';
}

export interface ApplicablePricingRule {
    id: string;
    name: string;
    description?: string;
    adjustmentType: string;
    adjustmentValue: number;
    customerTiers: CustomerTier[];
    isActive: boolean;
}

type CustomerBaseDetail = {
    customer: CustomerProfile | null;
    spending: CustomerSpendingData | null;
};

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function isAlleavesPlaceholderEmail(email: string): boolean {
    const atIndex = email.lastIndexOf('@');
    if (atIndex <= 0) return false;
    return email.slice(atIndex + 1) === 'alleaves.local';
}

function deriveTier(totalSpent: number): CustomerProfile['tier'] {
    if (totalSpent > 2000) return 'gold';
    if (totalSpent > 500) return 'silver';
    return 'bronze';
}

function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
}

function toIsoDate(value: Date | undefined): string | null {
    return value ? value.toISOString() : null;
}

function buildSpendingFromCache(
    cache: Record<string, CustomerSpendingData> | null | undefined,
    customerId: string,
): CustomerSpendingData | null {
    return cache?.[customerId] ?? null;
}

function decorateCustomerProfile(customer: CustomerProfile): CustomerProfile {
    const displayName = resolveCustomerDisplayName({
        displayName: customer.displayName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        fallbackId: customer.id,
    });

    const autoTags = buildAutoCustomerTags({
        segment: customer.segment,
        tier: customer.tier,
        priceRange: customer.priceRange,
        orderCount: customer.orderCount,
        totalSpent: customer.totalSpent,
        daysSinceLastOrder: customer.daysSinceLastOrder,
        preferredCategories: customer.preferredCategories,
        preferredProducts: customer.preferredProducts,
    });

    return {
        ...customer,
        displayName,
        autoTags,
        allTags: mergeCustomerTags(customer.customTags, autoTags),
    };
}

function mergeSpending(customer: CustomerProfile, spending: CustomerSpendingData | null): CustomerProfile {
    if (!spending) {
        return decorateCustomerProfile(customer);
    }

    const totalSpent = spending.totalSpent;
    const orderCount = spending.orderCount;
    const lastOrderDate = toDate(spending.lastOrderDate);
    const firstOrderDate = toDate(spending.firstOrderDate) ?? customer.firstOrderDate;
    const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : customer.daysSinceLastOrder;

    return decorateCustomerProfile({
        ...customer,
        totalSpent,
        orderCount,
        avgOrderValue: spending.avgOrderValue,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
        lifetimeValue: totalSpent,
        points: customer.points || Math.floor(totalSpent),
        segment: calculateSegment({
            ...customer,
            totalSpent,
            orderCount,
            avgOrderValue: spending.avgOrderValue,
            lastOrderDate,
            firstOrderDate,
            lifetimeValue: totalSpent,
            daysSinceLastOrder,
        }),
        tier: deriveTier(totalSpent),
    });
}

async function resolveOrgId(): Promise<string> {
    const user = await requireUser([
        'brand', 'brand_admin', 'brand_member',
        'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
        'super_user',
    ]);

    const userRole = String((user as { role?: string }).role || '');
    let orgId: string | undefined;

    if (isBrandRole(userRole)) {
        orgId = (user as { brandId?: string }).brandId;
    }
    if (isDispensaryRole(userRole)) {
        const dispensaryUser = user as { orgId?: string; currentOrgId?: string; locationId?: string };
        orgId = dispensaryUser.orgId || dispensaryUser.currentOrgId || dispensaryUser.locationId;
    }

    return orgId || user.uid;
}

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

function buildCustomerFromCrmDoc(
    customerId: string,
    orgId: string,
    data: FirebaseFirestore.DocumentData,
): CustomerProfile {
    const totalSpent = data.totalSpent || data.lifetimeValue || 0;
    const orderCount = data.orderCount || 0;
    const lastOrderDate = toDate(data.lastOrderDate);
    const firstOrderDate = toDate(data.firstOrderDate);
    const avgOrderValue = data.avgOrderValue || (orderCount > 0 ? totalSpent / orderCount : 0);
    const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

    return decorateCustomerProfile({
        id: customerId,
        orgId,
        email: data.email || `${customerId}@unknown.local`,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: resolveCustomerDisplayName({
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            fallbackId: customerId,
        }),
        phone: data.phone,
        totalSpent,
        orderCount,
        avgOrderValue,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
        preferredCategories: Array.isArray(data.preferredCategories) ? data.preferredCategories : [],
        preferredProducts: Array.isArray(data.preferredProducts) ? data.preferredProducts : [],
        priceRange: data.priceRange || 'mid',
        segment: data.segment || calculateSegment({ totalSpent, orderCount, avgOrderValue, daysSinceLastOrder, lifetimeValue: totalSpent }),
        tier: data.tier || deriveTier(totalSpent),
        points: data.points || Math.floor(totalSpent),
        lifetimeValue: data.lifetimeValue || totalSpent,
        customTags: Array.isArray(data.customTags) ? data.customTags : [],
        birthDate: data.birthDate,
        preferences: data.preferences,
        notes: data.notes,
        source: data.source || 'manual',
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
    });
}

function buildCustomerFromAlleavesRecord(
    customerId: string,
    orgId: string,
    alleavesCustomer: Record<string, unknown>,
    spending: CustomerSpendingData | null,
): CustomerProfile {
    const firstName = typeof alleavesCustomer.name_first === 'string' ? alleavesCustomer.name_first : '';
    const lastName = typeof alleavesCustomer.name_last === 'string' ? alleavesCustomer.name_last : '';
    const lastOrderDate = toDate(spending?.lastOrderDate);
    const firstOrderDate = toDate(spending?.firstOrderDate)
        || toDate(alleavesCustomer.date_created);
    const totalSpent = spending?.totalSpent ?? 0;
    const orderCount = spending?.orderCount ?? 0;
    const avgOrderValue = spending?.avgOrderValue ?? (orderCount > 0 ? totalSpent / orderCount : 0);
    const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
    const email = normalizeEmail(alleavesCustomer.email) || `customer_${customerId.replace('alleaves_', '')}@alleaves.local`;

    return decorateCustomerProfile({
        id: customerId,
        orgId,
        email,
        phone: typeof alleavesCustomer.phone === 'string' ? alleavesCustomer.phone : '',
        firstName,
        lastName,
        displayName: resolveCustomerDisplayName({
            displayName: typeof alleavesCustomer.customer_name === 'string' ? alleavesCustomer.customer_name : null,
            firstName,
            lastName,
            email,
            fallbackId: customerId,
        }),
        totalSpent,
        orderCount,
        avgOrderValue,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
        preferredCategories: [],
        preferredProducts: [],
        priceRange: 'mid',
        segment: calculateSegment({ totalSpent, orderCount, avgOrderValue, daysSinceLastOrder, lifetimeValue: totalSpent, firstOrderDate }),
        tier: deriveTier(totalSpent),
        points: Number(alleavesCustomer.loyalty_points || 0),
        lifetimeValue: totalSpent,
        customTags: [],
        birthDate: typeof alleavesCustomer.date_of_birth === 'string' ? alleavesCustomer.date_of_birth : undefined,
        source: 'pos_dutchie',
        createdAt: firstOrderDate || new Date(),
        updatedAt: new Date(),
    });
}

async function loadCustomerBaseDetail(
    customerId: string,
    orgId: string,
    firestore: FirebaseFirestore.Firestore,
): Promise<CustomerBaseDetail> {
    const spendingCacheKey = `spending:${orgId}`;
    const cachedSpending = posCache.get<Record<string, CustomerSpendingData>>(spendingCacheKey);
    const spending = buildSpendingFromCache(cachedSpending, customerId);

    const crmDoc = await firestore.collection('customers').doc(customerId).get();
    if (crmDoc.exists && crmDoc.data()?.orgId === orgId) {
        return {
            customer: mergeSpending(buildCustomerFromCrmDoc(crmDoc.id, orgId, crmDoc.data()!), spending),
            spending,
        };
    }

    if (customerId.startsWith('alleaves_')) {
        const customersCacheKey = cacheKeys.customers(orgId);
        const cachedCustomers = posCache.get<CustomerProfile[]>(customersCacheKey);
        const cachedCustomer = cachedCustomers?.find((candidate) => candidate.id === customerId) ?? null;
        if (cachedCustomer) {
            return { customer: mergeSpending(decorateCustomerProfile(cachedCustomer), spending), spending };
        }

        const client = await initAlleavesClient(orgId, firestore);
        if (client) {
            const numericId = customerId.replace('alleaves_', '');
            const allCustomers = await client.getAllCustomersPaginated(30);
            const alleavesCustomer = allCustomers.find((candidate: Record<string, unknown>) => String(candidate.id_customer || candidate.id) === numericId) ?? null;
            if (alleavesCustomer) {
                return {
                    customer: buildCustomerFromAlleavesRecord(customerId, orgId, alleavesCustomer, spending),
                    spending,
                };
            }
        }
    }

    const allCustomers = await getCustomers({ orgId });
    const fallback = allCustomers.customers.find((candidate) => candidate.id === customerId || candidate.email === customerId) ?? null;
    if (fallback) {
        return {
            customer: mergeSpending({
                ...fallback,
                lastOrderDate: toDate(fallback.lastOrderDate),
                firstOrderDate: toDate(fallback.firstOrderDate),
                createdAt: toDate(fallback.createdAt) || new Date(),
                updatedAt: toDate(fallback.updatedAt) || new Date(),
            }, spending),
            spending,
        };
    }

    return { customer: null, spending };
}

function mapAlleavesOrder(order: ALLeavesOrder): CustomerOrder {
    return {
        id: order.id,
        orderNumber: order.external_id || order.id,
        createdAt: new Date(order.created_at),
        items: order.items.map((item) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total,
            productId: item.product_id,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        status: order.status,
        paymentMethod: order.payment_method,
    };
}

function mapCachedOrder(order: Record<string, unknown>): CustomerOrder {
    const createdAt = toDate(order.date_created) || toDate(order.created_at) || new Date();
    const items = Array.isArray(order.items) ? order.items : [];

    return {
        id: String(order.id || order.id_order || order.order_number || ''),
        orderNumber: typeof order.order_number === 'string'
            ? order.order_number
            : String(order.id_order || order.id || ''),
        createdAt,
        items: items.map((item) => {
            const typedItem = item as Record<string, unknown>;
            return {
                name: String(typedItem.product_name || typedItem.item || typedItem.name || 'Unknown Product'),
                quantity: Number(typedItem.quantity || 1),
                price: Number(typedItem.unit_price || typedItem.price || 0),
                total: Number(typedItem.total || (Number(typedItem.quantity || 1) * Number(typedItem.unit_price || typedItem.price || 0))),
                category: typeof typedItem.category === 'string' ? typedItem.category : undefined,
                productId: typeof typedItem.product_id === 'string'
                    ? typedItem.product_id
                    : typeof typedItem.productId === 'string'
                        ? typedItem.productId
                        : undefined,
            };
        }),
        subtotal: Number(order.subtotal || order.total || 0),
        tax: Number(order.tax || 0),
        discount: Number(order.discount || 0),
        total: Number(order.total || 0),
        status: typeof order.status === 'string' ? order.status : 'completed',
        paymentMethod: typeof order.payment_method === 'string' ? order.payment_method : 'unknown',
    };
}

function buildOrderData(
    orders: CustomerOrder[],
    source: CustomerOrderData['source'],
    customer: CustomerProfile | null,
): CustomerOrderData {
    const analyticsOrders = orders.map((order) => ({
        items: order.items.map((item) => ({
            productId: item.productId || item.name,
            name: item.name,
            category: item.category,
            price: item.price || 0,
            qty: item.quantity || 1,
        })),
        totals: { total: order.total },
        createdAt: order.createdAt,
    }));

    const analyzed = analyzeCustomerPreferences(analyticsOrders, customer?.email);
    const categories = analyzed.preferredCategories.filter((category) => category.toLowerCase() !== 'other');
    const products = analyzed.preferredProducts;
    const autoTags = buildAutoCustomerTags({
        segment: customer?.segment,
        tier: customer?.tier,
        priceRange: analyzed.priceRange || customer?.priceRange,
        orderCount: customer?.orderCount ?? orders.length,
        totalSpent: customer?.totalSpent ?? orders.reduce((sum, order) => sum + order.total, 0),
        daysSinceLastOrder: customer?.daysSinceLastOrder,
        preferredCategories: categories,
        preferredProducts: products,
    });

    return {
        orders,
        preferences: {
            categories,
            products,
            strains: [],
            brands: [],
        },
        autoTags,
        source,
    };
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetailData> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    logger.info('[CUSTOMER_DETAIL] Fetching customer', { customerId, orgId });

    const baseDetail = await loadCustomerBaseDetail(customerId, orgId, firestore);
    if (!baseDetail.customer) {
        logger.warn('[CUSTOMER_DETAIL] Customer not found', { customerId, orgId });
        return {
            customer: null,
            spending: baseDetail.spending,
            orgName: orgId,
            communications: [],
            upcoming: [],
            playbooks: [],
        };
    }

    const orgSnap = await firestore.collection('organizations').doc(orgId).get();
    const orgName = typeof orgSnap.data()?.name === 'string' && orgSnap.data()?.name.trim()
        ? orgSnap.data()!.name.trim()
        : orgId;

    const assignmentsPromise = getDispensaryPlaybookAssignments(orgId).catch((error) => {
        logger.warn('[CUSTOMER_DETAIL] Failed to load playbook assignments', {
            customerId,
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            assignments: [],
            activeIds: [],
        };
    });

    const [communications, upcoming, playbooksSnap, assignments] = await Promise.all([
        baseDetail.customer.email
            ? getCustomerCommunications(baseDetail.customer.email, orgId, { limit: 10 })
            : Promise.resolve([]),
        baseDetail.customer.email
            ? getUpcomingCommunications(baseDetail.customer.email, orgId)
            : Promise.resolve([]),
        firestore.collection('playbooks').where('orgId', '==', orgId).limit(25).get(),
        assignmentsPromise,
    ]);

    const playbooks = buildLifecyclePlaybookStatuses({
        customer: { segment: baseDetail.customer.segment },
        playbooks: playbooksSnap.docs
            .map((doc) => ({ id: doc.id, templateId: doc.data().templateId }))
            .filter((playbook) => typeof playbook.templateId === 'string'),
        assignments: assignments.assignments.map((assignment) => ({
            playbookId: assignment.playbookId,
            status: assignment.status,
            isActive: assignment.status === 'active',
        })),
        communications: communications
            .map((communication) => ({
                sentAt: communication.sentAt || communication.createdAt,
                channel: communication.channel,
                subject: communication.subject,
                playbookId: communication.playbookId,
                metadata: communication.metadata ?? null,
                type: communication.type,
            }))
            .filter((communication) => communication.sentAt instanceof Date),
        upcoming,
    });

    return {
        customer: baseDetail.customer,
        spending: baseDetail.spending,
        orgName,
        communications,
        upcoming,
        playbooks,
    };
}

export async function getCustomerOrders(customerId: string): Promise<CustomerOrderData> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    logger.info('[CUSTOMER_ORDERS] Fetching orders', { customerId, orgId });

    const numericId = customerId.startsWith('alleaves_') ? customerId.replace('alleaves_', '') : customerId;
    const cacheKey = `customerOrders:${orgId}:${numericId}`;
    const cached = posCache.get<CustomerOrderData>(cacheKey);
    if (cached) {
        return cached;
    }

    const client = await initAlleavesClient(orgId, firestore);
    const baseDetail = await loadCustomerBaseDetail(customerId, orgId, firestore);

    if (!client) {
        const noClientData = buildOrderData([], 'no_client', baseDetail.customer);
        posCache.set(cacheKey, noClientData, 5 * 60 * 1000);
        return noClientData;
    }

    try {
        const customerOrders = await client.getCustomerOrders(numericId);
        if (customerOrders.length > 0) {
            const result = buildOrderData(
                customerOrders.map(mapAlleavesOrder).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
                'customer_endpoint',
                baseDetail.customer,
            );
            posCache.set(cacheKey, result, 5 * 60 * 1000);
            return result;
        }
    } catch (error) {
        logger.warn('[CUSTOMER_ORDERS] Per-customer endpoint failed, falling back to all orders', {
            customerId,
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    try {
        const ordersCacheKey = cacheKeys.orders(orgId);
        let allOrders = posCache.get<Record<string, unknown>[]>(ordersCacheKey);
        let source: CustomerOrderData['source'] = 'all_orders_cache';

        if (!allOrders) {
            allOrders = await client.getAllOrders(5000) as unknown as Record<string, unknown>[];
            posCache.set(ordersCacheKey, allOrders, 5 * 60 * 1000);
            source = 'all_orders_live';
        }

        const customerOrders = allOrders
            .filter((order) => String(order.id_customer || order.userId || '') === numericId)
            .map(mapCachedOrder)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

        const result = buildOrderData(customerOrders, source, baseDetail.customer);
        posCache.set(cacheKey, result, 5 * 60 * 1000);
        return result;
    } catch (error) {
        logger.error('[CUSTOMER_ORDERS] Failed to fetch orders', {
            customerId,
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return buildOrderData([], 'all_orders_live', baseDetail.customer);
    }
}

export async function updateCustomerNotes(customerId: string, notes: string): Promise<void> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    const existing = await firestore.collection('customers').doc(customerId).get();
    if (existing.exists && existing.data()?.orgId === orgId) {
        await firestore.collection('customers').doc(customerId).update({
            notes,
            updatedAt: new Date(),
        });
        return;
    }

    await firestore.collection('customers').doc(customerId).set({
        orgId,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
    }, { merge: true });
}

export async function updateCustomerTags(customerId: string, tags: string[]): Promise<void> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    await firestore.collection('customers').doc(customerId).set({
        orgId,
        customTags: tags,
        updatedAt: new Date(),
    }, { merge: true });
}

export async function getCustomerPricingRules(
    customerSegment: CustomerSegment,
    customerTotalSpent: number,
): Promise<{ pricingTier: CustomerTier; rules: ApplicablePricingRule[] }> {
    const orgId = await resolveOrgId();
    const { firestore } = await createServerClient();

    const pricingTier = mapSegmentToTier(customerSegment, customerTotalSpent);

    try {
        const rulesSnap = await firestore.collection('pricing_rules')
            .where('orgId', '==', orgId)
            .where('active', '==', true)
            .get();

        const rules: ApplicablePricingRule[] = [];

        rulesSnap.forEach(doc => {
            const data = doc.data() as DynamicPricingRule;
            const tierCondition = data.conditions?.customerTier;

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
            error: error instanceof Error ? error.message : String(error),
            orgId,
        });
        return { pricingTier, rules: [] };
    }
}
