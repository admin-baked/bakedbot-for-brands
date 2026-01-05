import { searchDemoRetailers } from '@/app/dashboard/intelligence/actions/demo-setup';
import { discovery } from '@/server/services/firecrawl';
import { getZipCodeCoordinates } from '@/server/services/geo-discovery';

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        search: jest.fn(),
        discoverUrl: jest.fn(),
        isConfigured: jest.fn().mockReturnValue(true),
    },
}));

jest.mock('@/server/services/geo-discovery', () => ({
    getZipCodeCoordinates: jest.fn(),
}));

describe('searchDemoRetailers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (getZipCodeCoordinates as jest.Mock).mockResolvedValue({ city: 'Test City', state: 'TS' });
    });

    it('should return search results and filter out directories AND duplicates', async () => {
        // Mock search results including some directories and duplicates
        (discovery.search as jest.Mock).mockResolvedValue([
            { title: 'Valid Dispensary', url: 'https://valid-dispensary.com', description: 'A great place.' },
            { title: 'Another Dispensary', url: 'https://another-one.com', description: 'Another place.' },
            { title: 'Yelp: Best Dispensaries', url: 'https://yelp.com/biz/dispensary', description: 'Yelp listing.' },
            { title: 'Weedmaps Menu', url: 'https://weedmaps.com/dispensaries/foo', description: 'Weedmaps page.' },
            // Duplicates
            { title: 'Valid Dispensary (Menu)', url: 'https://valid-dispensary.com/menu', description: 'Menu page.' }, // Domain dupe
            { title: 'Valid Dispensary - Home', url: 'https://valid-dispensary.com/home', description: 'Home page.' }, // Domain dupe
            { title: 'Another One Dispensary', url: 'https://different-url-but-same-name.com', description: 'Diff url but similar name.' } // Name dupe (fuzzy)
        ]);
        
        // Mock scrape result for enrichment (success)
        (discovery.discoverUrl as jest.Mock).mockResolvedValue({
            success: true,
            data: { markdown: 'We have a great deal on premium flower!' }
        });

        const result = await searchDemoRetailers('12345');

        expect(result.success).toBe(true);
        expect(result.daa).toHaveLength(2); // Should only have the 2 unique valid ones
        expect(result.daa[0].name).toBe('Valid Dispensary');
        
        // "Another Dispensary" came first, so it stays. "Another One Dispensary" should be filtered by fuzzy name check logic
        // "Another One Dispensary" -> clean: "anotherone"
        // "Another Dispensary" -> clean: "another"
        // "another" is substring of "anotherone", so it should skip.
        
        expect(result.daa[1].name).toBe('Another Dispensary');

        const names = result.daa.map((d: any) => d.name);
        expect(names).not.toContain('Yelp: Best Dispensaries');
        expect(names).not.toContain('Valid Dispensary (Menu)');
    });

    it('should enrich the top result with scraped data', async () => {
        (discovery.search as jest.Mock).mockResolvedValue([
            { title: 'Top Dispensary', url: 'https://top-dispensary.com', description: 'Address 1' },
            { title: 'Second Dispensary', url: 'https://second.com', description: 'Address 2' },
        ]);

        (discovery.discoverUrl as jest.Mock).mockResolvedValue({
            success: true,
            data: { markdown: 'Join our loyalty club and get a special deal on top shelf products.' }
        });

        const result = await searchDemoRetailers('12345');

        expect(discovery.discoverUrl).toHaveBeenCalledWith('https://top-dispensary.com', ['markdown']);
        
        const top = result.daa[0];
        expect(top.isEnriched).toBe(true);
        expect(top.enrichmentSummary).toContain('Verified via BakedBot Discovery');
        expect(top.pricingStrategy).toBe('Premium (+15%)'); // 'top shelf' trigger
        // 'deal' trigger might also key 'Aggressive Promo', but 'Premium' usually takes precedence in logic or vice versa
        // Let's check the logic: isPremium ? 'Premium' : (hasDeals ? 'Aggressive' : 'Standard')
        // 'top shelf' -> isPremium. So it should be Premium.
    });
    
    it('should handle search failure gracefully', async () => {
         (discovery.search as jest.Mock).mockResolvedValue([]);
         
         const result = await searchDemoRetailers('00000');
         expect(result.success).toBe(false);
         expect(result.error).toBe('No dispensaries found nearby.');
    });

    it('should fallback if enrichment fails', async () => {
        (discovery.search as jest.Mock).mockResolvedValue([
            { title: 'Fallback Dispensary', url: 'https://fallback.com', description: 'Address' },
        ]);

        (discovery.discoverUrl as jest.Mock).mockRejectedValue(new Error('Scrape failed'));

        const result = await searchDemoRetailers('12345');

        const top = result.daa[0];
        // Should still be marked enriched but with fallback message
        expect(top.isEnriched).toBe(true);
        expect(top.enrichmentSummary).toContain('Enrichment timeout');
    });
});
