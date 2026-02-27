import { listBrandAgents } from '../agents';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { agents as DEFAULT_AGENTS } from '@/config/agents';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

const mockFirestore = {
    collection: jest.fn(),
    batch: jest.fn()
};

describe('Agent Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'brand1',
            role: 'brand_admin',
            currentOrgId: 'brand1',
            orgId: 'brand1',
        });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    it('seeds default agents if brand has none', async () => {
        // Mock empty collection
        const mockGet = jest.fn().mockResolvedValue({ empty: true });
        const mockDoc = jest.fn().mockReturnValue({
            collection: jest.fn().mockReturnValue({
                get: mockGet,
                doc: jest.fn().mockReturnValue({ id: 'agent-id' })
            })
        });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        // Mock batch
        const mockBatchSet = jest.fn();
        const mockBatchCommit = jest.fn();
        mockFirestore.batch.mockReturnValue({ set: mockBatchSet, commit: mockBatchCommit });

        const result = await listBrandAgents('brand1');

        // Should have seeded data
        expect(mockBatchSet).toHaveBeenCalledTimes(DEFAULT_AGENTS.length);
        expect(mockBatchCommit).toHaveBeenCalled();
        expect(result.length).toBe(DEFAULT_AGENTS.length);
        expect(result[0].status).toBeDefined();
    });

    it('lists existing agents without seeding', async () => {
        // Mock existing data
        const mockData = { name: 'Smokey', status: 'online', updatedAt: { toDate: () => new Date() } };
        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: 'smokey', data: () => mockData }]
        });
        const mockDoc = jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ get: mockGet }) });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        const result = await listBrandAgents('brand1');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('smokey');

        // Should NOT batch write
        expect(mockFirestore.batch).not.toHaveBeenCalled();
    });

    it('rejects non-super users reading another brand', async () => {
        await expect(listBrandAgents('brand2')).rejects.toThrow('Unauthorized');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('allows super users to read another brand', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'super-1',
            role: 'super_user',
            currentOrgId: 'super-org',
        });

        const mockData = { name: 'Craig', status: 'online', updatedAt: { toDate: () => new Date() } };
        const mockGet = jest.fn().mockResolvedValue({
            empty: false,
            docs: [{ id: 'craig', data: () => mockData }]
        });
        const mockDoc = jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ get: mockGet }) });
        mockFirestore.collection.mockReturnValue({ doc: mockDoc });

        const result = await listBrandAgents('brand2');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('craig');
    });

    it('rejects invalid brandId path input', async () => {
        await expect(listBrandAgents('brand/evil')).rejects.toThrow('Invalid brandId');
        expect(createServerClient).not.toHaveBeenCalled();
    });
});
