import { deleteUserAccount, getAllUsers, isSuperUser } from '@/server/actions/delete-account';
import { adminDb, auth } from '@/firebase/admin';
import { getServerSessionUser } from '@/server/auth/session';

// Mock dependencies
jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    adminDb: {
        collection: jest.fn(),
        batch: jest.fn(),
    },
    auth: {
        deleteUser: jest.fn(),
    },
}));

jest.mock('@/server/auth/session', () => ({
    getServerSessionUser: jest.fn(),
}));

describe('delete-account actions', () => {
    const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn(),
    };

    const mockUserRef = {
        collection: jest.fn(),
        get: jest.fn(),
    };

    const mockDoc = jest.fn(() => mockUserRef);
    const mockCollection = jest.fn(() => ({ doc: mockDoc }));

    beforeEach(() => {
        jest.clearAllMocks();
        (adminDb.collection as jest.Mock).mockReturnValue({ doc: mockDoc });
        (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
        mockBatch.commit.mockResolvedValue(undefined);
    });

    describe('isSuperUser', () => {
        it('should return true for super_user role', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'super_user' }),
            });

            const result = await isSuperUser('user123');

            expect(adminDb.collection).toHaveBeenCalledWith('users');
            expect(mockDoc).toHaveBeenCalledWith('user123');
            expect(result).toBe(true);
        });

        it('should return true for isSuperAdmin flag', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'brand', isSuperAdmin: true }),
            });

            const result = await isSuperUser('user123');
            expect(result).toBe(true);
        });

        it('should return false for regular users', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'brand' }),
            });

            const result = await isSuperUser('user123');
            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            mockUserRef.get.mockRejectedValue(new Error('Firestore error'));

            const result = await isSuperUser('user123');
            expect(result).toBe(false);
        });
    });

    describe('deleteUserAccount', () => {
        const mockSubDocs = [
            { ref: { path: 'users/test/chatSessions/1' } },
            { ref: { path: 'users/test/chatSessions/2' } },
        ];

        beforeEach(() => {
            // Mock doc to return different values based on UID
            mockDoc.mockImplementation((uid: string) => {
                const mockGet = jest.fn();
                if (uid.startsWith('superuser')) {
                    mockGet.mockResolvedValue({
                        exists: true,
                        data: () => ({ role: 'super_user' }),
                    });
                } else if (uid === 'user456') {
                    mockGet.mockResolvedValue({
                        exists: true,
                        data: () => ({ role: 'customer' }),
                    });
                } else {
                    mockGet.mockResolvedValue({
                        exists: true,
                        data: () => ({ role: 'customer' }),
                    });
                }
                
                return {
                    get: mockGet,
                    collection: mockUserRef.collection,
                    delete: jest.fn(),
                };
            });

            // Mock subcollections
            mockUserRef.collection.mockReturnValue({
                listDocuments: jest.fn().mockResolvedValue(mockSubDocs),
            });

            // Mock related collections (empty by default)
            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === 'users') {
                    return { doc: mockDoc };
                }
                const mockGet = jest.fn().mockResolvedValue({ docs: [] });
                return {
                    doc: mockDoc,
                    where: jest.fn(() => ({ get: mockGet })),
                    get: mockGet,
                };
            });
        });

        it('should successfully delete a user account', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            (auth.deleteUser as jest.Mock).mockResolvedValue(undefined);

            const result = await deleteUserAccount('user456');

            expect(getServerSessionUser).toHaveBeenCalled();
            expect(auth.deleteUser).toHaveBeenCalledWith('user456');
            expect(mockBatch.commit).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('should reject unauthorized users', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'brand' }),
            });
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'regularuser123' });

            const result = await deleteUserAccount('user456');

            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: Super User access required',
            });
            expect(auth.deleteUser).not.toHaveBeenCalled();
        });

        it('should reject if current user is not logged in', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            const result = await deleteUserAccount('user456');

            expect(result).toEqual({
                success: false,
                error: 'Unauthorized: Super User access required',
            });
        });

        it('should prevent deleting super user accounts', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            
            // First call for current user (super), second call for target user (also super)
            mockUserRef.get
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({ role: 'super_user' }),
                })
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({ role: 'super_user' }),
                });

            const result = await deleteUserAccount('superuser456');

            expect(result).toEqual({
                success: false,
                error: 'Cannot delete Super User accounts',
            });
            expect(auth.deleteUser).not.toHaveBeenCalled();
        });

        it('should continue if auth user not found', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            
            const authError = new Error('User not found');
            (authError as any).code = 'auth/user-not-found';
            (auth.deleteUser as jest.Mock).mockRejectedValue(authError);

            const result = await deleteUserAccount('user456');

            expect(result).toEqual({ success: true });
            expect(mockBatch.commit).toHaveBeenCalled();
        });

        it('should propagate auth errors other than user-not-found', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            
            const authError = new Error('Auth service error');
            (authError as any).code = 'auth/internal-error';
            (auth.deleteUser as jest.Mock).mockRejectedValue(authError);

            const result = await deleteUserAccount('user456');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Auth service error');
        });

        it('should delete user subcollections', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            (auth.deleteUser as jest.Mock).mockResolvedValue(undefined);

            await deleteUserAccount('user456');

            // Should delete from subcollections
            expect(mockUserRef.collection).toHaveBeenCalledWith('chat_sessions');
            expect(mockUserRef.collection).toHaveBeenCalledWith('chatSessions');
            expect(mockUserRef.collection).toHaveBeenCalledWith('integrations');
            expect(mockUserRef.collection).toHaveBeenCalledWith('notifications');
            expect(mockUserRef.collection).toHaveBeenCalledWith('passport');
        });

        it('should delete related data across collections', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });
            (auth.deleteUser as jest.Mock).mockResolvedValue(undefined);

            const mockRelatedDocs = [
                { ref: { path: 'knowledge_base/1' } },
                { ref: { path: 'knowledge_base/2' } },
            ];

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                const mockWhere = jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ docs: name === 'knowledge_base' ? mockRelatedDocs : [] }),
                }));
                return {
                    doc: mockDoc,
                    where: mockWhere,
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                };
            });

            await deleteUserAccount('user456');

            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });

    describe('getAllUsers', () => {
        it('should return list of users for super user', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'super_user' }),
            });

            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'superuser123' });

            const mockUsers = [
                {
                    id: 'user1',
                    data: () => ({
                        email: 'user1@example.com',
                        displayName: 'User One',
                        role: 'brand',
                        createdAt: { toDate: () => new Date('2024-01-01') },
                    }),
                },
                {
                    id: 'user2',
                    data: () => ({
                        email: 'user2@example.com',
                        displayName: null,
                        role: 'customer',
                        createdAt: null,
                    }),
                },
            ];

            (adminDb.collection as jest.Mock).mockReturnValue({
                get: jest.fn().mockResolvedValue({ docs: mockUsers }),
                doc: mockDoc,
            });

            const result = await getAllUsers();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                uid: 'user1',
                email: 'user1@example.com',
                displayName: 'User One',
                role: 'brand',
                createdAt: '2024-01-01T00:00:00.000Z',
            });
            expect(result[1].email).toBe('user2@example.com');
            expect(result[1].createdAt).toBeNull();
        });

        it('should throw error for unauthorized users', async () => {
            mockUserRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ role: 'brand' }),
            });

            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'regularuser123' });

            await expect(getAllUsers()).rejects.toThrow('Unauthorized: Super User access required');
        });

        it('should throw error if not logged in', async () => {
            (getServerSessionUser as jest.Mock).mockResolvedValue(null);

            await expect(getAllUsers()).rejects.toThrow('Unauthorized: Super User access required');
        });
    });
});
