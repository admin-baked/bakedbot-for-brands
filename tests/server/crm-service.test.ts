import { getPlatformUsers } from '@/server/services/crm-service';

// Mock auth to avoid real auth checks
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'test-admin',
        role: 'super_user',
        email: 'admin@test.com',
    }),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// Mock Firebase Admin with chainable collection
const mockUsersGet = jest.fn();
const mockSubscriptionsGet = jest.fn();
const mockSubDocGet = jest.fn();
const mockFirestore = {
    collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'subscriptions') {
            return { get: mockSubscriptionsGet };
        }
        if (name === 'organizations') {
            return {
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue({
                            get: mockSubDocGet,
                        }),
                    }),
                }),
            };
        }
        // Default: users collection
        return { get: mockUsersGet };
    }),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockFirestore)
}));

describe('CRM Service - getPlatformUsers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default empty subscriptions
        mockSubscriptionsGet.mockResolvedValue({ docs: [] });
        mockSubDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
    });

    it('should fetch and return users', async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 86400000);

        const mockDocs = [
            {
                id: 'user-b',
                data: () => ({ email: 'b@test.com', name: 'User B', role: 'brand' })
            },
            {
                id: 'user-a',
                data: () => ({ email: 'a@test.com', name: 'User A', role: 'brand', createdAt: { toDate: () => now } })
            },
            {
                id: 'user-c',
                data: () => ({ email: 'c@test.com', name: 'User C', role: 'brand', createdAt: { toDate: () => yesterday } })
            }
        ];

        mockUsersGet.mockResolvedValue({
            docs: mockDocs,
            size: 3
        });

        const result = await getPlatformUsers({}, undefined, { skipAuth: true });

        // Verify all returned
        expect(result).toHaveLength(3);

        // Verify each user has expected fields
        expect(result.every(u => u.id && u.email)).toBe(true);
    });

    it('should filter users by search term', async () => {
        const mockDocs = [
            { id: '1', data: () => ({ email: 'match@test.com', name: 'Match', role: 'brand' }) },
            { id: '2', data: () => ({ email: 'other@test.com', name: 'Other', role: 'brand' }) }
        ];
        mockUsersGet.mockResolvedValue({ docs: mockDocs, size: 2 });

        const result = await getPlatformUsers({ search: 'match' }, undefined, { skipAuth: true });
        expect(result).toHaveLength(1);
        expect(result[0].email).toBe('match@test.com');
    });
});
