import { renderHook, waitFor } from '@testing-library/react';
import { useInsights } from '../use-insights';
import { useUserRole } from '../use-user-role';

jest.mock('../use-user-role');
jest.mock('@/server/actions/insights', () => ({
    getInsights: jest.fn(),
}));
jest.mock('../use-mock-data', () => ({
    useMockData: jest.fn(() => ({ isMock: false, isLoading: false })),
}));

const mockGetInsights = require('@/server/actions/insights').getInsights;

describe('useInsights - Grower Role', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns grower role and data when user is a grower', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'grower',
            isLoading: false,
        });

        mockGetInsights.mockResolvedValueOnce({
            success: true,
            data: {
                role: 'grower',
                data: {
                    yield: [{ id: 'yield-1', title: 'Yield Health' }],
                    wholesale: [],
                    partners: [],
                    compliance: [],
                    operations: [],
                    lastFetched: new Date(),
                },
            },
        });

        const { result } = renderHook(() => useInsights());

        await waitFor(() => {
            expect(result.current.insights?.role).toBe('grower');
            expect(result.current.insights?.data.yield).toHaveLength(1);
        });
    });

    it('aggregates all 5 grower insight categories', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'grower',
            isLoading: false,
        });

        mockGetInsights.mockResolvedValueOnce({
            success: true,
            data: {
                role: 'grower',
                data: {
                    yield: [{ id: 'yield-1', title: 'Yield Health' }],
                    wholesale: [{ id: 'wholesale-1', title: 'Wholesale Ready' }],
                    partners: [{ id: 'partners-1', title: 'Brand Outreach' }],
                    compliance: [{ id: 'compliance-1', title: 'Transfer Check' }],
                    operations: [{ id: 'operations-1', title: 'Catalog Freshness' }],
                    lastFetched: new Date(),
                },
            },
        });

        const { result } = renderHook(() => useInsights());

        await waitFor(() => {
            const allInsights = result.current.getAllInsights();
            expect(allInsights).toHaveLength(5);
            expect(allInsights.map((insight) => insight.id)).toEqual([
                'yield-1',
                'wholesale-1',
                'partners-1',
                'compliance-1',
                'operations-1',
            ]);
        });
    });
});
