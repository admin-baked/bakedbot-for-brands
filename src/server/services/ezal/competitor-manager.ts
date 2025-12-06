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
} from '@/types/ezal-scraper';
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
    data: Omit<DataSource, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'lastScrapeAt' | 'nextDueAt'>
): Promise<DataSource> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const sourceData = {
        ...data,
        tenantId,
        lastScrapeAt: null,
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
        lastScrapeAt: data.lastScrapeAt?.toDate?.() || null,
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
            lastScrapeAt: data.lastScrapeAt?.toDate?.() || null,
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
 * Mark a data source as scraped and calculate next due time
 */
export async function markSourceScraped(
    tenantId: string,
    sourceId: string,
    frequencyMinutes: number
): Promise<void> {
    const now = new Date();
    const nextDue = new Date(now.getTime() + frequencyMinutes * 60 * 1000);

    await updateDataSource(tenantId, sourceId, {
        lastScrapeAt: now,
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
 * Get sources due for scraping
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
            lastScrapeAt: data.lastScrapeAt?.toDate?.() || null,
            nextDueAt: data.nextDueAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as DataSource;
    });
}

/**
 * Quick setup: Create competitor + menu data source in one call
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
    }
): Promise<{ competitor: Competitor; dataSource: DataSource }> {
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

    const dataSource = await createDataSource(tenantId, {
        competitorId: competitor.id,
        kind: 'menu',
        sourceType: 'html',
        baseUrl: params.menuUrl,
        frequencyMinutes: params.frequencyMinutes || 60,
        robotsAllowed: true, // Would be verified in production
        parserProfileId: params.parserProfileId,
        timezone: 'America/New_York',
        priority: 5,
        active: true,
    });

    return { competitor, dataSource };
}
