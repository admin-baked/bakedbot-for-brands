
import { getTenantBySlugAction } from '@/server/actions/tenant';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

describe('Tenant Action', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockQuery: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn()
        };

        mockCollection = {
            where: jest.fn(() => mockQuery)
        };

        mockFirestore = {
            collection: jest.fn(() => mockCollection)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('should return brand if slug matches a crm_brand', async () => {
        const mockBrand = { name: 'Test Brand', slug: 'test-brand' };
        
        // Mock first check (crm_brands)
        mockQuery.get.mockResolvedValueOnce({ 
            empty: false,
            docs: [{ id: 'brand_123', data: () => mockBrand }]
        });

        const result = await getTenantBySlugAction('test-brand');
        
        expect(result?.type).toBe('brand');
        expect(result?.crmData.name).toBe('Test Brand');
        expect(mockFirestore.collection).toHaveBeenCalledWith('crm_brands');
    });

    it('should return dispensary if slug matches a crm_dispensary', async () => {
        const mockDisp = { name: 'Test Disp', slug: 'test-disp' };
        
        // Mock first check (crm_brands) - empty
        mockQuery.get.mockResolvedValueOnce({ empty: true });
        // Mock second check (crm_dispensaries) - found
        mockQuery.get.mockResolvedValueOnce({ 
            empty: false,
            docs: [{ id: 'disp_123', data: () => mockDisp }]
        });

        const result = await getTenantBySlugAction('test-disp');
        
        expect(result?.type).toBe('dispensary');
        expect(result?.crmData.name).toBe('Test Disp');
        expect(mockFirestore.collection).toHaveBeenCalledWith('crm_dispensaries');
    });

    it('should return null if no match found', async () => {
        mockQuery.get.mockResolvedValue({ empty: true });

        const result = await getTenantBySlugAction('unknown');
        expect(result).toBeNull();
    });
});
