'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { posCache, cacheKeys } from '@/lib/cache/pos-cache';
import { inferPreferencesFromAlleaves } from '@/lib/analytics/customer-preferences';
import {
    buildAutoCustomerTags,
    extractAlleavesCustomerIdentity,
    mergeCustomerTags,
    resolveCustomerDisplayName,
} from '@/lib/customers/profile-derivations';
import { LIFECYCLE_PLAYBOOKS, type LifecyclePlaybookKind } from '@/lib/customers/lifecycle-playbooks';
import {
    getDispensaryPlaybookAssignments,
    updatePlaybookAssignmentConfig,
} from '@/server/actions/dispensary-playbooks';
import {
    createVIPPlaybook,
    createWelcomeEmailPlaybook,
    createWinbackEmailPlaybook,
} from '@/server/actions/pilot-setup';
import type { PilotEmailConfig } from '@/server/actions/action-types';
import { syncCustomerSignupProactiveGap } from '@/server/services/customer-signup-proactive';
import {
    CustomerProfile,
    CustomerSegment,
    CRMStats,
    calculateSegment,
    SegmentSuggestion,
} from '@/types/customers';
import { isBrandRole, isDispensaryRole } from '@/types/roles';

// ==========================================
// Types
// ==========================================

export interface CustomersData {
    customers: CustomerProfile[];
    stats: CRMStats;
}

export interface GetCustomersParams {
    orgId?: string;
    brandId?: string;
    locationId?: string;
    segment?: CustomerSegment;
    search?: string;
    sortBy?: 'displayName' | 'totalSpent' | 'lastOrderDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function coerceNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

function coerceDate(value: unknown): Date | undefined {
    if (!value) {
        return undefined;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        const coerced = (value as { toDate: () => unknown }).toDate();
        return coerced instanceof Date && !Number.isNaN(coerced.getTime()) ? coerced : undefined;
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const coerced = new Date(value);
        return Number.isNaN(coerced.getTime()) ? undefined : coerced;
    }

    return undefined;
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

async function resolveAccessibleOrgContext(requestedOrgId?: string): Promise<{ orgId: string; brandId: string; userRole: string }> {
    const user = await requireUser([
        'brand', 'brand_admin', 'brand_member',
        'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
        'super_user',
    ]);

    const userRole = String((user as { role?: string }).role || '');
    let orgId = requestedOrgId;

    if (!orgId && isBrandRole(userRole)) {
        orgId = (user as { brandId?: string }).brandId;
    }

    if (!orgId && isDispensaryRole(userRole)) {
        const dispensaryUser = user as { orgId?: string; currentOrgId?: string; locationId?: string };
        orgId = dispensaryUser.orgId || dispensaryUser.currentOrgId || dispensaryUser.locationId;
    }

    if (!orgId) {
        orgId = user.uid;
    }

    if (isBrandRole(userRole) && (user as { brandId?: string }).brandId && (user as { brandId?: string }).brandId !== orgId) {
        throw new Error('Forbidden: Cannot access another brand\'s customers');
    }

    if (isDispensaryRole(userRole)) {
        const dispensaryUser = user as { orgId?: string; currentOrgId?: string; locationId?: string };
        const userOrgId = dispensaryUser.orgId || dispensaryUser.currentOrgId || dispensaryUser.locationId;
        if (userOrgId && userOrgId !== orgId) {
            throw new Error('Forbidden: Cannot access another dispensary\'s customers');
        }
    }

    return { orgId, brandId: orgId, userRole };
}

async function getLifecycleStatusHints(
    orgId: string,
    firestore: FirebaseFirestore.Firestore,
): Promise<Record<LifecyclePlaybookKind, 'missing' | 'paused' | 'active'>> {
    const hints: Record<LifecyclePlaybookKind, 'missing' | 'paused' | 'active'> = {
        welcome: 'missing',
        winback: 'missing',
        vip: 'missing',
    };

    const playbooksSnap = await firestore.collection('playbooks')
        .where('orgId', '==', orgId)
        .limit(25)
        .get();

    const playbooks = playbooksSnap.docs.map((doc) => ({
        id: doc.id,
        templateId: typeof doc.data().templateId === 'string' ? doc.data().templateId : null,
    }));

    let activeIds = new Set<string>();
    try {
        const assignments = await getDispensaryPlaybookAssignments(orgId);
        activeIds = new Set(assignments.activeIds);
    } catch (error) {
        logger.warn('[CUSTOMERS] Unable to load playbook assignments for suggestion hints', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
    }

    for (const definition of LIFECYCLE_PLAYBOOKS) {
        const playbook = playbooks.find((candidate) => candidate.templateId === definition.templateId);
        if (!playbook) {
            hints[definition.kind] = 'missing';
            continue;
        }

        hints[definition.kind] = activeIds.has(playbook.id) ? 'active' : 'paused';
    }

    return hints;
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
        const cached = await posCache.get<CustomerProfile[]>(cacheKey);

        if (cached) {
            logger.info('[CUSTOMERS] Using cached Alleaves customers', {
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
        });

        // Load spending data — two-tier strategy:
        //   Tier 1 (fast): Read from tenants/{orgId}/customer_spending pre-computed index
        //                  Written by pos-sync cron every 30 min → instant reads.
        //   Tier 2 (fallback): Live orders query with 8s timeout + field projection
        //                       Used when index is empty (first sync not yet run).
        const customerSpending = new Map<string, { totalSpent: number; orderCount: number; lastOrderDate: Date; firstOrderDate: Date }>();

        try {
            // Tier 1: pre-computed spending index
            const spendingSnap = await firestore
                .collection('tenants').doc(orgId)
                .collection('customer_spending')
                .limit(5000)
                .get();

            if (!spendingSnap.empty) {
                spendingSnap.forEach((doc: any) => {
                    const email = doc.id; // doc ID is the email
                    const s = doc.data();
                    customerSpending.set(email, {
                        totalSpent: s.totalSpent || 0,
                        orderCount: s.orderCount || 0,
                        lastOrderDate: s.lastOrderDate?.toDate?.() || new Date(0),
                        firstOrderDate: s.firstOrderDate?.toDate?.() || new Date(),
                    });
                });

                logger.info('[CUSTOMERS] Spending data loaded from pre-computed index', {
                    orgId,
                    customersWithSpending: customerSpending.size,
                });
            } else {
                // Tier 2: live orders query (fallback when index not yet populated)
                logger.info('[CUSTOMERS] Spending index empty — falling back to live orders query', { orgId });

                const ordersQuery = (firestore.collection('orders') as FirebaseFirestore.Query)
                    .where('brandId', '==', orgId)
                    .select('customer.email', 'totals.total', 'createdAt');

                const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 8_000));
                const result = await Promise.race([ordersQuery.get(), timeoutPromise]);

                if (result === null) {
                    logger.warn('[CUSTOMERS] Live orders query timed out after 8s — segments will use recency only', { orgId });
                } else {
                    result.forEach((doc: any) => {
                        const order = doc.data();
                        const email = normalizeEmail(order.customer?.email);
                        if (!email || isAlleavesPlaceholderEmail(email)) return;

                        if (!customerSpending.has(email)) {
                            customerSpending.set(email, {
                                totalSpent: 0,
                                orderCount: 0,
                                lastOrderDate: new Date(0),
                                firstOrderDate: new Date()
                            });
                        }

                        const spending = customerSpending.get(email)!;
                        spending.orderCount++;
                        spending.totalSpent += (order.totals?.total || 0);

                        const orderDate = order.createdAt?.toDate?.() || new Date();
                        if (orderDate > spending.lastOrderDate) spending.lastOrderDate = orderDate;
                        if (orderDate < spending.firstOrderDate) spending.firstOrderDate = orderDate;
                    });

                    logger.info('[CUSTOMERS] Spending data loaded from live orders query', {
                        orgId,
                        ordersFound: result.size,
                        customersWithSpending: customerSpending.size,
                    });
                }
            }
        } catch (spendingError: any) {
            logger.warn('[CUSTOMERS] Failed to load spending data, continuing without it', {
                orgId,
                error: spendingError.message,
            });
            // Continue without spending data — customers fall back to 'new' segment
        }

        // Transform Alleaves customers to CustomerProfile format
        const customers = alleavesCustomers.map((ac: any, index: number) => {
            const identity = extractAlleavesCustomerIdentity(ac);
            const alleavesCustId = (ac.id_customer || ac.id)?.toString();
            const email = normalizeEmail(identity.email) || `customer_${ac.id_customer || ac.id}@alleaves.local`;
            const firstName = identity.firstName || '';
            const lastName = identity.lastName || '';
            const displayName = resolveCustomerDisplayName({
                displayName: identity.displayName,
                firstName,
                lastName,
                email,
                fallbackId: alleavesCustId ? `alleaves_${alleavesCustId}` : email,
            });

            // Get spending data — try email first, then 'cid_{id_customer}' fallback.
            // The spending index uses 'cid_X' keys for in-store orders with no email
            // (matches the key written by computeAndPersistSpending in pos-sync-service.ts).
            const spending = customerSpending.get(email)
                ?? (alleavesCustId ? customerSpending.get(`cid_${alleavesCustId}`) : undefined);
            const totalSpent = spending?.totalSpent || 0;
            const orderCount = spending?.orderCount || 0;
            const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

            const lastOrderDate = spending?.lastOrderDate;
            const firstOrderDate = spending?.firstOrderDate || (ac.date_created ? new Date(ac.date_created) : undefined);

            // Infer preferences from Alleaves data
            const preferences = inferPreferencesFromAlleaves(ac);

            // Generate truly unique ID: Use Alleaves ID if available, otherwise create unique ID
            const uniqueCustomerId = alleavesCustId ? `alleaves_${alleavesCustId}` : `${orgId}_${email}_${index}`;

            const profile: CustomerProfile = {
                id: uniqueCustomerId,
                orgId,
                email,
                phone: identity.phone || '',
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
                points: identity.loyaltyPoints ?? parseInt(ac.loyalty_points || 0),
                lifetimeValue: totalSpent,
                customTags: [],
                birthDate: identity.birthDate || undefined,
                source: 'pos_dutchie', // Alleaves integration treated as POS source
                createdAt: firstOrderDate || new Date(),
                updatedAt: new Date(),
            };

            return profile;
        });

        // Cache the result (5 minute TTL)
        await posCache.set(cacheKey, customers, 300);

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
 *
 * @param params - Optional parameters for filtering and pagination
 * @param params.orgId - Organization ID (for dispensaries)
 * @param params.brandId - Brand ID (for brands) - backward compatibility
 * @param params.limit - Max customers to return
 */
export async function getCustomers(params: GetCustomersParams | string = {}): Promise<CustomersData> {
    const user = await requireUser(['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

    // Handle legacy brandId string parameter for backward compatibility
    const options: GetCustomersParams = typeof params === 'string'
        ? { brandId: params }
        : params;

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

    if (!orgId) {
        throw new Error('Organization ID not found');
    }

    logger.info('[CUSTOMERS] getCustomers called', {
        orgId,
        userRole: user.role,
        userEmail: user.email,
    });

    // For brand users, ensure they access their own data
    if ((user.role === 'brand' || user.role === 'brand_admin' || user.role === 'brand_member') && user.brandId !== orgId) {
        throw new Error('Forbidden: Cannot access another brand\'s customers');
    }

    // For dispensary users, ensure they access their own data
    if ((user.role === 'dispensary' || user.role === 'dispensary_admin' || user.role === 'dispensary_staff' || user.role === 'budtender')) {
        const userOrgId = (user as any).orgId || user.currentOrgId || user.locationId;
        if (userOrgId !== orgId) {
            throw new Error('Forbidden: Cannot access another dispensary\'s customers');
        }
    }

    const { firestore } = await createServerClient();

    // 1. Try to get customers from POS (Alleaves) if configured
    const posCustomers = await getCustomersFromAlleaves(orgId, firestore);

    // 2. Get customers from BakedBot orders (fallback or supplement)
    let ordersSnap;
    let ordersQuery = firestore.collection('orders') as FirebaseFirestore.Query;

    if (locationId) {
        // Try by retailerId first
        let query = ordersQuery.where('retailerId', '==', locationId);
        let snap = await query.get();
        if (!snap.empty) {
            ordersSnap = snap;
        } else {
            // Fallback: try by orgId if retailerId doesn't match
            logger.info('[CUSTOMERS] No orders by retailerId, trying orgId fallback', { locationId, orgId });
            ordersQuery = firestore.collection('orders') as FirebaseFirestore.Query;
            ordersSnap = await ordersQuery.where('orgId', '==', orgId).get();
        }
    } else {
        // Try by brandId first
        let query = ordersQuery.where('brandId', '==', orgId);
        let snap = await query.get();
        if (!snap.empty) {
            ordersSnap = snap;
        } else {
            // Fallback: try by orgId if brandId doesn't match
            logger.info('[CUSTOMERS] No orders by brandId, trying orgId fallback', { orgId });
            ordersQuery = firestore.collection('orders') as FirebaseFirestore.Query;
            ordersSnap = await ordersQuery.where('orgId', '==', orgId).get();
        }
    }

    const orders = ordersSnap.docs.map((doc: any) => {
        const data = doc.data();
        return {
            ...data,
            createdAt: data.createdAt,
            customer: data.customer || {},
            totals: data.totals || { total: 0 }
        };
    });

    logger.info('[CUSTOMERS] Orders loaded', {
        orgId,
        orderCount: orders.length,
        fromLocationId: locationId,
    });

    // 3. Get any manually added customers from CRM collection
    const crmSnap = await firestore.collection('customers')
        .where('orgId', '==', orgId)
        .get();

    const crmCustomers = new Map<string, any>();
    crmSnap.forEach(doc => {
        const data = doc.data();
        const crmEmail = normalizeEmail(data.email);
        if (!crmEmail) return;
        crmCustomers.set(crmEmail, { id: doc.id, ...data });
    });

    // 3. Build customer profiles - start with POS customers if available
    const customerMap = new Map<string, CustomerProfile>();
    const emailToIdMap = new Map<string, string>(); // Secondary lookup: email -> customer ID
    const alleavesIdToCustomerIdMap = new Map<string, string>(); // Alleaves userId -> BakedBot customer.id

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
            // Skip synthetic placeholder emails (@alleaves.local) — they can't match real orders
            const lowerEmail = normalizeEmail(customer.email);
            if (lowerEmail && !isAlleavesPlaceholderEmail(lowerEmail)) {
                emailToIdMap.set(lowerEmail, customer.id);
            }

            // Build Alleaves customer ID lookup for email-less in-store orders.
            // POS customer IDs follow the format 'alleaves_{id_customer}'.
            if (customer.id.startsWith('alleaves_')) {
                alleavesIdToCustomerIdMap.set(customer.id.slice('alleaves_'.length), customer.id);
            }
        });

        logger.info('[CUSTOMERS] CustomerMap after adding POS customers', {
            orgId,
            mapSize: customerMap.size,
        });
    }

    // 4. Merge/supplement with BakedBot orders
    orders.forEach(order => {
        const email = normalizeEmail(order.customer?.email);
        // Placeholder emails from Alleaves in-store orders can't be used for matching
        const isPlaceholderEmail = !email || isAlleavesPlaceholderEmail(email);

        const orderDate = order.createdAt?.toDate?.() || new Date();
        const orderTotal = order.totals?.total || 0;

        // Try email match first, then fall back to Alleaves customer ID.
        // In-store Alleaves orders use 'no-email@alleaves.local' but always have a userId
        // set to the Alleaves customer ID — use that to link the order to the right customer.
        let customerId: string | undefined;
        if (!isPlaceholderEmail) {
            customerId = emailToIdMap.get(email!);
        }
        if (!customerId) {
            const isAlleavesOrder = order.source === 'alleaves';
            const rawUserId = typeof order.userId === 'number'
                ? order.userId.toString()
                : (typeof order.userId === 'string' ? order.userId.trim() : '');

            if (isAlleavesOrder && rawUserId && rawUserId !== 'alleaves_customer') {
                const normalizedUserId = rawUserId.startsWith('alleaves_')
                    ? rawUserId.slice('alleaves_'.length)
                    : rawUserId;
                customerId = alleavesIdToCustomerIdMap.get(normalizedUserId);
            }
        }
        // If the order has a placeholder email and no matching POS customer, skip it.
        // Don't create a ghost 'no-email@alleaves.local' customer record.
        if (isPlaceholderEmail && !customerId) return;

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
            if (!email) return;

            // Check if customer exists in CRM collection
            const crmData = crmCustomers.get(email);

            const newCustomerId = crmData?.id || email;
            customerMap.set(newCustomerId, {
                id: newCustomerId,
                orgId: orgId,
                email: email,
                firstName: crmData?.firstName || order.customer?.name?.split(' ')[0],
                lastName: crmData?.lastName || order.customer?.name?.split(' ').slice(1).join(' '),
                displayName: resolveCustomerDisplayName({
                    displayName: crmData?.displayName || order.customer?.name,
                    firstName: crmData?.firstName || order.customer?.name?.split(' ')[0],
                    lastName: crmData?.lastName || order.customer?.name?.split(' ').slice(1).join(' '),
                    email,
                    fallbackId: crmData?.id || email,
                }),
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
            const orderCount = coerceNumber(crmData.orderCount);
            const totalSpent = coerceNumber(crmData.totalSpent);
            const avgOrderValue = orderCount > 0
                ? totalSpent / orderCount
                : coerceNumber(crmData.avgOrderValue);
            const lastOrderDate = coerceDate(crmData.lastOrderDate);
            const firstOrderDate = coerceDate(crmData.firstOrderDate);
            const createdAt = coerceDate(crmData.createdAt) || firstOrderDate || new Date();

            customerMap.set(crmData.id, {
                id: crmData.id,
                orgId: orgId,
                email: email,
                firstName: crmData.firstName,
                lastName: crmData.lastName,
                displayName: resolveCustomerDisplayName({
                    displayName: crmData.displayName,
                    firstName: crmData.firstName,
                    lastName: crmData.lastName,
                    email,
                    fallbackId: crmData.id,
                }),
                phone: crmData.phone,
                orderCount,
                totalSpent,
                avgOrderValue,
                lastOrderDate,
                firstOrderDate,
                preferredCategories: crmData.preferredCategories || [],
                preferredProducts: crmData.preferredProducts || [],
                priceRange: crmData.priceRange || 'mid',
                segment: 'new',
                tier: 'bronze',
                points: crmData.points || 0,
                lifetimeValue: totalSpent,
                customTags: crmData.customTags || [],
                birthDate: crmData.birthDate,
                preferences: crmData.preferences,
                source: crmData.source || 'manual',
                notes: crmData.notes,
                createdAt,
                updatedAt: new Date(),
            });
        }
    });

    // 6. Calculate segments and stats
    const segmentBreakdown: Record<CustomerSegment, number> = {
        vip: 0, loyal: 0, new: 0, at_risk: 0, slipping: 0, churned: 0, high_value: 0, frequent: 0, regular: 0
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
        c.tier = deriveTier(c.totalSpent);

        // Calculate points and LTV
        c.points = Math.floor(c.totalSpent);
        c.lifetimeValue = c.totalSpent;

        // Update breakdown
        segmentBreakdown[c.segment]++;

        return decorateCustomerProfile(c);
    }).sort((a, b) => (b.lastOrderDate?.getTime() || 0) - (a.lastOrderDate?.getTime() || 0));

    logger.info('[CUSTOMERS] After map and sort', {
        orgId,
        customersLength: customers.length,
    });

    // Debug: Log spending distribution
    const spendingStats = {
        totalWithSpending: customers.filter(c => c.totalSpent > 0).length,
        totalWithOrders: customers.filter(c => c.orderCount > 0).length,
        maxSpending: Math.max(...customers.map(c => c.totalSpent)),
        avgSpending: customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length,
        top10Customers: customers.slice(0, 10).map(c => ({
            displayName: c.displayName,
            totalSpent: c.totalSpent,
            orderCount: c.orderCount,
            avgOrderValue: c.avgOrderValue,
            daysSinceLastOrder: c.daysSinceLastOrder,
            lastOrderDate: c.lastOrderDate,
            lifetimeValue: c.lifetimeValue,
            segment: c.segment,
        })),
        customersWithNoOrders: customers.filter(c => c.orderCount === 0).length,
        customersWithOrders: customers.filter(c => c.orderCount > 0).length,
    };
    logger.info('[CUSTOMERS] Spending distribution', spendingStats);
    logger.info('[CUSTOMERS] Segment breakdown', { segmentBreakdown });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper to safely convert any date-like value to Date
    const toDate = (d: any): Date | null => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (d.toDate) return d.toDate(); // Firestore Timestamp
        if (typeof d === 'string' || typeof d === 'number') return new Date(d);
        return null;
    };

    const stats: CRMStats = {
        totalCustomers: customers.length,
        newThisWeek: customers.filter(c => {
            const created = toDate(c.createdAt);
            return created && created >= weekAgo;
        }).length,
        newThisMonth: customers.filter(c => {
            const created = toDate(c.createdAt);
            return created && created >= monthAgo;
        }).length,
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
        return decorateCustomerProfile({
            id: doc.id,
            orgId: data.orgId,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: resolveCustomerDisplayName({
                displayName: data.displayName,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                fallbackId: doc.id,
            }),
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
        } as CustomerProfile);
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
    const displayName = resolveCustomerDisplayName({
        displayName: profile.displayName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
    });

    const customerData = {
        orgId,
        email: profile.email.toLowerCase(),
        firstName: profile.firstName || null,
        lastName: profile.lastName || null,
        displayName,
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
    const isNewCustomer = existing.empty;

    if (!isNewCustomer) {
        docId = existing.docs[0].id;
        await firestore.collection('customers').doc(docId).update(customerData);
    } else {
        const docRef = await firestore.collection('customers').add({
            ...customerData,
            createdAt: FieldValue.serverTimestamp(),
        });
        docId = docRef.id;
    }

    if (isNewCustomer) {
        const proactiveResult = await syncCustomerSignupProactiveGap(orgId, {
            customerId: docId,
            email: profile.email,
            phone: profile.phone,
            name: profile.displayName,
            firstName: profile.firstName,
            lastName: profile.lastName,
        });

        if (!proactiveResult.success && !proactiveResult.skipped) {
            logger.warn('[CUSTOMERS] Failed to sync customer signup proactive gap after manual upsert', {
                orgId,
                customerId: docId,
                email: profile.email.toLowerCase(),
                error: proactiveResult.error,
            });
        }
    }

    return {
        ...profile,
        id: docId,
        orgId,
        displayName,
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
    const { orgId } = await resolveAccessibleOrgContext(brandId);
    const { firestore } = await createServerClient();
    const data = await getCustomers(brandId);
    const stats = data.stats;
    const statusHints = await getLifecycleStatusHints(orgId, firestore);
    const suggestions: SegmentSuggestion[] = [];

    if (stats.newThisMonth > 0) {
        suggestions.push({
            name: 'New Customer Welcome',
            description: 'Recurring welcome automation for newly acquired customers.',
            filters: [{ field: 'segment', operator: 'equals', value: 'new' }],
            estimatedCount: stats.newThisMonth,
            reasoning: `${stats.newThisMonth} customers currently fit your welcome lifecycle. Launch or review the Welcome Email playbook to keep onboarding consistent.`,
            playbookKind: 'welcome',
            ctaLabel: 'Launch Playbook',
            statusHint: statusHints.welcome,
        });
    }

    if (stats.atRiskCount > 3) {
        suggestions.push({
            name: 'Win-Back',
            description: 'Recurring re-engagement for customers who have not ordered recently.',
            filters: [{ field: 'segment', operator: 'in', value: ['at_risk', 'slipping'] }],
            estimatedCount: stats.atRiskCount,
            reasoning: `${stats.atRiskCount} customers need a win-back touch. Launch or review the Win-Back playbook to keep re-engagement running on schedule.`,
            playbookKind: 'winback',
            ctaLabel: 'Launch Playbook',
            statusHint: statusHints.winback,
        });
    }

    if (stats.vipCount > 0) {
        suggestions.push({
            name: 'VIP Appreciation',
            description: 'Recurring VIP appreciation automation for your highest-value customers.',
            filters: [{ field: 'segment', operator: 'equals', value: 'vip' }],
            estimatedCount: stats.vipCount,
            reasoning: `${stats.vipCount} customers qualify for VIP treatment right now. Launch or review the VIP Appreciation playbook to keep those relationships warm.`,
            playbookKind: 'vip',
            ctaLabel: 'Launch Playbook',
            statusHint: statusHints.vip,
        });
    }

    return suggestions;
}

export async function launchLifecyclePlaybook(
    playbookKind: LifecyclePlaybookKind,
    requestedOrgId?: string,
): Promise<{
    success: boolean;
    playbookId?: string;
    status?: 'paused' | 'active';
    error?: string;
}> {
    try {
        const { orgId, brandId } = await resolveAccessibleOrgContext(requestedOrgId);
        const { firestore } = await createServerClient();
        const definition = LIFECYCLE_PLAYBOOKS.find((candidate) => candidate.kind === playbookKind);

        if (!definition) {
            return { success: false, error: `Unsupported lifecycle playbook: ${playbookKind}` };
        }

        const playbooksSnap = await firestore.collection('playbooks')
            .where('orgId', '==', orgId)
            .limit(25)
            .get();

        let playbookId = playbooksSnap.docs.find((doc) => doc.data().templateId === definition.templateId)?.id;
        const emailConfig: PilotEmailConfig = {
            provider: 'mailjet',
            senderEmail: 'hello@bakedbot.ai',
            senderName: 'Mrs. Parker',
            enableWelcomePlaybook: true,
            enableWinbackPlaybook: true,
            enableVIPPlaybook: true,
        };

        if (!playbookId) {
            const createResult = playbookKind === 'welcome'
                ? await createWelcomeEmailPlaybook(orgId, brandId, emailConfig)
                : playbookKind === 'winback'
                    ? await createWinbackEmailPlaybook(orgId, brandId, emailConfig)
                    : await createVIPPlaybook(orgId, brandId, emailConfig);

            if (!createResult.success || !createResult.playbookId) {
                return { success: false, error: createResult.error || 'Failed to create lifecycle playbook' };
            }

            playbookId = createResult.playbookId;
        }

        const assignments = await getDispensaryPlaybookAssignments(orgId);
        const existingAssignment = assignments.assignments.find((assignment) => assignment.playbookId === playbookId);
        if (existingAssignment?.status === 'active') {
            logger.info('[CUSTOMERS] Lifecycle playbook already active', { orgId, playbookKind, playbookId, status: 'active' });
            return { success: true, playbookId, status: 'active' };
        }

        const updateResult = await updatePlaybookAssignmentConfig(orgId, playbookId, {});
        if (!updateResult.success) {
            return { success: false, error: updateResult.error || 'Failed to prepare lifecycle playbook assignment' };
        }

        logger.info('[CUSTOMERS] Lifecycle playbook ready in sandbox', { orgId, playbookKind, playbookId, status: 'paused' });
        return { success: true, playbookId, status: 'paused' };
    } catch (error) {
        logger.error('[CUSTOMERS] Failed to launch lifecycle playbook', {
            playbookKind,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to launch lifecycle playbook',
        };
    }
}

// ==========================================
// Segment Helpers (exported for UI)
// ==========================================


