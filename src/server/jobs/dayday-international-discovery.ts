/**
 * Day Day International Market Discovery Job
 * Runs daily via GitHub Actions to scrape and enrich international dispensary data
 * Powered by RTRVR browser automation for Google Maps scraping
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import {
    getEnabledInternationalMarkets,
    InternationalMarket,
} from '@/lib/config/international-markets';
import {
    scrapeGoogleMapsDispensaries,
    enrichDispensaryData,
    generatePageMetadata,
    saveInternationalPageData,
    logDiscoveryRun,
    InternationalDispensary,
} from '@/server/services/growth/international-discovery';
import { FieldValue } from 'firebase-admin/firestore';

export interface InternationalDiscoveryResult {
    marketsProcessed: number;
    dispensariesFound: number;
    dispensariesEnriched: number;
    pagesSaved: number;
    errors: string[];
    duration: number;
}

/**
 * Run international market discovery for multiple markets
 * @param marketCount - Number of markets to process per run (default 2)
 */
export async function runInternationalDiscovery(
    marketCount: number = 2
): Promise<InternationalDiscoveryResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let dispensariesFound = 0;
    let dispensariesEnriched = 0;
    let pagesSaved = 0;

    try {
        logger.info('[IntlDay] Starting international discovery', {
            marketCount,
            timestamp: new Date().toISOString(),
        });

        const db = getAdminFirestore();
        const enabledMarkets = getEnabledInternationalMarkets();

        // Get markets processed in last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentRuns = await db
            .collection('international_discovery_log')
            .where('timestamp', '>=', oneDayAgo)
            .where('success', '==', true)
            .get();

        const recentlyProcessed = new Set(
            recentRuns.docs.map(d => (d.data() as any).marketId)
        );

        // Find unprocessed markets
        const unprocessedMarkets = enabledMarkets.filter(
            m => !recentlyProcessed.has(m.id)
        );

        // If all markets processed today, cycle from top
        const markets =
            unprocessedMarkets.length > 0
                ? unprocessedMarkets.slice(0, marketCount)
                : enabledMarkets.slice(0, marketCount);

        logger.info('[IntlDay] Selected markets for processing', {
            count: markets.length,
            markets: markets.map(m => m.id),
        });

        // Process each market
        for (const market of markets) {
            try {
                logger.info('[IntlDay] Processing market', { marketId: market.id });

                // 1. Scrape Google Maps via RTRVR
                const rawDispensaries =
                    await scrapeGoogleMapsDispensaries(market);

                if (rawDispensaries.length === 0) {
                    logger.warn('[IntlDay] No dispensaries found', {
                        marketId: market.id,
                    });
                    await logDiscoveryRun(market.id, {
                        dispensariesFound: 0,
                        success: false,
                        error: 'No dispensaries found via RTRVR',
                    });
                    continue;
                }

                dispensariesFound += rawDispensaries.length;
                logger.info('[IntlDay] Scraped dispensaries', {
                    marketId: market.id,
                    count: rawDispensaries.length,
                });

                // 2. Enrich dispensary data (visit websites for menu/pricing)
                const enrichedDispensaries: InternationalDispensary[] = [];
                for (const dispensary of rawDispensaries) {
                    try {
                        const enriched = await enrichDispensaryData(
                            dispensary,
                            market
                        );
                        enrichedDispensaries.push(enriched);
                        dispensariesEnriched++;
                        // Rate limiting - be respectful to websites
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        logger.warn('[IntlDay] Enrichment failed for dispensary', {
                            dispensary: dispensary.name,
                            error: err,
                        });
                        // Add unenriched version to list
                        enrichedDispensaries.push(dispensary);
                    }
                }

                // 3. Generate SEO metadata
                const metadata = await generatePageMetadata(
                    market,
                    enrichedDispensaries.length
                );

                // 4. Save to Firestore
                const pageSaved = await saveInternationalPageData({
                    marketId: market.id,
                    country: market.country,
                    city: market.city,
                    dispensaries: enrichedDispensaries,
                    metadata,
                    scrapedAt: new Date(),
                    currency: market.currency,
                    language: market.locale.split('-')[0],
                    published: true,
                });

                if (pageSaved) {
                    pagesSaved++;
                }

                // 5. Log successful run
                await logDiscoveryRun(market.id, {
                    dispensariesFound: enrichedDispensaries.length,
                    success: true,
                });

                // Rate limiting between markets
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                logger.error('[IntlDay] Market processing failed', {
                    marketId: market.id,
                    error: errorMsg,
                });
                errors.push(`${market.id}: ${errorMsg}`);

                // Log failed run
                await logDiscoveryRun(market.id, {
                    dispensariesFound: 0,
                    success: false,
                    error: errorMsg,
                });
            }
        }

        const duration = Date.now() - startTime;

        logger.info('[IntlDay] Discovery complete', {
            marketsProcessed: markets.length,
            dispensariesFound,
            dispensariesEnriched,
            pagesSaved,
            duration,
            errors: errors.length,
        });

        return {
            marketsProcessed: markets.length,
            dispensariesFound,
            dispensariesEnriched,
            pagesSaved,
            errors,
            duration,
        };
    } catch (error) {
        const errorMsg =
            error instanceof Error ? error.message : String(error);
        logger.error('[IntlDay] Discovery job failed', { error: errorMsg });

        return {
            marketsProcessed: 0,
            dispensariesFound: 0,
            dispensariesEnriched: 0,
            pagesSaved: 0,
            errors: [errorMsg],
            duration: Date.now() - startTime,
        };
    }
}

export const runInternationalDiscoveryJob = runInternationalDiscovery;
