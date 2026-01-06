
import { searchEntities, triggerDiscoverySync } from '@/server/actions/discovery-search';
import { discovery } from '@/server/services/firecrawl';

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        search: jest.fn(),
        extractData: jest.fn(),
        discoverUrl: jest.fn(),
    }
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', email: 'test@example.com' })
}));

// Define mocks at module level
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({
    set: mockSet,
    update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
}));

// Mock Firestore
jest.mock('@/firebase/server-client', () => {
    return {
        createServerClient: jest.fn().mockImplementation(async () => ({
            firestore: {
                collection: mockCollection,
            }
        }))
    };
});

describe('Discovery Search Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should search entities successfully', async () => {
        // Setup mock response from FireCrawl
        (discovery.search as jest.Mock).mockResolvedValue([
            { url: 'https://essexapothecary.com', title: 'Essex Apothecary', description: 'Best dispensary in Lynn' },
            { url: 'https://leafly.com/dispensaries/verilife', title: 'Verilife', description: 'Aggregator' }
        ]);

        const result = await searchEntities('Essex', 'dispensary', '01901');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1); // Should filter out Leafly
        expect(result.data[0].name).toBe('Essex Apothecary');
        expect(discovery.search).toHaveBeenCalledWith('Essex 01901 cannabis dispensary menu');
    });

    it('should handle search errors gracefully', async () => {
        (discovery.search as jest.Mock).mockRejectedValue(new Error('FireCrawl down'));

        const result = await searchEntities('Fail', 'brand');

        expect(result.success).toBe(false);
        expect(result.error).toBe('FireCrawl down');
    });

    it('should trigger discovery sync and update firestore', async () => {
        await triggerDiscoverySync('org-123', 'https://test.com', 'dispensary');

        // Check initial status update (Syncing)
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            'syncStatus.status': 'syncing',
            'syncStatus.productsFound': 0
        }));

        // Check simulated progress update
        // Note: In the actual function these happen sequentially. 
        // Since we are mocking, we just verify update was called multiple times.
        expect(mockUpdate).toHaveBeenCalledTimes(3); 
        
        // Check final status (Completed)
        expect(mockUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
            'syncStatus.status': 'completed',
            'syncStatus.productsFound': expect.any(Number)
        }));
    });
});
