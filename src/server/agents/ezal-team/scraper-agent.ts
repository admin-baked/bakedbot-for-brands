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
  FirecrawlAction,
} from './types';
import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { sanitizeForPrompt } from '@/server/security';

// ============================================================================
// SCRAPER AGENT SYSTEM INSTRUCTIONS
// ============================================================================

const SCRAPER_SYSTEM_INSTRUCTIONS = `
You are the SCRAPER - the second step in the Ezal Competitive Intelligence pipeline.

YOUR MISSION: Extract structured product/pricing data from competitor URLs.

STRATEGY:
1. Primary: Use Firecrawl with age-gate actions (handles Dutchie, iHeartJane, and most cannabis menus)
2. Fallback: Use RTRVR browser automation for pages Firecrawl cannot render
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

  // Age-gate actions for cannabis menu platforms (Dutchie, iHeartJane, Weedmaps, etc.)
  const AGE_GATE_ACTIONS: FirecrawlAction[] = [
    {
      type: 'click',
      selector: [
        '[data-testid="age-gate-yes"]',
        '.age-gate__button--yes',
        '[class*="ageGate"] button',
        '[id*="age-gate"] button',
        'button[class*="age-verif"]',
        'button[class*="confirm-age"]',
        '[aria-label*="21"]',
        'button[class*="AgeGate"]',
      ].join(', '),
    },
    { type: 'wait', milliseconds: 800 },
  ];

  const preferFirecrawl = tools.preferredBackend !== 'rtrvr' && !!tools.firecrawlScrape;

  for (const urlEntry of urls) {
    try {
      logger.debug(`[Ezal:Scraper] Processing: ${urlEntry.url}`);

      let markdown = '';
      let products: ScrapedCompetitor['products'] = [];
      let scrapeMethod = 'none';

      // Strategy 1: Firecrawl with age-gate actions (primary — handles Dutchie, iHeartJane, most menus)
      if (preferFirecrawl && tools.firecrawlScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Trying Firecrawl (with age-gate actions) for ${urlEntry.url}`);
          const scrapeResult = await tools.firecrawlScrape(urlEntry.url, {
            formats: ['markdown'],
            actions: AGE_GATE_ACTIONS,
          });
          if (scrapeResult.markdown && scrapeResult.markdown.length >= 300) {
            markdown = scrapeResult.markdown;
            scrapeMethod = 'firecrawl_actions';
          }
        } catch (e) {
          logger.warn(`[Ezal:Scraper] Firecrawl failed for ${urlEntry.url}: ${e}`);
        }
      }

      // Strategy 2: Firecrawl plain scrape (no actions — fallback for non-cannabis pages)
      if (!markdown && !preferFirecrawl && tools.firecrawlScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Trying Firecrawl (plain) for ${urlEntry.url}`);
          const scrapeResult = await tools.firecrawlScrape(urlEntry.url, { formats: ['markdown'] });
          markdown = scrapeResult.markdown;
          scrapeMethod = 'firecrawl';
        } catch (e) {
          logger.warn(`[Ezal:Scraper] Firecrawl plain failed for ${urlEntry.url}: ${e}`);
        }
      }

      // Strategy 3: RTRVR browser automation (fallback — for pages Firecrawl cannot render)
      if (products.length === 0 && !markdown && tools.rtrvrScrape) {
        try {
          logger.debug(`[Ezal:Scraper] Fallback to RTRVR for ${urlEntry.url}`);
          const rtrvrResult = await tools.rtrvrScrape(
            urlEntry.url,
            'Extract all cannabis products with name, brand, category, price, regularPrice, inStock, thc%, cbd%'
          );

          if (rtrvrResult.status === 'success') {
            if (rtrvrResult.products && rtrvrResult.products.length > 0) {
              products = rtrvrResult.products;
              scrapeMethod = 'rtrvr_direct';
            } else if (rtrvrResult.markdown) {
              markdown = rtrvrResult.markdown;
              scrapeMethod = 'rtrvr_markdown';
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
        // SECURITY: Sanitize competitor name from external source
        name: sanitizeForPrompt(urlEntry.title || extractDomainName(urlEntry.url), 200),
        url: urlEntry.url,
        products,
        scrapedAt: new Date().toISOString(),
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
      // SECURITY: Truncate AND sanitize scraped content before LLM prompt
      const truncatedMarkdown = sanitizeForPrompt(markdown, 5000);

      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
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
// FIRECRAWL SCRAPER FACTORY
// ============================================================================

/**
 * Create a default Firecrawl-based scraper tool.
 * Passes actions through to Firecrawl (age gates, login sequences).
 */
export function createDefaultFirecrawlScraper(): ScraperTools['firecrawlScrape'] {
  return async (url: string, options = {}) => {
    const { formats = ['markdown'], actions = [] } = options;
    const { discovery } = await import('@/server/services/firecrawl');
    try {
      if (actions.length > 0) {
        const result = await discovery.discoverWithActions(url, actions);
        return { markdown: result.markdown, metadata: result.metadata };
      }
      const result = await discovery.discoverUrl(url, formats as ('markdown' | 'html' | 'rawHtml' | 'screenshot')[]);
      return {
        markdown: (result as any).markdown ?? '',
        metadata: (result as any).metadata,
      };
    } catch (e) {
      logger.warn(`[Ezal:Scraper:Firecrawl] Failed for ${url}: ${e}`);
      return { markdown: '' };
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
