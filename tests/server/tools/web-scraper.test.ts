import { getWebScraperTool } from '@/server/tools/web-scraper';
import { firecrawl } from '@/server/services/firecrawl';

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
    firecrawl: {
        isConfigured: jest.fn(),
        scrapeUrl: jest.fn(),
    }
}));


// Mock global fetch for basic scraper
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><title>Test Page</title><body>Hello world</body></html>'),
    })
) as jest.Mock;

describe('WebScraper Tool', () => {
    const tool = getWebScraperTool();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use Firecrawl for super_admin when configured', async () => {
        // Setup
        (firecrawl.isConfigured as jest.Mock).mockReturnValue(true);
        (firecrawl.scrapeUrl as jest.Mock).mockResolvedValue({ success: true, data: { markdown: 'Firecrawl Content' } });

        // Execute
        const result = await tool.execute({ url: 'https://example.com' }, { user: { role: 'super_admin' } });

        // Verify
        expect(firecrawl.scrapeUrl).toHaveBeenCalledWith('https://example.com', ['markdown']);
        expect(result.success).toBe(true);
        expect(result.source).toBe('firecrawl');
    });

    it('should fall back to basic scraper for guests', async () => {
        // Setup - Firecrawl configured but user is guest
        (firecrawl.isConfigured as jest.Mock).mockReturnValue(true);

        // Execute
        const result = await tool.execute({ url: 'https://example.com' }, { user: { role: 'guest' } });

        // Verify
        expect(firecrawl.scrapeUrl).not.toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
        expect(result.source).toBe('basic');
        expect(result.data.markdown).toContain('Hello world');
    });

    it('should use basic scraper if Firecrawl is not configured', async () => {
         // Setup
        (firecrawl.isConfigured as jest.Mock).mockReturnValue(false);

        // Execute
        const result = await tool.execute({ url: 'https://example.com' }, { user: { role: 'super_admin' } });

        // Verify
        expect(firecrawl.scrapeUrl).not.toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalled();
        expect(result.source).toBe('basic');
    });
});
