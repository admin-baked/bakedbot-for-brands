
// Mock Firecrawl SDK FIRST (before any other mock, hoisted)
const mockScrape = jest.fn();
const MockFirecrawlApp = jest.fn().mockImplementation(() => ({
    scrape: mockScrape
}));

jest.mock('@mendable/firecrawl-js', () => ({
    __esModule: true,
    default: MockFirecrawlApp,
}));

// Mock genkit / ai — defineTool returns the handler fn directly
jest.mock('@/ai/genkit', () => ({
  ai: {
    defineTool: jest.fn((_config: any, fn: any) => fn),
  }
}));

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
  discovery: {
    isConfigured: jest.fn(),
    discoverUrl: jest.fn(),
    search: jest.fn(),
    mapSite: jest.fn(),
    extractData: jest.fn(),
  }
}));

// Import tools after mocks
import {
    firecrawlScrapeMenu,
    firecrawlScrapeWithActions
} from '../firecrawl-mcp';

// Access mocked discovery
import { discovery } from '@/server/services/firecrawl';

describe('Firecrawl MCP Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FIRECRAWL_API_KEY = 'test-key';
        (discovery.isConfigured as jest.Mock).mockReturnValue(true);
    });

    describe('firecrawlScrapeMenu', () => {
        it('should return error if not configured', async () => {
            (discovery.isConfigured as jest.Mock).mockReturnValue(false);
            const result = await firecrawlScrapeMenu({ url: 'https://example.com', waitMs: 5000 });
            expect(result).toHaveProperty('error');
        });

        it('should scrape menu with age gate bypass', async () => {
            mockScrape.mockResolvedValueOnce({
                success: true,
                markdown: 'Menu content with Flower $50'
            });

            const result = await firecrawlScrapeMenu({ url: 'https://example.com/menu', waitMs: 5000 });

            expect(mockScrape).toHaveBeenCalledWith(
                'https://example.com/menu',
                expect.objectContaining({
                    actions: expect.arrayContaining([
                        expect.objectContaining({ type: 'click', selector: 'a[href*="#yes"]' })
                    ])
                })
            );
            expect(result).toEqual(expect.objectContaining({
                success: true,
                hasProducts: true
            }));
        });
    });

    describe('firecrawlScrapeWithActions', () => {
        it('should execute custom actions', async () => {
            mockScrape.mockResolvedValueOnce({
                success: true,
                markdown: 'Custom content'
            });

            const actions = [
                { type: 'wait' as const, milliseconds: 1000 },
                { type: 'click' as const, selector: '.btn' }
            ];

            const result = await firecrawlScrapeWithActions({
                url: 'https://example.com',
                actions: actions as any,
                format: 'markdown'
            });

            expect(mockScrape).toHaveBeenCalledWith(
                'https://example.com',
                expect.objectContaining({
                    actions: actions
                })
            );
            expect(result).toEqual(expect.objectContaining({
                success: true,
                content: 'Custom content'
            }));
        });
    });
});
