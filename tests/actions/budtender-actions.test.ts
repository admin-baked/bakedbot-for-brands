
import { getBudtenderDashboardData } from '@/app/dashboard/budtender/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { type DomainUserProfile } from '@/types/domain';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

describe('Budtender Actions', () => {
    let mockCollection: jest.Mock;
    let mockGet: jest.Mock;
    let mockWhere: jest.Mock;
    let mockOrderBy: jest.Mock;
    let mockLimit: jest.Mock;

    const mockBudtender: DomainUserProfile = {
        id: 'bud-1',
        uid: 'bud-1',
        email: 'bud@test.com',
        role: 'budtender',
        organizationIds: [],
        locationId: 'dispensary-1',
        brandId: null,
        displayName: 'Buddy',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mocks
        mockGet = jest.fn();
        
        // Use explicit function to ensure 'this' context is preserved for chaining
        mockWhere = jest.fn().mockImplementation(function() { return this; });
        mockOrderBy = jest.fn().mockImplementation(function() { return this; });
        mockLimit = jest.fn().mockImplementation(function() { return this; });
        
        mockCollection = jest.fn((name) => {
            if (name === 'dispensaries') {
                return {
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ name: 'Test Dispensary', address: '123 Weed St' })
                        })
                    }))
                };
            }
            if (name === 'orders') {
                return {
                    where: mockWhere,
                    orderBy: mockOrderBy,
                    limit: mockLimit,
                    get: mockGet
                };
            }
            return { get: jest.fn() };
        });

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });

        (requireUser as jest.Mock).mockResolvedValue(mockBudtender);
    });

    describe('getBudtenderDashboardData', () => {
        it('should return null if user has no locationId', async () => {
            (requireUser as jest.Mock).mockResolvedValue({
                ...mockBudtender,
                locationId: null
            });

            const result = await getBudtenderDashboardData();
            expect(result).toBeNull();
        });

        it('should fetch dispensary info and pending orders', async () => {
            // Mock Orders Response
            const mockDocData = {
                status: 'confirmed',
                customer: { name: 'Cust 1' },
                items: [1, 2],
                totals: { total: 50 }, // Use totals object as per implementation
                total: 50,
                createdAt: { toDate: () => new Date() }
            };

            mockGet.mockResolvedValue({
                docs: [
                    {
                        id: 'order-1',
                        data: () => mockDocData
                    }
                ],
                size: 1, // Add size property
                forEach: (cb: any) => [mockDocData].forEach(cb) // Add forEach
            });

            const result = await getBudtenderDashboardData();

            expect(result).not.toBeNull();
            expect(result?.dispensary.name).toBe('Test Dispensary');
            expect(result?.pendingOrders).toHaveLength(1);
            expect(result?.pendingOrders[0].id).toBe('order-1');
            
            // Should query orders by locationId
            expect(mockWhere).toHaveBeenCalledWith('retailerId', '==', 'dispensary-1');
        });
    });
});
