// src/server/services/ezal/index.ts

/**
 * Ezal Competitive Intelligence - Main Orchestrator
 * Combines all Ezal services into a single entry point
 */

import { createServerClient } from '@/firebase/server-client';
import { findPricingPlan } from '@/lib/config/pricing';
import { logger } from '@/lib/logger';
import { getEzalLimits } from '@/lib/plan-limits';
import { saveCompetitorSnapshot } from '@/server/repos/competitor-snapshots';
import {
    DataSource,
} from '@/types/ezal-discovery';

// Re-export all services
export * from './competitor-manager';
export * from './competitor-discovery';
export * from './discovery-scheduler';
export * from './discovery-fetcher';
export * from './parser-engine';
export * from './diff-engine';
export { lancedbStore } from './lancedb-store';

// Import for orchestration
import {
    createDataSource,
    getCompetitor,
    getDataSource,
    listCompetitors,
    listDataSources,
    lookupCannMenusRetailer,
    quickSetupCompetitor,
    searchCompetitors,
    updateDataSource,
} from './competitor-manager';
import {
    searchProducts as lanceSearchProducts,
    searchInsights as lanceSearchInsights,
    getStoreStats as lanceGetStoreStats,
} from './lancedb-store';
import {
    getPendingJobs,
} from './discovery-scheduler';
import {
    discoverNow,
} from './discovery-fetcher';
import {
    parseContent,
    ParsedProduct,
    ParseResult,
} from './parser-engine';
import {
    processParsedProducts,
    getRecentInsights,
    findPriceGaps,
    DiffResult,
} from './diff-engine';
import {
    generateWeeklyIntelReport,
    WeeklyIntelReport,
} from './weekly-intel-report';

// =============================================================================
// FULL DISCOVERY PIPELINE
// =============================================================================

export interface FullDiscoveryResult {
    success: boolean;
    runId: string;
    fetchDurationMs: number;
    parseDurationMs: number;
    diffResult: DiffResult | null;
    parseResult: ParseResult | null;
    snapshotId?: string;
    error?: string;
}

function pickFirstString(...values: Array<unknown>): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function normalizeTrackedUrl(url: string | undefined | null): string | null {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        return parsed.toString();
    } catch {
        try {
            return new URL(`https://${url}`).toString();
        } catch {
            return null;
        }
    }
}

function formatDiscount(currentPrice: number, regularPrice: number | null): string | undefined {
    if (!regularPrice || regularPrice <= currentPrice) {
        return undefined;
    }

    const pctOff = Math.round(((regularPrice - currentPrice) / regularPrice) * 100);
    return pctOff > 0 ? `${pctOff}% off` : undefined;
}

function buildSnapshotProducts(parsedProducts: ParsedProduct[]) {
    return parsedProducts.map((product) => ({
        name: product.productName,
        price: product.price,
        category: product.category,
        brand: product.brandName || undefined,
        inStock: product.inStock,
    }));
}

function buildSnapshotDeals(parsedProducts: ParsedProduct[]) {
    const promoDeals = parsedProducts
        .filter((product) => product.regularPrice !== null && product.regularPrice > product.price)
        .map((product) => ({
            name: product.productName,
            price: product.price,
            originalPrice: product.regularPrice ?? undefined,
            discount: formatDiscount(product.price, product.regularPrice),
            category: product.category,
        }));

    if (promoDeals.length > 0) {
        return promoDeals;
    }

    // Some menus expose price points but not list-vs-sale pricing.
    // Fall back to tracked priced offers so the daily report still reflects live menu data.
    return parsedProducts
        .filter((product) => product.inStock && product.price > 0)
        .slice(0, 50)
        .map((product) => ({
            name: product.productName,
            price: product.price,
            category: product.category,
        }));
}

function truncateSnapshotContent(content: string | undefined): string | undefined {
    if (!content) return undefined;
    return content.length > 20_000 ? content.slice(0, 20_000) : content;
}

/**
 * Execute a full discovery pipeline: fetch -> parse -> diff
 */
export async function executeFullDiscovery(
    tenantId: string,
    sourceId: string
): Promise<FullDiscoveryResult> {
    const startTime = Date.now();

    try {
        // Get the data source
        const source = await getDataSource(tenantId, sourceId);
        if (!source) {
            throw new Error(`Data source not found: ${sourceId}`);
        }

        // Step 1: Fetch
        const discoveryResult = await discoverNow(tenantId, sourceId);
        const fetchDuration = Date.now() - startTime;

        if (!discoveryResult.success || !discoveryResult.content) {
            return {
                success: false,
                runId: discoveryResult.runId,
                fetchDurationMs: fetchDuration,
                parseDurationMs: 0,
                diffResult: null,
                parseResult: null,
                error: discoveryResult.error,
            };
        }

        // Step 2: Parse
        const parseStart = Date.now();
        const parseResult = await parseContent(
            discoveryResult.content,
            source.sourceType,
            source.parserProfileId
        );
        const parseDuration = Date.now() - parseStart;

        if (!parseResult.success || parseResult.products.length === 0) {
            return {
                success: false,
                runId: discoveryResult.runId,
                fetchDurationMs: fetchDuration,
                parseDurationMs: parseDuration,
                diffResult: null,
                parseResult,
                error: parseResult.parseErrors.join('; ') || 'No products found',
            };
        }

        // Step 3: Diff & Store
        const diffResult = await processParsedProducts(
            tenantId,
            source.competitorId,
            discoveryResult.runId,
            parseResult.products
        );

        const competitor = await getCompetitor(tenantId, source.competitorId);
        const snapshotId = await saveCompetitorSnapshot(tenantId, {
            competitorId: source.competitorId,
            competitorName: competitor?.name || source.competitorId,
            deals: buildSnapshotDeals(parseResult.products),
            products: buildSnapshotProducts(parseResult.products),
            rawMarkdown: truncateSnapshotContent(discoveryResult.content),
            sourceUrl: source.baseUrl,
        });

        logger.info('[Ezal] Full discovery completed:', {
            tenantId,
            sourceId,
            totalDuration: Date.now() - startTime,
            productsParsed: parseResult.products.length,
            newProducts: diffResult.newProducts,
            priceChanges: diffResult.priceChanges,
            snapshotId,
        });

        return {
            success: true,
            runId: discoveryResult.runId,
            fetchDurationMs: fetchDuration,
            parseDurationMs: parseDuration,
            diffResult,
            parseResult,
            snapshotId,
        };

    } catch (error) {
        logger.error('[Ezal] Full discovery failed:', {
            tenantId,
            sourceId,
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            success: false,
            runId: '',
            fetchDurationMs: Date.now() - startTime,
            parseDurationMs: 0,
            diffResult: null,
            parseResult: null,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Process all pending discovery jobs for a tenant
 */
export async function processAllPendingJobs(
    tenantId: string,
    limit: number = 10
): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
}> {
    const jobs = await getPendingJobs(tenantId, limit);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const job of jobs) {
        try {
            const source = await getDataSource(tenantId, job.sourceId);
            if (!source) continue;

            const result = await executeFullDiscovery(tenantId, job.sourceId);
            processed++;

            if (result.success) {
                succeeded++;
            } else {
                failed++;
            }

        } catch (error) {
            processed++;
            failed++;
            logger.error('[Ezal] Job processing failed:', {
                jobId: job.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { processed, succeeded, failed };
}

export interface CompetitiveIntelSourceReconciliation {
    planId: string;
    frequencyMinutes: number;
    competitorsChecked: number;
    sourcesCreated: number;
    sourcesUpdated: number;
    sources: DataSource[];
    skippedCompetitors: Array<{ competitorId: string; reason: string }>;
}

export interface CompetitiveIntelRefreshResult {
    planId: string;
    frequencyMinutes: number;
    competitorsChecked: number;
    activeSources: number;
    sourcesCreated: number;
    sourcesUpdated: number;
    sourcesRun: number;
    succeeded: number;
    failed: number;
    failures: Array<{ sourceId: string; competitorId: string; error: string }>;
    report: Pick<WeeklyIntelReport, 'id' | 'generatedAt' | 'totalDealsTracked' | 'totalSnapshots'> | null;
}

export async function getCompetitiveIntelPlanId(tenantId: string): Promise<string> {
    const { firestore } = await createServerClient();

    const [orgDoc, subscriptionDoc, tenantDoc] = await Promise.all([
        firestore.collection('organizations').doc(tenantId).get(),
        firestore.collection('organizations').doc(tenantId).collection('subscription').doc('current').get(),
        firestore.collection('tenants').doc(tenantId).get(),
    ]);

    const orgData = orgDoc.data() || {};
    const subscriptionData = subscriptionDoc.data() || {};
    const tenantData = tenantDoc.data() || {};

    const rawPlanId =
        pickFirstString(
            orgData?.billing?.planId,
            orgData?.planId,
            subscriptionData?.planId,
            subscriptionData?.tierId,
            orgData?.subscription?.tierId,
            orgData?.plan,
            tenantData?.billing?.planId,
            tenantData?.planId,
            tenantData?.plan
        ) || 'signal';

    return findPricingPlan(rawPlanId)?.id || rawPlanId.toLowerCase();
}

export async function reconcileCompetitiveIntelSources(
    tenantId: string,
    options?: {
        planId?: string;
        forceRunNow?: boolean;
    }
): Promise<CompetitiveIntelSourceReconciliation> {
    const planId = options?.planId || await getCompetitiveIntelPlanId(tenantId);
    const limits = getEzalLimits(planId);
    const now = new Date();

    const [competitors, activeSources] = await Promise.all([
        listCompetitors(tenantId, { active: true, limit: Math.max(limits.maxCompetitors, 100) }),
        listDataSources(tenantId, { active: true }),
    ]);

    const trackedCompetitors =
        limits.maxCompetitors > 0 ? competitors.slice(0, limits.maxCompetitors) : competitors;

    const sourcesByCompetitor = new Map<string, DataSource[]>();
    for (const source of activeSources) {
        const existing = sourcesByCompetitor.get(source.competitorId) || [];
        existing.push(source);
        sourcesByCompetitor.set(source.competitorId, existing);
    }

    const reconciledSources: DataSource[] = [];
    const skippedCompetitors: Array<{ competitorId: string; reason: string }> = [];
    let sourcesCreated = 0;
    let sourcesUpdated = 0;

    for (const competitor of trackedCompetitors) {
        const existingSources = sourcesByCompetitor.get(competitor.id) || [];

        if (existingSources.length === 0) {
            const cannMenusMatch = await lookupCannMenusRetailer(competitor.name, competitor.state);
            const baseUrl =
                normalizeTrackedUrl(cannMenusMatch?.menuUrl) ||
                normalizeTrackedUrl(competitor.primaryDomain);

            if (!baseUrl) {
                skippedCompetitors.push({
                    competitorId: competitor.id,
                    reason: 'Competitor has no valid menu URL or domain to recover a source.',
                });
                continue;
            }

            const source = await createDataSource(tenantId, {
                competitorId: competitor.id,
                kind: 'menu',
                sourceType: cannMenusMatch ? 'cann_menus' : 'jina',
                baseUrl,
                frequencyMinutes: limits.frequencyMinutes,
                robotsAllowed: true,
                parserProfileId: 'generic_html_v1',
                timezone: 'America/New_York',
                priority: cannMenusMatch ? 8 : 6,
                active: true,
                metadata: cannMenusMatch
                    ? {
                        retailerId: cannMenusMatch.retailerId,
                        retailerName: cannMenusMatch.retailerName,
                        state: competitor.state,
                        recoveredBy: 'competitive-intel-refresh',
                        recoveredAt: now.toISOString(),
                    }
                    : {
                        recoveredBy: 'competitive-intel-refresh',
                        recoveredAt: now.toISOString(),
                    },
            });

            reconciledSources.push(source);
            sourcesCreated++;
            continue;
        }

        for (const source of existingSources) {
            const updates: Partial<DataSource> = {};
            const expectedNextDue = source.lastDiscoveryAt
                ? new Date(source.lastDiscoveryAt.getTime() + limits.frequencyMinutes * 60 * 1000)
                : now;

            if (source.frequencyMinutes !== limits.frequencyMinutes) {
                updates.frequencyMinutes = limits.frequencyMinutes;
            }

            if (
                options?.forceRunNow ||
                !source.nextDueAt ||
                source.nextDueAt.getTime() > expectedNextDue.getTime()
            ) {
                updates.nextDueAt = now;
            }

            if (Object.keys(updates).length > 0) {
                await updateDataSource(tenantId, source.id, updates);
                reconciledSources.push({
                    ...source,
                    ...updates,
                    updatedAt: now,
                });
                sourcesUpdated++;
            } else {
                reconciledSources.push(source);
            }
        }
    }

    logger.info('[Ezal] Reconciled competitive intel sources', {
        tenantId,
        planId,
        competitorsChecked: trackedCompetitors.length,
        sourcesCreated,
        sourcesUpdated,
        skippedCompetitors: skippedCompetitors.length,
    });

    return {
        planId,
        frequencyMinutes: limits.frequencyMinutes,
        competitorsChecked: trackedCompetitors.length,
        sourcesCreated,
        sourcesUpdated,
        sources: reconciledSources,
        skippedCompetitors,
    };
}

export async function refreshCompetitiveIntelWorkspace(
    tenantId: string,
    options?: {
        force?: boolean;
        maxSources?: number;
        planId?: string;
    }
): Promise<CompetitiveIntelRefreshResult> {
    const reconciliation = await reconcileCompetitiveIntelSources(tenantId, {
        planId: options?.planId,
        forceRunNow: options?.force,
    });

    const now = new Date();
    const sortedSources = [...reconciliation.sources].sort((left, right) => {
        const leftDue = left.nextDueAt?.getTime() ?? 0;
        const rightDue = right.nextDueAt?.getTime() ?? 0;
        if (leftDue !== rightDue) {
            return leftDue - rightDue;
        }
        return right.priority - left.priority;
    });

    const dueSources = sortedSources.filter((source) => {
        if (options?.force) return true;
        return !source.nextDueAt || source.nextDueAt.getTime() <= now.getTime();
    });

    const maxSources = options?.maxSources ?? 10;
    const sourcesToRun = dueSources.slice(0, maxSources);

    let succeeded = 0;
    let failed = 0;
    const failures: Array<{ sourceId: string; competitorId: string; error: string }> = [];

    for (const source of sourcesToRun) {
        const result = await executeFullDiscovery(tenantId, source.id);
        if (result.success) {
            succeeded++;
            continue;
        }

        failed++;
        failures.push({
            sourceId: source.id,
            competitorId: source.competitorId,
            error: result.error || 'Unknown discovery error',
        });
    }

    const report = await generateWeeklyIntelReport(tenantId);

    logger.info('[Ezal] Competitive intel workspace refresh complete', {
        tenantId,
        planId: reconciliation.planId,
        sourcesRun: sourcesToRun.length,
        succeeded,
        failed,
        reportId: report.id,
        totalSnapshots: report.totalSnapshots,
    });

    return {
        planId: reconciliation.planId,
        frequencyMinutes: reconciliation.frequencyMinutes,
        competitorsChecked: reconciliation.competitorsChecked,
        activeSources: reconciliation.sources.length,
        sourcesCreated: reconciliation.sourcesCreated,
        sourcesUpdated: reconciliation.sourcesUpdated,
        sourcesRun: sourcesToRun.length,
        succeeded,
        failed,
        failures,
        report: {
            id: report.id,
            generatedAt: report.generatedAt,
            totalDealsTracked: report.totalDealsTracked,
            totalSnapshots: report.totalSnapshots,
        },
    };
}

// =============================================================================
// EZAL AGENT INTERFACE
// =============================================================================

/**
 * Interface for Ezal agent to interact with discovery services
 */
export const EzalAgent = {
    /**
     * Track a new competitor
     */
    async trackCompetitor(
        tenantId: string,
        params: {
            name: string;
            city: string;
            state: string;
            zip: string;
            menuUrl: string;
            brandsFocus?: string[];
        }
    ) {
        const result = await quickSetupCompetitor(tenantId, {
            name: params.name,
            type: 'dispensary',
            city: params.city,
            state: params.state,
            zip: params.zip,
            menuUrl: params.menuUrl,
            parserProfileId: 'generic_html_v1',
            brandsFocus: params.brandsFocus,
            frequencyMinutes: 60,
        });

        return {
            message: `Now tracking ${params.name} in ${params.city}, ${params.state}`,
            competitorId: result.competitor.id,
            sourceId: result.dataSource.id,
        };
    },

    /**
     * Find competitors carrying a specific brand
     */
    async findCompetitors(
        tenantId: string,
        params: {
            brandName?: string;
            state?: string;
            zip?: string;
        }
    ) {
        const competitors = await searchCompetitors({
            tenantId,
            brandName: params.brandName,
            state: params.state,
            zip: params.zip,
        });

        return {
            count: competitors.length,
            competitors: competitors.map(c => ({
                name: c.name,
                city: c.city,
                state: c.state,
                brandsFocus: c.brandsFocus,
            })),
        };
    },

    /**
     * Get competitive insights
     */
    async getInsights(
        tenantId: string,
        params?: {
            brandName?: string;
            type?: string;
        }
    ) {
        const insights = await getRecentInsights(tenantId, {
            brandName: params?.brandName,
            limit: 20,
        });

        return {
            count: insights.length,
            insights: insights.map(i => ({
                type: i.type,
                brand: i.brandName,
                severity: i.severity,
                delta: i.deltaPercentage ? `${i.deltaPercentage.toFixed(1)}%` : undefined,
                createdAt: i.createdAt,
            })),
        };
    },

    /**
     * Find price gaps
     */
    async findPriceGaps(
        tenantId: string,
        params?: {
            brandName?: string;
            minGapPercent?: number;
        }
    ) {
        const gaps = await findPriceGaps(tenantId, {
            brandName: params?.brandName,
            minGapPercent: params?.minGapPercent || 5,
        });

        return {
            count: gaps.length,
            gaps: gaps.slice(0, 10).map(g => ({
                product: g.productName,
                ourPrice: `$${g.ourPrice.toFixed(2)}`,
                theirPrice: `$${g.competitorPrice.toFixed(2)}`,
                gap: `${g.gapPercent > 0 ? '+' : ''}${g.gapPercent.toFixed(1)}%`,
            })),
        };
    },

    /**
     * Semantic search across competitive product catalog (LanceDB)
     */
    async semanticSearch(
        tenantId: string,
        params: {
            query: string;
            category?: string;
            competitorId?: string;
            inStockOnly?: boolean;
            limit?: number;
        }
    ) {
        const results = await lanceSearchProducts(tenantId, params.query, {
            category: params.category,
            competitorId: params.competitorId,
            inStockOnly: params.inStockOnly,
            limit: params.limit || 10,
        });

        return {
            count: results.length,
            products: results.map(r => ({
                brand: r.brandName,
                product: r.productName,
                category: r.category,
                price: `$${r.priceCurrent.toFixed(2)}`,
                inStock: r.inStock,
                relevance: `${(r.score * 100).toFixed(0)}%`,
            })),
        };
    },

    /**
     * Semantic search across competitive insights (LanceDB)
     */
    async searchIntel(
        tenantId: string,
        params: {
            query: string;
            severity?: string;
            type?: string;
            limit?: number;
        }
    ) {
        const results = await lanceSearchInsights(tenantId, params.query, {
            severity: params.severity as 'low' | 'medium' | 'high' | 'critical',
            type: params.type as any,
            limit: params.limit || 10,
        });

        return {
            count: results.length,
            insights: results.map(i => ({
                type: i.type,
                brand: i.brandName,
                severity: i.severity,
                delta: i.deltaPercentage ? `${i.deltaPercentage.toFixed(1)}%` : undefined,
                date: i.createdAt,
                summary: i.summary,
                relevance: `${(i.score * 100).toFixed(0)}%`,
            })),
        };
    },

    /**
     * Get LanceDB store stats for this tenant
     */
    async getVectorStoreStats(tenantId: string) {
        return lanceGetStoreStats(tenantId);
    },

    /**
     * Trigger immediate discovery
     */
    async discoverNow(tenantId: string, sourceId: string) {
        const result = await executeFullDiscovery(tenantId, sourceId);

        return {
            success: result.success,
            productsParsed: result.parseResult?.totalFound || 0,
            newProducts: result.diffResult?.newProducts || 0,
            priceChanges: result.diffResult?.priceChanges || 0,
            error: result.error,
        };
    },
};
