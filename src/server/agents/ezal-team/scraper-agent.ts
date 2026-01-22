/**
 * Ezal Scraper Agent
 *
 * Step 2 of the competitive intelligence pipeline.
 * Extracts structured product/pricing data from competitor URLs.
 */

import { logger } from '@/lib/logger';
import { runMultiStepTask } from '../harness';
import {
  ScraperTools,
  ScraperResult,
  ScrapedCompetitor,
  EzalPipelineState,
} from './types';
import { z } from 'zod';
import { ai } from '@/ai/genkit';

// ============================================================================
// SCRAPER AGENT SYSTEM INSTRUCTIONS
// ============================================================================

const SCRAPER_SYSTEM_INSTRUCTIONS = `
You are the SCRAPER - the second step in the Ezal Competitive Intelligence pipeline.

YOUR MISSION: Extract structured product/pricing data from competitor URLs.

STRATEGY:
1. Primary: Use RTRVR browser automation for JavaScript-heavy menus (Dutchie, iHeartJane)
2. Fallback: Use Firecrawl for static content
3. Parse content to extract products, prices, categories

DATA TO EXTRACT FOR EACH PRODUCT:
- name: Product name
- brand: Brand name if visible
- category: flower, vape, edible, pre-roll, concentrate, etc.
- price: Current price (sale price if on sale)
- regularPrice: Original price if on sale
- inStock: Whether available
- thc: THC percentage if shown
- cbd: CBD percentage if shown

OUTPUT:
Structured array of products per competitor URL.

RULES:
- Extract ALL products visible on the page (up to 100 per URL)
- Capture both sale and regular prices when available
- Note stock status when visible
- If parsing fails, try the fallback scraper before giving up
`;

// ============================================================================
// SCRAPER AGENT IMPLEMENTATION
// ============================================================================

/**
 * Run the Scraper agent to extract product data from competitor URLs.
 */
export async function runScraperAgent(
  pipelineState: EzalPipelineState,
  tools: ScraperTools
): Promise<ScraperResult> {
  const startTime = Date.now();
  const urls = pipelineState.finderResult?.urls || [];

  logger.info(`[Ezal:Scraper] Starting extraction for ${urls.length} URLs`);

  const competitors: ScrapedCompetitor[] = [];
  let successCount = 0;
  let failureCount = 0;
  let totalProducts = 0;

  // Determine scraping order based on preference
  const preferRtrvr = tools.preferredBackend === 'rtrvr' ||
    (tools.preferredBackend === 'auto' && tools.rtrvrScrape);

  for (const urlEntry of urls) {
    try {
      logger.debug(`[Ezal:Scraper] Processing: ${urlEntry.url}`);

      let markdown = '';
      let products: ScrapedCompetitor['products'] = [];
      let scrapeMethod = 'none';

      // Strategy 1: Try RTRVR first (better for JS-heavy menus like Dutchie, iHeartJane)
      if (preferRtrvr && tools.rtrvrScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Trying RTRVR for ${urlEntry.url}`);
          const rtrvrResult = await tools.rtrvrScrape(
            urlEntry.url,
            'Extract all cannabis products with name, brand, category, price, regularPrice, inStock, thc%, cbd%'
          );

          if (rtrvrResult.status === 'success') {
            // RTRVR may return products directly or markdown
            if (rtrvrResult.products && rtrvrResult.products.length > 0) {
              products = rtrvrResult.products;
              scrapeMethod = 'rtrvr_direct';
            } else if (rtrvrResult.markdown) {
              markdown = rtrvrResult.markdown;
              scrapeMethod = 'rtrvr_markdown';
            }
          }
        } catch (e) {
          logger.warn(`[Ezal:Scraper] RTRVR failed for ${urlEntry.url}: ${e}`);
        }
      }

      // Strategy 2: Try Firecrawl if RTRVR didn't get products
      if (products.length === 0 && !markdown && tools.firecrawlScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Trying Firecrawl for ${urlEntry.url}`);
          const scrapeResult = await tools.firecrawlScrape(urlEntry.url, {
            formats: ['markdown'],
          });
          markdown = scrapeResult.markdown;
          scrapeMethod = 'firecrawl';
        } catch (e) {
          logger.warn(`[Ezal:Scraper] Firecrawl failed for ${urlEntry.url}: ${e}`);
        }
      }

      // Strategy 3: Fallback to RTRVR if Firecrawl was tried first and failed
      if (products.length === 0 && !markdown && !preferRtrvr && tools.rtrvrScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Fallback to RTRVR for ${urlEntry.url}`);
          const rtrvrResult = await tools.rtrvrScrape(
            urlEntry.url,
            'Extract all cannabis products with name, brand, category, price, regularPrice, inStock, thc%, cbd%'
          );

          if (rtrvrResult.status === 'success') {
            if (rtrvrResult.products && rtrvrResult.products.length > 0) {
              products = rtrvrResult.products;
              scrapeMethod = 'rtrvr_fallback_direct';
            } else if (rtrvrResult.markdown) {
              markdown = rtrvrResult.markdown;
              scrapeMethod = 'rtrvr_fallback_markdown';
            }
          }
        } catch (e) {
          logger.warn(`[Ezal:Scraper] RTRVR fallback failed for ${urlEntry.url}: ${e}`);
        }
      }

      // Extract products from markdown if we have it but no products yet
      if (markdown && products.length === 0) {
        products = await tools.extractProductsFromMarkdown(markdown);
      }

      // Limit to 100 products per competitor
      products = products.slice(0, 100);

      const competitor: ScrapedCompetitor = {
        id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: urlEntry.title || extractDomainName(urlEntry.url),
        url: urlEntry.url,
        products,
        scrapedAt: new Date().toISOString(),
        rawMarkdown: markdown.slice(0, 5000), // Keep truncated for debugging
      };

      competitors.push(competitor);
      totalProducts += products.length;
      successCount++;

      logger.debug(
        `[Ezal:Scraper] Extracted ${products.length} products from ${urlEntry.url} (method: ${scrapeMethod})`
      );
    } catch (e) {
      logger.error(`[Ezal:Scraper] Failed to scrape ${urlEntry.url}: ${e}`);
      failureCount++;
    }
  }

  const durationMs = Date.now() - startTime;

  logger.info(
    `[Ezal:Scraper] Complete. Scraped ${successCount}/${urls.length} URLs, ${totalProducts} products in ${durationMs}ms`
  );

  return {
    competitors,
    totalProducts,
    successCount,
    failureCount,
    durationMs,
  };
}

// ============================================================================
// PRODUCT EXTRACTION
// ============================================================================

const ProductExtractionSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      brand: z.string().optional(),
      category: z.string().optional(),
      price: z.number().optional(),
      regularPrice: z.number().optional(),
      inStock: z.boolean().optional(),
      thc: z.number().optional(),
      cbd: z.number().optional(),
    })
  ),
});

/**
 * Create a default product extractor using LLM to parse markdown.
 */
export function createDefaultProductExtractor(): ScraperTools['extractProductsFromMarkdown'] {
  return async (markdown: string): Promise<ScrapedCompetitor['products']> => {
    if (!markdown || markdown.length < 100) {
      return [];
    }

    try {
      // Truncate very long content
      const truncatedMarkdown = markdown.slice(0, 15000);

      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: `Extract all cannabis products from this menu content. Return a JSON array of products.

For each product, extract:
- name: Product name
- brand: Brand name if visible
- category: flower, vape, edible, pre-roll, concentrate, topical, tincture, or other
- price: Current price as number (no $ sign)
- regularPrice: Original price if on sale
- inStock: true/false if visible
- thc: THC percentage as number (e.g., 24.5)
- cbd: CBD percentage as number

MENU CONTENT:
${truncatedMarkdown}

Return ONLY valid JSON with format: { "products": [...] }`,
        output: {
          schema: ProductExtractionSchema,
        },
      });

      const parsed = result.output;
      if (parsed && Array.isArray(parsed.products)) {
        return parsed.products;
      }

      return [];
    } catch (e) {
      logger.warn(`[Ezal:Scraper] Product extraction failed: ${e}`);
      return [];
    }
  };
}

// ============================================================================
// RTRVR SCRAPER FACTORY
// ============================================================================

/**
 * Create an RTRVR-based scraper tool.
 * Uses browser automation for JavaScript-heavy menus.
 */
export function createRTRVRScraper(): ScraperTools['rtrvrScrape'] {
  return async (url: string, extractionPrompt?: string) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { executeAgentTask, isRTRVRAvailable } = await import('@/server/services/rtrvr');

      if (!isRTRVRAvailable()) {
        return { status: 'error' as const };
      }

      const prompt = extractionPrompt ||
        'Extract all cannabis products from this dispensary menu. For each product, get: name, brand, category (flower/vape/edible/pre-roll/concentrate/topical/tincture), price, regularPrice (if on sale), inStock (true/false), thc percentage, cbd percentage.';

      const result = await executeAgentTask({
        input: prompt,
        urls: [url],
        verbosity: 'final',
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  brand: { type: 'string' },
                  category: { type: 'string' },
                  price: { type: 'number' },
                  regularPrice: { type: 'number' },
                  inStock: { type: 'boolean' },
                  thc: { type: 'number' },
                  cbd: { type: 'number' },
                },
                required: ['name'],
              },
            },
          },
        },
      });

      if (result.success && result.data) {
        const data = result.data;

        // Try to extract products from result
        const resultData = data.result as { products?: ScrapedCompetitor['products'] } | undefined;

        return {
          status: data.status,
          result: data.result,
          products: resultData?.products,
        };
      }

      return { status: 'error' as const };
    } catch (e) {
      logger.error(`[Ezal:Scraper:RTRVR] Failed: ${e}`);
      return { status: 'error' as const };
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and common TLDs for cleaner name
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}
