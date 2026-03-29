'use server';

import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';
import { isBrandRole, isDispensaryRole, normalizeRole } from '@/types/roles';
import { PLANS } from '@/lib/plans';
import { logger } from '@/lib/logger';
import type { CRMLifecycleStage, CRMUser } from './crm-types';

export interface CRMBrand {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    description?: string | null;
    source: 'discovery' | 'claim' | 'import' | 'system';
    discoveredFrom?: string[]; // Array of dispensary IDs where found
    states: string[];
    isNational: boolean;
    city?: string | null;
    state?: string | null;
    seoPageId?: string | null;
    claimedOrgId?: string | null;
    claimStatus: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    discoveredAt: number;
    updatedAt: number;
    claimedBy?: string | null;
    claimedAt?: number | null;
}

export interface CRMDispensary {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    address: string;
    city: string;
    state: string;
    zip: string;
    website?: string | null;
    phone?: string | null;
    description?: string | null;
    source: 'discovery' | 'claim' | 'import' | 'system';
    seoPageId?: string | null;
    claimedOrgId?: string | null;
    claimStatus: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    invitationSentAt?: number | null;
    discoveredAt: number;
    updatedAt: number;
    retailerId?: string | null;
    claimedBy?: string | null;
    claimedAt?: number | null;
}

export interface CRMFilters {
    state?: string;
    claimStatus?: 'unclaimed' | 'invited' | 'pending' | 'claimed';
    isNational?: boolean;
    search?: string;
    limit?: number;
    lifecycleStage?: CRMLifecycleStage;
    /** Only return users who signed up on or after this date */
    signupAfter?: Date;
    /** Include test accounts in results (default: false — test accounts excluded) */
    includeTest?: boolean;
    /** Filter by lead source (e.g. 'fff_audit') */
    source?: string;
}

// NOTE: LIFECYCLE_STAGE_CONFIG, CRMLifecycleStage, and CRMUser are in crm-types.ts
// Import them directly from '@/server/services/crm-types' - cannot re-export from 'use server' file

/**
 * Create a URL-safe slug from a name
 */
function createSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

const VALID_LIFECYCLE_STAGES: readonly CRMLifecycleStage[] = [
    'prospect',
    'contacted',
    'demo_scheduled',
    'trial',
    'customer',
    'vip',
    'churned',
    'winback',
] as const;

function normalizeLifecycleStage(value: unknown): CRMLifecycleStage | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return (VALID_LIFECYCLE_STAGES as readonly string[]).includes(trimmed)
        ? (trimmed as CRMLifecycleStage)
        : null;
}

function coerceDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') {
        try {
            const d = value.toDate();
            return d instanceof Date ? d : null;
        } catch {
            return null;
        }
    }
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? new Date(parsed) : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return new Date(value);
    }
    return null;
}

function toMillisOrZero(value: any): number {
    return coerceDate(value)?.getTime() || 0;
}

function coerceNumber(value: any): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
}

function extractProviderId(data: any): string {
    return typeof data?.providerSubscriptionId === 'string'
        ? data.providerSubscriptionId.trim()
        : typeof data?.authorizeNetSubscriptionId === 'string'
            ? data.authorizeNetSubscriptionId.trim()
            : '';
}

function resolveOrgIdFromUserDoc(data: any): string | null {
    const candidates: unknown[] = [
        data?.currentOrgId,
        Array.isArray(data?.organizationIds) ? data.organizationIds[0] : null,
        data?.brandId,
        data?.locationId,
        data?.dispensaryId,
        data?.organizationId,
        data?.orgId,
        data?.tenantId,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }

    return null;
}

function planNameFromId(planId: unknown): string | null {
    if (typeof planId !== 'string' || !planId.trim()) return null;
    return planId in PLANS ? PLANS[planId as keyof typeof PLANS].name : planId;
}

async function loadSubscriptionCurrentByOrgIds(
    firestore: FirebaseFirestore.Firestore,
    orgIds: Set<string>
): Promise<Map<string, any>> {
    if (orgIds.size === 0) return new Map();
    const results = new Map<string, any>();
    const ids = Array.from(orgIds).filter(Boolean);

    // Individual reads — run all concurrently. collectionGroup queries on
    // 'subscription' require a composite index that may not exist.
    const snaps = await Promise.all(
        ids.map(async (orgId) => {
            try {
                return {
                    orgId,
                    snap: await firestore
                        .collection('organizations')
                        .doc(orgId)
                        .collection('subscription')
                        .doc('current')
                        .get(),
                };
            } catch (err) {
                logger.error('[CRM] Failed to fetch subscription for org:', { orgId, error: String(err) });
                return null;
            }
        })
    );

    for (const entry of snaps) {
        if (entry && entry.snap.exists) {
            results.set(entry.orgId, entry.snap.data());
        }
    }

    return results;
}

/**
 * Upsert a brand - adds state to existing brand or creates new
 */
export async function upsertBrand(
    name: string,
    state: string,
    data: Partial<Pick<CRMBrand, 'logoUrl' | 'website' | 'description' | 'source' | 'discoveredFrom' | 'seoPageId'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Use top-level collection as per approved plan
    const collection = firestore.collection('crm_brands');

    // Check for existing brand by slug
    const existingQuery = await collection
        .where('slug', '==', slug)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Update existing brand - add state if not present
        const doc = existingQuery.docs[0];
        const existing = doc.data() as CRMBrand;
        const states = existing.states || [];

        if (!states.includes(state)) {
            states.push(state);
        }

        const discoveredFrom = existing.discoveredFrom || [];
        if (data.discoveredFrom) {
            data.discoveredFrom.forEach(id => {
                if (!discoveredFrom.includes(id)) {
                    discoveredFrom.push(id);
                }
            });
        }

        await doc.ref.update({
            states,
            discoveredFrom,
            isNational: states.length >= 3,
            updatedAt: FieldValue.serverTimestamp(),
            ...(data.logoUrl && { logoUrl: data.logoUrl }),
            ...(data.website && { website: data.website }),
            ...(data.description && { description: data.description }),
            ...(data.seoPageId && { seoPageId: data.seoPageId }),
        });

        return doc.id;
    } else {
        // Create new brand
        const brandRef = collection.doc();

        const brand: CRMBrand = {
            id: brandRef.id,
            name,
            slug,
            states: [state],
            isNational: false,
            claimStatus: 'unclaimed',
            source: data.source || 'discovery',
            logoUrl: data.logoUrl || null,
            website: data.website || null,
            description: data.description || null,
            discoveredFrom: data.discoveredFrom || [],
            seoPageId: data.seoPageId || null,
        };

        await brandRef.set({
            ...brand,
            discoveredAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return brandRef.id;
    }
}

/**
 * Upsert a dispensary - creates if not exists for the given state
 */
export async function upsertDispensary(
    name: string,
    state: string,
    city: string,
    data: Partial<Pick<CRMDispensary, 'address' | 'zip' | 'website' | 'phone' | 'retailerId' | 'source' | 'seoPageId'>> = {}
): Promise<string> {
    const firestore = getAdminFirestore();
    const slug = createSlug(name);

    // Use top-level collection as per approved plan
    const collection = firestore.collection('crm_dispensaries');

    // Check for existing dispensary by slug + state + city (allow same name in different locations)
    const existingQuery = await collection
        .where('slug', '==', slug)
        .where('state', '==', state)
        .where('city', '==', city)
        .limit(1)
        .get();

    if (!existingQuery.empty) {
        // Already exists for this location, just return the ID
        const doc = existingQuery.docs[0];
        return doc.id;
    } else {
        // Create new dispensary
        const dispRef = collection.doc();

        const dispensary: Omit<CRMDispensary, 'discoveredAt' | 'updatedAt'> = {
            id: dispRef.id,
            name,
            slug,
            address: data.address || '',
            city,
            state,
            zip: data.zip || '',
            website: data.website || null,
            phone: data.phone || null,
            source: data.source || 'discovery',
            claimStatus: 'unclaimed',
            retailerId: data.retailerId || null,
            seoPageId: data.seoPageId || null,
        };

        await dispRef.set({
            ...dispensary,
            discoveredAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return dispRef.id;
    }
}

/**
 * Get brands with optional filtering
 */
export async function getBrands(filters: CRMFilters = {}): Promise<CRMBrand[]> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('crm_brands')
        .orderBy('name', 'asc');

    if (filters.claimStatus) {
        query = query.where('claimStatus', '==', filters.claimStatus);
    }

    if (filters.isNational !== undefined) {
        query = query.where('isNational', '==', filters.isNational);
    }

    const snapshot = await query.limit(filters.limit || 100).get();

    let brands = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            discoveredAt: toMillisOrZero(data.discoveredAt) || Date.now(),
            updatedAt: toMillisOrZero(data.updatedAt) || Date.now(),
            claimedAt: data.claimedAt ? toMillisOrZero(data.claimedAt) : null,
        } as CRMBrand;
    });

    // Filter by state (client-side since Firestore can't do array-contains with other filters easily)
    if (filters.state) {
        brands = brands.filter(b => b.states.includes(filters.state!));
    }

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        brands = brands.filter(b => b.name.toLowerCase().includes(search));
    }

    return brands;
}

/**
 * Get dispensaries with optional filtering
 */
export async function getDispensaries(filters: CRMFilters = {}): Promise<CRMDispensary[]> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    let query = firestore
        .collection('crm_dispensaries')
        .orderBy('name', 'asc');

    if (filters.state) {
        query = query.where('state', '==', filters.state);
    }

    if (filters.claimStatus) {
        query = query.where('claimStatus', '==', filters.claimStatus);
    }

    const snapshot = await query.limit(filters.limit || 100).get();

    let dispensaries = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            discoveredAt: toMillisOrZero(data.discoveredAt) || Date.now(),
            updatedAt: toMillisOrZero(data.updatedAt) || Date.now(),
            claimedAt: data.claimedAt ? toMillisOrZero(data.claimedAt) : null,
            invitationSentAt: data.invitationSentAt ? toMillisOrZero(data.invitationSentAt) : null,
        } as CRMDispensary;
    });

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        dispensaries = dispensaries.filter(d =>
            d.name.toLowerCase().includes(search) ||
            d.city.toLowerCase().includes(search)
        );
    }

    return dispensaries;
}

/**
 * Get CRM stats
 */
export async function getCRMStats(): Promise<{
    totalBrands: number;
    nationalBrands: number;
    claimedBrands: number;
    totalDispensaries: number;
    claimedDispensaries: number;
    totalPlatformLeads: number;
}> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();

    const brandsSnap = await firestore
        .collection('crm_brands')
        .get();

    const dispensariesSnap = await firestore
        .collection('crm_dispensaries')
        .get();

    const leadsSnap = await firestore
        .collection('leads')
        .get();

    const brands = brandsSnap.docs.map(d => d.data());
    const dispensaries = dispensariesSnap.docs.map(d => d.data());

    return {
        totalBrands: brands.length,
        nationalBrands: brands.filter(b => b.isNational).length,
        claimedBrands: brands.filter(b => b.claimStatus === 'claimed').length,
        totalDispensaries: dispensaries.length,
        claimedDispensaries: dispensaries.filter(d => d.claimStatus === 'claimed').length,
        totalPlatformLeads: leadsSnap.size,
    };
}

export interface CRMLead {
    id: string;
    email: string;
    company: string;
    source: string;
    status: string;
    demoCount: number;
    createdAt: number;
    // FFF Audit fields (populated when source === 'fff_audit')
    firstName?: string;
    businessType?: 'dispensary' | 'brand';
    websiteUrl?: string;
    state?: string;
    fffScore?: number;
    fffScoreLabel?: string;
    fffLeadStatus?: string;
    claimRecommended?: boolean;
    auditReportId?: string;
}

/**
 * Get platform leads (inbound B2B)
 */
export async function getPlatformLeads(filters: CRMFilters = {}): Promise<CRMLead[]> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    let query: FirebaseFirestore.Query = firestore
        .collection('leads')
        .orderBy('createdAt', 'desc');

    if (filters.source) {
        query = query.where('source', '==', filters.source);
    }

    query = query.limit(filters.limit ?? 100);

    const snapshot = await query.get();

    let leads = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            email: data.email,
            company: data.company || data.websiteUrl || '',
            source: data.source || 'unknown',
            status: data.status || data.fffLeadStatus || 'new',
            demoCount: data.demoCount || 0,
            createdAt: toMillisOrZero(data.createdAt),
            firstName: data.firstName,
            businessType: data.businessType,
            websiteUrl: data.websiteUrl,
            state: data.state,
            fffScore: typeof data.fffScore === 'number' ? data.fffScore : undefined,
            fffScoreLabel: data.fffScoreLabel,
            fffLeadStatus: data.fffLeadStatus,
            claimRecommended: data.claimRecommended === true,
            auditReportId: data.auditReportId,
        } as CRMLead;
    });

    // Filter by search (client-side)
    if (filters.search) {
        const search = filters.search.toLowerCase();
        leads = leads.filter(l =>
            l.email.toLowerCase().includes(search) ||
            (l.company || '').toLowerCase().includes(search) ||
            (l.firstName || '').toLowerCase().includes(search)
        );
    }

    return leads;
}

export interface CreateFFFLeadRequest {
    email: string;
    firstName?: string;
    businessType: 'dispensary' | 'brand';
    state: string;
    websiteUrl?: string;
    fffScore: number;
    fffScoreLabel: string;
    fffLeadStatus: string;
    claimRecommended: boolean;
    auditReportId: string;
    emailLeadId: string;
    topLeakBuckets?: string[];
}

/**
 * Create or upsert a CRM lead record when an FFF Audit is submitted.
 * Writes to the `leads` collection. Returns the lead doc ID.
 */
export async function createFFFAuditLead(req: CreateFFFLeadRequest): Promise<string> {
    const db = getAdminFirestore();
    const now = Date.now();

    // Dedupe: check for existing lead with same email + source
    const existing = await db
        .collection('leads')
        .where('email', '==', req.email)
        .where('source', '==', 'fff_audit')
        .limit(1)
        .get();

    if (!existing.empty) {
        const docRef = existing.docs[0].ref;
        await docRef.update({
            fffScore: req.fffScore,
            fffScoreLabel: req.fffScoreLabel,
            fffLeadStatus: req.fffLeadStatus,
            claimRecommended: req.claimRecommended,
            auditReportId: req.auditReportId,
            emailLeadId: req.emailLeadId,
            topLeakBuckets: req.topLeakBuckets || [],
            updatedAt: now,
        });
        return existing.docs[0].id;
    }

    const docRef = await db.collection('leads').add({
        email: req.email,
        firstName: req.firstName,
        company: req.websiteUrl || '',
        websiteUrl: req.websiteUrl || '',
        businessType: req.businessType,
        state: req.state,
        source: 'fff_audit',
        status: req.fffLeadStatus,
        fffScore: req.fffScore,
        fffScoreLabel: req.fffScoreLabel,
        fffLeadStatus: req.fffLeadStatus,
        claimRecommended: req.claimRecommended,
        auditReportId: req.auditReportId,
        emailLeadId: req.emailLeadId,
        topLeakBuckets: req.topLeakBuckets || [],
        demoCount: 0,
        createdAt: now,
        updatedAt: now,
    });

    return docRef.id;
}

// ============================================================================
// Platform Users (Full CRM)
// ============================================================================

/**
 * Pre-fetch the top-level subscriptions collection. Pass the result to
 * getPlatformUsers and getCRMUserStats via their preloadedTopLevelSubsDocs
 * param to avoid scanning the collection twice on the same request.
 */
export async function getTopLevelSubsDocs(): Promise<QueryDocumentSnapshot[]> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('subscriptions').get();
    return snapshot.docs;
}

/**
 * Get all platform users with lifecycle tracking and MRR
 */
export async function getPlatformUsers(
    filters: CRMFilters = {},
    preloadedTopLevelSubsDocs?: QueryDocumentSnapshot[]
): Promise<CRMUser[]> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('users').get();

    const rawUsers = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() as any }));

    const orgIds = new Set<string>();
    for (const { data } of rawUsers) {
        const resolvedOrgId = resolveOrgIdFromUserDoc(data);
        if (resolvedOrgId) orgIds.add(resolvedOrgId);
    }

    const subscriptionByOrgId = await loadSubscriptionCurrentByOrgIds(firestore, orgIds);

    // Top-level subscriptions are created via /checkout and some legacy flows.
    // Without these, the CEO CRM will show "Free" for paying users who didn't
    // go through organizations/{orgId}/subscription/current.
    type TopLevelSub = {
        status: string;
        monthlyAmount: number;
        planName: string | null;
        providerSubscriptionId: string | null;
    };

    const normalizeIntervalMonths = (data: any): number => {
        const raw = data?.intervalMonths;
        if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;

        const billingPeriod = String(data?.billingPeriod || '').toLowerCase();
        if (billingPeriod === 'annual' || billingPeriod === 'yearly') return 12;

        return 1;
    };

    const pickBestPlanName = (subs: TopLevelSub[]): string | null => {
        const withPlan = subs.filter((s) => typeof s.planName === 'string' && s.planName.trim());
        if (withPlan.length === 0) return null;
        withPlan.sort((a, b) => (b.monthlyAmount || 0) - (a.monthlyAmount || 0));
        return withPlan[0].planName || null;
    };

    const orgProviderSubscriptionIds = new Set<string>();
    for (const sub of subscriptionByOrgId.values()) {
        const providerId = typeof sub?.providerSubscriptionId === 'string' ? sub.providerSubscriptionId.trim() : '';
        if (providerId) orgProviderSubscriptionIds.add(providerId);
    }

    const topLevelSubsByEmail = new Map<string, Map<string, TopLevelSub>>();
    try {
        const subsDocs = preloadedTopLevelSubsDocs ?? (await firestore.collection('subscriptions').get()).docs;
        subsDocs.forEach((doc) => {
            const data = doc.data() as any;

            const status = String(data?.status || '').toLowerCase();
            // Keep this list small; we only need enough to infer lifecycle + revenue.
            if (!['active', 'trialing', 'past_due', 'canceled', 'cancelled'].includes(status)) return;

            const providerId = extractProviderId(data);
            if (providerId && orgProviderSubscriptionIds.has(providerId)) return;

            const rawEmail =
                (typeof data?.customer?.email === 'string' ? data.customer.email : null) ??
                (typeof data?.email === 'string' ? data.email : null) ??
                (typeof data?.userEmail === 'string' ? data.userEmail : null);
            const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
            if (!email) return;

            const amount = coerceNumber(data?.price ?? data?.amount);
            const intervalMonths = normalizeIntervalMonths(data);
            const monthly = amount > 0 ? amount / intervalMonths : 0;
            if (!Number.isFinite(monthly) || monthly <= 0) return;

            const planName =
                (typeof data?.planName === 'string' ? data.planName : null) ||
                planNameFromId(data?.planId) ||
                planNameFromId(data?.plan) ||
                null;

            const entry: TopLevelSub = {
                status,
                monthlyAmount: Math.round(monthly * 100) / 100,
                planName,
                providerSubscriptionId: providerId || null,
            };

            const key = providerId || doc.id;
            const existing = topLevelSubsByEmail.get(email) || new Map<string, TopLevelSub>();
            const prev = existing.get(key);
            if (!prev || entry.monthlyAmount > prev.monthlyAmount) {
                existing.set(key, entry);
            }
            topLevelSubsByEmail.set(email, existing);
        });
    } catch (error) {
        logger.error('[CRM] Failed to load top-level subscriptions:', { error: String(error) });
    }

    let users = rawUsers.map(({ id, data }) => {
        const normalizedRole = normalizeRole(typeof data.role === 'string' ? data.role : null);

        // Determine account type from role (source of truth) with org context fallback.
        let accountType: CRMUser['accountType'] = 'customer';
        if (normalizedRole === 'super_user' || normalizedRole === 'super_admin') accountType = 'superuser';
        else if (isBrandRole(normalizedRole)) accountType = 'brand';
        else if (isDispensaryRole(normalizedRole)) accountType = 'dispensary';

        const resolvedOrgId = resolveOrgIdFromUserDoc(data);
        const subscription = resolvedOrgId ? subscriptionByOrgId.get(resolvedOrgId) : null;

        const orgStatus = typeof subscription?.status === 'string' ? String(subscription.status).toLowerCase() : null;
        const orgAmount = coerceNumber(subscription?.amount);
        const orgIsPaying = orgStatus === 'active' && orgAmount > 0;
        const orgMrr = orgIsPaying ? Math.round(orgAmount * 100) / 100 : 0;

        const subscriptionPlanName = planNameFromId(subscription?.planId);
        const userPlanName = planNameFromId(data?.billing?.planId) ||
            planNameFromId(data?.planId) ||
            planNameFromId(data?.plan) ||
            null;

        const emailKey = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
        const topSubs = emailKey ? Array.from((topLevelSubsByEmail.get(emailKey) || new Map()).values()) : [];
        const activeTopSubs = topSubs.filter((s) => s.status === 'active' && s.monthlyAmount > 0);
        const trialTopSubs = topSubs.filter((s) => s.status === 'trialing' && s.monthlyAmount > 0);

        const topMrr = Math.round(activeTopSubs.reduce((sum, s) => sum + s.monthlyAmount, 0) * 100) / 100;
        const topPlanName = pickBestPlanName(activeTopSubs) || pickBestPlanName(trialTopSubs) || null;

        const plan = subscriptionPlanName || topPlanName || userPlanName || 'Free';
        const mrr = Math.round((orgMrr + topMrr) * 100) / 100;
        const isPaying = mrr > 0 && (orgIsPaying || activeTopSubs.length > 0);

        // Determine lifecycle stage (prefer explicit, otherwise infer from billing/subscription state)
        const explicitStage = normalizeLifecycleStage(data.lifecycleStage);
        let lifecycleStage: CRMLifecycleStage = explicitStage || 'prospect';

        if (!explicitStage) {
            const hasTopStatus = (status: string) => topSubs.some((s) => s.status === status);

            if (orgStatus === 'canceled' || orgStatus === 'cancelled' || hasTopStatus('canceled') || hasTopStatus('cancelled')) {
                lifecycleStage = 'churned';
            } else if (orgStatus === 'past_due' || hasTopStatus('past_due')) {
                lifecycleStage = 'winback';
            } else if (isPaying) {
                // Treat higher tiers as VIP (simple heuristic); otherwise a standard customer.
                const isVip = mrr >= 349 || String(subscription?.planId || '').toLowerCase().includes('empire');
                lifecycleStage = isVip ? 'vip' : 'customer';
            } else if (orgStatus === 'trialing' || trialTopSubs.length > 0 || data.claimedAt) {
                lifecycleStage = 'trial';
            } else if (data.createdAt) {
                lifecycleStage = 'prospect';
            }
        }

        const signupAt = coerceDate(data.createdAt) || coerceDate(data.signupAt) || new Date(0);
        const lastLoginAt = coerceDate(data.lastLoginAt) || coerceDate(data.lastLogin) || null;
        const isTestMarkedAt = coerceDate(data.isTestMarkedAt) || null;

        return {
            id,
            email: data.email || '',
            displayName: data.displayName || data.name || 'Unknown',
            photoUrl: data.photoURL || data.photoUrl || null,
            accountType,
            lifecycleStage,
            signupAt: signupAt.getTime(),
            lastLoginAt: lastLoginAt?.getTime() || null,
            plan,
            mrr,
            orgId: resolvedOrgId,
            orgName: data.orgName || null,
            notes: data.crmNotes || null,
            approvalStatus: data.approvalStatus || 'approved', // Default to approved for legacy/existing
            isTestAccount: data.isTestAccount === true,
            isTestMarkedAt: isTestMarkedAt?.getTime() || null,
        } as CRMUser;
    });

    // Filter out test accounts by default (include only if explicitly requested)
    if (!filters.includeTest) {
        users = users.filter(u => !u.isTestAccount);
    }

    // Filter by lifecycle stage
    if (filters.lifecycleStage) {
        users = users.filter(u => u.lifecycleStage === filters.lifecycleStage);
    }

    // Filter by search
    if (filters.search) {
        const search = filters.search.toLowerCase();
        users = users.filter(u =>
            u.email.toLowerCase().includes(search) ||
            u.displayName.toLowerCase().includes(search) ||
            (u.orgName?.toLowerCase().includes(search) ?? false)
        );
    }

    // Filter by signup date (enables "who signed up this week?" queries)
    if (filters.signupAfter) {
        const cutoff = filters.signupAfter.getTime();
        users = users.filter(u => u.signupAt >= cutoff);
    }

    // Sort by signupAt desc (Newest first)
    // Handle nulls by pushing them to the end or treating as old
    users.sort((a, b) => {
        const timeA = a.signupAt || 0;
        const timeB = b.signupAt || 0;
        return timeB - timeA;
    });

    const maxResults = filters.limit ?? 200;
    return users.slice(0, maxResults);
}

/**
 * Get CRM user stats for dashboard
 */
export async function getCRMUserStats(
    preloadedUsers?: CRMUser[],
    preloadedTopLevelSubsDocs?: QueryDocumentSnapshot[]
): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalMRR: number;
    byLifecycle: Record<CRMLifecycleStage, number>;
}> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();

    // Revenue source of truth: subscriptions collection (normalized to MRR)
    // Fallback: organizations/{orgId}/subscription/current (legacy billing)
    let totalMRR = 0;
    try {
        const coerceAmount = (value: unknown): number => {
            if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
            if (typeof value === 'string') {
                const n = Number(value);
                return Number.isFinite(n) ? n : 0;
            }
            return 0;
        };

        const normalizeIntervalMonths = (data: any): number => {
            const raw = data?.intervalMonths;
            if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;

            const billingPeriod = String(data?.billingPeriod || '').toLowerCase();
            if (billingPeriod === 'annual' || billingPeriod === 'yearly') return 12;

            return 1;
        };

        const orgProviderSubscriptionIds = new Set<string>();

        // 1) Primary: org subscription docs via individual reads (no composite index needed)
        const orgIds = new Set<string>(
            (preloadedUsers ?? []).map(u => u.orgId).filter((id): id is string => Boolean(id))
        );
        if (orgIds.size > 0) {
            const orgSubDocs = await loadSubscriptionCurrentByOrgIds(firestore, orgIds);
            orgSubDocs.forEach((data, _orgId) => {
                const status = String(data?.status || '').toLowerCase();
                if (status !== 'active') return;

                const providerId = extractProviderId(data);
                if (providerId) orgProviderSubscriptionIds.add(providerId);

                const amount = coerceAmount(data?.amount);
                if (amount > 0) totalMRR += amount;
            });
        }

        // 2) Add-ons / legacy: top-level subscriptions collection
        const topLevelDocs = preloadedTopLevelSubsDocs ?? (await firestore.collection('subscriptions').get()).docs;

        // Dedupe within the top-level collection too to avoid double counting legacy duplicates.
        const topLevelByKey = new Map<string, number>();

        topLevelDocs.forEach((doc) => {
            const data = doc.data() as any;
            const status = String(data?.status || '').toLowerCase();
            // MRR should reflect revenue from active subscriptions only (exclude trialing).
            if (status !== 'active') return;

            const providerId = extractProviderId(data);
            if (providerId && orgProviderSubscriptionIds.has(providerId)) return;

            const amount = coerceAmount(data?.price ?? data?.amount);
            if (!(amount > 0)) return;

            const intervalMonths = normalizeIntervalMonths(data);
            const monthly = amount / intervalMonths;
            if (!Number.isFinite(monthly) || monthly <= 0) return;

            const key = providerId || doc.id;
            const existing = topLevelByKey.get(key);
            if (existing === undefined || monthly > existing) {
                topLevelByKey.set(key, monthly);
            }
        });

        for (const monthly of topLevelByKey.values()) {
            totalMRR += monthly;
        }

        totalMRR = Math.round(totalMRR * 100) / 100;
    } catch (error) {
        logger.error('[CRM] Failed to aggregate MRR from subscriptions:', { error: String(error) });
        totalMRR = 0;
    }

    // Use getPlatformUsers() for lifecycle + active counts so stats always match
    // the crmListUsers tool (same subscription-aware inference logic).
    // If callers pre-fetch users they can pass them here to avoid a duplicate scan.
    let allUsers: CRMUser[] = preloadedUsers ?? [];
    if (!preloadedUsers) {
        try {
            allUsers = await getPlatformUsers();
        } catch (error) {
            logger.error('[CRM] Failed to load users for stats:', { error: String(error) });
        }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let activeUsers = 0;
    const byLifecycle: Record<CRMLifecycleStage, number> = {
        prospect: 0,
        contacted: 0,
        demo_scheduled: 0,
        trial: 0,
        customer: 0,
        vip: 0,
        churned: 0,
        winback: 0,
    };

    for (const user of allUsers) {
        if (user.lastLoginAt && new Date(user.lastLoginAt) >= sevenDaysAgo) {
            activeUsers++;
        }
        if (byLifecycle[user.lifecycleStage] !== undefined) {
            byLifecycle[user.lifecycleStage]++;
        }
    }

    return {
        totalUsers: allUsers.length,
        activeUsers,
        totalMRR,
        byLifecycle,
    };
}

/**
 * Update user lifecycle stage
 */
export async function updateUserLifecycle(
    userId: string,
    stage: CRMLifecycleStage,
    note?: string
): Promise<void> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();

    const updateData: any = {
        lifecycleStage: stage,
        lifecycleUpdatedAt: new Date(),
    };

    if (note) {
        updateData.crmNotes = note;
    }

    await firestore.collection('users').doc(userId).update(updateData);
}

/**
 * Add CRM note to user
 */
export async function addCRMNote(
    userId: string,
    note: string,
    authorId: string
): Promise<void> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();

    await firestore.collection('users').doc(userId).collection('crm_notes').add({
        note,
        authorId,
        createdAt: new Date(),
    });
}

/**
 * Mark a user as a test account (excludes them from CRM stats and metrics)
 */
export async function markAccountAsTest(userId: string, isTest: boolean): Promise<void> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    await firestore.collection('users').doc(userId).update({
        isTestAccount: isTest,
        isTestMarkedAt: isTest ? new Date() : null,
    });
}

/**
 * Get count of test accounts (for stats footnote)
 */
export async function getTestAccountCount(): Promise<number> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();
    const snap = await firestore.collection('users').where('isTestAccount', '==', true).get();
    return snap.size;
}

/**
 * Delete all documents in known user subcollections (batch delete, max 500 per collection)
 */
async function deleteUserSubcollections(
    firestore: FirebaseFirestore.Firestore,
    uid: string
): Promise<void> {
    const subcollections = [
        'crm_notes', 'sessions', 'integrations', 'notifications', 'passport',
        'chat_sessions', 'drop_alerts', 'user_sessions', 'tasks',
    ];
    for (const sub of subcollections) {
        try {
            const snap = await firestore
                .collection('users').doc(uid)
                .collection(sub)
                .limit(500)
                .get();
            if (!snap.empty) {
                const batch = firestore.batch();
                snap.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch {
            // Subcollection may not exist — safe to ignore
        }
    }
}

/**
 * Delete a CRM entity (Brand, Dispensary, or User with full cascade)
 * Only for admin cleanup
 */
export async function deleteCrmEntity(
    id: string,
    type: 'brand' | 'dispensary' | 'user'
): Promise<void> {
    await requireUser(['super_user']);
    const firestore = getAdminFirestore();

    if (type === 'user') {
        const auth = getAdminAuth();
        // 1. Delete from Firebase Auth
        try {
            await auth.deleteUser(id);
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                logger.error('[CRM] Error deleting user from Auth:', { error: String(error) });
            }
        }
        // 2. Delete all subcollections
        await deleteUserSubcollections(firestore, id);
        // 3. Delete main user doc
        await firestore.collection('users').doc(id).delete();
        return;
    }

    const collection = type === 'brand' ? 'crm_brands' : 'crm_dispensaries';
    await firestore.collection(collection).doc(id).delete();
}

/**
 * Force delete a user by email (useful for cleanup of zombie users)
 */
export async function deleteUserByEmail(email: string): Promise<string> {
    await requireUser(['super_user']);
    const auth = getAdminAuth();
    const firestore = getAdminFirestore();
    let result = '';

    try {
        // 1. Delete from Auth
        try {
            const user = await auth.getUserByEmail(email);
            if (user) {
                await auth.deleteUser(user.uid);
                // 2. Delete main doc
                await firestore.collection('users').doc(user.uid).delete();
                result += `Deleted Auth user ${user.uid}. `;
            }
        } catch (e: any) {
             if (e.code === 'auth/user-not-found') {
                 result += 'User not found in Auth. ';
             } else {
                 throw e;
             }
        }

        // 3. Delete any orphaned docs with this email
        const snap = await firestore.collection('users').where('email', '==', email).get();
        if (!snap.empty) {
            const batch = firestore.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            result += `Deleted ${snap.size} orphaned Firestore documents.`;
        } else {
            result += 'No orphaned documents found.';
        }

    } catch (error: any) {
        logger.error('[CRM] Error in deleteUserByEmail:', { error: String(error) });
        throw error;
    }
    
    return result;
}
