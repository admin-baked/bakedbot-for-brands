import { listBrandPlaybooks, togglePlaybookStatus } from '../playbooks';
import { createServerClient } from '@/firebase/server-client';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ uid: 'user1' })
}));

const mockFirestore = {
    collection: jest.fn(),
    batch: jest.fn()
};

describe('Playbook Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('seeds default playbooks if brand has none', async () => {
        // Mock empty collection
        const mockGet = jest.fn().mockResolvedValue({ empty: true });
        const mockDoc = jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ get: mockGet, doc: jest.fn().mockReturnValue({ id: 'new-id' }) }) });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        // Mock batch
        const mockBatchSet = jest.fn();
        const mockBatchCommit = jest.fn();
        mockFirestore.batch.mockReturnValue({ set: mockBatchSet, commit: mockBatchCommit });

        const result = await listBrandPlaybooks('brand1');

        // Should have seeded data
        expect(mockBatchSet).toHaveBeenCalledTimes(DEFAULT_PLAYBOOKS.length);
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(result.length).toBe(DEFAULT_PLAYBOOKS.length);
        expect(result[0].name).toBeDefined();
    });

    it('lists existing playbooks without seeding', async () => {
        // Mock existing data
        const mockData = { name: 'Existing Playbook', status: 'active' };
        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: 'pb1', data: () => mockData }]
        });
        const mockDoc = jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ get: mockGet }) });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        const result = await listBrandPlaybooks('brand1');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('pb1');

        // Should NOT batch write
        expect(mockFirestore.batch).not.toHaveBeenCalled();
    });

    it('toggles playbook status successfully', async () => {
        const mockUpdate = jest.fn();
        const mockDoc = jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({ update: mockUpdate })
            })
        });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        const result = await togglePlaybookStatus('brand1', 'pb1', false);

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'paused' }));
        expect(result.success).toBe(true);
    });
});
