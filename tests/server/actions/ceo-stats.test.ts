
import { getRagIndexStats } from '@/app/dashboard/ceo/actions';
import { ragService } from '@/server/services/vector-search/rag-service';
import { requireUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn()
}));

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {
        getStats: jest.fn()
    }
}));

describe('CEO Dashboard Actions', () => {
    describe('getRagIndexStats', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return stats when authorized', async () => {
             const mockStats = { totalDocuments: 100, collections: { test: 1 } };
             (ragService.getStats as jest.Mock).mockResolvedValue(mockStats);
             (requireUser as jest.Mock).mockResolvedValue(true);

             const result = await getRagIndexStats();

             expect(requireUser).toHaveBeenCalledWith(['owner', 'super_user']);
             expect(ragService.getStats).toHaveBeenCalled();
             expect(result).toEqual(mockStats);
        });

        it('should return empty stats on error/auth failure', async () => {
             (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

             const result = await getRagIndexStats();

             // Should catch error and return safe default
             expect(result).toEqual({ totalDocuments: 0, collections: {} });
        });
    });
});
