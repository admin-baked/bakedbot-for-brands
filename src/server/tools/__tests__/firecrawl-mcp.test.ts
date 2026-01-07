
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { disableValidation } from '@/ai/genkit'; // Helper to bypass schema validation if needed

// Mock genkit
jest.mock('genkit', () => ({
  __esModule: true,
  tool: jest.fn((config, fn) => fn)
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

// Mock Firecrawl SDK
const mockScrape = jest.fn();
jest.mock('@mendable/firecrawl-js', () => {
    return {
        default: jest.fn().mockImplementation(() => ({
            scrape: mockScrape
        }))
    };
});

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
            const result = await firecrawlScrapeMenu({ url: 'https://example.com' });
            expect(result).toHaveProperty('error');
        });

        it('should scrape menu with age gate bypass', async () => {
            mockScrape.mockResolvedValueOnce({
                success: true,
                markdown: 'Menu content with Flower $50'
            });

            const result = await firecrawlScrapeMenu({ url: 'https://example.com/menu' });

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
                { type: 'wait', milliseconds: 1000 },
                { type: 'click', selector: '.btn' }
            ];

            // @ts-ignore
            const result = await firecrawlScrapeWithActions({ 
                url: 'https://example.com', 
                actions: actions as any 
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
