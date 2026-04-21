
import { deleteSeoPageAction } from '@/app/dashboard/ceo/actions';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies

jest.mock('server-only', () => { });
jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

/**
 * deleteSeoPageAction uses Promise.allSettled to delete from 5 paths:
 *   1. foot_traffic/config/zip_pages/<zip>
 *   2. foot_traffic/config/seo_pages/<zip>
 *   3. seo_pages/zip-<zip>
 *   4. seo_pages/zip_<zip>
 *   5. seo_pages/<zip>
 * Since it uses allSettled, individual delete failures don't throw — only
 * requireUser / getAdminFirestore failures cause the catch branch to activate.
 */
describe('deleteSeoPageAction', () => {
    const mockDelete = jest.fn().mockResolvedValue({});
    const makeDocStub = () => ({ delete: mockDelete });
    const makeCollectionStub = () => ({ doc: jest.fn(() => makeDocStub()) });

    // configDoc stub: collection() → subdoc stub
    const mockConfigDoc = {
        collection: jest.fn(() => makeCollectionStub()),
    };

    // foot_traffic collection stub: doc('config') → configDoc
    const mockFootTrafficCollection = {
        doc: jest.fn(() => mockConfigDoc),
    };

    // top-level seo_pages collection stub
    const mockSeoPagesColl = makeCollectionStub();

    const mockFirestore = {
        collection: jest.fn((name: string) => {
            if (name === 'foot_traffic') return mockFootTrafficCollection;
            if (name === 'seo_pages') return mockSeoPagesColl;
            return makeCollectionStub();
        }),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDelete.mockResolvedValue({});
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-123', role: 'super_user' });
    });

    it('should delete the SEO page across all paths and return success message', async () => {
        const result = await deleteSeoPageAction('90004');

        expect(requireUser).toHaveBeenCalledWith(['super_user']);
        // foot_traffic/config must be accessed
        expect(mockFirestore.collection).toHaveBeenCalledWith('foot_traffic');
        expect(mockFootTrafficCollection.doc).toHaveBeenCalledWith('config');
        // seo_pages top-level collection accessed for 3 delete paths
        expect(mockFirestore.collection).toHaveBeenCalledWith('seo_pages');
        expect(result).toEqual({ message: 'Successfully deleted page for 90004' });
    });

    it('should return error if requireUser throws (unauthorized)', async () => {
        (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

        const result = await deleteSeoPageAction('90004');

        expect(result).toMatchObject({ error: true, message: 'Unauthorized' });
    });
});
