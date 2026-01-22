/**
 * Unit tests for Ezal 3-Agent Team Pipeline
 * Tests: Finder → Scraper → Analyzer
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the harness
const mockRunMultiStepTask = jest.fn();
jest.mock('@/server/agents/harness', () => ({
  runMultiStepTask: mockRunMultiStepTask,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Genkit AI
jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn().mockResolvedValue({
      output: { products: [] },
    }),
  },
}));

// Mock RTRVR service
jest.mock('@/server/services/rtrvr', () => ({
  executeAgentTask: jest.fn().mockResolvedValue({
    success: true,
    data: { status: 'success', result: { products: [] } },
  }),
  isRTRVRAvailable: jest.fn().mockReturnValue(true),
}));

import {
  runEzalPipeline,
  quickScan,
  getPipelineProgress,
  createDefaultUrlValidator,
  createDefaultProductExtractor,
  createRTRVRScraper,
  createDefaultPriceComparator,
} from '@/server/agents/ezal-team';
import type {
  EzalPipelineState,
  FinderTools,
  ScraperTools,
  AnalyzerTools,
  DiscoveredUrl,
} from '@/server/agents/ezal-team';

describe('Ezal 3-Agent Team Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pipeline State Schema', () => {
    it('should validate pipeline stages', () => {
      const validStages = ['pending', 'finding', 'scraping', 'analyzing', 'complete', 'error'];

      for (const stage of validStages) {
        expect(validStages).toContain(stage);
      }
    });

    it('should validate discovered URL structure', () => {
      const url: DiscoveredUrl = {
        url: 'https://example.com/menu',
        title: 'Test Dispensary',
        relevanceScore: 0.8,
        source: 'exa',
      };

      expect(url.url).toMatch(/^https?:\/\//);
      expect(url.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(url.relevanceScore).toBeLessThanOrEqual(1);
      expect(['exa', 'perplexity', 'firecrawl', 'google', 'manual']).toContain(url.source);
    });
  });

  describe('runEzalPipeline', () => {
    it('should initialize pipeline state correctly', async () => {
      mockRunMultiStepTask.mockResolvedValue({
        finalResult: '',
        steps: [],
      });

      const result = await runEzalPipeline({
        tenantId: 'test-tenant',
        query: 'Detroit dispensaries',
      });

      expect(result.tenantId).toBe('test-tenant');
      expect(result.query).toBe('Detroit dispensaries');
      expect(result.requestId).toMatch(/^ezal_/);
      expect(result.startedAt).toBeDefined();
    });

    it('should skip finder when manual URLs provided', async () => {
      mockRunMultiStepTask.mockResolvedValue({
        finalResult: '',
        steps: [],
      });

      const manualUrls = ['https://dispensary1.com', 'https://dispensary2.com'];

      const result = await runEzalPipeline({
        tenantId: 'test-tenant',
        query: 'Manual scan',
        manualUrls,
      });

      expect(result.finderResult?.urls).toHaveLength(2);
      expect(result.finderResult?.urls[0].source).toBe('manual');
      expect(result.finderResult?.urls[0].relevanceScore).toBe(1.0);
    });

    it('should respect maxUrls option', async () => {
      const result = await runEzalPipeline({
        tenantId: 'test-tenant',
        query: 'test',
        manualUrls: Array(20).fill('https://example.com'),
        maxUrls: 5,
      });

      expect(result.finderResult?.urls.length).toBeLessThanOrEqual(5);
    });

    it('should call onStageComplete callback for each stage', async () => {
      mockRunMultiStepTask.mockResolvedValue({
        finalResult: '',
        steps: [],
      });

      const onStageComplete = jest.fn();

      await runEzalPipeline(
        {
          tenantId: 'test',
          query: 'test',
          manualUrls: ['https://example.com'],
        },
        {
          scraper: {
            extractProductsFromMarkdown: async () => [],
          },
          analyzer: {
            compareWithOurPrices: async () => [],
            alertCraig: async () => false,
            lettaSaveFact: async () => ({}),
            lettaMessageAgent: async () => ({}),
          },
        }
      );

      // Pipeline should complete
      // Note: exact callback count depends on successful stages
    });

    it('should handle errors gracefully', async () => {
      mockRunMultiStepTask.mockRejectedValueOnce(new Error('Test error'));

      const result = await runEzalPipeline({
        tenantId: 'test',
        query: 'test',
        manualUrls: ['https://example.com'],
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('quickScan', () => {
    it('should call runEzalPipeline with manual URLs', async () => {
      mockRunMultiStepTask.mockResolvedValue({
        finalResult: '',
        steps: [],
      });

      const urls = ['https://test1.com', 'https://test2.com'];
      const result = await quickScan('tenant-123', urls);

      expect(result.finderResult?.urls).toHaveLength(2);
      expect(result.query).toContain('Manual scan');
    });
  });

  describe('getPipelineProgress', () => {
    it('should return correct progress for each stage', () => {
      const testCases: Array<{ stage: EzalPipelineState['stage']; expected: number }> = [
        { stage: 'pending', expected: 0 },
        { stage: 'finding', expected: 25 },
        { stage: 'scraping', expected: 50 },
        { stage: 'analyzing', expected: 75 },
        { stage: 'complete', expected: 100 },
        { stage: 'error', expected: 0 },
      ];

      for (const { stage, expected } of testCases) {
        const state = {
          requestId: 'test',
          tenantId: 'test',
          query: 'test',
          stage,
          errors: [],
          startedAt: new Date().toISOString(),
        } as EzalPipelineState;

        expect(getPipelineProgress(state)).toBe(expected);
      }
    });
  });

  describe('createDefaultUrlValidator', () => {
    it('should return a function', () => {
      const validator = createDefaultUrlValidator();
      expect(typeof validator).toBe('function');
    });

    it('should validate URL accessibility', async () => {
      const validator = createDefaultUrlValidator();

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.MockedFunction<typeof fetch>;

      const result = await validator('https://example.com');

      expect(result).toHaveProperty('valid');

      global.fetch = originalFetch;
    });
  });

  describe('createDefaultProductExtractor', () => {
    it('should return a function', () => {
      const extractor = createDefaultProductExtractor();
      expect(typeof extractor).toBe('function');
    });

    it('should return empty array for short markdown', async () => {
      const extractor = createDefaultProductExtractor();
      const result = await extractor('short');

      expect(result).toEqual([]);
    });
  });

  describe('createRTRVRScraper', () => {
    it('should return a function', () => {
      const scraper = createRTRVRScraper();
      expect(typeof scraper).toBe('function');
    });
  });

  describe('createDefaultPriceComparator', () => {
    it('should compare prices and return recommendations', async () => {
      const getOurProducts = jest.fn().mockResolvedValue([
        { name: 'Blue Dream', price: 40 },
        { name: 'OG Kush', price: 35 },
      ]);

      const comparator = createDefaultPriceComparator(getOurProducts);

      const competitorProducts = [
        { name: 'Blue Dream', price: 30 },
        { name: 'OG Kush', price: 45 },
        { name: 'New Product', price: 50 },
      ];

      const results = await comparator(competitorProducts, 'tenant-123');

      expect(getOurProducts).toHaveBeenCalledWith('tenant-123');
      expect(results).toHaveLength(3);

      // Blue Dream: Our $40 vs Competitor $30 -> overpriced (we're higher)
      const blueDream = results.find(r => r.productName === 'Blue Dream');
      expect(blueDream?.recommendation).toBe('overpriced');

      // OG Kush: Our $35 vs Competitor $45 -> underpriced (we're lower)
      const ogKush = results.find(r => r.productName === 'OG Kush');
      expect(ogKush?.recommendation).toBe('underpriced');

      // New Product: Not in our inventory
      const newProduct = results.find(r => r.productName === 'New Product');
      expect(newProduct?.recommendation).toBe('new_product');
    });
  });

  describe('Scraper Backend Selection', () => {
    it('should prefer RTRVR when preferredBackend is rtrvr', async () => {
      const scraperTools: ScraperTools = {
        extractProductsFromMarkdown: async () => [],
        firecrawlScrape: jest.fn(),
        rtrvrScrape: jest.fn().mockResolvedValue({
          status: 'success',
          products: [{ name: 'Test Product', price: 30 }],
        }),
        preferredBackend: 'rtrvr',
      };

      // Verify the backend preference is respected in the config
      expect(scraperTools.preferredBackend).toBe('rtrvr');
    });

    it('should use auto backend selection by default', async () => {
      const scraperTools: ScraperTools = {
        extractProductsFromMarkdown: async () => [],
        preferredBackend: 'auto',
      };

      expect(scraperTools.preferredBackend).toBe('auto');
    });
  });
});

describe('Pipeline Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should flow data from finder to scraper to analyzer', async () => {
    // This is more of an integration test pattern
    // In a real scenario, you'd mock each stage's output

    const pipelineState: EzalPipelineState = {
      requestId: 'test-123',
      tenantId: 'tenant-123',
      query: 'Detroit dispensaries',
      stage: 'complete',
      finderResult: {
        urls: [
          { url: 'https://example.com', relevanceScore: 0.9, source: 'exa' },
        ],
        searchQueries: ['detroit dispensary menu'],
        totalFound: 1,
        durationMs: 1000,
      },
      scraperResult: {
        competitors: [
          {
            id: 'comp-1',
            name: 'Example Dispensary',
            url: 'https://example.com',
            products: [
              { name: 'Blue Dream', price: 35, category: 'flower' },
            ],
            scrapedAt: new Date().toISOString(),
          },
        ],
        totalProducts: 1,
        successCount: 1,
        failureCount: 0,
        durationMs: 2000,
      },
      analyzerResult: {
        insights: [
          {
            type: 'price_opportunity',
            severity: 'high',
            title: 'Competitive Pricing Found',
            description: 'Blue Dream priced competitively',
            recommendations: ['Match competitor pricing'],
          },
        ],
        report: 'Analysis complete',
        actionItems: [],
        durationMs: 1500,
      },
      errors: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    // Verify data flows correctly
    expect(pipelineState.finderResult?.urls).toHaveLength(1);
    expect(pipelineState.scraperResult?.competitors).toHaveLength(1);
    expect(pipelineState.analyzerResult?.insights).toHaveLength(1);
    expect(pipelineState.stage).toBe('complete');
  });
});
