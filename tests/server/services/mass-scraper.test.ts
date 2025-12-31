
import { MassScraperService } from '@/server/services/mass-scraper';
import { FirecrawlService } from '@/server/services/firecrawl';

// Mock FirecrawlService
jest.mock('@/server/services/firecrawl', () => {
    return {
        FirecrawlService: {
            getInstance: jest.fn().mockReturnValue({
                search: jest.fn(),
                extractData: jest.fn()
            })
        }
    };
});

describe('MassScraperService', () => {
    let scraper: MassScraperService;
    let mockFirecrawl: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFirecrawl = FirecrawlService.getInstance();
        scraper = MassScraperService.getInstance();
    });

    it('should discover dispensaries using Firecrawl search', async () => {
        mockFirecrawl.search.mockResolvedValue([
            { title: 'Sunnyside', url: 'https://sunnyside.shop' },
            { title: 'Leafly List', url: 'https://leafly.com/list' }
        ]);

        const results = await scraper.discoverDispensaries('60601');
        
        expect(mockFirecrawl.search).toHaveBeenCalledWith(expect.stringContaining('60601'));
        expect(results).toHaveLength(1); // Should filter out Leafly
        expect(results[0].name).toBe('Sunnyside');
    });

    it('should scrape dispensary data and format as SEO Page', async () => {
        const mockData = {
            dispensaryName: 'Test Dispensary',
            address: '123 Main St',
            city: 'Chicago',
            state: 'IL',
            aboutText: 'Best dispensary in town.'
        };

        mockFirecrawl.extractData.mockResolvedValue(mockData);

        const page = await scraper.scrapeDispensary('https://test.com', '60601');

        expect(page).not.toBeNull();
        expect(page?.dispensaryName).toBe('Test Dispensary');
        expect(page?.zipCode).toBe('60601');
        expect(page?.id).toContain('test-dispensary_60601');
        expect(page?.seoTags?.metaDescription).toBe('Best dispensary in town.');
    });
});
