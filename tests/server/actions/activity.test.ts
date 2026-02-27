
import { getRecentActivity, getUsageStats, logActivity } from '@/server/actions/activity';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('MOCK_TIMESTAMP')
    }
}));

describe('Activity Server Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // effective mock setup for firestore chaining
        mockDoc = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
            add: jest.fn(),
            set: jest.fn() // possibly used?
        };

        mockCollection = jest.fn().mockReturnValue(mockDoc);

        mockFirestore = {
            collection: mockCollection
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user1',
            role: 'dispensary_admin',
            currentOrgId: 'org1',
            orgId: 'org1',
        });
    });

    describe('getRecentActivity', () => {
        it('fetches recent activity correctly', async () => {
            const mockData = [
                { id: '1', type: 'test', description: 'desc1' },
                { id: '2', type: 'test', description: 'desc2' }
            ];

            mockDoc.get.mockResolvedValue({
                docs: mockData.map(d => ({
                    id: d.id,
                    data: () => d
                }))
            });

            const result = await getRecentActivity('org1');

            expect(createServerClient).toHaveBeenCalled();
            expect(requireUser).toHaveBeenCalled();
            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
            expect(mockCollection().doc).toHaveBeenCalledWith('org1');
            expect(mockDoc.collection).toHaveBeenCalledWith('activity_feed');
            expect(mockDoc.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
            expect(mockDoc.limit).toHaveBeenCalledWith(10);
            
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
        });

        it('handles empty results', async () => {
            mockDoc.get.mockResolvedValue({ docs: [] });

            const result = await getRecentActivity('org1');

            expect(result).toHaveLength(0);
        });

        it('rejects cross-org reads for non-super users', async () => {
            await expect(getRecentActivity('org2')).rejects.toThrow('Unauthorized');
            expect(createServerClient).not.toHaveBeenCalled();
        });
    });

    describe('getUsageStats', () => {
        it('fetches usage stats for current month', async () => {
             const mockUsage = { messages: 50, recommendations: 10, api_calls: 5 };
             mockDoc.get.mockResolvedValue({
                 data: () => mockUsage
             });

             const result = await getUsageStats('org1');
             
             // Check path construction logic (YYYY-MM)
             const currentMonth = new Date().toISOString().slice(0, 7);

             expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
             expect(mockDoc.collection).toHaveBeenCalledWith('usage');
             expect(mockDoc.doc).toHaveBeenCalledWith(currentMonth);

             expect(result.messages).toBe(50);
             expect(result.limitMessages).toBe(1000);
        });

        it('returns defaults when no data found', async () => {
            mockDoc.get.mockResolvedValue({
                data: () => null
            });

            const result = await getUsageStats('org1');

            expect(result.messages).toBe(0);
            expect(result.apiCalls).toBe(0);
        });
    });

    describe('logActivity', () => {
        it('adds activity log entry', async () => {
            await logActivity('org1', 'u1', 'Test User', 'action_type', 'description text');

            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
            expect(mockDoc.collection).toHaveBeenCalledWith('activity_feed');
            expect(mockDoc.add).toHaveBeenCalledWith({
                orgId: 'org1',
                userId: 'user1',
                userName: 'Test User',
                type: 'action_type',
                description: 'description text',
                createdAt: 'MOCK_TIMESTAMP'
            });
        });

        it('rejects cross-org writes for non-super users', async () => {
            await expect(
                logActivity('org2', 'u1', 'Test User', 'action_type', 'description text')
            ).rejects.toThrow('Unauthorized');
            expect(mockDoc.add).not.toHaveBeenCalled();
        });
    });
});
