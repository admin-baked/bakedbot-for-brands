/**
 * Ezal Pipeline Orchestrator
 *
 * Coordinates the 3-agent team: Finder → Scraper → Analyzer
 */

import { logger } from '@/lib/logger';
import {
  EzalPipelineState,
  EzalPipelineOptions,
  FinderTools,
  ScraperTools,
  AnalyzerTools,
  PipelineStage,
} from './types';
import { runFinderAgent, createDefaultUrlValidator } from './finder-agent';
import { runScraperAgent, createDefaultProductExtractor, createRTRVRScraper } from './scraper-agent';
import { runAnalyzerAgent, createDefaultPriceComparator } from './analyzer-agent';

// ============================================================================
// PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Run the complete Ezal competitive intelligence pipeline.
 *
 * @example
 * ```typescript
 * const result = await runEzalPipeline({
 *   tenantId: 'brand-123',
 *   query: 'Detroit Michigan cannabis dispensaries',
 * });
 *
 * console.log(result.analyzerResult?.insights);
 * ```
 */
export async function runEzalPipeline(
  options: EzalPipelineOptions,
  tools?: {
    finder?: Partial<FinderTools>;
    scraper?: Partial<ScraperTools>;
    analyzer?: Partial<AnalyzerTools>;
  }
): Promise<EzalPipelineState> {
  const {
    tenantId,
    query,
    skipStages = [],
    manualUrls,
    maxUrls = 10,
    onStageComplete,
  } = options;

  // Initialize pipeline state
  const state: EzalPipelineState = {
    requestId: `ezal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tenantId,
    query,
    stage: 'pending',
    errors: [],
    startedAt: new Date().toISOString(),
  };

  logger.info(`[Ezal:Pipeline] Starting pipeline ${state.requestId} for query: "${query}"`);

  try {
    // =========================================================================
    // STAGE 1: FINDER
    // =========================================================================
    if (!skipStages.includes('finding') && !manualUrls?.length) {
      state.stage = 'finding';
      logger.info('[Ezal:Pipeline] Stage 1: Finding competitor URLs...');

      const finderTools: FinderTools = {
        validateUrl: tools?.finder?.validateUrl || createDefaultUrlValidator(),
        searchExa: tools?.finder?.searchExa,
        searchPerplexity: tools?.finder?.searchPerplexity,
        searchWeb: tools?.finder?.searchWeb,
      };

      try {
        state.finderResult = await runFinderAgent(state, finderTools);

        if (onStageComplete) {
          await onStageComplete('finding', state.finderResult);
        }

        logger.info(
          `[Ezal:Pipeline] Stage 1 complete: Found ${state.finderResult.urls.length} URLs`
        );
      } catch (e) {
        const errorMsg = `Finder failed: ${(e as Error).message}`;
        state.errors.push(errorMsg);
        logger.error(`[Ezal:Pipeline] ${errorMsg}`);
      }
    } else if (manualUrls?.length) {
      // Use manual URLs
      state.finderResult = {
        urls: manualUrls.slice(0, maxUrls).map((url) => ({
          url,
          relevanceScore: 1.0,
          source: 'manual' as const,
        })),
        searchQueries: [],
        totalFound: manualUrls.length,
        durationMs: 0,
      };
      logger.info(`[Ezal:Pipeline] Using ${manualUrls.length} manual URLs (skipping finder)`);
    }

    // =========================================================================
    // STAGE 2: SCRAPER
    // =========================================================================
    if (
      !skipStages.includes('scraping') &&
      state.finderResult?.urls?.length
    ) {
      state.stage = 'scraping';
      logger.info(
        `[Ezal:Pipeline] Stage 2: Scraping ${state.finderResult.urls.length} URLs...`
      );

      const scraperTools: ScraperTools = {
        extractProductsFromMarkdown:
          tools?.scraper?.extractProductsFromMarkdown ||
          createDefaultProductExtractor(),
        firecrawlScrape: tools?.scraper?.firecrawlScrape,
        rtrvrScrape: tools?.scraper?.rtrvrScrape || createRTRVRScraper(),
        parseMenu: tools?.scraper?.parseMenu,
        preferredBackend: tools?.scraper?.preferredBackend || 'auto',
      };

      try {
        state.scraperResult = await runScraperAgent(state, scraperTools);

        if (onStageComplete) {
          await onStageComplete('scraping', state.scraperResult);
        }

        logger.info(
          `[Ezal:Pipeline] Stage 2 complete: Scraped ${state.scraperResult.competitors.length} competitors, ${state.scraperResult.totalProducts} products`
        );
      } catch (e) {
        const errorMsg = `Scraper failed: ${(e as Error).message}`;
        state.errors.push(errorMsg);
        logger.error(`[Ezal:Pipeline] ${errorMsg}`);
      }
    }

    // =========================================================================
    // STAGE 3: ANALYZER
    // =========================================================================
    if (
      !skipStages.includes('analyzing') &&
      state.scraperResult?.competitors?.length
    ) {
      state.stage = 'analyzing';
      logger.info(
        `[Ezal:Pipeline] Stage 3: Analyzing ${state.scraperResult.totalProducts} products...`
      );

      const analyzerTools: AnalyzerTools = {
        compareWithOurPrices:
          tools?.analyzer?.compareWithOurPrices ||
          createDefaultPriceComparator(async () => []), // Empty by default
        alertCraig:
          tools?.analyzer?.alertCraig || (async () => false), // Noop by default
        lettaSaveFact:
          tools?.analyzer?.lettaSaveFact || (async () => ({})),
        lettaMessageAgent:
          tools?.analyzer?.lettaMessageAgent || (async () => ({})),
      };

      try {
        state.analyzerResult = await runAnalyzerAgent(state, analyzerTools);

        if (onStageComplete) {
          await onStageComplete('analyzing', state.analyzerResult);
        }

        logger.info(
          `[Ezal:Pipeline] Stage 3 complete: Generated ${state.analyzerResult.insights.length} insights`
        );
      } catch (e) {
        const errorMsg = `Analyzer failed: ${(e as Error).message}`;
        state.errors.push(errorMsg);
        logger.error(`[Ezal:Pipeline] ${errorMsg}`);
      }
    }

    // =========================================================================
    // COMPLETE
    // =========================================================================
    state.stage = 'complete';
    state.completedAt = new Date().toISOString();

    const totalDurationMs =
      Date.now() - new Date(state.startedAt).getTime();

    logger.info(
      `[Ezal:Pipeline] Pipeline ${state.requestId} complete in ${totalDurationMs}ms. ` +
        `URLs: ${state.finderResult?.urls.length || 0}, ` +
        `Competitors: ${state.scraperResult?.competitors.length || 0}, ` +
        `Products: ${state.scraperResult?.totalProducts || 0}, ` +
        `Insights: ${state.analyzerResult?.insights.length || 0}, ` +
        `Errors: ${state.errors.length}`
    );

    if (onStageComplete) {
      await onStageComplete('complete', state);
    }
  } catch (error) {
    state.stage = 'error';
    const errorMsg = (error as Error).message;
    state.errors.push(errorMsg);
    logger.error(`[Ezal:Pipeline] Pipeline failed: ${errorMsg}`);

    if (onStageComplete) {
      await onStageComplete('error', { error: errorMsg });
    }
  }

  return state;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick scan with manual URLs (skips finder stage).
 */
export async function quickScan(
  tenantId: string,
  urls: string[],
  tools?: {
    scraper?: Partial<ScraperTools>;
    analyzer?: Partial<AnalyzerTools>;
  }
): Promise<EzalPipelineState> {
  return runEzalPipeline(
    {
      tenantId,
      query: `Manual scan of ${urls.length} URLs`,
      manualUrls: urls,
    },
    tools
  );
}

/**
 * Get pipeline stage progress as a percentage.
 */
export function getPipelineProgress(state: EzalPipelineState): number {
  const stageWeights: Record<PipelineStage, number> = {
    pending: 0,
    finding: 25,
    scraping: 50,
    analyzing: 75,
    complete: 100,
    error: 0,
  };

  return stageWeights[state.stage];
}
