describe('FirecrawlService', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.FIRECRAWL_API_KEY = 'test-key';

        jest.doMock('@mendable/firecrawl-js', () => {
            return {
                default: jest.fn().mockImplementation(() => ({
                    scrapeUrl: jest.fn().mockResolvedValue({ success: true, data: { markdown: '# Title\nContent' } }),
                    search: jest.fn().mockResolvedValue({ success: true, data: [] }),
                    mapUrl: jest.fn().mockResolvedValue({ success: true, links: [] }),
                }))
            };
        });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should be configured when API key is present', async () => {
        const { firecrawl } = require('../../../src/server/services/firecrawl');
        expect(firecrawl.isConfigured()).toBe(true);
    });

    it('should call scrapeUrl with correct params', async () => {
        const { firecrawl } = require('../../../src/server/services/firecrawl');
        const result = await firecrawl.scrapeUrl('https://example.com');
        expect(result.success).toBe(true);
        expect(result.data.markdown).toBe('# Title\nContent');
    });
    
    it('should throw if not configured (no key)', async () => {
        jest.resetModules();
        process.env.FIRECRAWL_API_KEY = ''; 
        delete process.env.FIRECRAWL_API_KEY;
        
         jest.doMock('@mendable/firecrawl-js', () => ({
            default: jest.fn()
        }));

        const { firecrawl } = require('../../../src/server/services/firecrawl');
        
        expect(firecrawl.isConfigured()).toBe(false);
        
        await expect(firecrawl.scrapeUrl('https://example.com'))
            .rejects.toThrow('Firecrawl not configured');
    });
});
