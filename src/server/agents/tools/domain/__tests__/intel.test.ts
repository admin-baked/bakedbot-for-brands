
import { scanCompetitors } from '../intel';
import { searchWeb } from '@/server/tools/web-search';

// Mock dependencies
const mockGet = jest.fn();
const mockDoc = jest.fn();

const mockFirestore = {
    doc: mockDoc
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({ firestore: mockFirestore })),
}));

jest.mock('@/server/tools/web-search', () => ({
    searchWeb: jest.fn()
}));

describe('Intel Tool: scanCompetitors', () => {
    const tenantId = 'test-brand';

    beforeEach(() => {
        jest.clearAllMocks();
        mockDoc.mockReturnValue({ get: mockGet });
    });

    it('should scan configured competitors and parse prices', async () => {
        // Mock Settings
        mockGet.mockResolvedValue({
            data: () => ({ competitors: ['TestDisp'] })
        });

        // Mock Search Results
        const mockSearchResults = {
            results: [
                { snippet: 'Menu: Blue Dream 1/8th $45.00', link: 'http://testdisp.com' },
                { snippet: 'Special Deal: 20% off all edibles', link: 'http://testdisp.com' },
                { snippet: 'Irrelevant snippet', link: 'http://testdisp.com' }
            ]
        };
        (searchWeb as jest.Mock).mockResolvedValue(mockSearchResults);

        const result = await scanCompetitors(tenantId, {});

        expect(result).toHaveLength(1);
        const scan = result[0];
        expect(scan.competitorName).toBe('TestDisp');
        expect(scan.url).toBe('http://testdisp.com');
        
        // Verify Price Parsing
        expect(scan.priceCheck).toHaveLength(1);
        expect(scan.priceCheck[0].theirPrice).toBe(45.00);

        // Verify Promotion Parsing
        expect(scan.promotions).toContain('Special Deal: 20% off all edibles');
    });

    it('should handle search errors gracefully', async () => {
        // Mock Settings
        mockGet.mockResolvedValue({
            data: () => ({ competitors: ['FailDisp'] })
        });

        // Mock Search Failure
        (searchWeb as jest.Mock).mockRejectedValue(new Error('API Error'));

        const result = await scanCompetitors(tenantId, { competitors: ['FailDisp'] });

        expect(result).toHaveLength(1);
        expect(result[0].promotions).toContain('Scan failed');
    });
});
