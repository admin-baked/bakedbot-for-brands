import { getDispensaryDashboardData, getDispensaryPlaybooks, toggleDispensaryPlaybook } from '../actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'user1', role: 'dispensary', locationId: 'disp1' })
}));

describe('Dispensary Dashboard Actions', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getDispensaryDashboardData', () => {
        it('calculates trends and sync stats correctly', async () => {
            // Setup mock returns for all .get() calls in Order
            mockFirestore.get
                .mockResolvedValueOnce({ // 1. dispensaryDoc
                    exists: true,
                    data: () => ({ name: 'Test Dispensary', fulfillmentType: 'pickup', state: 'MI' })
                })
                .mockResolvedValueOnce({ // 2. ordersToday
                    size: 10, 
                    forEach: (cb: any) => cb({ data: () => ({ total: 100 }) }) 
                })
                .mockResolvedValueOnce({ // 3. yesterdaySnap
                    size: 5, 
                    forEach: (cb: any) => cb({ data: () => ({ total: 50 }) }) 
                })
                .mockResolvedValueOnce({ // 4. openOrdersSnap
                    size: 2 
                })
                .mockResolvedValueOnce({ // 5. complianceSnap
                    size: 1 
                })
                .mockResolvedValueOnce({ // 6. productsSnap (near OOS)
                    size: 3 
                })
                .mockResolvedValueOnce({ // 7. completedOrdersSnap
                    size: 1, 
                    forEach: (cb: any) => {
                        cb({ data: () => ({ 
                            createdAt: { toMillis: () => 1000 }, 
                            completedAt: { toMillis: () => 70000 } 
                        }) });
                    }
                })
                .mockResolvedValueOnce({ // 8. userProfile
                    data: () => ({ currentOrgId: 'org1' }) 
                })
                .mockResolvedValueOnce({ // 9. orgDoc
                    exists: true, 
                    data: () => ({ name: 'Org Name', state: 'MI' }) 
                })
                .mockResolvedValueOnce({ // 10. productsCount
                    data: () => ({ count: 100 }) 
                })
                .mockResolvedValueOnce({ // 11. competitorsCount
                    data: () => ({ count: 50 }) 
                });

            const result = await getDispensaryDashboardData('disp1');

            expect(result).not.toBeNull();
            expect(result?.stats.ordersToday.value).toBe(10);
            expect(result?.stats.ordersToday.trend).toBe('+100%');
            expect(result?.stats.revenueToday.value).toBe('$100');
            expect(result?.operations.openOrders).toBe(2);
            expect(result?.operations.avgFulfillmentMinutes).toBe(1);
            expect(result?.sync.products).toBe(100);
            expect(result?.sync.competitors).toBe(50);
        });

        it('handles errors gracefully by returning null', async () => {
            mockFirestore.get.mockRejectedValue(new Error('Firestore Error'));

            const result = await getDispensaryDashboardData('disp1');
            expect(result).toBeNull();
        });
    });

    describe('getDispensaryPlaybooks', () => {
        it('maps statusMap correctly to active field for a dispensary', async () => {
            mockFirestore.get.mockResolvedValue({
                docs: [
                    {
                        id: 'pb1',
                        data: () => ({
                            name: 'Test Playbook',
                            statusMap: { 'disp1': true },
                            type: 'dispensary'
                        })
                    }
                ]
            });

            const playbooks = await getDispensaryPlaybooks('disp1');

            expect(playbooks).toHaveLength(1);
            expect(playbooks[0].active).toBe(true);
        });
    });

    describe('toggleDispensaryPlaybook', () => {
        it('updates the statusMap in Firestore', async () => {
            const mockUpdate = jest.fn().mockResolvedValue({ success: true });
            mockFirestore.update = mockUpdate;

            const result = await toggleDispensaryPlaybook('disp1', 'pb1', true);

            expect(mockUpdate).toHaveBeenCalledWith({
                'statusMap.disp1': true
            });
            expect(result.success).toBe(true);
        });
    });
});
