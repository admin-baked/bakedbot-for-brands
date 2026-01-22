/**
 * Ezal 3-Agent Team Types
 *
 * Pipeline: Finder → Scraper → Analyzer
 * Inspired by awesome-llm-apps competitor intelligence agent team
 */

import { z } from 'zod';

// ============================================================================
// PIPELINE STATE
// ============================================================================

export const PipelineStageSchema = z.enum([
  'pending',
  'finding',
  'scraping',
  'analyzing',
  'complete',
  'error',
]);

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const DiscoveredUrlSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  relevanceScore: z.number().min(0).max(1),
  source: z.enum(['exa', 'perplexity', 'firecrawl', 'google', 'manual']),
  metadata: z.record(z.unknown()).optional(),
});

export type DiscoveredUrl = z.infer<typeof DiscoveredUrlSchema>;

export const FinderResultSchema = z.object({
  urls: z.array(DiscoveredUrlSchema),
  searchQueries: z.array(z.string()),
  totalFound: z.number(),
  durationMs: z.number(),
});

export type FinderResult = z.infer<typeof FinderResultSchema>;

export const ScrapedCompetitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  products: z.array(z.object({
    name: z.string(),
    brand: z.string().optional(),
    category: z.string().optional(),
    price: z.number().optional(),
    regularPrice: z.number().optional(),
    inStock: z.boolean().optional(),
    thc: z.number().optional(),
    cbd: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
  scrapedAt: z.string().datetime(),
  rawMarkdown: z.string().optional(),
});

export type ScrapedCompetitor = z.infer<typeof ScrapedCompetitorSchema>;

export const ScraperResultSchema = z.object({
  competitors: z.array(ScrapedCompetitorSchema),
  totalProducts: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  durationMs: z.number(),
});

export type ScraperResult = z.infer<typeof ScraperResultSchema>;

export const InsightTypeSchema = z.enum([
  'price_opportunity',
  'product_gap',
  'threat_alert',
  'market_trend',
  'competitive_advantage',
]);

export type InsightType = z.infer<typeof InsightTypeSchema>;

export const InsightSeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);

export type InsightSeverity = z.infer<typeof InsightSeveritySchema>;

export const CompetitiveInsightSchema = z.object({
  type: InsightTypeSchema,
  severity: InsightSeveritySchema,
  title: z.string(),
  description: z.string(),
  recommendations: z.array(z.string()),
  data: z.record(z.unknown()).optional(),
  competitorId: z.string().optional(),
  productName: z.string().optional(),
});

export type CompetitiveInsight = z.infer<typeof CompetitiveInsightSchema>;

export const ActionItemSchema = z.object({
  action: z.string(),
  delegateTo: z.string().optional(),
  priority: z.number().min(1).max(10),
  context: z.record(z.unknown()).optional(),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const AnalyzerResultSchema = z.object({
  insights: z.array(CompetitiveInsightSchema),
  report: z.string(),
  actionItems: z.array(ActionItemSchema),
  durationMs: z.number(),
});

export type AnalyzerResult = z.infer<typeof AnalyzerResultSchema>;

export const EzalPipelineStateSchema = z.object({
  requestId: z.string(),
  tenantId: z.string(),
  query: z.string(),
  stage: PipelineStageSchema,
  finderResult: FinderResultSchema.optional(),
  scraperResult: ScraperResultSchema.optional(),
  analyzerResult: AnalyzerResultSchema.optional(),
  errors: z.array(z.string()),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type EzalPipelineState = z.infer<typeof EzalPipelineStateSchema>;

// ============================================================================
// TOOL INTERFACES
// ============================================================================

export interface ExaSearchResult {
  results: Array<{
    url: string;
    title: string;
    score?: number;
    text?: string;
  }>;
}

export interface PerplexityResult {
  answer: string;
  sources: Array<{
    url: string;
    title: string;
  }>;
}

export interface FirecrawlScrapeResult {
  markdown: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface RTRVRScrapeResult {
  status: 'success' | 'continuation' | 'blocked' | 'error';
  result?: unknown;
  markdown?: string;
  products?: ScrapedCompetitor['products'];
}

export interface FinderTools {
  /** Search using Exa AI for semantic/neural search */
  searchExa?(query: string, options?: { numResults?: number; type?: 'neural' | 'keyword' }): Promise<ExaSearchResult>;
  /** Search using Perplexity for real-time data */
  searchPerplexity?(query: string): Promise<PerplexityResult>;
  /** Search using Firecrawl */
  searchFirecrawl?(query: string): Promise<ExaSearchResult>;
  /** Validate a URL is accessible */
  validateUrl(url: string): Promise<{ valid: boolean; reason?: string }>;
  /** Search web (fallback) */
  searchWeb?(query: string): Promise<string>;
}

export interface ScraperTools {
  /** Scrape a URL using Firecrawl */
  firecrawlScrape?(url: string, options?: { formats?: string[] }): Promise<FirecrawlScrapeResult>;
  /** Scrape and extract products using RTRVR browser automation */
  rtrvrScrape?(url: string, extractionPrompt?: string): Promise<RTRVRScrapeResult>;
  /** Parse menu HTML using existing parser engine */
  parseMenu?(html: string, profileId?: string): Promise<ScrapedCompetitor['products']>;
  /** Extract products from markdown using LLM */
  extractProductsFromMarkdown(markdown: string): Promise<ScrapedCompetitor['products']>;
  /** Preferred scraping backend */
  preferredBackend?: 'firecrawl' | 'rtrvr' | 'auto';
}

export interface AnalyzerTools {
  /** Compare competitor products with our prices */
  compareWithOurPrices(products: ScrapedCompetitor['products'], tenantId: string): Promise<Array<{
    productName: string;
    ourPrice?: number;
    competitorPrice: number;
    priceDifference?: number;
    recommendation: string;
  }>>;
  /** Alert Craig to launch a counter-campaign */
  alertCraig(competitorId: string, threat: string, product: string): Promise<boolean>;
  /** Save fact to long-term memory */
  lettaSaveFact(fact: string, category?: string): Promise<unknown>;
  /** Message another agent */
  lettaMessageAgent(toAgent: string, message: string): Promise<unknown>;
}

// ============================================================================
// PIPELINE OPTIONS
// ============================================================================

export interface EzalPipelineOptions {
  tenantId: string;
  query: string;
  /** Skip specific stages (e.g., for testing) */
  skipStages?: PipelineStage[];
  /** Provide URLs directly (skips finder) */
  manualUrls?: string[];
  /** Max URLs to scrape */
  maxUrls?: number;
  /** Callback for stage completion */
  onStageComplete?: (stage: PipelineStage, result: unknown) => Promise<void>;
}
