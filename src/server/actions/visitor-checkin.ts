'use server';

import { createHash, randomBytes } from 'crypto';
import { firestore } from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import {
    getPhoneLast4,
    isPlaceholderCustomerEmail,
} from '@/lib/customers/profile-derivations';
import {
    isNormalizedPhone,
    normalizeEmail,
    normalizePhone,
} from '@/lib/customer-import/column-mapping';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { logger } from '@/lib/logger';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { handleCustomerOnboardingSignal } from '@/server/services/customer-onboarding';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { getCustomerHistory } from '@/server/tools/crm-tools';
import { requireUser } from '@/server/auth/auth';
import { z } from 'zod';
import { captureEmailLead } from './email-capture';

const visitorCheckinSourceSchema = z.enum([
    'brand_rewards_checkin',
    'loyalty_tablet_checkin',
]);

const visitorAgeVerifiedMethodSchema = z.enum([
    'staff_visual_check',
    'staff_attested_public_flow',
]);

const favoriteCategorySchema = z.enum([
    'flower',
    'pre-rolls',
    'vapes',
    'edibles',
    'concentrates',
    'tinctures',
]);

const thriveCheckinUiVersionSchema = z.enum([
    'thrive_checkin_v2',
]);

const visitorOfferTypeSchema = z.enum([
    'email',
    'favorite_categories',
]);

const visitorCheckinLookupCandidateSchema = z.object({
    kind: z.enum(['customer', 'order']),
    id: z.string().min(1),
});

const phoneLast4Schema = z.string().regex(/^\d{4}$/);

const getVisitorCheckinContextSchema = z.object({
    orgId: z.string().min(1),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    lookupCandidate: visitorCheckinLookupCandidateSchema.optional(),
}).refine((value) => Boolean(value.phone?.trim() || value.lookupCandidate), {
    message: 'Phone or lookup candidate required',
    path: ['phone'],
});

const findVisitorCheckinCandidatesSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().trim().min(2).max(100),
    phoneLast4: phoneLast4Schema,
});

const captureVisitorCheckinSchema = z.object({
    orgId: z.string().min(1),
    firstName: z.string().trim().min(1).max(100),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal('')),
    emailConsent: z.boolean(),
    smsConsent: z.boolean(),
    source: visitorCheckinSourceSchema,
    ageVerifiedMethod: visitorAgeVerifiedMethodSchema,
    mood: z.string().optional(),
    cartProductIds: z.array(z.string()).optional(),
    bundleAdded: z.boolean().optional(),
    favoriteCategories: z.array(favoriteCategorySchema).max(6).optional(),
    uiVersion: thriveCheckinUiVersionSchema.optional(),
    offerType: visitorOfferTypeSchema.nullable().optional(),
    lookupCandidate: visitorCheckinLookupCandidateSchema.optional(),
}).refine((value) => Boolean(value.phone?.trim() || value.lookupCandidate), {
    message: 'Phone or lookup candidate required',
    path: ['phone'],
});

/**
 * Fire-and-forget: notify backoffice that a kiosk customer selected products.
 * Writes to tenants/{orgId}/kioskPicks (real-time Firestore listener on dashboard).
 * Staff sees the customer name + product IDs before they reach the counter.
 */
async function notifyKioskPicks(params: {
    orgId: string;
    customerId: string;
    firstName: string;
    mood: string | null;
    cartProductIds: string[];
    db: FirebaseFirestore.Firestore;
    now: Date;
}): Promise<void> {
    const { orgId, customerId, firstName, mood, cartProductIds, db, now } = params;

    // Fetch product names for the notification (best-effort, non-blocking)
    let productNames: string[] = [];
    try {
        const productSnaps = await Promise.all(
            cartProductIds.slice(0, 5).map((id) =>
                db.collection('tenants').doc(orgId)
                    .collection('publicViews').doc('products')
                    .collection('items').doc(id).get()
            )
        );
        productNames = productSnaps
            .filter((snap) => snap.exists)
            .map((snap) => (snap.data() as { name?: string })?.name ?? snap.id);
    } catch {
        productNames = cartProductIds;
    }

    const pickDoc = {
        orgId,
        customerId,
        firstName,
        mood: mood ?? null,
        productIds: cartProductIds,
        productNames,
        status: 'pending',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4h TTL
    };

    await db.collection('tenants').doc(orgId)
        .collection('kioskPicks').add(pickDoc);

    logger.info('[VisitorCheckin] Kiosk pick written for backoffice', {
        orgId,
        customerId,
        productCount: cartProductIds.length,
    });
}

/**
 * Fire-and-forget: sync email/phone from check-in back to the Alleaves POS customer record.
 * Looks up the customer's alleavesCustomerId from their Firestore doc, then PUTs the update.
 */
async function syncCheckinToAlleaves(
    orgId: string,
    customerId: string,
    email: string | null,
    phone: string,
    db: firestore.Firestore,
): Promise<void> {
    // Read the customer doc to get their Alleaves ID
    const custDoc = await db.collection('customers').doc(customerId).get();
    const alleavesId = custDoc.data()?.alleavesCustomerId; // e.g. "cid_1234"
    if (!alleavesId) return; // No Alleaves link — nothing to sync

    const numericId = alleavesId.replace('cid_', '');

    // Get POS config for the org
    const locSnap = await db.collection('locations').where('orgId', '==', orgId).limit(1).get();
    const posConfig = locSnap.docs[0]?.data()?.posConfig;
    if (!posConfig || posConfig.provider !== 'alleaves' || posConfig.status !== 'active') return;

    const { ALLeavesClient } = await import('@/lib/pos/adapters/alleaves');
    const client = new ALLeavesClient({
        apiKey: posConfig.apiKey,
        username: posConfig.username || process.env.ALLEAVES_USERNAME || '',
        password: posConfig.password || process.env.ALLEAVES_PASSWORD || '',
        pin: posConfig.pin || process.env.ALLEAVES_PIN,
        storeId: posConfig.storeId,
        locationId: posConfig.locationId || posConfig.storeId,
        environment: posConfig.environment || 'production',
    });

    const fields: Record<string, string> = {};
    if (email) fields.email = email;
    if (phone) fields.phone = phone;

    if (Object.keys(fields).length > 0) {
        await client.updateCustomer(numericId, fields);
        logger.info('[VisitorCheckin] Synced contact info to Alleaves', {
            orgId, customerId, alleavesId, fieldsUpdated: Object.keys(fields),
        });
    }
}

export type VisitorCheckinSource = z.infer<typeof visitorCheckinSourceSchema>;
export type VisitorAgeVerifiedMethod = z.infer<typeof visitorAgeVerifiedMethodSchema>;
export type VisitorFavoriteCategory = z.infer<typeof favoriteCategorySchema>;
export type VisitorCheckinUiVersion = z.infer<typeof thriveCheckinUiVersionSchema>;
export type VisitorCheckinOfferType = z.infer<typeof visitorOfferTypeSchema>;

export interface CaptureVisitorCheckinRequest {
    orgId: string;
    firstName: string;
    phone?: string;
    email?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    source: VisitorCheckinSource;
    ageVerifiedMethod: VisitorAgeVerifiedMethod;
    mood?: string;
    cartProductIds?: string[];
    bundleAdded?: boolean;
    favoriteCategories?: VisitorFavoriteCategory[];
    uiVersion?: VisitorCheckinUiVersion;
    offerType?: VisitorCheckinOfferType | null;
    lookupCandidate?: VisitorCheckinLookupCandidateRef;
}

export interface GetVisitorCheckinContextRequest {
    orgId: string;
    phone?: string;
    email?: string;
    lookupCandidate?: VisitorCheckinLookupCandidateRef;
}

export interface FindVisitorCheckinCandidatesRequest {
    orgId: string;
    firstName: string;
    phoneLast4: string;
}

export interface VisitorFollowupEligibility {
    emailWelcome: boolean;
    smsWelcome: boolean;
    reviewSequence: boolean;
}

export interface VisitorLastPurchase {
    orderId: string;
    primaryItemName: string;
    itemCount: number;
    total: number;
    purchasedAt: string | null;
    orderDateLabel: string | null;
}

export interface VisitorCheckinContextResult {
    success: boolean;
    normalizedPhone?: string;
    isReturningCustomer: boolean;
    customerId?: string;
    returningSource?: 'customer' | 'lead' | 'online_order';
    savedEmail?: string;
    savedEmailConsent?: boolean;
    lastPurchase?: VisitorLastPurchase;
    googleReviewUrl?: string;
    enrichmentMode?: 'email' | 'favorite_categories';
    error?: string;
}

export interface VisitorCheckinLookupCandidateRef {
    kind: 'customer' | 'order';
    id: string;
}

export interface VisitorCheckinLookupCandidate {
    candidate: VisitorCheckinLookupCandidateRef;
    firstName: string;
    phoneLast4: string;
    returningSource: 'customer' | 'online_order';
    title: string;
    subtitle: string;
    lastActivityAt?: string;
}

export interface FindVisitorCheckinCandidatesResult {
    success: boolean;
    candidates: VisitorCheckinLookupCandidate[];
    error?: string;
}

export interface CaptureVisitorCheckinResult {
    success: boolean;
    isNewLead: boolean;
    isReturningCustomer: boolean;
    customerId?: string;
    leadId?: string;
    visitId?: string;
    loyaltyPoints?: number;
    followupEligibility?: VisitorFollowupEligibility;
    error?: string;
}

type CustomerSnapshot =
    | firestore.DocumentSnapshot
    | firestore.QueryDocumentSnapshot;

type LeadScope = {
    brandId?: string;
    dispensaryId?: string;
};

type LeadSnapshot = {
    id: string;
    data: Record<string, unknown>;
};

type ReturningSource = NonNullable<VisitorCheckinContextResult['returningSource']>;

type OrderMatchSummary = {
    savedEmail?: string;
    lastPurchase?: VisitorLastPurchase;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: Date | null;
};

function digitsOnlyPhone(value: string): string {
    return value.replace(/\D/g, '');
}

function buildPhoneCustomerId(orgId: string, phone: string): string {
    return `${orgId}_phone_${digitsOnlyPhone(phone)}`;
}

function sameLeadScope(existing: LeadScope, incoming: LeadScope): boolean {
    const existingBrand = existing.brandId || '';
    const existingDispensary = existing.dispensaryId || '';
    const incomingBrand = incoming.brandId || '';
    const incomingDispensary = incoming.dispensaryId || '';

    if (incomingBrand || existingBrand) {
        return incomingBrand !== '' && existingBrand !== '' && incomingBrand === existingBrand;
    }

    if (incomingDispensary || existingDispensary) {
        return (
            incomingDispensary !== '' &&
            existingDispensary !== '' &&
            incomingDispensary === existingDispensary
        );
    }

    return true;
}

function normalizeStoredEmail(value: unknown): string | undefined {
    return normalizeEmail(typeof value === 'string' ? value : undefined) || undefined;
}

function getRecordValue(
    record: Record<string, unknown> | null | undefined,
    key: string,
): unknown {
    return record?.[key];
}

function resolveSavedEmailState(
    existingCustomerData: Record<string, unknown> | null,
    existingLeadData: Record<string, unknown> | null,
    orderEmail?: string,
): {
    savedEmail?: string;
    savedEmailConsent: boolean;
} {
    const customerEmail = normalizeStoredEmail(existingCustomerData?.email);
    const leadEmail = normalizeStoredEmail(existingLeadData?.email);
    const customerEmailConsent = Boolean(
        customerEmail && existingCustomerData?.emailConsent === true,
    );
    const leadEmailConsent = Boolean(
        leadEmail && existingLeadData?.emailConsent === true,
    );

    if (customerEmailConsent) {
        return {
            savedEmail: customerEmail,
            savedEmailConsent: true,
        };
    }

    if (leadEmailConsent) {
        return {
            savedEmail: leadEmail,
            savedEmailConsent: true,
        };
    }

    return {
        savedEmail: customerEmail ?? leadEmail ?? orderEmail,
        savedEmailConsent: false,
    };
}

function resolveReturningSource(
    existingCustomerData: Record<string, unknown> | null,
    existingLeadData: Record<string, unknown> | null,
    existingOrderHistory: OrderMatchSummary | null,
): ReturningSource | undefined {
    if (existingCustomerData) {
        return 'customer';
    }

    if (existingLeadData) {
        return 'lead';
    }

    if (existingOrderHistory) {
        return 'online_order';
    }

    return undefined;
}

function normalizeNameForLookup(value: string | null | undefined): string {
    return (typeof value === 'string' ? value : '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function extractFirstName(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const [firstName] = value.trim().split(/\s+/);
    return firstName?.trim() || null;
}

function namesLikelyMatch(inputFirstName: string, candidateFirstName: string | null): boolean {
    const normalizedInput = normalizeNameForLookup(inputFirstName);
    const normalizedCandidate = normalizeNameForLookup(candidateFirstName);

    if (!normalizedInput || !normalizedCandidate) {
        return false;
    }

    return normalizedInput.startsWith(normalizedCandidate)
        || normalizedCandidate.startsWith(normalizedInput);
}

function formatActivityLabel(date: Date | null): string | null {
    if (!date) {
        return null;
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function normalizeStoredCategories(value: unknown): VisitorFavoriteCategory[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(
        value.filter((category): category is VisitorFavoriteCategory => (
            typeof category === 'string' &&
            favoriteCategorySchema.safeParse(category).success
        )),
    ));
}

function mergePreferredCategories(
    existing: unknown,
    incoming: VisitorFavoriteCategory[],
): VisitorFavoriteCategory[] {
    return Array.from(new Set([
        ...normalizeStoredCategories(existing),
        ...incoming,
    ]));
}

function toCurrencyNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function getOrderCustomerRecord(order: Record<string, unknown>): Record<string, unknown> | null {
    const customer = order.customer;
    if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
        return null;
    }

    return customer as Record<string, unknown>;
}

function getOrderCustomerEmail(order: Record<string, unknown>): string | undefined {
    const orderEmail = normalizeStoredEmail(getOrderValue(order, 'email'));
    if (!orderEmail || isPlaceholderCustomerEmail(orderEmail)) {
        return undefined;
    }

    return orderEmail;
}

function getOrderValue(order: Record<string, unknown>, key: string): unknown {
    const customer = getOrderCustomerRecord(order);
    if (customer && key in customer) {
        return customer[key];
    }

    return order[key];
}

function getOrderDate(order: Record<string, unknown>): Date | null {
    return firestoreTimestampToDate(order.date)
        ?? firestoreTimestampToDate(order.createdAt)
        ?? firestoreTimestampToDate(order.updatedAt);
}

function getOrderTotal(order: Record<string, unknown>): number {
    const totals = order.totals;
    if (totals && typeof totals === 'object' && !Array.isArray(totals)) {
        return toCurrencyNumber((totals as Record<string, unknown>).total);
    }

    return toCurrencyNumber(order.total);
}

function orderBelongsToOrg(order: Record<string, unknown>, orgId: string): boolean {
    const scopedIds = [
        getRecordValue(order, 'brandId'),
        getRecordValue(order, 'retailerId'),
        getRecordValue(order, 'orgId'),
    ];

    return scopedIds.some((value) => value === orgId);
}

function buildPhoneLookupCandidates(rawPhone: string, normalizedPhone: string): string[] {
    const rawPhoneValue = typeof rawPhone === 'string' ? rawPhone.trim() : '';
    const digits = digitsOnlyPhone(normalizedPhone);
    const localTenDigits = digits.length > 10 ? digits.slice(-10) : digits;

    return Array.from(new Set([
        rawPhoneValue,
        normalizedPhone,
        digits,
        localTenDigits,
    ].filter((value) => value.length > 0)));
}

function summarizeLastPurchase(order: Record<string, unknown>): VisitorLastPurchase | null {
    const items = Array.isArray(order.items) ? order.items : [];
    const primaryItem = items.find((item): item is Record<string, unknown> => (
        !!item &&
        typeof item === 'object' &&
        (
            typeof (item as { name?: string }).name === 'string' ||
            typeof (item as { productName?: string }).productName === 'string'
        )
    ));
    const purchasedAt = getOrderDate(order);
    const total = getOrderTotal(order);

    if (!primaryItem) {
        return null;
    }

    return {
        orderId: String(order.id || ''),
        primaryItemName: String(primaryItem.name || primaryItem.productName || 'Recent order'),
        itemCount: items.length,
        total,
        purchasedAt: purchasedAt ? purchasedAt.toISOString() : null,
        orderDateLabel: purchasedAt
            ? purchasedAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            })
            : null,
    };
}

async function findCustomerByField(
    field: 'phone' | 'email',
    value: string,
    orgId: string,
): Promise<CustomerSnapshot | null> {
    const db = getAdminFirestore();
    const snapshot = await db
        .collection('customers')
        .where('orgId', '==', orgId)
        .where(field, '==', value)
        .limit(10)
        .get();

    return snapshot.docs[0] ?? null;
}

async function findExistingCustomer(
    orgId: string,
    normalizedPhone: string,
    normalizedEmail?: string,
): Promise<CustomerSnapshot | null> {
    const db = getAdminFirestore();
    const directPhoneDoc = await db
        .collection('customers')
        .doc(buildPhoneCustomerId(orgId, normalizedPhone))
        .get();

    if (directPhoneDoc.exists && directPhoneDoc.data()?.orgId === orgId) {
        return directPhoneDoc;
    }

    const phoneMatch = await findCustomerByField('phone', normalizedPhone, orgId);
    if (phoneMatch) {
        return phoneMatch;
    }

    if (normalizedEmail) {
        return findCustomerByField('email', normalizedEmail, orgId);
    }

    return null;
}

async function findExistingLead(
    orgId: string,
    normalizedPhone: string,
    normalizedEmail?: string,
): Promise<LeadSnapshot | null> {
    const db = getAdminFirestore();

    if (normalizedEmail) {
        const emailQuery = await db.collection('email_leads')
            .where('email', '==', normalizedEmail)
            .get();

        const emailDoc = emailQuery.docs.find((doc) => sameLeadScope(
            {
                brandId: doc.get('brandId'),
                dispensaryId: doc.get('dispensaryId'),
            },
            {
                brandId: orgId,
                dispensaryId: orgId,
            },
        ));

        if (emailDoc) {
            return {
                id: emailDoc.id,
                data: emailDoc.data(),
            };
        }
    }

    const phoneQuery = await db.collection('email_leads')
        .where('phone', '==', normalizedPhone)
        .get();

    const phoneDoc = phoneQuery.docs.find((doc) => sameLeadScope(
        {
            brandId: doc.get('brandId'),
            dispensaryId: doc.get('dispensaryId'),
        },
        {
            brandId: orgId,
            dispensaryId: orgId,
        },
    ));

    if (!phoneDoc) {
        return null;
    }

    return {
        id: phoneDoc.id,
        data: phoneDoc.data(),
    };
}

async function findCustomersByPhoneLast4(
    orgId: string,
    phoneLast4: string,
): Promise<CustomerSnapshot[]> {
    const db = getAdminFirestore();

    try {
        const snapshot = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('phoneLast4', '==', phoneLast4)
            .limit(10)
            .get();

        return snapshot.docs;
    } catch (error) {
        logger.warn('[VisitorCheckin] Scoped customer phoneLast4 lookup failed, falling back', {
            orgId,
            phoneLast4,
            error: error instanceof Error ? error.message : String(error),
        });

        const fallbackSnapshot = await db
            .collection('customers')
            .where('phoneLast4', '==', phoneLast4)
            .limit(25)
            .get();

        return fallbackSnapshot.docs.filter((doc) => doc.data()?.orgId === orgId);
    }
}

async function findOrdersByPhoneLast4(
    orgId: string,
    phoneLast4: string,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const db = getAdminFirestore();
    const scopeFields: Array<'brandId' | 'retailerId' | 'orgId'> = ['brandId', 'retailerId', 'orgId'];

    try {
        const snapshots = await Promise.all(
            scopeFields.map((scopeField) => (
                db.collection('orders')
                    .where(scopeField, '==', orgId)
                    .where('phoneLast4', '==', phoneLast4)
                    .limit(10)
                    .get()
            )),
        );

        const matches = new Map<string, Record<string, unknown>>();
        for (const snapshot of snapshots) {
            for (const doc of snapshot.docs) {
                matches.set(doc.id, doc.data() as Record<string, unknown>);
            }
        }

        return Array.from(matches.entries()).map(([id, data]) => ({ id, data }));
    } catch (error) {
        logger.warn('[VisitorCheckin] Scoped order phoneLast4 lookup failed, falling back', {
            orgId,
            phoneLast4,
            error: error instanceof Error ? error.message : String(error),
        });

        const fallbackSnapshot = await db
            .collection('orders')
            .where('phoneLast4', '==', phoneLast4)
            .limit(30)
            .get();

        return fallbackSnapshot.docs
            .map((doc) => ({
                id: doc.id,
                data: doc.data() as Record<string, unknown>,
            }))
            .filter((doc) => orderBelongsToOrg(doc.data, orgId));
    }
}

async function resolveLookupCandidatePhone(
    orgId: string,
    lookupCandidate: VisitorCheckinLookupCandidateRef,
): Promise<string | undefined> {
    const db = getAdminFirestore();

    if (lookupCandidate.kind === 'customer') {
        const doc = await db.collection('customers').doc(lookupCandidate.id).get();
        const data = doc.data();
        if (!doc.exists || data?.orgId !== orgId) {
            return undefined;
        }

        // Try `phone` first (formatted), then `phoneDigits` (Alleaves import stores digits-only)
        const rawPhone = typeof data?.phone === 'string' && data.phone
            ? data.phone
            : typeof data?.phoneDigits === 'string' && data.phoneDigits
                ? data.phoneDigits
                : undefined;
        const normalizedPhone = normalizePhone(rawPhone);
        return isNormalizedPhone(normalizedPhone) ? normalizedPhone : undefined;
    }

    const orderDoc = await db.collection('orders').doc(lookupCandidate.id).get();
    const orderData = orderDoc.data() as Record<string, unknown> | undefined;
    if (!orderDoc.exists || !orderData || !orderBelongsToOrg(orderData, orgId)) {
        return undefined;
    }

    const normalizedPhone = normalizePhone(
        typeof getOrderValue(orderData, 'phone') === 'string'
            ? String(getOrderValue(orderData, 'phone'))
            : undefined,
    );
    return isNormalizedPhone(normalizedPhone) ? normalizedPhone : undefined;
}

async function findOrdersByField(
    field: 'customer.phone' | 'customer.email',
    value: string,
    orgId: string,
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    const db = getAdminFirestore();
    const scopeFields: Array<'brandId' | 'retailerId' | 'orgId'> = ['brandId', 'retailerId', 'orgId'];

    const snapshots = await Promise.all(
        scopeFields.map((scopeField) =>
            db.collection('orders')
                .where(scopeField, '==', orgId)
                .where(field, '==', value)
                .limit(25)
                .get()
        ),
    );

    const matches = new Map<string, Record<string, unknown>>();
    for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
            matches.set(doc.id, doc.data() as Record<string, unknown>);
        }
    }

    return Array.from(matches.entries()).map(([id, data]) => ({ id, data }));
}

async function findExistingOrderHistory(
    orgId: string,
    rawPhone: string,
    normalizedPhone: string,
    normalizedEmail?: string,
): Promise<OrderMatchSummary | null> {
    const phoneCandidates = buildPhoneLookupCandidates(rawPhone, normalizedPhone);
    const queries = [
        ...phoneCandidates.map((phoneCandidate) => (
            findOrdersByField('customer.phone', phoneCandidate, orgId)
        )),
    ];

    if (normalizedEmail && !isPlaceholderCustomerEmail(normalizedEmail)) {
        queries.push(findOrdersByField('customer.email', normalizedEmail, orgId));
    }

    const queryResults = await Promise.all(queries);
    const dedupedMatches = new Map<string, Record<string, unknown>>();

    for (const queryResult of queryResults) {
        for (const match of queryResult) {
            if (!orderBelongsToOrg(match.data, orgId)) {
                continue;
            }

            dedupedMatches.set(match.id, {
                id: match.id,
                ...match.data,
            });
        }
    }

    const matchedOrders = Array.from(dedupedMatches.values()).sort((left, right) => {
        const leftDate = getOrderDate(left)?.getTime() ?? 0;
        const rightDate = getOrderDate(right)?.getTime() ?? 0;
        return rightDate - leftDate;
    });

    if (matchedOrders.length === 0) {
        return null;
    }

    const latestOrder = matchedOrders[0];
    const savedEmail = matchedOrders
        .map((order) => getOrderCustomerEmail(order))
        .find((value): value is string => Boolean(value));

    return {
        savedEmail,
        lastPurchase: summarizeLastPurchase(latestOrder) || undefined,
        orderCount: matchedOrders.length,
        totalSpent: matchedOrders.reduce((sum, order) => sum + getOrderTotal(order), 0),
        lastOrderDate: getOrderDate(latestOrder),
    };
}

async function resolveLastPurchase(
    customerId: string,
    orgId: string,
): Promise<VisitorLastPurchase | null> {
    try {
        const history = await getCustomerHistory(customerId, orgId, 1);
        const firstOrder = history.orders[0];

        if (!firstOrder || typeof firstOrder !== 'object') {
            return null;
        }

        return summarizeLastPurchase(firstOrder as Record<string, unknown>);
    } catch (error) {
        logger.warn('[VisitorCheckin] Failed to resolve last purchase', {
            orgId,
            customerId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

export async function findVisitorCheckinCandidates(
    request: FindVisitorCheckinCandidatesRequest,
): Promise<FindVisitorCheckinCandidatesResult> {
    try {
        const validated = findVisitorCheckinCandidatesSchema.parse(request);
        const [customerDocs, orderDocs] = await Promise.all([
            findCustomersByPhoneLast4(validated.orgId, validated.phoneLast4),
            findOrdersByPhoneLast4(validated.orgId, validated.phoneLast4),
        ]);

        const candidatesByPhone = new Map<string, VisitorCheckinLookupCandidate & { sortTime: number }>();

        for (const customerDoc of customerDocs) {
            const data = customerDoc.data() ?? {};
            const normalizedPhone = normalizePhone(typeof data.phone === 'string' ? data.phone : undefined);
            const customerPhoneLast4 = getPhoneLast4(normalizedPhone);
            const candidateFirstName = extractFirstName(
                typeof data.firstName === 'string' && data.firstName
                    ? data.firstName
                    : typeof data.displayName === 'string'
                        ? data.displayName
                        : null,
            );

            if (
                !isNormalizedPhone(normalizedPhone)
                || customerPhoneLast4 !== validated.phoneLast4
                || !namesLikelyMatch(validated.firstName, candidateFirstName)
                || !candidateFirstName
            ) {
                continue;
            }

            const lastActivityAt = firestoreTimestampToDate(data.lastOrderDate)
                ?? firestoreTimestampToDate(data.lastCheckinAt)
                ?? firestoreTimestampToDate(data.updatedAt);
            const activityLabel = formatActivityLabel(lastActivityAt);

            candidatesByPhone.set(normalizedPhone, {
                candidate: { kind: 'customer', id: customerDoc.id },
                firstName: candidateFirstName,
                phoneLast4: validated.phoneLast4,
                returningSource: 'customer',
                title: `${candidateFirstName} - Known customer`,
                subtitle: activityLabel
                    ? `Phone ending in ${validated.phoneLast4} - last seen ${activityLabel}`
                    : `Phone ending in ${validated.phoneLast4} - existing Thrive profile`,
                lastActivityAt: lastActivityAt?.toISOString(),
                sortTime: lastActivityAt?.getTime() ?? 0,
            });
        }

        for (const orderDoc of orderDocs) {
            const normalizedPhone = normalizePhone(
                typeof getOrderValue(orderDoc.data, 'phone') === 'string'
                    ? String(getOrderValue(orderDoc.data, 'phone'))
                    : undefined,
            );
            const orderPhoneLast4 = getPhoneLast4(normalizedPhone);
            const candidateFirstName = extractFirstName(getOrderValue(orderDoc.data, 'name'));

            if (
                !isNormalizedPhone(normalizedPhone)
                || orderPhoneLast4 !== validated.phoneLast4
                || !namesLikelyMatch(validated.firstName, candidateFirstName)
                || !candidateFirstName
                || candidatesByPhone.has(normalizedPhone)
            ) {
                continue;
            }

            const lastPurchase = summarizeLastPurchase({
                id: orderDoc.id,
                ...orderDoc.data,
            });
            const lastActivityAt = getOrderDate(orderDoc.data);

            candidatesByPhone.set(normalizedPhone, {
                candidate: { kind: 'order', id: orderDoc.id },
                firstName: candidateFirstName,
                phoneLast4: validated.phoneLast4,
                returningSource: 'online_order',
                title: `${candidateFirstName} - Ordered online`,
                subtitle: lastPurchase?.orderDateLabel
                    ? `${lastPurchase.primaryItemName} - ${lastPurchase.orderDateLabel} - phone ending in ${validated.phoneLast4}`
                    : `Recent online order - phone ending in ${validated.phoneLast4}`,
                lastActivityAt: lastActivityAt?.toISOString(),
                sortTime: lastActivityAt?.getTime() ?? 0,
            });
        }

        const candidates = Array.from(candidatesByPhone.values())
            .sort((left, right) => right.sortTime - left.sortTime)
            .slice(0, 3)
            .map(({ sortTime: _sortTime, ...candidate }) => candidate);

        logger.info('[VisitorCheckin] Resolved staff-assisted check-in candidates', {
            orgId: validated.orgId,
            phoneLast4: validated.phoneLast4,
            firstName: validated.firstName,
            candidateCount: candidates.length,
        });

        return {
            success: true,
            candidates,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                candidates: [],
                error: error.errors[0]?.message || 'Invalid lookup payload',
            };
        }

        logger.error('[VisitorCheckin] Failed to resolve staff-assisted check-in candidates', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });

        return {
            success: false,
            candidates: [],
            error: error instanceof Error ? error.message : 'Failed to find returning customer candidates',
        };
    }
}

export async function getVisitorCheckinContext(
    request: GetVisitorCheckinContextRequest,
): Promise<VisitorCheckinContextResult> {
    try {
        const validated = getVisitorCheckinContextSchema.parse(request);
        const normalizedPhone = validated.lookupCandidate
            ? await resolveLookupCandidatePhone(validated.orgId, validated.lookupCandidate)
            : normalizePhone(validated.phone);
        const normalizedEmail = normalizeEmail(validated.email || undefined);

        if (!isNormalizedPhone(normalizedPhone)) {
            return {
                success: false,
                isReturningCustomer: false,
                error: 'Valid phone number required',
            };
        }

        const [existingCustomer, existingLead] = await Promise.all([
            findExistingCustomer(validated.orgId, normalizedPhone, normalizedEmail),
            findExistingLead(validated.orgId, normalizedPhone, normalizedEmail),
        ]);
        const existingCustomerData = existingCustomer?.data() ?? null;
        const existingLeadData = existingLead?.data ?? null;
        const initialEmailState = resolveSavedEmailState(existingCustomerData, existingLeadData);
        const crmLastPurchase = existingCustomer?.id
            ? await resolveLastPurchase(existingCustomer.id, validated.orgId)
            : null;
        const existingOrderHistory = !existingCustomerData || !initialEmailState.savedEmail || !crmLastPurchase
            ? await findExistingOrderHistory(
                validated.orgId,
                validated.phone ?? normalizedPhone,
                normalizedPhone,
                normalizedEmail,
            )
            : null;
        const returningSource = resolveReturningSource(
            existingCustomerData,
            existingLeadData,
            existingOrderHistory,
        );

        const {
            savedEmail,
            savedEmailConsent,
        } = resolveSavedEmailState(
            existingCustomerData,
            existingLeadData,
            existingOrderHistory?.savedEmail,
        );
        const canReuseSavedEmail = Boolean(savedEmail && savedEmailConsent);
        const isReturningCustomer = Boolean(existingCustomerData || existingLead || existingOrderHistory);
        const lastPurchase = crmLastPurchase ?? existingOrderHistory?.lastPurchase ?? null;
        const googleReviewUrl = isReturningCustomer && lastPurchase
            ? await getGoogleReviewUrl(validated.orgId)
            : null;
        const enrichmentMode = canReuseSavedEmail ? 'favorite_categories' : 'email';

        logger.info('[VisitorCheckin] Resolved public check-in context', {
            orgId: validated.orgId,
            normalizedPhone,
            customerId: existingCustomer?.id ?? null,
            isReturningCustomer,
            returningSource: returningSource ?? null,
            lastPurchaseFound: Boolean(lastPurchase),
            reviewUrlFound: Boolean(googleReviewUrl),
            enrichmentMode,
        });

        return {
            success: true,
            normalizedPhone,
            isReturningCustomer,
            customerId: existingCustomer?.id,
            returningSource,
            savedEmail,
            savedEmailConsent,
            lastPurchase: lastPurchase || undefined,
            googleReviewUrl: googleReviewUrl || undefined,
            enrichmentMode,
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                isReturningCustomer: false,
                error: error.errors[0]?.message || 'Invalid visitor context payload',
            };
        }

        logger.error('[VisitorCheckin] Failed to resolve public check-in context', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });

        return {
            success: false,
            isReturningCustomer: false,
            error: error instanceof Error ? error.message : 'Failed to resolve visitor context',
        };
    }
}

export async function captureVisitorCheckin(
    request: CaptureVisitorCheckinRequest,
): Promise<CaptureVisitorCheckinResult> {
    try {
        const validated = captureVisitorCheckinSchema.parse(request);
        
        // Validate org access - only allow check-ins for user's org or as super_user
        let sessionUser;
        try {
            sessionUser = await requireUser();
        } catch {
            // Tablet kiosk may not have session - allow if no user context
            sessionUser = null;
        }
        
        if (sessionUser) {
            const userOrgId = (sessionUser as any).currentOrgId || (sessionUser as any).orgId;
            const userRole = (sessionUser as any).role;
            const isSuperUser = userRole === 'super_user' || userRole === 'super_admin';
            
            if (!isSuperUser && userOrgId && userOrgId !== validated.orgId) {
                logger.warn('[VisitorCheckin] Org access denied', {
                    userOrgId,
                    requestedOrgId: validated.orgId,
                });
                return {
                    success: false,
                    isNewLead: false,
                    isReturningCustomer: false,
                    error: 'Unauthorized org',
                };
            }
        }
        
        const normalizedEmail = normalizeEmail(validated.email || undefined);
        const normalizedPhone = validated.lookupCandidate
            ? await resolveLookupCandidatePhone(validated.orgId, validated.lookupCandidate)
            : normalizePhone(validated.phone);

        if (!isNormalizedPhone(normalizedPhone)) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: 'Valid phone number required',
            };
        }

        const favoriteCategories = Array.from(new Set(validated.favoriteCategories ?? []));
        const emailConsent = Boolean(normalizedEmail && validated.emailConsent);
        const smsConsent = validated.smsConsent;
        const cartProductIds = Array.from(new Set(validated.cartProductIds ?? []));
        const now = new Date();
        const db = getAdminFirestore();

        const leadResult = await captureEmailLead({
            email: normalizedEmail,
            phone: normalizedPhone,
            firstName: validated.firstName,
            emailConsent,
            smsConsent,
            brandId: validated.orgId,
            dispensaryId: validated.orgId,
            source: validated.source,
            ageVerified: true,
        });

        // Enroll in weekly campaign list if email consent given
        if (emailConsent && normalizedEmail) {
            try {
                // Query outside the transaction — Admin SDK does not support transaction.get(Query)
                const existingSnap = await db.collection('weekly_campaign_subscribers')
                    .where('email', '==', normalizedEmail)
                    .where('orgId', '==', validated.orgId)
                    .limit(1)
                    .get();

                if (existingSnap.empty) {
                    const subId = `wsub_${createHash('sha256').update(normalizedEmail + validated.orgId).digest('hex').slice(0, 16)}`;
                    await db.collection('weekly_campaign_subscribers').doc(subId).set({
                        orgId: validated.orgId,
                        customerId: validated.orgId + '_' + normalizedPhone.slice(-4),
                        email: normalizedEmail,
                        firstName: validated.firstName,
                        enrolledAt: now,
                        lastSentAt: null,
                        status: 'active',
                        source: validated.source,
                    }, { merge: true });
                    logger.info('[VisitorCheckin] Enrolled in weekly campaign', {
                        orgId: validated.orgId,
                        email: normalizedEmail,
                    });
                }
            } catch (err) {
                logger.warn('[VisitorCheckin] Failed to enroll in weekly campaign', {
                    orgId: validated.orgId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        if (!leadResult.success) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: leadResult.error || 'Failed to capture visitor check-in',
            };
        }

        const existingCustomer = await findExistingCustomer(
            validated.orgId,
            normalizedPhone,
            normalizedEmail,
        );
        const existingCustomerData = existingCustomer?.data() ?? null;
        const existingCustomerEmail = normalizeStoredEmail(existingCustomerData?.email);
        // Only fetch lead data when no customer record exists (fallback for email/name only)
        const [existingOrderHistory, leadFallbackData] = existingCustomerData
            ? await Promise.all([
                existingCustomerEmail
                    ? Promise.resolve<OrderMatchSummary | null>(null)
                    : findExistingOrderHistory(
                        validated.orgId,
                        validated.phone ?? normalizedPhone,
                        normalizedPhone,
                        normalizedEmail,
                    ),
                Promise.resolve<Record<string, unknown> | null>(null),
            ])
            : await Promise.all([
                findExistingOrderHistory(
                    validated.orgId,
                    validated.phone ?? normalizedPhone,
                    normalizedPhone,
                    normalizedEmail,
                ),
                findExistingLead(validated.orgId, normalizedPhone, normalizedEmail)
                    .then((result) => result?.data ?? null),
            ]);
        const returningSource = resolveReturningSource(
            existingCustomerData,
            leadFallbackData,
            existingOrderHistory,
        );

        const customerId = existingCustomer?.id ?? buildPhoneCustomerId(validated.orgId, normalizedPhone);
        const customerRef = db.collection('customers').doc(customerId);
        const loyaltyPoints =
            typeof existingCustomerData?.points === 'number' ? existingCustomerData.points : 0;
        const seededCustomerEmail = normalizedEmail ?? existingOrderHistory?.savedEmail ?? null;
        const seededOrderCount = existingOrderHistory?.orderCount ?? 0;
        const seededTotalSpent = existingOrderHistory?.totalSpent ?? 0;
        const phoneLast4 = getPhoneLast4(normalizedPhone);
        const isReturningCustomer = Boolean(
            existingCustomerData ||
            leadFallbackData ||
            existingOrderHistory ||
            !leadResult.isNewLead,
        );

        const batch = db.batch();

        if (!existingCustomerData) {
            batch.set(customerRef, {
                id: customerId,
                orgId: validated.orgId,
                email: seededCustomerEmail,
                phone: normalizedPhone,
                phoneLast4,
                firstName: validated.firstName,
                totalSpent: seededTotalSpent,
                orderCount: seededOrderCount,
                visitCount: 1,
                avgOrderValue: seededOrderCount > 0 ? seededTotalSpent / seededOrderCount : 0,
                segment: 'new',
                tier: 'bronze',
                points: 0,
                lifetimeValue: seededTotalSpent,
                emailConsent,
                smsConsent,
                source: validated.source,
                firstCheckinMood: validated.mood ?? null,
                lastCheckinMood: validated.mood ?? null,
                preferredCategories: favoriteCategories,
                lastCheckinUiVersion: validated.uiVersion ?? null,
                lastOrderDate: existingOrderHistory?.lastOrderDate ?? null,
                createdAt: now,
                updatedAt: now,
                lastCheckinAt: now,
            });
        } else {
            const customerUpdates: Record<string, unknown> = {
                updatedAt: now,
                lastCheckinAt: now,
            };

            if (!existingCustomerData.firstName && validated.firstName) {
                customerUpdates.firstName = validated.firstName;
            }
            if (normalizedEmail && (!existingCustomerEmail || (emailConsent && normalizedEmail !== existingCustomerEmail))) {
                customerUpdates.email = normalizedEmail;
            }
            if (!existingCustomerData.phone && normalizedPhone) {
                customerUpdates.phone = normalizedPhone;
            }
            if (phoneLast4 && existingCustomerData.phoneLast4 !== phoneLast4) {
                customerUpdates.phoneLast4 = phoneLast4;
            }
            if (emailConsent && !existingCustomerData.emailConsent) {
                customerUpdates.emailConsent = true;
            }
            if (smsConsent && !existingCustomerData.smsConsent) {
                customerUpdates.smsConsent = true;
            }
            if (!existingCustomerData.source) {
                customerUpdates.source = validated.source;
            }
            if (validated.mood && !existingCustomerData.firstCheckinMood) {
                customerUpdates.firstCheckinMood = validated.mood;
            }
            if (validated.mood) {
                customerUpdates.lastCheckinMood = validated.mood;
            }
            if (favoriteCategories.length > 0) {
                customerUpdates.preferredCategories = mergePreferredCategories(
                    existingCustomerData.preferredCategories,
                    favoriteCategories,
                );
            }
            if (validated.uiVersion) {
                customerUpdates.lastCheckinUiVersion = validated.uiVersion;
            }
            customerUpdates.visitCount = FieldValue.increment(1);

            batch.update(customerRef, customerUpdates);
        }

        const visitId = `${customerId}_visit_${now.getTime()}_${randomBytes(3).toString('hex')}`;
        const reviewSequenceEnabled = Boolean(normalizedEmail && emailConsent);
        const visitRef = db.collection('checkin_visits').doc(visitId);

        batch.set(visitRef, {
            visitId,
            orgId: validated.orgId,
            customerId,
            leadId: leadResult.leadId ?? null,
            firstName: validated.firstName,
            email: normalizedEmail ?? null,
            phone: normalizedPhone,
            phoneLast4,
            source: validated.source,
            isReturning: isReturningCustomer,
            returningSource: returningSource ?? null,
            ageVerified: true,
            ageVerifiedMethod: validated.ageVerifiedMethod,
            ageVerifiedAt: now,
            emailConsent,
            smsConsent,
            mood: validated.mood ?? null,
            favoriteCategories,
            uiVersion: validated.uiVersion ?? null,
            offerType: validated.offerType ?? null,
            cartProductIds,
            bundleAdded: Boolean(validated.bundleAdded),
            createdAt: now,
            visitedAt: now,
            reviewSequence: {
                status: reviewSequenceEnabled ? 'pending' : 'skipped_no_email',
                checkoutEmailScheduledAt: now,
                reviewNudgeScheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
                reviewLeft: false,
            },
        });

        await batch.commit();

        // 8b. Kiosk product picks — notify backoffice if customer selected products
        if (cartProductIds.length > 0) {
            notifyKioskPicks({
                orgId: validated.orgId,
                customerId,
                firstName: validated.firstName,
                mood: validated.mood ?? null,
                cartProductIds,
                db,
                now,
            }).catch((err) => {
                logger.warn('[VisitorCheckin] Kiosk pick notification failed', {
                    orgId: validated.orgId,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }

        // 9. Dispatch Playbook Events
        const resolvedEmail = normalizedEmail
            ?? existingCustomerEmail
            ?? normalizeStoredEmail(leadFallbackData?.email)
            ?? existingOrderHistory?.savedEmail
            ?? null;
        const resolvedName = validated.firstName || existingCustomerData?.firstName || leadFallbackData?.firstName;

        if (existingCustomerData && normalizedEmail && normalizedEmail !== existingCustomerEmail) {
            logger.info('[VisitorCheckin] Updated customer email during check-in', {
                orgId: validated.orgId,
                customerId,
                previousEmail: existingCustomerEmail ?? null,
                nextEmail: normalizedEmail,
                source: validated.source,
            });
        }

        if (leadResult.isNewLead && !isReturningCustomer) {
            dispatchPlaybookEvent(validated.orgId, 'customer.signup', {
                customerId,
                customerEmail: resolvedEmail,
                customerPhone: normalizedPhone,
                customerName: resolvedName,
                leadId: leadResult.leadId ?? null,
                source: validated.source,
                eventName: 'customer.signup',
                priorVisits: 0,
                cartProductIds: cartProductIds?.length ? cartProductIds : undefined,
                mood: validated.mood,
            }).catch((error) => {
                logger.warn('[VisitorCheckin] Failed to dispatch customer signup event', {
                    orgId: validated.orgId,
                    customerId,
                    leadId: leadResult.leadId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        } else if (isReturningCustomer) {
            dispatchPlaybookEvent(validated.orgId, 'customer.checkin', {
                customerId,
                customerEmail: resolvedEmail,
                customerPhone: normalizedPhone,
                customerName: resolvedName,
                eventName: 'customer.checkin',
                source: validated.source,
                priorVisits: existingCustomerData?.visitCount ?? 1,
                cartProductIds: cartProductIds?.length ? cartProductIds : undefined,
                mood: validated.mood,
            }).catch((error) => {
                logger.warn('[VisitorCheckin] Failed to dispatch customer checkin event', {
                    orgId: validated.orgId,
                    customerId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        }

        logger.info('[VisitorCheckin] Captured visitor check-in', {
            orgId: validated.orgId,
            customerId,
            leadId: leadResult.leadId,
            visitId,
            source: validated.source,
            isNewLead: leadResult.isNewLead,
            isReturningCustomer,
            returningSource: returningSource ?? null,
            uiVersion: validated.uiVersion ?? null,
            mood: validated.mood ?? null,
            favoriteCategories,
            offerType: validated.offerType ?? null,
        });

        const onboardingResult = await handleCustomerOnboardingSignal({
            type: 'tablet_checkin_captured',
            context: {
                orgId: validated.orgId,
                customerId,
                visitId,
                leadId: leadResult.leadId ?? null,
                firstName: resolvedName ?? validated.firstName,
                email: resolvedEmail,
                emailConsent,
                smsConsent,
                isReturning: isReturningCustomer,
                returningSource: returningSource ?? null,
                mood: validated.mood ?? null,
                source: validated.source,
                loyaltyPoints,
            },
        });

        if (!onboardingResult.success) {
            logger.warn('[VisitorCheckin] Failed to hand off onboarding workflow', {
                orgId: validated.orgId,
                customerId,
                visitId,
                error: onboardingResult.error ?? 'unknown_error',
            });
        }

        // Sync email/phone back to Alleaves customer record (fire-and-forget)
        if (resolvedEmail || normalizedPhone) {
            syncCheckinToAlleaves(validated.orgId, customerId, resolvedEmail, normalizedPhone, db).catch(err => {
                logger.warn('[VisitorCheckin] Alleaves writeback failed (non-fatal)', {
                    orgId: validated.orgId, customerId,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }

        // TODO(blackleaf-sms): Post-visit re-engagement SMS hook.
        // 24h after this visit, send a review request or "How was your visit?" text.
        // Schedule via Cloud Tasks or a cron that queries checkin_visits where
        // visitedAt >= now-25h AND visitedAt <= now-23h AND smsConsent = true
        // AND postVisitSmsSentAt IS NULL. Fire-and-forget via Blackleaf SMS API.

        return {
            success: true,
            isNewLead: leadResult.isNewLead,
            isReturningCustomer,
            customerId,
            leadId: leadResult.leadId,
            visitId,
            loyaltyPoints,
            followupEligibility: {
                emailWelcome: emailConsent,
                smsWelcome: smsConsent,
                reviewSequence: reviewSequenceEnabled,
            },
        };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return {
                success: false,
                isNewLead: false,
                isReturningCustomer: false,
                error: error.errors[0]?.message || 'Invalid visitor check-in payload',
            };
        }

        logger.error('[VisitorCheckin] Failed to capture visitor check-in', {
            error: error instanceof Error ? error.message : String(error),
            request,
        });

        return {
            success: false,
            isNewLead: false,
            isReturningCustomer: false,
            error: error instanceof Error ? error.message : 'Failed to capture visitor check-in',
        };
    }
}
