/**
 * Ezal Finder Agent
 *
 * Step 1 of the competitive intelligence pipeline.
 * Discovers competitor URLs using Exa, Perplexity, or web search.
 */

import { logger } from '@/lib/logger';
import { runMultiStepTask } from '../harness';
import {
  FinderTools,
  FinderResult,
  DiscoveredUrl,
  EzalPipelineState,
} from './types';
import { z } from 'zod';

// ============================================================================
// FINDER AGENT SYSTEM INSTRUCTIONS
// ============================================================================

const FINDER_SYSTEM_INSTRUCTIONS = `
You are the FINDER - the first step in the Ezal Competitive Intelligence pipeline.

YOUR MISSION: Discover competitor URLs and data sources for a given market/query.

STRATEGY:
1. Start with Exa semantic search (best for finding dispensary/cannabis menus)
2. Use Perplexity for real-time market data if available
3. Fall back to web search for broader coverage
4. Validate all URLs before returning

TARGET URLS:
- Dispensary menus with live pricing (Dutchie, iHeartJane, custom)
- Competitor website product pages
- Online menu aggregators (Weedmaps, Leafly)

OUTPUT:
Return a ranked list of URLs with relevance scores.
Focus on ACTIVE menus with pricing data, not news articles.

RULES:
- Max 10 URLs per search to keep scraping manageable
- Validate URLs are accessible before including
- Prioritize URLs with visible product/pricing data
- Skip URLs that are clearly not menus (news, blogs, etc.)
`;

// ============================================================================
// FINDER AGENT IMPLEMENTATION
// ============================================================================

/**
 * Run the Finder agent to discover competitor URLs.
 */
export async function runFinderAgent(
  pipelineState: EzalPipelineState,
  tools: FinderTools
): Promise<FinderResult> {
  const startTime = Date.now();
  const { query, tenantId } = pipelineState;

  logger.info(`[Ezal:Finder] Starting URL discovery for: "${query}"`);

  const urls: DiscoveredUrl[] = [];
  const searchQueries: string[] = [];

  // Build tool definitions based on available tools
  const toolsDef = [];
  const toolsImpl: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  if (tools.searchExa) {
    toolsDef.push({
      name: 'searchExa',
      description: 'Search using Exa AI for semantic/neural search of cannabis menus and dispensaries',
      schema: z.object({
        query: z.string().describe('Search query'),
        numResults: z.number().optional().describe('Number of results (default 5)'),
      }),
    });
    toolsImpl.searchExa = async (q: unknown, opts: unknown) => {
      const query = q as string;
      const options = opts as { numResults?: number } | undefined;
      return tools.searchExa!(query, options);
    };
  }

  if (tools.searchPerplexity) {
    toolsDef.push({
      name: 'searchPerplexity',
      description: 'Search using Perplexity for real-time market data and competitor info',
      schema: z.object({
        query: z.string().describe('Search query'),
      }),
    });
    toolsImpl.searchPerplexity = async (q: unknown) => tools.searchPerplexity!(q as string);
  }

  if (tools.searchWeb) {
    toolsDef.push({
      name: 'searchWeb',
      description: 'General web search for competitor information',
      schema: z.object({
        query: z.string().describe('Search query'),
      }),
    });
    toolsImpl.searchWeb = async (q: unknown) => tools.searchWeb!(q as string);
  }

  toolsDef.push({
    name: 'validateUrl',
    description: 'Check if a URL is accessible and valid',
    schema: z.object({
      url: z.string().url().describe('URL to validate'),
    }),
  });
  toolsImpl.validateUrl = async (url: unknown) => tools.validateUrl(url as string);

  // Run multi-step task to discover URLs
  const result = await runMultiStepTask({
    userQuery: `Find competitor dispensary menu URLs for: ${query}

Focus on:
- Cannabis dispensary menus with pricing
- Competitor websites in the same market
- Menu aggregators (Weedmaps, Leafly, Dutchie stores)

Return up to 10 relevant URLs.`,
    systemInstructions: FINDER_SYSTEM_INSTRUCTIONS,
    toolsDef,
    tools: toolsImpl,
    model: 'hybrid',
    maxIterations: 5,
    agentId: 'ezal_finder',
  });

  // Extract URLs from the result
  // Parse the final result and tool outputs to collect URLs
  for (const step of result.steps) {
    if (step.tool === 'searchExa' && step.result) {
      const exaResult = step.result as { results?: Array<{ url: string; title?: string; score?: number }> };
      if (exaResult.results) {
        for (const r of exaResult.results) {
          if (!urls.some((u) => u.url === r.url)) {
            urls.push({
              url: r.url,
              title: r.title,
              relevanceScore: r.score || 0.7,
              source: 'exa',
            });
          }
        }
      }
      searchQueries.push(step.args?.query as string || query);
    }

    if (step.tool === 'searchPerplexity' && step.result) {
      const perplexityResult = step.result as { sources?: Array<{ url: string; title?: string }> };
      if (perplexityResult.sources) {
        for (const s of perplexityResult.sources) {
          if (!urls.some((u) => u.url === s.url)) {
            urls.push({
              url: s.url,
              title: s.title,
              relevanceScore: 0.6,
              source: 'perplexity',
            });
          }
        }
      }
      searchQueries.push(step.args?.query as string || query);
    }

    if (step.tool === 'searchWeb' && step.result) {
      // Try to extract URLs from web search result text
      const text = step.result as string;
      const urlRegex = /https?:\/\/[^\s"<>]+/g;
      const foundUrls = text.match(urlRegex) || [];
      for (const url of foundUrls.slice(0, 5)) {
        if (!urls.some((u) => u.url === url)) {
          urls.push({
            url,
            relevanceScore: 0.5,
            source: 'google',
          });
        }
      }
      searchQueries.push(step.args?.query as string || query);
    }
  }

  // Validate and filter URLs (limit to 10)
  const validatedUrls: DiscoveredUrl[] = [];
  for (const urlEntry of urls.slice(0, 15)) {
    try {
      const validation = await tools.validateUrl(urlEntry.url);
      if (validation.valid) {
        validatedUrls.push(urlEntry);
        if (validatedUrls.length >= 10) break;
      }
    } catch (e) {
      logger.debug(`[Ezal:Finder] URL validation failed for ${urlEntry.url}: ${e}`);
    }
  }

  const durationMs = Date.now() - startTime;

  logger.info(
    `[Ezal:Finder] Complete. Found ${validatedUrls.length} valid URLs in ${durationMs}ms`
  );

  return {
    urls: validatedUrls,
    searchQueries: [...new Set(searchQueries)],
    totalFound: urls.length,
    durationMs,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a simple URL validator using fetch HEAD request.
 */
export function createDefaultUrlValidator(): FinderTools['validateUrl'] {
  return async (url: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'BakedBot/1.0 (Competitive Intelligence)',
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        return { valid: true };
      }

      return { valid: false, reason: `HTTP ${response.status}` };
    } catch (e) {
      return { valid: false, reason: (e as Error).message };
    }
  };
}
