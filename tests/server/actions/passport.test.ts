
import { getPassportAction, updatePassportAction, savePassportAction } from '@/server/actions/passport';
import { createServerClient } from '@/firebase/server-client';
import { getAdminAuth } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';

// Mock server-only to avoid errors in Jest
jest.mock('server-only', () => ({}), { virtual: true });

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/firebase/admin', () => ({
    getAdminAuth: jest.fn(),
    getAdminFirestore: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('next/navigation', () => ({
    redirect: jest.fn()
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

describe('Passport Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockAuth: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Recursive mock for deep collections: users -> doc -> passport -> doc
        mockDoc = {
            get: jest.fn().mockResolvedValue({ exists: false }),
            set: jest.fn().mockResolvedValue({ success: true }),
            update: jest.fn().mockResolvedValue({ success: true }),
            collection: jest.fn(() => mockCollection)
        };

        mockCollection = {
            doc: jest.fn(() => mockDoc),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn()
        };

        mockFirestore = {
            collection: jest.fn(() => mockCollection)
        };

        mockAuth = {
            verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user_123' }),
            getUser: jest.fn().mockResolvedValue({ uid: 'user_123', email: 'test@example.com' })
        };

        (createServerClient as jest.Mock).mockResolvedValue({ 
            firestore: mockFirestore,
            auth: mockAuth
        });
        (getAdminAuth as jest.Mock).mockReturnValue(mockAuth);
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user_123' });
    });

    describe('getPassportAction', () => {
        it('should return null if passport does not exist', async () => {
            mockDoc.get.mockResolvedValue({ exists: false });
            
            const result = await getPassportAction();
            expect(result).toBeNull();
        });

        it('should return passport data if it exists', async () => {
            const mockData = {
                id: 'user_123',
                userId: 'user_123',
                displayName: 'Test User'
            };
            mockDoc.get.mockResolvedValue({ 
                exists: true, 
                data: () => mockData 
            });

            const result = await getPassportAction();
            expect(result).toEqual(mockData);
        });
    });

    describe('updatePassportAction', () => {
        it('should update passport data', async () => {
            const updates = { displayName: 'New Name' };
            
            const result = await updatePassportAction(updates);
            
            expect(result.success).toBe(true);
            expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining(updates), { merge: true });
        });
    });

    describe('savePassportAction', () => {
        it('should save new passport and update user document', async () => {
            const passportData = {
                displayName: 'Test User',
                preferredMethods: ['flower']
            };

            const result = await savePassportAction(passportData as any);

            expect(result.success).toBe(true);
            expect(mockDoc.set).toHaveBeenCalledWith(expect.any(Object)); // Save passport
            expect(mockDoc.set).toHaveBeenCalledWith({ onboardingComplete: true }, { merge: true }); // Update user
        });
    });
});
