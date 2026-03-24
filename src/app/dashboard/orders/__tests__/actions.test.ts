import { getOrders, updateOrderStatus } from '../actions';
import { mapAlleavesStatus } from '../order-utils';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

jest.mock('@/lib/email/send-order-email', () => ({
    sendOrderEmail: jest.fn().mockResolvedValue({})
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('mock-timestamp')
    }
}));

jest.mock('@/firebase/converters', () => ({
    retailerConverter: {}
}));

describe('Orders Management Actions', () => {
    let mockFirestore: any;
    let mockTransaction: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTransaction = {
            get: jest.fn(),
            update: jest.fn(),
        };

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            withConverter: jest.fn().mockReturnThis(),
            get: jest.fn(),
            runTransaction: jest.fn().mockImplementation(async (cb) => await cb(mockTransaction)),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getOrders', () => {
        it('scopes by retailerId for dispensary users', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ 
                uid: 'user1', 
                role: 'dispensary', 
                locationId: 'loc123' 
            });

            mockFirestore.get.mockResolvedValue({
                docs: [{ id: 'order1', data: () => ({ total: 100 }) }]
            });

            const result = await getOrders('ignored_org');

            expect(mockFirestore.where).toHaveBeenCalledWith('retailerId', '==', 'loc123');
            expect(result.data).toHaveLength(1);
        });

        it('scopes by brandId for brand users', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ 
                uid: 'user1', 
                role: 'brand',
                brandId: 'brand456'
            });

            mockFirestore.get.mockResolvedValue({ docs: [] });

            await getOrders('brand456');

            expect(mockFirestore.where).toHaveBeenCalledWith('brandId', '==', 'brand456');
        });
    });

    describe('updateOrderStatus', () => {
        it('validates status transitions via transaction', async () => {
             (requireUser as jest.Mock).mockResolvedValue({ 
                uid: 'user1', 
                role: 'dispensary', 
                locationId: 'loc123' 
            });

            // Mock order in transaction
            mockTransaction.get.mockResolvedValue({
                exists: true,
                data: () => ({ 
                    status: 'submitted', 
                    retailerId: 'loc123',
                    customer: { email: 'test@example.com' }
                })
            });

            // Mock order after transaction (for email logic)
            mockFirestore.get
                .mockResolvedValueOnce({ // updatedOrderSnap
                    data: () => ({ 
                        status: 'confirmed', 
                        retailerId: 'loc123',
                        brandId: 'brand1',
                        customer: { email: 'test@example.com' }
                    })
                })
                .mockResolvedValueOnce({ // retailerSnap
                    data: () => ({ name: 'Test Retailer' })
                });

            const formData = new FormData();
            formData.append('orderId', 'order1');
            formData.append('newStatus', 'confirmed');

            const result = await updateOrderStatus({ message: '', error: false }, formData);

            expect(result.error).toBe(false);
            expect(result.message).toContain('updated to \'confirmed\'');
            expect(mockTransaction.update).toHaveBeenCalled();
        });

        it('blocks invalid transitions and returns error message', async () => {
            (requireUser as jest.Mock).mockResolvedValue({ 
                uid: 'user1', 
                role: 'dispensary', 
                locationId: 'loc123' 
            });

            mockTransaction.get.mockResolvedValue({
                exists: true,
                data: () => ({ 
                    status: 'completed', 
                    retailerId: 'loc123' 
                })
            });

            const formData = new FormData();
            formData.append('orderId', 'order1');
            formData.append('newStatus', 'preparing');

            const result = await updateOrderStatus({ message: '', error: false }, formData);

            expect(result.error).toBe(true);
            expect(result.message).toContain('Cannot transition from \'completed\' to \'preparing\'');
        });
    });
});

describe('mapAlleavesStatus', () => {
    const expectedMappings: Array<[string, string]> = [
        ['pending', 'pending'],
        ['submitted', 'submitted'],
        ['confirmed', 'confirmed'],
        ['preparing', 'preparing'],
        ['ready', 'ready'],
        ['completed', 'completed'],
        ['cancelled', 'cancelled'],
        // Alleaves-specific aliases
        ['processing', 'preparing'],
        ['delivered', 'completed'],
        ['voided', 'cancelled'],
        // Case insensitivity
        ['COMPLETED', 'completed'],
        ['Pending', 'pending'],
    ];

    test.each(expectedMappings)('maps "%s" → "%s"', (input, expected) => {
        expect(mapAlleavesStatus(input)).toBe(expected);
    });

    it('defaults unknown statuses to "pending"', () => {
        expect(mapAlleavesStatus('unknown_status')).toBe('pending');
        expect(mapAlleavesStatus('')).toBe('pending');
    });
});
