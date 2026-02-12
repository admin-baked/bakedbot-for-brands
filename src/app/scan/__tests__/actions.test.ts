import { getScanOrderData } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');

describe('getScanOrderData', () => {
    const mockFirestore = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user-id' });
    });

    it('returns order, profile, and last order when all exist', async () => {
        const orderId = 'order-123';
        const customerId = 'cust-456';
        const retailerId = 'retail-789';

        // Mock current order
        const mockOrderDoc = {
            exists: true,
            data: () => ({
                userId: customerId,
                retailerId: retailerId,
                status: 'ready',
                items: [{ name: 'Blue Dream', qty: 1, price: 45 }],
                customer: { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0199' },
                totals: { subtotal: 45, tax: 4.5, total: 49.5 },
                createdAt: { seconds: 1700000000 }
            })
        };

        // Mock customer profile
        const mockProfileDoc = {
            exists: true,
            data: () => ({
                segment: 'vip',
                preferences: { strainType: 'hybrid' }
            })
        };

        // Mock last order
        const mockLastOrderSnap = {
            empty: false,
            docs: [{
                id: 'order-000',
                data: () => ({
                    status: 'completed',
                    items: [{ name: 'OG Kush', qty: 1, price: 50 }],
                    createdAt: { seconds: 1600000000 }
                })
            }]
        };

        // Mock dispensary
        const mockDispDoc = {
            exists: true,
            data: () => ({
                name: 'Thrive Syracuse',
                address: '123 Main St'
            })
        };

        // Setup sequential mocks for get() calls
        mockFirestore.get
            .mockResolvedValueOnce(mockOrderDoc) // Order
            .mockResolvedValueOnce(mockProfileDoc) // Profile
            .mockResolvedValueOnce(mockLastOrderSnap) // Last Order
            .mockResolvedValueOnce(mockDispDoc); // Dispensary

        const result = await getScanOrderData(orderId);

        expect(result.order?.id).toBe(orderId);
        expect(result.customerProfile?.segment).toBe('vip');
        expect(result.lastOrder?.id).toBe('order-000');
        expect(result.dispensary?.name).toBe('Thrive Syracuse');
    });

    it('returns nulls if order does not exist', async () => {
        mockFirestore.get.mockResolvedValueOnce({ exists: false });

        const result = await getScanOrderData('invalid-id');

        expect(result.order).toBeNull();
        expect(result.customerProfile).toBeNull();
    });
});
