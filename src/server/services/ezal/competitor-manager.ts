'use server';

// src/server/services/ezal/competitor-manager.ts
/**
 * Competitor & Data Source Manager
 * CRUD operations for tracking competitors and their menu sources
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import {
    Competitor,
    DataSource,
    CompetitorSearchRequest,
    CompetitorType,
    SourceKind,
    SourceType
} from '@/types/ezal-discovery';
import { FieldValue } from 'firebase-admin/firestore';

const COLLECTION_COMPETITORS = 'competitors';
const COLLECTION_DATA_SOURCES = 'data_sources';

// =============================================================================
// COMPETITOR CRUD
// =============================================================================

/**
 * Create a new competitor to track
 */
export async function createCompetitor(
    tenantId: string,
    data: Omit<Competitor, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<Competitor> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const competitorData = {
        ...data,
        tenantId,
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_COMPETITORS)
        .add(competitorData);

    logger.info('[Ezal] Created competitor:', {
        tenantId,
        competitorId: docRef.id,
        name: data.name
    });

    return {
        id: docRef.id,
        ...competitorData,
    };
}

/**
 * Get a competitor by ID
 */
export async function getCompetitor(
    tenantId: string,
    competitorId: string
): Promise<Competitor | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_COMPETITORS)
        .doc(competitorId)
        .get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as Competitor;
}

/**
 * List competitors for a tenant
 */
export async function listCompetitors(
    tenantId: string,
    options?: {
        state?: string;
        type?: CompetitorType;
        active?: boolean;
        limit?: number;
    }
): Promise<Competitor[]> {
    const { firestore } = await createServerClient();

    let query = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_COMPETITORS) as FirebaseFirestore.Query;

    if (options?.state) {
        query = query.where('state', '==', options.state);
    }
    if (options?.type) {
        query = query.where('type', '==', options.type);
    }
    if (options?.active !== undefined) {
        query = query.where('active', '==', options.active);
    }

    query = query.limit(options?.limit || 100);

    const snapshot = await query.get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Competitor;
    });
}

/**
 * Update a competitor
 */
export async function updateCompetitor(
    tenantId: string,
    competitorId: string,
    updates: Partial<Omit<Competitor, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_COMPETITORS)
        .doc(competitorId)
        .update({
            ...updates,
            updatedAt: new Date(),
        });

    logger.info('[Ezal] Updated competitor:', { tenantId, competitorId });
}

/**
 * Delete a competitor (soft delete - sets active=false)
 */
export async function deactivateCompetitor(
    tenantId: string,
    competitorId: string
): Promise<void> {
    await updateCompetitor(tenantId, competitorId, { active: false });
    logger.info('[Ezal] Deactivated competitor:', { tenantId, competitorId });
}

// =============================================================================
// DATA SOURCE CRUD
// =============================================================================

/**
 * Create a data source for a competitor
 */
export async function createDataSource(
    tenantId: string,
    data: Omit<DataSource, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'lastDiscoveryAt' | 'nextDueAt'>
): Promise<DataSource> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const sourceData = {
        ...data,
        tenantId,
        lastDiscoveryAt: null,
        nextDueAt: now, // Due immediately
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DATA_SOURCES)
        .add(sourceData);

    logger.info('[Ezal] Created data source:', {
        tenantId,
        sourceId: docRef.id,
        competitorId: data.competitorId,
        kind: data.kind,
    });

    return {
        id: docRef.id,
        ...sourceData,
    };
}

/**
 * Get a data source by ID
 */
export async function getDataSource(
    tenantId: string,
    sourceId: string
): Promise<DataSource | null> {
    const { firestore } = await createServerClient();

    const doc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DATA_SOURCES)
        .doc(sourceId)
        .get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        lastDiscoveryAt: data.lastDiscoveryAt?.toDate?.() || null,
        nextDueAt: data.nextDueAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as DataSource;
}

/**
 * List data sources for a competitor
 */
export async function listDataSources(
    tenantId: string,
    options?: {
        competitorId?: string;
        active?: boolean;
        kind?: SourceKind;
    }
): Promise<DataSource[]> {
    const { firestore } = await createServerClient();

    let query = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DATA_SOURCES) as FirebaseFirestore.Query;

    if (options?.competitorId) {
        query = query.where('competitorId', '==', options.competitorId);
    }
    if (options?.active !== undefined) {
        query = query.where('active', '==', options.active);
    }
    if (options?.kind) {
        query = query.where('kind', '==', options.kind);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            lastDiscoveryAt: data.lastDiscoveryAt?.toDate?.() || null,
            nextDueAt: data.nextDueAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as DataSource;
    });
}

/**
 * Update a data source
 */
export async function updateDataSource(
    tenantId: string,
    sourceId: string,
    updates: Partial<Omit<DataSource, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DATA_SOURCES)
        .doc(sourceId)
        .update({
            ...updates,
            updatedAt: new Date(),
        });
}

/**
 * Mark a data source as discovered and calculate next due time
 */
export async function markSourceDiscovered(
    tenantId: string,
    sourceId: string,
    frequencyMinutes: number
): Promise<void> {
    const now = new Date();
    const nextDue = new Date(now.getTime() + frequencyMinutes * 60 * 1000);

    await updateDataSource(tenantId, sourceId, {
        lastDiscoveryAt: now,
        nextDueAt: nextDue,
    });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Search competitors by brand or location
 */
export async function searchCompetitors(
    request: CompetitorSearchRequest
): Promise<Competitor[]> {
    const { firestore } = await createServerClient();

    let query = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection(COLLECTION_COMPETITORS)
        .where('active', '==', true) as FirebaseFirestore.Query;

    if (request.state) {
        query = query.where('state', '==', request.state);
    }

    const snapshot = await query.limit(100).get();

    let results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Competitor;
    });

    // Filter by brand if specified
    if (request.brandName) {
        const brandLower = request.brandName.toLowerCase();
        results = results.filter(c =>
            c.brandsFocus.some(b => b.toLowerCase().includes(brandLower))
        );
    }

    // Filter by ZIP/radius if specified (simplified - real impl would use geohash)
    if (request.zip) {
        results = results.filter(c => c.zip === request.zip);
    }

    return results;
}

/**
 * Get sources due for discovery
 */
export async function getSourcesDue(
    tenantId: string,
    limit: number = 50
): Promise<DataSource[]> {
    const { firestore } = await createServerClient();
    const now = new Date();

    const snapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection(COLLECTION_DATA_SOURCES)
        .where('active', '==', true)
        .where('nextDueAt', '<=', now)
        .orderBy('nextDueAt')
        .orderBy('priority', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            lastDiscoveryAt: data.lastDiscoveryAt?.toDate?.() || null,
            nextDueAt: data.nextDueAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as DataSource;
    });
}

// =============================================================================
// CANNMENUS LOOKUP HELPER
// =============================================================================

/**
 * Try to resolve a competitor to a CannMenus retailer ID.
 *
 * Waterfall:
 *   1. Search CannMenus by name + state (exact/fuzzy)
 *   2. If a result's name is close enough (≥60% match), treat as found
 *   3. Returns retailerId + canonical name, or null if not indexed
 *
 * This is a best-effort lookup — callers must handle null gracefully.
 */
export async function lookupCannMenusRetailer(
    name: string,
    state: string
): Promise<{ retailerId: string; retailerName: string; menuUrl?: string } | null> {
    try {
        const { searchRetailersByName } = await import('@/lib/cannmenus-api');
        const results = await searchRetailersByName(name, state, 5);

        if (results.length === 0) return null;

        // Simple similarity: does the CannMenus name contain the query (or vice versa)?
        const queryLower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const r of results) {
            const candidateLower = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (
                candidateLower.includes(queryLower) ||
                queryLower.includes(candidateLower)
            ) {
                logger.info('[Ezal] CannMenus retailer matched', {
                    query: name, matched: r.name, retailerId: r.id, state,
                });
                return { retailerId: r.id, retailerName: r.name, menuUrl: r.menuUrl };
            }
        }

        // Fallback: take top result if very short name (≤4 chars can't do substring)
        if (queryLower.length <= 4 && results[0]) {
            return { retailerId: results[0].id, retailerName: results[0].name, menuUrl: results[0].menuUrl };
        }

        return null;
    } catch (err) {
        logger.warn('[Ezal] CannMenus retailer lookup failed (non-fatal)', {
            name, state, error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

// =============================================================================
// QUICK SETUP
// =============================================================================

/**
 * Quick setup: Create competitor + menu data source in one call.
 *
 * Data source waterfall (in priority order):
 *   1. CannMenus API  — structured JSON, no scraping, most reliable
 *   2. Jina Reader    — clean markdown from any URL, handles JS-rendered menus
 *   3. HTML scrape    — raw HTML fallback (requires parser profile)
 *
 * CannMenus is attempted automatically via name+state lookup. If found, the
 * data source is set to sourceType='cann_menus' with the retailerId stored in
 * metadata. The caller-provided menuUrl is preserved as primaryDomain regardless.
 */
export async function quickSetupCompetitor(
    tenantId: string,
    params: {
        name: string;
        type: CompetitorType;
        state: string;
        city: string;
        zip: string;
        menuUrl: string;
        parserProfileId: string;
        brandsFocus?: string[];
        frequencyMinutes?: number;
        planId?: string; // Determines update frequency
    }
): Promise<{ competitor: Competitor; dataSource: DataSource; cannMenusMatch: boolean }> {
    // Get frequency from plan limits if not explicitly provided
    const { getEzalLimits } = await import('@/lib/plan-limits');
    const ezalLimits = getEzalLimits(params.planId || 'free');
    const frequency = params.frequencyMinutes ?? ezalLimits.frequencyMinutes;

    // --- Stage 1: Try CannMenus lookup ---
    const cannMenusMatch = await lookupCannMenusRetailer(params.name, params.state);

    const competitor = await createCompetitor(tenantId, {
        name: params.name,
        type: params.type,
        state: params.state,
        city: params.city,
        zip: params.zip,
        primaryDomain: new URL(params.menuUrl).origin,
        brandsFocus: params.brandsFocus || [],
        active: true,
    });

    let dataSource: DataSource;

    if (cannMenusMatch) {
        // --- Stage 1 hit: CannMenus structured API ---
        dataSource = await createDataSource(tenantId, {
            competitorId: competitor.id,
            kind: 'menu',
            sourceType: 'cann_menus',
            baseUrl: params.menuUrl, // preserved for reference / fallback
            frequencyMinutes: frequency,
            robotsAllowed: true,
            parserProfileId: params.parserProfileId,
            timezone: 'America/New_York',
            priority: 8, // Higher priority — structured data is more valuable
            active: true,
            metadata: {
                retailerId: cannMenusMatch.retailerId,
                retailerName: cannMenusMatch.retailerName,
                state: params.state,
                cannMenusMatchedAt: new Date().toISOString(),
            },
        });

        logger.info('[Ezal] Competitor set up with CannMenus source', {
            tenantId, competitorId: competitor.id, retailerId: cannMenusMatch.retailerId,
        });
    } else {
        // --- Stage 2: Jina Reader (preferred over raw HTML) ---
        // Jina handles JS-rendered menus, returns clean markdown, no parser profile needed
        dataSource = await createDataSource(tenantId, {
            competitorId: competitor.id,
            kind: 'menu',
            sourceType: 'jina',
            baseUrl: params.menuUrl,
            frequencyMinutes: frequency,
            robotsAllowed: true,
            parserProfileId: params.parserProfileId,
            timezone: 'America/New_York',
            priority: 5,
            active: true,
        });

        logger.info('[Ezal] Competitor set up with Jina fallback source', {
            tenantId, competitorId: competitor.id, menuUrl: params.menuUrl,
        });
    }

    return { competitor, dataSource, cannMenusMatch: !!cannMenusMatch };
}
