import { saveGmailToken, getGmailToken } from '../token-storage';
import { createServerClient } from '@/firebase/server-client';
import { encrypt, decrypt } from '@/server/utils/encryption';
// Mock dependencies with explicit factories to prevent module loading
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/utils/encryption', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn()
}));
// We don't need to mock firebase-admin if we successfully block server-client

describe('Gmail Token Storage', () => {
    const mockFirestore = {
        collection: jest.fn(),
    };
    const mockDoc = jest.fn();
    const mockSet = jest.fn();
    const mockGet = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore chain
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });
        mockDoc.mockReturnValue({
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    set: mockSet,
                    get: mockGet
                })
            })
        });

        // Setup encryption mocks
        (encrypt as jest.Mock).mockImplementation((text) => `encrypted_${text}`);
        (decrypt as jest.Mock).mockImplementation((text) => text.replace('encrypted_', ''));
    });

    describe('saveGmailToken', () => {
        it('should save encrypted refresh token', async () => {
            const userId = 'user123';
            const tokens = { refresh_token: 'refresh123', scope: 'email profile' };

            await saveGmailToken(userId, tokens);

            expect(encrypt).toHaveBeenCalledWith('refresh123');
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                scopes: ['email', 'profile'],
                refreshTokenEncrypted: 'encrypted_refresh123'
            }), { merge: true });
        });

        it('should not save if no tokens provided', async () => {
            await saveGmailToken('user123', {});
            expect(mockSet).not.toHaveBeenCalled();
        });
    });

    describe('getGmailToken', () => {
        it('should return null if doc does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const result = await getGmailToken('user123');
            expect(result).toBeNull();
        });

        it('should decrypt and return tokens', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    refreshTokenEncrypted: 'encrypted_refresh123',
                    expiryDate: 1234567890
                })
            });

            const result = await getGmailToken('user123');
            expect(decrypt).toHaveBeenCalledWith('encrypted_refresh123');
            expect(result).toEqual({
                refresh_token: 'refresh123',
                expiry_date: 1234567890
            });
        });
    });
});
