/**
 * Unit Tests: CRM Service — deleteCrmEntity
 *
 * Tests the deletion routing logic for brands, dispensaries, and users.
 * All firebase-admin and auth dependencies are mocked.
 */

// Mock firebase-admin before any imports
jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(),
    FieldValue: { serverTimestamp: jest.fn() },
}));

// Mock the admin firestore getter
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockDocRef = () => ({ delete: mockDelete });
const mockCollection = jest.fn((name: string) => ({
    doc: jest.fn(() => mockDocRef()),
    where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
    listDocuments: jest.fn().mockResolvedValue([]),
}));

const mockFirestore = {
    collection: mockCollection,
    batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
    })),
};

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockFirestore),
    getAdminAuth: jest.fn(() => ({
        deleteUser: jest.fn().mockResolvedValue(undefined),
    })),
}));

// Mock requireUser to always pass (super_user context)
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'super-user-uid',
        role: 'super_user',
    }),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { deleteCrmEntity } from '@/server/services/crm-service';
import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';

describe('deleteCrmEntity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Re-setup mocks after clearAllMocks
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        (getAdminAuth as jest.Mock).mockReturnValue({
            deleteUser: jest.fn().mockResolvedValue(undefined),
        });
    });

    describe('type: brand', () => {
        it('deletes from crm_brands collection', async () => {
            const mockDocDelete = jest.fn().mockResolvedValue(undefined);
            const mockBrandDoc = jest.fn(() => ({ delete: mockDocDelete }));
            mockCollection.mockImplementation((name: string) => ({
                doc: mockBrandDoc,
                where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
                listDocuments: jest.fn().mockResolvedValue([]),
            }));

            await deleteCrmEntity('brand-123', 'brand');

            expect(mockCollection).toHaveBeenCalledWith('crm_brands');
            expect(mockBrandDoc).toHaveBeenCalledWith('brand-123');
            expect(mockDocDelete).toHaveBeenCalled();
        });
    });

    describe('type: dispensary', () => {
        it('deletes from crm_dispensaries collection', async () => {
            const mockDocDelete = jest.fn().mockResolvedValue(undefined);
            const mockDispensaryDoc = jest.fn(() => ({ delete: mockDocDelete }));
            mockCollection.mockImplementation((name: string) => ({
                doc: mockDispensaryDoc,
                where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
                listDocuments: jest.fn().mockResolvedValue([]),
            }));

            await deleteCrmEntity('dispensary-456', 'dispensary');

            expect(mockCollection).toHaveBeenCalledWith('crm_dispensaries');
            expect(mockDispensaryDoc).toHaveBeenCalledWith('dispensary-456');
            expect(mockDocDelete).toHaveBeenCalled();
        });
    });

    describe('type: user', () => {
        it('deletes user from Firebase Auth and Firestore', async () => {
            const mockAuthDeleteUser = jest.fn().mockResolvedValue(undefined);
            const mockDocDelete = jest.fn().mockResolvedValue(undefined);

            (getAdminAuth as jest.Mock).mockReturnValue({
                deleteUser: mockAuthDeleteUser,
            });

            mockCollection.mockImplementation((name: string) => ({
                doc: jest.fn(() => ({ delete: mockDocDelete })),
                where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
                listDocuments: jest.fn().mockResolvedValue([]),
            }));

            await deleteCrmEntity('user-789', 'user');

            // Firebase Auth deletion attempted
            expect(mockAuthDeleteUser).toHaveBeenCalledWith('user-789');
            // Firestore users doc deletion attempted
            expect(mockCollection).toHaveBeenCalledWith('users');
        });

        it('tolerates auth/user-not-found error during Auth deletion', async () => {
            const notFoundError = Object.assign(new Error('user not found'), {
                code: 'auth/user-not-found',
            });
            const mockAuthDeleteUser = jest.fn().mockRejectedValue(notFoundError);
            const mockDocDelete = jest.fn().mockResolvedValue(undefined);

            (getAdminAuth as jest.Mock).mockReturnValue({
                deleteUser: mockAuthDeleteUser,
            });

            mockCollection.mockImplementation(() => ({
                doc: jest.fn(() => ({ delete: mockDocDelete })),
                where: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) })),
                listDocuments: jest.fn().mockResolvedValue([]),
            }));

            // Should NOT throw even though Auth deletion failed
            await expect(deleteCrmEntity('ghost-user', 'user')).resolves.toBeUndefined();
        });
    });
});
