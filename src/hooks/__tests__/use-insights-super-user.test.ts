import { renderHook, waitFor } from '@testing-library/react';
import { useInsights } from '../use-insights';
import { useUserRole } from '../use-user-role';

// Mock dependencies
jest.mock('../use-user-role');
jest.mock('@/server/actions/insights', () => ({
    getInsights: jest.fn(),
}));
jest.mock('../use-mock-data', () => ({
    useMockData: jest.fn(() => ({ isMock: false, isLoading: false })),
}));

const mockGetInsights = require('@/server/actions/insights').getInsights;

describe('useInsights - Super User Role', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Real data fetching for Super User', () => {
        it('returns super_user role and data when user is super_user', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [
                            {
                                id: 'system-health',
                                category: 'platform',
                                agentId: 'leo',
                                agentName: 'Leo',
                                title: 'System Health',
                                headline: '99.9% uptime',
                                severity: 'success',
                                actionable: false,
                                lastUpdated: new Date(),
                                dataSource: 'system-logs',
                            },
                        ],
                        growth: [],
                        deployment: [],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                expect(result.current.insights?.role).toBe('super_user');
                expect(result.current.insights?.data.platform).toHaveLength(1);
            });
        });

        it('aggregates all 5 insight categories for Super User', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [{ id: 'platform-1', title: 'System Health' }],
                        growth: [{ id: 'growth-1', title: 'New Signups' }],
                        deployment: [{ id: 'deploy-1', title: 'Deployments' }],
                        support: [{ id: 'support-1', title: 'Support Queue' }],
                        intelligence: [{ id: 'intel-1', title: 'Research Queue' }],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const allInsights = result.current.getAllInsights();
                expect(allInsights).toHaveLength(5);
                expect(allInsights.map(i => i.id)).toEqual([
                    'platform-1',
                    'growth-1',
                    'deploy-1',
                    'support-1',
                    'intel-1',
                ]);
            });
        });
    });

    describe('System Health metrics', () => {
        it('returns system health with uptime percentage', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [
                            {
                                id: 'system-health',
                                category: 'platform',
                                agentId: 'leo',
                                agentName: 'Leo',
                                title: 'System Health',
                                headline: '99.9% uptime',
                                subtext: 'All systems operational',
                                severity: 'success',
                                dataSource: 'system-logs',
                                lastUpdated: new Date(),
                            },
                        ],
                        growth: [],
                        deployment: [],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const platform = result.current.getAllInsights().find(
                    i => i.id === 'system-health'
                );
                expect(platform?.headline).toMatch(/99\.\d%\s+uptime/);
            });
        });

        it('shows error severity when system has critical errors', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [
                            {
                                id: 'system-health',
                                title: 'System Health',
                                headline: '98.0% uptime',
                                subtext: '15 errors (24h)',
                                severity: 'critical',
                                dataSource: 'system-logs',
                                lastUpdated: new Date(),
                            },
                        ],
                        growth: [],
                        deployment: [],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const platform = result.current.getAllInsights().find(
                    i => i.id === 'system-health'
                );
                expect(platform?.severity).toBe('critical');
            });
        });
    });

    describe('Growth metrics', () => {
        it('returns new signups with trend calculation', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [],
                        growth: [
                            {
                                id: 'new-signups',
                                category: 'growth',
                                agentId: 'jack',
                                title: 'New Signups',
                                headline: '12 this week',
                                subtext: 'Up from 8 last week',
                                trend: 'up',
                                trendValue: '+50%',
                                severity: 'success',
                                dataSource: 'users-collection',
                                lastUpdated: new Date(),
                            },
                        ],
                        deployment: [],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const growth = result.current.getAllInsights().find(
                    i => i.id === 'new-signups'
                );
                expect(growth?.trend).toBe('up');
                expect(growth?.trendValue).toBe('+50%');
            });
        });
    });

    describe('Deployment metrics', () => {
        it('returns deployment status with failed count', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [],
                        growth: [],
                        deployment: [
                            {
                                id: 'deployment-status',
                                category: 'deployment',
                                agentId: 'linus',
                                title: 'Deployments',
                                headline: '5 today',
                                subtext: '2 failed',
                                severity: 'warning',
                                dataSource: 'deployment-logs',
                                lastUpdated: new Date(),
                            },
                        ],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const deployment = result.current.getAllInsights().find(
                    i => i.id === 'deployment-status'
                );
                expect(deployment?.subtext).toContain('2 failed');
                expect(deployment?.severity).toBe('warning');
            });
        });
    });

    describe('Support metrics', () => {
        it('returns support queue with average response time', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [],
                        growth: [],
                        deployment: [],
                        support: [
                            {
                                id: 'support-queue',
                                category: 'support',
                                agentId: 'mrs_parker',
                                title: 'Support Queue',
                                headline: '2 open tickets',
                                subtext: 'Avg response: 4h',
                                severity: 'info',
                                dataSource: 'inbox-threads',
                                lastUpdated: new Date(),
                            },
                        ],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const support = result.current.getAllInsights().find(
                    i => i.id === 'support-queue'
                );
                expect(support?.subtext).toContain('4h');
            });
        });
    });

    describe('Research queue metrics', () => {
        it('returns research queue with priority count', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [],
                        growth: [],
                        deployment: [],
                        support: [],
                        intelligence: [
                            {
                                id: 'research-queue',
                                category: 'intelligence',
                                agentId: 'big_worm',
                                title: 'Research Queue',
                                headline: '5 tasks pending',
                                subtext: '2 high priority',
                                severity: 'warning',
                                dataSource: 'research-queue',
                                lastUpdated: new Date(),
                            },
                        ],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const research = result.current.getAllInsights().find(
                    i => i.id === 'research-queue'
                );
                expect(research?.subtext).toContain('2 high priority');
                expect(research?.severity).toBe('warning');
            });
        });
    });

    describe('Graceful fallbacks', () => {
        it('shows placeholder when data source unavailable', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'super_user',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'super_user',
                    data: {
                        platform: [
                            {
                                id: 'system-health-placeholder',
                                category: 'platform',
                                agentId: 'leo',
                                title: 'System Health',
                                headline: '99.9% uptime',
                                severity: 'success',
                                dataSource: 'placeholder',
                                lastUpdated: new Date(),
                            },
                        ],
                        growth: [],
                        deployment: [],
                        support: [],
                        intelligence: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                const platform = result.current.getAllInsights().find(
                    i => i.id === 'system-health-placeholder'
                );
                expect(platform?.dataSource).toBe('placeholder');
            });
        });
    });

    describe('Role-based filtering', () => {
        it('returns empty insights for non-super_user roles', async () => {
            (useUserRole as jest.Mock).mockReturnValue({
                role: 'brand',
                isLoading: false,
            });

            mockGetInsights.mockResolvedValueOnce({
                success: true,
                data: {
                    role: 'brand',
                    data: {
                        performance: [],
                        campaign: [],
                        distribution: [],
                        content: [],
                        competitive: [],
                        lastFetched: new Date(),
                    },
                },
            });

            const { result } = renderHook(() => useInsights());

            await waitFor(() => {
                expect(result.current.insights?.role).toBe('brand');
            });
        });
    });
});
