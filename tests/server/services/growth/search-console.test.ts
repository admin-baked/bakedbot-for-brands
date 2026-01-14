
import { SearchConsoleService, searchConsoleService } from '@/server/services/growth/search-console';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis', () => ({
    google: {
        webmasters: jest.fn()
    }
}));

// Mock GoogleAuth
jest.mock('google-auth-library', () => ({
    GoogleAuth: jest.fn().mockImplementation(() => ({}))
}));

describe('SearchConsoleService', () => {
    let mockQuery: jest.Mock;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, SEARCH_CONSOLE_SITE_URL: 'https://example.com' };
        
        // Setup mock response for webmasters.searchanalytics.query
        mockQuery = jest.fn();
        (google.webmasters as unknown as jest.Mock).mockReturnValue({
            searchanalytics: {
                query: mockQuery
            }
        });
        
        // Reset singleton instance if possible, or just rely on the mocks being active 
        // when the methods are called (since the service creates the client in constructor,
        // we might typically need to reinstantiate if we want fresh mocks, 
        // but since we Mock the module, the singleton's internal 'webmasters' should happen-upon the mocked fn if it was lazy
        // ACTUALLY: The singleton is instantiated at import time. 
        // To test properly, we should instantiate a NEW service in tests or ensure the mock works retroactively.
        // It's safer to re-instantiate or assume the module mock was hoisted.
        // Jest hoists mocks, so the import of the service *should* see the mocked google.
    });

    // We need to bypass the fact that the singleton was already created
    // So we'll instantiate a fresh one for testing
    const createService = () => new SearchConsoleService();

    describe('getTopQueries', () => {
        it('should return valid report data when API succeeds', async () => {
            const service = createService();
            
            mockQuery.mockResolvedValue({
                data: {
                    rows: [
                        { keys: ['query1', 'page1'], clicks: 10, impressions: 100, ctr: 0.1, position: 5.5 },
                        { keys: ['query2', 'page1'], clicks: 5, impressions: 50, ctr: 0.1, position: 10.0 }
                    ]
                }
            });

            const result = await service.getTopQueries();

            expect(result.queries).toHaveLength(2);
            expect(result.totalClicks).toBe(15);
            expect(result.totalImpressions).toBe(150);
            expect(result.avgPosition).toBe(7.75);
            expect(mockQuery).toHaveBeenCalledTimes(1);
        });

        it('should return empty report on API failure', async () => {
            const service = createService();
            mockQuery.mockRejectedValue(new Error('API Error'));

            const result = await service.getTopQueries();

            expect(result.queries).toHaveLength(0);
            expect(result.totalClicks).toBe(0);
        });
    });

    describe('findLowCompetitionOpportunities', () => {
        it('should identify high opportunity keywords', async () => {
            const service = createService();
            
            // Mock a large report response
            mockQuery.mockResolvedValue({
                data: {
                    rows: [
                        // High opportunity: High impressions, low CTR, pos 5-10
                        { keys: ['golden opportunity', 'page1'], clicks: 5, impressions: 500, ctr: 0.01, position: 6.0 },
                        // Medium: Decent impressions, pos 10-20
                        { keys: ['decent keyword', 'page2'], clicks: 2, impressions: 80, ctr: 0.02, position: 15.0 },
                        // Low/Ignore: Low impressions or bad position
                        { keys: ['junk', 'page3'], clicks: 0, impressions: 5, ctr: 0, position: 50.0 }
                    ]
                }
            });

            const opps = await service.findLowCompetitionOpportunities();

            expect(opps.length).toBeGreaterThan(0);
            expect(opps[0].query).toBe('golden opportunity');
            expect(opps[0].opportunity).toBe('high');
        });
    });

    describe('getSiteSummary', () => {
        it('should return summary stats', async () => {
            const service = createService();
            
            mockQuery.mockResolvedValue({
                data: {
                    rows: [{ clicks: 1000, impressions: 50000, ctr: 0.02, position: 12.5 }]
                }
            });

            const result = await service.getSiteSummary();

            expect(result.clicks).toBe(1000);
            expect(result.impressions).toBe(50000);
            expect(result.avgPosition).toBe(12.5);
        });
        
        it('should handle missing rows gracefully', async () => {
            const service = createService();
            mockQuery.mockResolvedValue({ data: {} }); // No rows

            const result = await service.getSiteSummary();

            expect(result.clicks).toBe(0);
            expect(result.impressions).toBe(0);
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });
});
