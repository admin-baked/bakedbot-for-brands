'use server';

/**
 * Competitor Snapshots Repository
 * 
 * Stores daily competitor data scraped by Ezal.
 * Powers weekly aggregation for competitive intelligence reports.
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { Query } from 'firebase-admin/firestore';

// =============================================================================
// TYPES
// =============================================================================

export interface CompetitorDeal {
    name: string;
    price: number;
    originalPrice?: number;
    discount?: string;
    category?: string;
}

export interface CompetitorProduct {
    name: string;
    price: number;
    category: string;
    brand?: string;
    inStock?: boolean;
}

export interface CompetitorSnapshot {
    id: string;
    orgId: string;
    competitorId: string;
    competitorName: string;
    scrapedAt: Date;
    deals: CompetitorDeal[];
    products: CompetitorProduct[];
    rawMarkdown?: string;
    sourceUrl?: string;
    
    // Aggregated metrics
    avgDealPrice?: number;
    dealCount?: number;
    productCount?: number;
}

export interface SnapshotSummary {
    competitorId: string;
    competitorName: string;
    snapshotCount: number;
    avgDealPrice: number;
    totalDeals: number;
    totalProducts: number;
    lastScrapedAt: Date;
}

const COLLECTION = 'competitor_snapshots';

// =============================================================================
// CREATE
// =============================================================================

/**
 * Save a new competitor snapshot from daily scraping.
 */
export async function saveCompetitorSnapshot(
    orgId: string,
    data: Omit<CompetitorSnapshot, 'id' | 'scrapedAt'>
): Promise<string> {
    const { firestore } = await createServerClient();
    
    const now = new Date();
    const snapshotData = {
        ...data,
        orgId,
        scrapedAt: now,
        // Calculate aggregated metrics
        avgDealPrice: data.deals.length > 0
            ? data.deals.reduce((sum, d) => sum + d.price, 0) / data.deals.length
            : 0,
        dealCount: data.deals.length,
        productCount: data.products.length,
    };

    const docRef = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .add(snapshotData);

    logger.info('[Snapshots] Saved competitor snapshot', {
        orgId,
        competitorId: data.competitorId,
        snapshotId: docRef.id,
        deals: data.deals.length,
        products: data.products.length,
    });

    return docRef.id;
}

// =============================================================================
// READ
// =============================================================================

/**
 * Get snapshots for a competitor within a date range.
 */
export async function getCompetitorSnapshots(
    orgId: string,
    competitorId: string,
    options?: {
        startDate?: Date;
        endDate?: Date;
        limit?: number;
    }
): Promise<CompetitorSnapshot[]> {
    const { firestore } = await createServerClient();

    let query = firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .where('competitorId', '==', competitorId)
        .orderBy('scrapedAt', 'desc') as Query;

    if (options?.startDate) {
        query = query.where('scrapedAt', '>=', options.startDate);
    }
    if (options?.endDate) {
        query = query.where('scrapedAt', '<=', options.endDate);
    }

    query = query.limit(options?.limit || 30);

    const snapshot = await query.get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scrapedAt: data.scrapedAt?.toDate?.() || new Date(),
        } as CompetitorSnapshot;
    });
}

/**
 * Get last week's snapshots for all competitors.
 */
export async function getWeeklySnapshots(orgId: string): Promise<CompetitorSnapshot[]> {
    const { firestore } = await createServerClient();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const snapshot = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .where('scrapedAt', '>=', oneWeekAgo)
        .orderBy('scrapedAt', 'desc')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            scrapedAt: data.scrapedAt?.toDate?.() || new Date(),
        } as CompetitorSnapshot;
    });
}

/**
 * Get summary of competitor activity over a time period.
 */
export async function getCompetitorSummaries(
    orgId: string,
    daysBack: number = 7
): Promise<SnapshotSummary[]> {
    const snapshots = await getWeeklySnapshots(orgId);

    // Group by competitor
    const byCompetitor = new Map<string, CompetitorSnapshot[]>();
    for (const snap of snapshots) {
        const existing = byCompetitor.get(snap.competitorId) || [];
        existing.push(snap);
        byCompetitor.set(snap.competitorId, existing);
    }

    // Calculate summaries
    const summaries: SnapshotSummary[] = [];
    for (const [competitorId, snaps] of byCompetitor.entries()) {
        const allDeals = snaps.reduce<CompetitorDeal[]>((acc, s) => acc.concat(s.deals), []);
        const allProducts = snaps.reduce<CompetitorProduct[]>((acc, s) => acc.concat(s.products), []);
        
        summaries.push({
            competitorId,
            competitorName: snaps[0]?.competitorName || 'Unknown',
            snapshotCount: snaps.length,
            avgDealPrice: allDeals.length > 0
                ? allDeals.reduce((sum, d) => sum + d.price, 0) / allDeals.length
                : 0,
            totalDeals: allDeals.length,
            totalProducts: allProducts.length,
            lastScrapedAt: snaps[0]?.scrapedAt || new Date(),
        });
    }

    return summaries;
}

/**
 * Get the most recent snapshot for each competitor.
 */
export async function getLatestSnapshots(orgId: string): Promise<CompetitorSnapshot[]> {
    const { firestore } = await createServerClient();

    // Get all competitors for this org
    const competitorsSnap = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('competitors')
        .where('active', '==', true)
        .get();

    const latestSnapshots: CompetitorSnapshot[] = [];

    for (const compDoc of competitorsSnap.docs) {
        const competitorId = compDoc.id;
        
        const snapshotQuery = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection(COLLECTION)
            .where('competitorId', '==', competitorId)
            .orderBy('scrapedAt', 'desc')
            .limit(1)
            .get();

        if (!snapshotQuery.empty) {
            const doc = snapshotQuery.docs[0];
            const data = doc.data();
            latestSnapshots.push({
                id: doc.id,
                ...data,
                scrapedAt: data.scrapedAt?.toDate?.() || new Date(),
            } as CompetitorSnapshot);
        }
    }

    return latestSnapshots;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Delete snapshots older than retention period.
 * Free tier: 30 days, Paid: 90 days
 */
export async function cleanupOldSnapshots(
    orgId: string,
    retentionDays: number = 30
): Promise<number> {
    const { firestore } = await createServerClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldSnapshots = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection(COLLECTION)
        .where('scrapedAt', '<', cutoffDate)
        .limit(500)
        .get();

    if (oldSnapshots.empty) {
        return 0;
    }

    const batch = firestore.batch();
    for (const doc of oldSnapshots.docs) {
        batch.delete(doc.ref);
    }
    await batch.commit();

    logger.info('[Snapshots] Cleaned up old snapshots', {
        orgId,
        deleted: oldSnapshots.size,
        cutoffDate,
    });

    return oldSnapshots.size;
}
