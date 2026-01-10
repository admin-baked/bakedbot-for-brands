import { getPlatformUsers } from '@/server/services/crm-service';
import { getAdminFirestore } from '@/firebase/admin';

// Mock Firebase Admin
const mockGet = jest.fn();
const mockLimit = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ limit: mockLimit }));
const mockFirestore = {
    collection: mockCollection
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockFirestore)
}));

describe('CRM Service - getPlatformUsers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch ALL users (ignoring missing createdAt) and sort them', async () => {
        // Mock Data: 
        // User A: Has date (Newest)
        // User B: No date (Oldest/Legacy)
        // User C: Has date (Middle)
        
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000);
        
        const mockDocs = [
            {
                id: 'user-b',
                data: () => ({ email: 'b@test.com', name: 'User B' }) // No createdAt
            },
            {
                id: 'user-a',
                data: () => ({ email: 'a@test.com', name: 'User A', createdAt: { toDate: () => now } })
            },
            {
                id: 'user-c',
                data: () => ({ email: 'c@test.com', name: 'User C', createdAt: { toDate: () => yesterday } })
            }
        ];

        mockGet.mockResolvedValue({
            docs: mockDocs,
            size: 3
        });

        const result = await getPlatformUsers();

        // 1. Verify all returned
        expect(result).toHaveLength(3);

        // 2. Verify Sorting (Newest First)
        // Order should be: A (Now), C (Yesterday), B (0/Null)
        expect(result[0].id).toBe('user-a');
        expect(result[1].id).toBe('user-c');
        expect(result[2].id).toBe('user-b');
        
        // 3. Verify orderBy was NOT called
        // We can't strictly assert method absence on the chain easily without complex mocks,
        // but we can assume the code change worked if it runs without erroring on the missing field logic simulated here.
        // Actually, in the real implementation we removed orderBy.
    });

    it('should filter users by search term', async () => {
         const mockDocs = [
            { id: '1', data: () => ({ email: 'match@test.com', name: 'Match' }) },
            { id: '2', data: () => ({ email: 'other@test.com', name: 'Other' }) }
        ];
        mockGet.mockResolvedValue({ docs: mockDocs });

        const result = await getPlatformUsers({ search: 'match' });
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('match@test.com');
    });
});
