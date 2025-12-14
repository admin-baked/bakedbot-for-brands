
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


describe('deleteSeoPageAction', () => {
    const mockDelete = jest.fn();
    const mockDoc = jest.fn((id) => ({ delete: mockDelete })); // Modified to accept id for clarity
    const mockCollection = jest.fn((path: string) => ({ doc: mockDoc }));
    const mockFirestore = {
        collection: mockCollection,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should delete the SEO page and return success message', async () => {
        // Setup nested mocks
        const mockSeoPagesCollection = { doc: mockDoc };
        const mockConfigDoc = { collection: jest.fn(() => mockSeoPagesCollection) };
        const mockConfigCollection = { doc: jest.fn(() => mockConfigDoc) };

        mockFirestore.collection.mockImplementation((name) => {
            if (name === 'foot_traffic') return mockConfigCollection;
            return { doc: jest.fn() };
        });

        (requireUser as jest.Mock).mockResolvedValue({ role: 'owner' });
        mockDelete.mockResolvedValue({});

        const result = await deleteSeoPageAction('90004');

        expect(requireUser).toHaveBeenCalledWith(['owner']);
        expect(mockFirestore.collection).toHaveBeenCalledWith('foot_traffic');
        expect(mockConfigCollection.doc).toHaveBeenCalledWith('config');
        expect(mockConfigDoc.collection).toHaveBeenCalledWith('seo_pages');
        expect(mockSeoPagesCollection.doc).toHaveBeenCalledWith('90004');
        expect(mockDelete).toHaveBeenCalled(); // Call delete on the returned doc
        expect(result).toEqual({ message: 'Successfully deleted page for 90004' });
    });

    it('should return error if delete fails', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ role: 'owner' });
        const error = new Error('Delete failed');

        // Setup nested mocks for failure case
        const mockDeleteFailure = jest.fn().mockRejectedValue(error);
        const mockSeoPagesCollectionFailure = { doc: jest.fn(() => ({ delete: mockDeleteFailure })) };
        const mockConfigDocFailure = { collection: jest.fn(() => mockSeoPagesCollectionFailure) };
        const mockConfigCollectionFailure = { doc: jest.fn(() => mockConfigDocFailure) };

        mockFirestore.collection.mockImplementation((name) => {
            if (name === 'foot_traffic') return mockConfigCollectionFailure;
            return { doc: jest.fn() };
        });

        const result = await deleteSeoPageAction('90004');

        expect(requireUser).toHaveBeenCalledWith(['owner']);
        expect(mockFirestore.collection).toHaveBeenCalledWith('foot_traffic');
        expect(mockConfigCollectionFailure.doc).toHaveBeenCalledWith('config');
        expect(mockConfigDocFailure.collection).toHaveBeenCalledWith('seo_pages');
        expect(mockSeoPagesCollectionFailure.doc).toHaveBeenCalledWith('90004');
        expect(mockDeleteFailure).toHaveBeenCalled();
        expect(result).toEqual({ message: 'Failed to delete page: Delete failed', error: true });
    });

});
