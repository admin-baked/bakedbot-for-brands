'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { fetchSeoKpis, type SeoKpis } from '@/lib/seo-kpis';
import {
    FootTrafficMetrics,
    BrandCTAType,
    CSVPreview,
    BulkImportResult,
    DispensarySEOPage,
    LocalSEOPage,
    BrandSEOPage,
    CreateBrandPageInput,
} from '@/types/foot-traffic';
import {
    getZipCodeCoordinates,
    getRetailersByZipCode,
    discoverNearbyProducts
} from '@/server/services/geo-discovery';
import type { CRMBrand, CRMDispensary } from '@/server/services/crm-service';
import { logger } from '@/lib/logger';
import { ActionResult } from './types';

// Map for CSV import
const VALID_STATES = ['CA', 'CO', 'IL', 'MI', 'NY', 'OH', 'NV', 'OR', 'WA'];
const VALID_CTA_TYPES = ['Order Online', 'View Products', 'Pickup In-Store', 'Learn More'];
const CTA_TYPE_MAP: Record<string, BrandCTAType> = {
    'order online': 'order_online',
    'view products': 'view_products',
    'pickup in-store': 'in_store_pickup',
    'learn more': 'learn_more',
};

export type SyncDiscoveryPagesFromCrmOptions = {
    publish?: boolean;
    includeZipPages?: boolean;
    includeDispensaryPages?: boolean;
    includeBrandPages?: boolean;
    brandsLimit?: number;
    dispensariesLimit?: number;
};

export type SyncDiscoveryPagesFromCrmResult = ActionResult & {
    created: {
        zipPages: number;
        dispensaryPages: number;
        brandPages: number;
    };
    skipped: {
        zipPages: number;
        dispensaryPages: number;
        brandPages: number;
        brandsWithoutCoverage: number;
    };
};

type TimestampLike = {
    toDate?: () => Date;
};

function coerceDate(value: unknown): Date {
    if (value instanceof Date) {
        return value;
    }

    if (value && typeof value === 'object' && typeof (value as TimestampLike).toDate === 'function') {
        try {
            return (value as TimestampLike).toDate?.() || new Date();
        } catch {
            return new Date();
        }
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return new Date();
}

function getUpdatedAtScore(value: { updatedAt?: Date; createdAt?: Date }): number {
    return value.updatedAt?.getTime() || value.createdAt?.getTime() || 0;
}

function dedupeById<T extends { id: string; updatedAt?: Date; createdAt?: Date }>(items: T[]): T[] {
    const deduped = new Map<string, T>();

    for (const item of items) {
        const existing = deduped.get(item.id);
        if (!existing || getUpdatedAtScore(item) >= getUpdatedAtScore(existing)) {
            deduped.set(item.id, item);
        }
    }

    return Array.from(deduped.values());
}

function slugifyValue(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function normalizeZipCode(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    const digits = String(value).replace(/\D/g, '');
    if (digits.length < 5) {
        return null;
    }

    return digits.slice(0, 5);
}

function normalizeState(value: unknown): string {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function buildZipRetailerSummaries(dispensaries: CRMDispensary[]) {
    return dispensaries.map((dispensary) => ({
        id: dispensary.id,
        name: dispensary.name,
        address: dispensary.address || '',
        city: dispensary.city || '',
        state: normalizeState(dispensary.state),
        postalCode: normalizeZipCode(dispensary.zip) || '',
        phone: dispensary.phone || null,
        website: dispensary.website || null,
    }));
}

function buildZipPageFromDispensaries(
    zipCode: string,
    city: string,
    state: string,
    dispensaries: CRMDispensary[],
    published: boolean
): LocalSEOPage {
    const nearbyRetailers = buildZipRetailerSummaries(dispensaries);
    const now = new Date();

    return {
        id: zipCode,
        zipCode,
        city,
        state,
        pageType: 'zip',
        featuredDispensaryId: dispensaries[0]?.id || null,
        featuredDispensaryName: dispensaries[0]?.name || null,
        content: {
            title: `Cannabis Dispensaries Near ${zipCode}`,
            metaDescription: `Discover dispensaries and cannabis shopping options serving ${city}, ${state} ${zipCode}.`,
            h1: `Cannabis Dispensaries Near ${zipCode}`,
            introText: `Explore licensed dispensaries serving ${city}, ${state}. This page was seeded from verified CRM records so Super Users can expand and optimize discovery coverage faster.`,
            topStrains: [],
            topDeals: [],
            nearbyRetailers,
            categoryBreakdown: [],
        },
        structuredData: {
            localBusiness: {
                '@type': 'CollectionPage',
                name: `Cannabis Dispensaries Near ${zipCode}`,
                about: `${city}, ${state} cannabis discovery`,
            },
            products: [],
            breadcrumb: {
                '@type': 'BreadcrumbList',
                itemListElement: [],
            },
        },
        lastRefreshed: now,
        nextRefresh: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        refreshFrequency: 'weekly',
        published,
        metrics: {
            pageViews: 0,
            uniqueVisitors: 0,
            bounceRate: 0,
            avgTimeOnPage: 0,
        },
        productCount: nearbyRetailers.length,
    };
}

function buildLegacyZipPagePayload(
    zipCode: string,
    city: string,
    state: string,
    dispensaries: CRMDispensary[],
    published: boolean
) {
    const citySlug = `${slugifyValue(city)}-cannabis-guide`;

    return {
        zip: zipCode,
        city,
        state,
        published,
        dispensaries: dispensaries.map((dispensary) => ({
            id: dispensary.id,
            name: dispensary.name,
            address: dispensary.address || '',
        })),
        nearbyZipCodes: [],
        nearbyZips: [],
        citySlug,
        updatedAt: new Date(),
    };
}

function buildDispensaryPageFromCrm(
    dispensary: CRMDispensary,
    zipCode: string,
    published: boolean
): DispensarySEOPage {
    const slug = dispensary.slug || slugifyValue(dispensary.name);
    const state = normalizeState(dispensary.state);
    const description = dispensary.description?.trim();

    return {
        id: `${slug}_${zipCode}`,
        dispensaryId: dispensary.retailerId || dispensary.id,
        dispensaryName: dispensary.name,
        dispensarySlug: slug,
        about: description,
        zipCode,
        city: dispensary.city,
        state,
        featured: false,
        seoTags: {
            metaTitle: `${dispensary.name} | Dispensary in ${dispensary.city}, ${state}`,
            metaDescription: description || `Learn about ${dispensary.name}, a dispensary serving ${dispensary.city}, ${state}.`,
            keywords: [
                dispensary.name,
                `${dispensary.city} dispensary`,
                `${state} cannabis`,
                `dispensary near ${zipCode}`,
            ],
        },
        published,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system:crm-page-sync',
        metrics: {
            pageViews: 0,
            ctaClicks: 0,
        },
    };
}

function resolveBrandCoverageTargets(
    brand: CRMBrand,
    dispensariesById: Map<string, CRMDispensary>,
    dispensaries: CRMDispensary[]
): Array<{ zipCode: string; city: string; state: string }> {
    const targets = new Map<string, { zipCode: string; city: string; state: string }>();

    for (const dispensaryId of brand.discoveredFrom || []) {
        const dispensary = dispensariesById.get(dispensaryId);
        const zipCode = normalizeZipCode(dispensary?.zip);
        const state = normalizeState(dispensary?.state);

        if (!dispensary || !zipCode || !dispensary.city || !state) {
            continue;
        }

        targets.set(zipCode, {
            zipCode,
            city: dispensary.city,
            state,
        });
    }

    if (targets.size === 0 && brand.city && brand.state) {
        const brandCity = brand.city.trim().toLowerCase();
        const brandState = normalizeState(brand.state);

        for (const dispensary of dispensaries) {
            const zipCode = normalizeZipCode(dispensary.zip);
            if (!zipCode) continue;

            if (
                dispensary.city.trim().toLowerCase() === brandCity &&
                normalizeState(dispensary.state) === brandState
            ) {
                targets.set(zipCode, {
                    zipCode,
                    city: dispensary.city,
                    state: brandState,
                });
            }
        }
    }

    if (targets.size === 0) {
        const candidateStates = brand.states.length > 0
            ? brand.states.map(normalizeState)
            : [normalizeState(brand.state)].filter(Boolean);

        for (const dispensary of dispensaries) {
            const zipCode = normalizeZipCode(dispensary.zip);
            const state = normalizeState(dispensary.state);

            if (!zipCode || !state || !candidateStates.includes(state)) {
                continue;
            }

            targets.set(zipCode, {
                zipCode,
                city: dispensary.city,
                state,
            });

            if (targets.size >= 5) {
                break;
            }
        }
    }

    return Array.from(targets.values()).slice(0, 5);
}

function buildBrandPageFromCrm(
    brand: CRMBrand,
    target: { zipCode: string; city: string; state: string },
    published: boolean
): BrandSEOPage {
    const brandSlug = brand.slug || slugifyValue(brand.name);
    const description = brand.description?.trim();

    return {
        id: `${brandSlug}_${target.zipCode}`,
        brandId: brand.id,
        brandName: brand.name,
        brandSlug,
        logoUrl: brand.logoUrl || undefined,
        about: description,
        zipCodes: [target.zipCode],
        city: target.city,
        state: target.state,
        radiusMiles: 15,
        priority: brand.isNational ? 7 : 5,
        ctaType: 'learn_more',
        ctaUrl: brand.website || `https://bakedbot.ai/brands/${brandSlug}`,
        seoTags: {
            metaTitle: `${brand.name} in ${target.city}, ${target.state}`,
            metaDescription: description || `Discover ${brand.name} availability and market coverage in ${target.city}, ${target.state}.`,
            keywords: [
                brand.name,
                `${brand.name} ${target.city}`,
                `${brand.name} ${target.state}`,
                `cannabis brand ${target.zipCode}`,
            ],
        },
        published,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system:crm-page-sync',
        metrics: {
            pageViews: 0,
            ctaClicks: 0,
            claimAttempts: 0,
        },
    };
}

function normalizeZipPage(doc: any): LocalSEOPage {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        updatedAt: coerceDate(data.updatedAt),
        createdAt: coerceDate(data.createdAt),
        lastRefreshed: coerceDate(data.lastRefreshed),
        nextRefresh: coerceDate(data.nextRefresh),
    } as LocalSEOPage;
}

function normalizeLegacyZipPage(doc: any): LocalSEOPage {
    const data = doc.data();
    const zipCode = normalizeZipCode(data.zipCode || data.zip || String(doc.id).replace(/^zip[-_]/, '')) || doc.id;
    const city = typeof data.city === 'string' ? data.city : 'Unknown';
    const state = normalizeState(data.state) || 'Unknown';
    const nearbyRetailers = Array.isArray(data.dispensaries)
        ? data.dispensaries.map((dispensary: any) => ({
            id: dispensary.id || `${slugifyValue(dispensary.name || 'dispensary')}_${zipCode}`,
            name: dispensary.name || 'Unknown dispensary',
            address: dispensary.address || '',
            city,
            state,
            postalCode: zipCode,
            phone: dispensary.phone || null,
            website: dispensary.website || null,
        }))
        : [];

    return {
        id: zipCode,
        zipCode,
        city,
        state,
        pageType: 'zip',
        content: {
            title: data.content?.title || `Cannabis Dispensaries Near ${zipCode}`,
            metaDescription: data.content?.metaDescription || data.metaDescription || `Discover licensed dispensaries near ${zipCode}.`,
            h1: data.content?.h1 || `Cannabis Near ${zipCode}`,
            introText: data.content?.introText || `Explore local cannabis discovery options serving ${zipCode}.`,
            topStrains: Array.isArray(data.content?.topStrains) ? data.content.topStrains : [],
            topDeals: Array.isArray(data.content?.topDeals) ? data.content.topDeals : [],
            nearbyRetailers: Array.isArray(data.content?.nearbyRetailers) ? data.content.nearbyRetailers : nearbyRetailers,
            categoryBreakdown: Array.isArray(data.content?.categoryBreakdown) ? data.content.categoryBreakdown : [],
        },
        structuredData: data.structuredData || {
            localBusiness: {},
            products: [],
            breadcrumb: {},
        },
        lastRefreshed: coerceDate(data.lastRefreshed || data.updatedAt),
        nextRefresh: coerceDate(data.nextRefresh || data.updatedAt),
        refreshFrequency: data.refreshFrequency || 'weekly',
        published: data.published !== false,
        metrics: data.metrics || {
            pageViews: 0,
            uniqueVisitors: 0,
            bounceRate: 0,
            avgTimeOnPage: 0,
        },
        productCount: typeof data.productCount === 'number' ? data.productCount : nearbyRetailers.length,
    };
}

function normalizeBrandPage(doc: any): BrandSEOPage {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        updatedAt: coerceDate(data.updatedAt),
        createdAt: coerceDate(data.createdAt),
    } as BrandSEOPage;
}

function normalizeDispensaryPage(doc: any): DispensarySEOPage {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        updatedAt: coerceDate(data.updatedAt),
        createdAt: coerceDate(data.createdAt),
    } as DispensarySEOPage;
}

function getFootTrafficConfigRef(firestore: ReturnType<typeof getAdminFirestore>) {
    return firestore.collection('foot_traffic').doc('config');
}

async function getCollectionDocs(query: any): Promise<any[]> {
    try {
        const snapshot = await query.get();
        return snapshot.docs;
    } catch (error) {
        console.warn('[seo-actions] collection read failed', error);
        return [];
    }
}

export async function getSeoKpis(): Promise<SeoKpis> {
    try {
        const user = await requireUser(['super_user']);
        return await fetchSeoKpis(user.uid);
    } catch (error) {
        console.error('Error fetching SEO KPIs:', error);
        return {
            indexedPages: { zip: 0, dispensary: 0, brand: 0, city: 0, state: 0, total: 0 },
            claimMetrics: { totalUnclaimed: 0, totalClaimed: 0, claimRate: 0, pendingClaims: 0 },
            pageHealth: { freshPages: 0, stalePages: 0, healthScore: 100 },
            searchConsole: { impressions: null, clicks: null, ctr: null, avgPosition: null, top3Keywords: null, top10Keywords: null, dataAvailable: false },
            lastUpdated: new Date()
        };
    }
}

export async function getSeoPagesAction(): Promise<LocalSEOPage[]> {
    try {
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [zipDocs, legacyConfigDocs, topLevelZipDocs] = await Promise.all([
            getCollectionDocs(configRef.collection('zip_pages')),
            getCollectionDocs(configRef.collection('seo_pages')),
            getCollectionDocs(firestore.collection('seo_pages').limit(500)),
        ]);

        const normalizedTopLevelZipDocs = topLevelZipDocs
            .filter((doc) => {
                const data = doc.data();
                return Boolean(
                    normalizeZipCode(data.zipCode || data.zip) ||
                    /^zip[-_]\d{5}$/.test(doc.id) ||
                    /^\d{5}$/.test(doc.id)
                );
            })
            .map(normalizeLegacyZipPage);

        return dedupeById([
            ...zipDocs.map(normalizeZipPage),
            ...legacyConfigDocs.map(normalizeLegacyZipPage),
            ...normalizedTopLevelZipDocs,
        ]).sort((a, b) => a.zipCode.localeCompare(b.zipCode));
    } catch (error) {
        console.error('Error fetching SEO pages:', error);
        return [];
    }
}

export async function seedSeoPageAction(data: { zipCode: string; featuredDispensaryName?: string }): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const { zipCode, featuredDispensaryName } = data;
        const firestore = getAdminFirestore();

        const coords = await getZipCodeCoordinates(zipCode);
        if (!coords) return { message: 'Invalid ZIP code', error: true };

        const retailers = await getRetailersByZipCode(zipCode, 20);

        // CRM Sync
        try {
            const orgBatch = firestore.batch();
            let opsCount = 0;
            for (const retailer of retailers) {
                const orgId = `disp_${(retailer.id || '').replace(/[^a-zA-Z0-9]/g, '')}`;
                if (!retailer.id) continue;
                const orgRef = firestore.collection('organizations').doc(orgId);
                const orgDoc = await orgRef.get();
                if (!orgDoc.exists) {
                    orgBatch.set(orgRef, {
                        id: orgId,
                        name: retailer.name,
                        slug: retailer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        address: retailer.address || '',
                        city: retailer.city || '',
                        state: retailer.state || '',
                        zip: retailer.postalCode || zipCode,
                        type: 'dispensary',
                        claimStatus: 'unclaimed',
                        source: 'auto_discovery',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    opsCount++;
                }
            }
            if (opsCount > 0) await orgBatch.commit();
        } catch (crmError) { console.error('CRM sync error:', crmError); }

        const discoveryResult = await discoverNearbyProducts({
            lat: coords.lat, lng: coords.lng, cityName: coords.city, state: coords.state, radiusMiles: 15, limit: 50
        });

        const seoPageConfig: LocalSEOPage = {
            id: zipCode,
            zipCode,
            city: retailers[0]?.city || 'Unknown',
            state: retailers[0]?.state || 'Unknown',
            featuredDispensaryId: retailers.find(r => r.name.toLowerCase().includes(featuredDispensaryName?.toLowerCase() || ''))?.id || null,
            featuredDispensaryName: featuredDispensaryName || null,
            content: {
                title: `Cannabis Dispensaries Near ${zipCode}`,
                metaDescription: `Find the best cannabis in ${zipCode}.`,
                h1: `Cannabis Near ${zipCode}`,
                introText: `Discover top rated dispensaries in ${zipCode}...`,
                topStrains: discoveryResult.products.slice(0, 10) as any,
                topDeals: [],
                nearbyRetailers: retailers.slice(0, 10) as any,
                categoryBreakdown: []
            },
            lastRefreshed: new Date(),
            nextRefresh: new Date(Date.now() + 86400000),
            published: true,
            productCount: discoveryResult.totalProducts,
            metrics: { pageViews: 0, uniqueVisitors: 0, bounceRate: 0, avgTimeOnPage: 0 }
        } as any;

        const batch = firestore.batch();
        batch.set(firestore.collection('foot_traffic').doc('config').collection('zip_pages').doc(zipCode), seoPageConfig);
        batch.set(
            firestore.collection('seo_pages').doc(`zip-${zipCode}`),
            buildLegacyZipPagePayload(
                zipCode,
                seoPageConfig.city,
                seoPageConfig.state,
                retailers.slice(0, 10).map((retailer) => ({
                    id: retailer.id,
                    name: retailer.name,
                    slug: slugifyValue(retailer.name),
                    address: retailer.address || '',
                    city: retailer.city || seoPageConfig.city,
                    state: retailer.state || seoPageConfig.state,
                    zip: retailer.postalCode || zipCode,
                    source: 'discovery',
                    claimStatus: 'unclaimed',
                    discoveredAt: Date.now(),
                    updatedAt: Date.now(),
                } as CRMDispensary)),
                true
            ),
            { merge: true }
        );
        await batch.commit();

        return { message: `Successfully seeded page for ${zipCode}` };
    } catch (error: any) {
        console.error('Error seeding SEO page:', error);
        return { message: error.message, error: true };
    }
}

export async function deleteSeoPageAction(zipCode: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        await Promise.allSettled([
            configRef.collection('zip_pages').doc(zipCode).delete(),
            configRef.collection('seo_pages').doc(zipCode).delete(),
            firestore.collection('seo_pages').doc(`zip-${zipCode}`).delete(),
            firestore.collection('seo_pages').doc(`zip_${zipCode}`).delete(),
            firestore.collection('seo_pages').doc(zipCode).delete(),
        ]);
        return { message: `Successfully deleted page for ${zipCode}` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function toggleSeoPagePublishAction(pageId: string, pageType: 'zip' | 'dispensary', published: boolean): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const collection = pageType === 'zip' ? 'zip_pages' : 'dispensary_pages';
        await firestore.collection('foot_traffic').doc('config').collection(collection).doc(pageId).update({
            published, status: published ? 'published' : 'draft', updatedAt: new Date()
        });
        return { message: `Page ${published ? 'published' : 'set to draft'} successfully.` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function getFootTrafficMetrics(): Promise<FootTrafficMetrics> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [zipSnapshot, configDispSnapshot, topLevelDispSnapshot, configBrandSnapshot, topLevelBrandSnapshot] = await Promise.all([
            configRef.collection('zip_pages').get(),
            configRef.collection('dispensary_pages').get(),
            firestore.collection('seo_pages_dispensary').get(),
            configRef.collection('brand_pages').get(),
            firestore.collection('seo_pages_brand').get()
        ]);

        const dispensaryPages = dedupeById([
            ...configDispSnapshot.docs.map(normalizeDispensaryPage),
            ...topLevelDispSnapshot.docs.map(normalizeDispensaryPage),
        ]);
        const brandPages = dedupeById([
            ...configBrandSnapshot.docs.map(normalizeBrandPage),
            ...topLevelBrandSnapshot.docs.map(normalizeBrandPage),
        ]);

        return {
            period: 'month', startDate: new Date(), endDate: new Date(),
            seo: {
                totalPages: zipSnapshot.size + dispensaryPages.length + brandPages.length,
                totalPageViews: 0,
                topZipCodes: [],
            },
            alerts: { configured: 0, triggered: 0, sent: 0, conversionRate: 0 },
            offers: { active: 0, totalImpressions: 0, totalRedemptions: 0, revenueGenerated: 0 },
            discovery: { searchesPerformed: 0, productsViewed: 0, retailerClicks: 0 }
        };
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return {} as any;
    }
}

export async function getBrandPagesAction(): Promise<BrandSEOPage[]> {
    try {
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [topLevelDocs, configDocs] = await Promise.all([
            getCollectionDocs(firestore.collection('seo_pages_brand').orderBy('createdAt', 'desc')),
            getCollectionDocs(configRef.collection('brand_pages').orderBy('createdAt', 'desc')),
        ]);

        return dedupeById([
            ...topLevelDocs.map(normalizeBrandPage),
            ...configDocs.map(normalizeBrandPage),
        ]).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error fetching brand pages:', error);
        return [];
    }
}

export async function createBrandPageAction(input: CreateBrandPageInput): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const brandSlug = input.brandSlug || input.brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const batch = firestore.batch();
        const now = new Date();
        for (const zipCode of input.zipCodes) {
            const pageId = `${brandSlug}_${zipCode}`;
            const pageDoc = {
                ...input,
                id: pageId,
                brandSlug,
                zipCodes: [zipCode],
                createdAt: now,
                updatedAt: now,
            };
            batch.set(firestore.collection('seo_pages_brand').doc(pageId), pageDoc, { merge: true });
            batch.set(configRef.collection('brand_pages').doc(pageId), pageDoc, { merge: true });
        }
        await batch.commit();
        return { message: 'Successfully created brand page(s)' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function updateBrandPageAction(id: string, updates: Partial<CreateBrandPageInput>): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const updateDoc = { ...updates, updatedAt: new Date() };
        await Promise.all([
            firestore.collection('seo_pages_brand').doc(id).set(updateDoc, { merge: true }),
            configRef.collection('brand_pages').doc(id).set(updateDoc, { merge: true }),
        ]);
        return { message: 'Brand page updated successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function deleteBrandPageAction(id: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        await Promise.all([
            firestore.collection('seo_pages_brand').doc(id).delete(),
            configRef.collection('brand_pages').doc(id).delete(),
        ]);
        return { message: 'Brand page deleted successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function toggleBrandPagePublishAction(id: string, published: boolean): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const updateDoc = { published, updatedAt: new Date() };
        await Promise.all([
            firestore.collection('seo_pages_brand').doc(id).set(updateDoc, { merge: true }),
            configRef.collection('brand_pages').doc(id).set(updateDoc, { merge: true }),
        ]);
        return { message: `Brand page ${published ? 'published' : 'unpublished'} successfully.` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function bulkPublishBrandPagesAction(published: boolean): Promise<ActionResult & { count?: number }> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [topLevelQuery, configQuery] = await Promise.all([
            firestore.collection('seo_pages_brand').where('published', '==', !published).get(),
            configRef.collection('brand_pages').where('published', '==', !published).get(),
        ]);
        const docs = [...topLevelQuery.docs, ...configQuery.docs];
        if (docs.length === 0) return { message: 'No pages to update' };
        const batch = firestore.batch();
        docs.forEach(doc => batch.set(doc.ref, { published, updatedAt: new Date() }, { merge: true }));
        await batch.commit();
        return { message: `Successfully updated ${docs.length} brand pages`, count: docs.length };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function bulkPublishDispensaryPagesAction(published: boolean): Promise<ActionResult & { count?: number }> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [configQuery, topLevelQuery] = await Promise.all([
            configRef.collection('dispensary_pages').where('published', '==', !published).get(),
            firestore.collection('seo_pages_dispensary').where('published', '==', !published).get(),
        ]);
        const docs = [...configQuery.docs, ...topLevelQuery.docs];
        if (docs.length === 0) return { message: 'No pages to update' };
        const batch = firestore.batch();
        docs.forEach(doc => batch.set(doc.ref, { published, updatedAt: new Date() }, { merge: true }));
        await batch.commit();
        return { message: `Successfully updated ${docs.length} dispensary pages`, count: docs.length };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function getDispensaryPagesAction(): Promise<DispensarySEOPage[]> {
    try {
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const [topLevelDocs, configDocs] = await Promise.all([
            getCollectionDocs(firestore.collection('seo_pages_dispensary').orderBy('createdAt', 'desc').limit(100)),
            getCollectionDocs(configRef.collection('dispensary_pages').orderBy('createdAt', 'desc').limit(100)),
        ]);

        return dedupeById([
            ...topLevelDocs.map(normalizeDispensaryPage),
            ...configDocs.map(normalizeDispensaryPage),
        ]).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error fetching dispensary pages:', error);
        return [];
    }
}

export async function deleteDispensaryPageAction(id: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        await Promise.all([
            firestore.collection('seo_pages_dispensary').doc(id).delete(),
            configRef.collection('dispensary_pages').doc(id).delete(),
        ]);
        return { message: 'Dispensary page deleted successfully.' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function toggleDispensaryPagePublishAction(id: string, published: boolean): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const updateDoc = { published, updatedAt: new Date() };
        await Promise.all([
            firestore.collection('seo_pages_dispensary').doc(id).set(updateDoc, { merge: true }),
            configRef.collection('dispensary_pages').doc(id).set(updateDoc, { merge: true }),
        ]);
        return { message: `Dispensary page ${published ? 'published' : 'unpublished'} successfully.` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function syncDiscoveryPagesFromCrmAction(
    options: SyncDiscoveryPagesFromCrmOptions = {}
): Promise<SyncDiscoveryPagesFromCrmResult> {
    const created = {
        zipPages: 0,
        dispensaryPages: 0,
        brandPages: 0,
    };
    const skipped = {
        zipPages: 0,
        dispensaryPages: 0,
        brandPages: 0,
        brandsWithoutCoverage: 0,
    };

    try {
        await requireUser(['super_user']);

        const publish = options.publish ?? false;
        const includeZipPages = options.includeZipPages ?? true;
        const includeDispensaryPages = options.includeDispensaryPages ?? true;
        const includeBrandPages = options.includeBrandPages ?? true;
        const brandsLimit = Math.max(1, Math.min(options.brandsLimit ?? 500, 2000));
        const dispensariesLimit = Math.max(1, Math.min(options.dispensariesLimit ?? 1000, 3000));

        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const crm = await import('@/server/services/crm-service');

        logger.info('[seo-actions] Starting CRM discovery sync', {
            publish,
            includeZipPages,
            includeDispensaryPages,
            includeBrandPages,
            brandsLimit,
            dispensariesLimit,
        });

        const [brands, dispensaries, zipPages, brandPages, dispensaryPages] = await Promise.all([
            crm.getBrands({ limit: brandsLimit }),
            crm.getDispensaries({ limit: dispensariesLimit }),
            getSeoPagesAction(),
            getBrandPagesAction(),
            getDispensaryPagesAction(),
        ]);

        const existingZipIds = new Set(zipPages.map((page) => page.zipCode));
        const existingBrandIds = new Set(brandPages.map((page) => page.id));
        const existingDispensaryIds = new Set(dispensaryPages.map((page) => page.id));
        const dispensariesById = new Map(dispensaries.map((dispensary) => [dispensary.id, dispensary]));
        const dispensariesByZip = new Map<string, CRMDispensary[]>();

        for (const dispensary of dispensaries) {
            const zipCode = normalizeZipCode(dispensary.zip);
            if (!zipCode) {
                continue;
            }

            const current = dispensariesByZip.get(zipCode) || [];
            current.push(dispensary);
            dispensariesByZip.set(zipCode, current);
        }

        let batch = firestore.batch();
        let opsInBatch = 0;

        const commitBatch = async () => {
            if (opsInBatch === 0) {
                return;
            }

            await batch.commit();
            batch = firestore.batch();
            opsInBatch = 0;
        };

        const queueSet = async (
            ref: FirebaseFirestore.DocumentReference,
            data: object,
            merge = true
        ) => {
            if (merge) {
                batch.set(ref, data, { merge: true });
            } else {
                batch.set(ref, data);
            }
            opsInBatch += 1;

            if (opsInBatch >= 400) {
                await commitBatch();
            }
        };

        if (includeZipPages) {
            for (const [zipCode, zipDispensaries] of dispensariesByZip.entries()) {
                if (existingZipIds.has(zipCode)) {
                    skipped.zipPages += 1;
                    continue;
                }

                const primary = zipDispensaries[0];
                const city = primary?.city?.trim() || 'Unknown';
                const state = normalizeState(primary?.state) || 'Unknown';
                const zipPage = buildZipPageFromDispensaries(zipCode, city, state, zipDispensaries, publish);

                await queueSet(configRef.collection('zip_pages').doc(zipCode), zipPage);
                await queueSet(
                    firestore.collection('seo_pages').doc(`zip-${zipCode}`),
                    buildLegacyZipPagePayload(zipCode, city, state, zipDispensaries, publish)
                );

                existingZipIds.add(zipCode);
                created.zipPages += 1;
            }
        }

        if (includeDispensaryPages) {
            for (const dispensary of dispensaries) {
                const zipCode = normalizeZipCode(dispensary.zip);
                const state = normalizeState(dispensary.state);

                if (!zipCode || !dispensary.city || !state) {
                    skipped.dispensaryPages += 1;
                    continue;
                }

                const page = buildDispensaryPageFromCrm(dispensary, zipCode, publish);
                if (existingDispensaryIds.has(page.id)) {
                    skipped.dispensaryPages += 1;
                    continue;
                }

                await queueSet(firestore.collection('seo_pages_dispensary').doc(page.id), page);
                await queueSet(configRef.collection('dispensary_pages').doc(page.id), page);
                await queueSet(firestore.collection('crm_dispensaries').doc(dispensary.id), {
                    seoPageId: page.id,
                    updatedAt: new Date(),
                });

                existingDispensaryIds.add(page.id);
                created.dispensaryPages += 1;
            }
        }

        if (includeBrandPages) {
            for (const brand of brands) {
                const targets = resolveBrandCoverageTargets(brand, dispensariesById, dispensaries);

                if (targets.length === 0) {
                    skipped.brandsWithoutCoverage += 1;
                    continue;
                }

                let firstPageId: string | null = null;
                for (const target of targets) {
                    const page = buildBrandPageFromCrm(brand, target, publish);

                    if (existingBrandIds.has(page.id)) {
                        skipped.brandPages += 1;
                        continue;
                    }

                    await queueSet(firestore.collection('seo_pages_brand').doc(page.id), page);
                    await queueSet(configRef.collection('brand_pages').doc(page.id), page);

                    existingBrandIds.add(page.id);
                    created.brandPages += 1;
                    firstPageId = firstPageId || page.id;
                }

                if (firstPageId) {
                    await queueSet(firestore.collection('crm_brands').doc(brand.id), {
                        seoPageId: firstPageId,
                        updatedAt: new Date(),
                    });
                }
            }
        }

        await commitBatch();

        logger.info('[seo-actions] CRM discovery sync complete', { created, skipped });

        return {
            message: `Synced ${created.zipPages + created.dispensaryPages + created.brandPages} Discovery Hub page records from CRM.`,
            created,
            skipped,
        };
    } catch (error) {
        logger.error('[seo-actions] CRM discovery sync failed', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            message: error instanceof Error ? error.message : 'Failed to sync Discovery Hub pages from CRM.',
            error: true,
            created,
            skipped,
        };
    }
}

// Reuse CSV logic (keeping simplified for brevity but same logic as actions.ts)
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = values[i] || '');
        return row;
    });
    return { headers, rows };
}

export async function validateBrandPagesCSV(csvText: string): Promise<CSVPreview> {
    const { headers, rows } = parseCSV(csvText);
    return { headers, rows, totalRows: rows.length, validRows: rows.length, invalidRows: 0, errors: [] };
}

export async function importBrandPagesAction(rows: Record<string, string>[]): Promise<BulkImportResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const batch = firestore.batch();
        rows.forEach(row => {
            const brandSlug = row.brand_name.toLowerCase().replace(/\s+/g, '-');
            const pageId = `${brandSlug}_${row.zip_codes}`;
            const pageDoc = {
                ...row,
                id: pageId,
                brandSlug,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            batch.set(configRef.collection('brand_pages').doc(pageId), pageDoc, { merge: true });
            batch.set(firestore.collection('seo_pages_brand').doc(pageId), pageDoc, { merge: true });
        });
        await batch.commit();
        return { totalRows: rows.length, validRows: rows.length, invalidRows: 0, errors: [], createdPages: [], skippedRows: [] };
    } catch (error: any) { return { errors: [{ row: -1, field: 'auth', message: error.message }] } as any; }
}

export async function validateDispensaryPagesCSV(csvText: string): Promise<CSVPreview> {
    const { headers, rows } = parseCSV(csvText);
    return { headers, rows, totalRows: rows.length, validRows: rows.length, invalidRows: 0, errors: [] };
}

export async function importDispensaryPagesAction(rows: Record<string, string>[]): Promise<BulkImportResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const configRef = getFootTrafficConfigRef(firestore);
        const batch = firestore.batch();
        rows.forEach(row => {
            const dispensarySlug = row.dispensary_name.toLowerCase().replace(/\s+/g, '-');
            const pageId = `${dispensarySlug}_${row.zip_code}`;
            const pageDoc = {
                ...row,
                id: pageId,
                dispensarySlug,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            batch.set(configRef.collection('dispensary_pages').doc(pageId), pageDoc, { merge: true });
            batch.set(firestore.collection('seo_pages_dispensary').doc(pageId), pageDoc, { merge: true });
        });
        await batch.commit();
        return { totalRows: rows.length, validRows: rows.length, invalidRows: 0, errors: [], createdPages: [], skippedRows: [] };
    } catch (error: any) { return { errors: [{ row: -1, field: 'auth', message: error.message }] } as any; }
}

export async function setTop25PublishedAction(): Promise<ActionResult & { published?: number; draft?: number }> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const collection = firestore.collection('foot_traffic').doc('config').collection('zip_pages');
        const snapshot = await collection.get();
        const batchSize = 400;
        let batch = firestore.batch();
        let count = 0;
        for (const doc of snapshot.docs) {
            batch.update(doc.ref, { published: true, status: 'published', updatedAt: new Date() });
            count++;
            if (count % batchSize === 0) {
                await batch.commit();
                batch = firestore.batch();
            }
        }
        if (count % batchSize !== 0) await batch.commit();
        return { message: `Updated ${count} pages`, published: count };
    } catch (error: any) { return { message: error.message, error: true }; }
}

// Re-exports removed - import directly from './pilot-actions' or './user-actions'
// export { runDispensaryPilotAction, runBrandPilotAction } from './pilot-actions';
// export { bulkSeoPageStatusAction } from './user-actions';

// Stub for missing function
export async function refreshSeoPageDataAction(): Promise<ActionResult> {
    return { message: 'SEO page refresh not implemented', error: true };
}
