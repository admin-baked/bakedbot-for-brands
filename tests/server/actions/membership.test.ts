
import { joinOrganizationAction, getMembershipAction } from '@/server/actions/membership';
import { createServerClient } from '@/firebase/server-client';
import { getPassportAction } from '@/server/actions/passport';

// Mock server-only to avoid errors in Jest
jest.mock('server-only', () => ({}), { virtual: true });

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/actions/passport', () => ({
    getPassportAction: jest.fn()
}));

describe('Membership Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockQuery: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDoc = {
            get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ id: 'mock_data' }) }),
            set: jest.fn().mockResolvedValue({ success: true }),
            update: jest.fn().mockResolvedValue({ success: true }),
            collection: jest.fn(() => mockCollection)
        };

        mockQuery = {
            get: jest.fn().mockResolvedValue({ 
                empty: false, 
                docs: [{ id: 'doc_123', data: () => ({ id: 'doc_123' }) }] 
            })
        };

        mockCollection = {
            doc: jest.fn(() => mockDoc),
            collection: jest.fn().mockReturnThis(),
            where: jest.fn(() => mockQuery),
            limit: jest.fn(() => mockQuery)
        };

        mockFirestore = {
            collection: jest.fn(() => mockCollection)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ 
            firestore: mockFirestore,
            auth: { currentUser: { uid: 'user_123' } } 
        });
    });

    describe('joinOrganizationAction', () => {
        it('should fail if user has no passport', async () => {
            (getPassportAction as jest.Mock).mockResolvedValue(null);
            
            const result = await joinOrganizationAction('org_123');
            expect(result.success).toBe(false);
            expect(result.error).toBe('User must have a Passport to join.');
        });

        it('should create a membership if user has passport', async () => {
            const mockPassport = {
                id: 'passport_123', // This acts as handle in where query
                userId: 'user_123',
                displayName: 'Test User',
                preferredMethods: ['flower']
            };
            (getPassportAction as jest.Mock).mockResolvedValue(mockPassport);
            
            const result = await joinOrganizationAction('org_123');
            
            expect(result.success).toBe(true);
            expect(result.membershipId).toBe('user_123_org_123');
            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
            expect(mockDoc.set).toHaveBeenCalled();
        });
    });

    describe('getMembershipAction', () => {
        it('should return null if no membership exists', async () => {
            (getPassportAction as jest.Mock).mockResolvedValue({ userId: 'user_123' });
            mockDoc.get.mockResolvedValue({ exists: false });
            
            const result = await getMembershipAction('org_123');
            expect(result).toBeNull();
        });

        it('should return membership data if it exists', async () => {
            (getPassportAction as jest.Mock).mockResolvedValue({ userId: 'user_123' });
            const mockData = { id: 'mem_123', points: 100 };
            mockDoc.get.mockResolvedValue({ 
                exists: true, 
                data: () => mockData 
            });
            
            const result = await getMembershipAction('org_123');
            expect(result).toEqual(mockData);
        });
    });
});
