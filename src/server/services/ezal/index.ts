// src/server/services/ezal/index.ts

// src/server/services/ezal/index.ts
/**
 * Ezal Competitive Intelligence - Main Orchestrator
 * Combines all Ezal services into a single entry point
 */

import { logger } from '@/lib/logger';
import {
    DataSource,
    Competitor,
    ScrapeJob,
    CompetitorSearchRequest,
    EzalInsight,
} from '@/types/ezal-scraper';

// Re-export all services
export * from './competitor-manager';
export * from './scrape-scheduler';
export * from './scraper-fetcher';
export * from './parser-engine';
export * from './diff-engine';

// Import for orchestration
import {
    getDataSource,
    quickSetupCompetitor,
    searchCompetitors,
} from './competitor-manager';
import {
    createScrapeJob,
    runScheduler,
    getPendingJobs,
} from './scrape-scheduler';
import {
    executeScrape,
    scrapeNow,
} from './scraper-fetcher';
import {
    parseContent,
    ParseResult,
} from './parser-engine';
import {
    processParsedProducts,
    getRecentInsights,
    findPriceGaps,
    DiffResult,
} from './diff-engine';

// =============================================================================
// FULL SCRAPE PIPELINE
// =============================================================================

export interface FullScrapeResult {
    success: boolean;
    runId: string;
    fetchDurationMs: number;
    parseDurationMs: number;
    diffResult: DiffResult | null;
    parseResult: ParseResult | null;
    error?: string;
}

/**
 * Execute a full scrape pipeline: fetch -> parse -> diff
 */
export async function executeFullScrape(
    tenantId: string,
    sourceId: string
): Promise<FullScrapeResult> {
    const startTime = Date.now();

    try {
        // Get the data source
        const source = await getDataSource(tenantId, sourceId);
        if (!source) {
            throw new Error(`Data source not found: ${sourceId}`);
        }

        // Step 1: Fetch
        const scrapeResult = await scrapeNow(tenantId, sourceId);
        const fetchDuration = Date.now() - startTime;

        if (!scrapeResult.success || !scrapeResult.content) {
            return {
                success: false,
                runId: scrapeResult.runId,
                fetchDurationMs: fetchDuration,
                parseDurationMs: 0,
                diffResult: null,
                parseResult: null,
                error: scrapeResult.error,
            };
        }

        // Step 2: Parse
        const parseStart = Date.now();
        const parseResult = await parseContent(
            scrapeResult.content,
            source.sourceType,
            source.parserProfileId
        );
        const parseDuration = Date.now() - parseStart;

        if (!parseResult.success || parseResult.products.length === 0) {
            return {
                success: false,
                runId: scrapeResult.runId,
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
            scrapeResult.runId,
            parseResult.products
        );

        logger.info('[Ezal] Full scrape completed:', {
            tenantId,
            sourceId,
            totalDuration: Date.now() - startTime,
            productsParsed: parseResult.products.length,
            newProducts: diffResult.newProducts,
            priceChanges: diffResult.priceChanges,
        });

        return {
            success: true,
            runId: scrapeResult.runId,
            fetchDurationMs: fetchDuration,
            parseDurationMs: parseDuration,
            diffResult,
            parseResult,
        };

    } catch (error) {
        logger.error('[Ezal] Full scrape failed:', {
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
 * Process all pending scrape jobs for a tenant
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

            const result = await executeFullScrape(tenantId, job.sourceId);
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

// =============================================================================
// EZAL AGENT INTERFACE
// =============================================================================

/**
 * Interface for Ezal agent to interact with scraper
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
     * Trigger immediate scrape
     */
    async scrapeNow(tenantId: string, sourceId: string) {
        const result = await executeFullScrape(tenantId, sourceId);

        return {
            success: result.success,
            productsParsed: result.parseResult?.totalFound || 0,
            newProducts: result.diffResult?.newProducts || 0,
            priceChanges: result.diffResult?.priceChanges || 0,
            error: result.error,
        };
    },
};
