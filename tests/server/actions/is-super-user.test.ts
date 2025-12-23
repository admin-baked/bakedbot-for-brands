
import { isSuperUser } from '@/server/actions/delete-account';
import { isSuperAdminEmail } from '@/lib/super-admin-config';

// Mock getAdminFirestore to avoid real DB calls
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => ({
        collection: mockCollection,
    }),
}));

// Mock server auth session to prevent loading potential crashy dependencies
jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn(),
}));

// Mock super-admin-config to have controlled behavior
jest.mock('@/lib/super-admin-config', () => ({
    isSuperAdminEmail: jest.fn(),
}));

describe('isSuperUser', () => {
    const mockIsSuperAdminEmail = isSuperAdminEmail as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true if email is provided and in whitelist (bypass Firestore)', async () => {
        mockIsSuperAdminEmail.mockReturnValue(true);
        // Firestore mocks shouldn't be called
        const result = await isSuperUser('some-uid', 'admin@bakedbot.ai');
        expect(result).toBe(true);
        expect(mockIsSuperAdminEmail).toHaveBeenCalledWith('admin@bakedbot.ai');
        expect(mockCollection).not.toHaveBeenCalled();
    });

    it('returns false if email provided but not in whitelist, and Firestore doc missing', async () => {
        mockIsSuperAdminEmail.mockReturnValue(false);
        mockGet.mockResolvedValue({ exists: false, data: () => undefined });

        const result = await isSuperUser('user-uid', 'user@example.com');
        expect(result).toBe(false);
        expect(mockCollection).toHaveBeenCalledWith('users');
    });

    it('returns true if Firestore role is super_user (email not provided)', async () => {
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ role: 'super_user' }),
        });

        const result = await isSuperUser('super-uid');
        expect(result).toBe(true);
    });

    it('returns true if Firestore isSuperAdmin is true (email not provided)', async () => {
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ isSuperAdmin: true }),
        });

        const result = await isSuperUser('super-uid');
        expect(result).toBe(true);
    });

    it('returns true if Firestore email is whitelisted (email not provided)', async () => {
        mockIsSuperAdminEmail.mockReturnValue(true);
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ email: 'admin@bakedbot.ai' }),
        });

        const result = await isSuperUser('admin-uid');
        expect(result).toBe(true);
        expect(mockIsSuperAdminEmail).toHaveBeenCalledWith('admin@bakedbot.ai');
    });

    it('returns false for regular user', async () => {
        mockIsSuperAdminEmail.mockReturnValue(false);
        mockGet.mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand', email: 'regular@example.com' }),
        });

        const result = await isSuperUser('regular-uid');
        expect(result).toBe(false);
    });
});
