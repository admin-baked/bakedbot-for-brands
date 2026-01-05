
import { getScanOrderData, updateScanOrderStatus } from '@/app/scan/actions';
import { createServerClient } from '@/firebase/server-client';

// Mock Firebase Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

describe('Scan Actions', () => {
    let mockCollection: jest.Mock;
    let mockGet: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockDoc: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGet = jest.fn();
        mockUpdate = jest.fn().mockResolvedValue({});
        
        mockDoc = jest.fn(() => ({
            get: mockGet,
            update: mockUpdate,
        }));

        mockCollection = jest.fn(() => ({
            doc: mockDoc,
        }));

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });
    });

    describe('getScanOrderData', () => {
        it('should return nulls if order does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            const result = await getScanOrderData('bad-id');
            expect(result.order).toBeNull();
            expect(result.dispensary).toBeNull();
        });

        it('should fetch order and dispensary data', async () => {
            // Mock Order Fetch
            mockGet.mockImplementationOnce(() => Promise.resolve({
                exists: true,
                data: () => ({
                    retailerId: 'disp-1',
                    status: 'submitted',
                    items: [],
                    totals: { total: 100 }
                })
            }));

            // Mock Dispensary Fetch
            mockGet.mockImplementationOnce(() => Promise.resolve({
                exists: true,
                data: () => ({
                    name: 'Test Dispensary',
                    claimedBy: 'owner-1'
                })
            }));

            const result = await getScanOrderData('order-1');

            expect(result.order).not.toBeNull();
            expect(result.order?.id).toBe('order-1');
            expect(result.dispensary).not.toBeNull();
            expect(result.dispensary?.name).toBe('Test Dispensary');
            expect(result.dispensary?.claimed).toBe(true);
        });
    });

    describe('updateScanOrderStatus', () => {
        it('should successfully update status', async () => {
            const result = await updateScanOrderStatus('order-1', 'confirmed');

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                status: 'confirmed'
            }));
        });

        it('should handle errors', async () => {
            mockUpdate.mockRejectedValue(new Error('Update failed'));

            const result = await updateScanOrderStatus('order-1', 'completed');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
