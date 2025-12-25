
import { getKPIs } from '../analytics';

// Define mock types
const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockCollection = jest.fn().mockReturnThis();

const mockFirestore = {
    collection: mockCollection,
    where: mockWhere,
    get: mockGet
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({ firestore: mockFirestore })),
}));

describe('Analytics Tool: getKPIs', () => {
    const tenantId = 'test-brand';

    beforeEach(() => {
        jest.clearAllMocks();
        // Default collection setup
        mockCollection.mockReturnValue({
            where: mockWhere,
            get: mockGet
        });
        mockWhere.mockReturnValue({
            where: mockWhere,
            get: mockGet
        });
    });

    it('should aggregate revenue and orders correctly', async () => {
        // Mock Orders
        const mockOrders = [
            { data: () => ({ status: 'completed', total: 100, items: [{ name: 'Item A', qty: 2 }] }) },
            { data: () => ({ status: 'submitted', total: 50, items: [{ name: 'Item B', qty: 1 }] }) },
            { data: () => ({ status: 'cancelled', total: 200 }) } // Should be ignored
        ];
        
        mockGet.mockResolvedValue({
            forEach: (callback: Function) => mockOrders.forEach(o => callback(o))
        });

        const result = await getKPIs(tenantId, { period: 'day' });

        expect(result.revenue).toBe(150); // 100 + 50
        expect(result.orders).toBe(2);
        expect(mockFirestore.collection).toHaveBeenCalledWith('orders');
        expect(mockWhere).toHaveBeenCalledWith('brandId', '==', tenantId);
    });

    it('should calculate top products', async () => {
        const mockOrders = [
            { 
                data: () => ({ 
                    status: 'completed', 
                    total: 10, 
                    items: [
                        { name: 'Popcorn', qty: 5 },
                        { name: 'Soda', qty: 2 }
                    ] 
                }) 
            },
            { 
                data: () => ({ 
                    status: 'completed', 
                    total: 10, 
                    items: [
                        { name: 'Popcorn', qty: 3 }
                    ] 
                }) 
            }
        ];

        mockGet.mockResolvedValue({
            forEach: (callback: Function) => mockOrders.forEach(o => callback(o))
        });

        const result = await getKPIs(tenantId, { period: 'week' });

        expect(result.topProducts).toHaveLength(2);
        expect(result.topProducts[0]).toEqual({ name: 'Popcorn', sales: 8 });
        expect(result.topProducts[1]).toEqual({ name: 'Soda', sales: 2 });
    });
});
