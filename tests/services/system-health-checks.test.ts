/**
 * System Health Checks Service Tests
 *
 * Tests for periodic system diagnostics and health monitoring
 */

import { SystemHealthChecksService } from '@/server/services/system-health-checks';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

describe('SystemHealthChecksService', () => {
    let service: SystemHealthChecksService;
    let mockDb: any;
    let mockCollection: any;
    let mockQuery: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Firestore
        mockQuery = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn(),
            onSnapshot: jest.fn(),
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue({
                get: jest.fn(),
                set: jest.fn(),
                update: jest.fn(),
                add: jest.fn(),
            }),
            add: jest.fn(),
            where: jest.fn().mockReturnValue(mockQuery),
            orderBy: jest.fn().mockReturnValue(mockQuery),
            count: jest.fn().mockReturnValue(mockQuery),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue(mockDb);

        service = new SystemHealthChecksService();
    });

    describe('executeCheck', () => {
        it('should execute system_stats check', async () => {
            mockQuery.get.mockResolvedValue({
                data: () => ({ count: 5 }),
            });

            const result = await service.executeCheck('system_stats');

            expect(result.checkType).toBe('system_stats');
            expect(result.status).toBe('healthy');
            expect(result.message).toContain('System healthy');
        });

        it('should execute heartbeat_diagnose check', async () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            mockQuery.get.mockResolvedValue({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            status: 'completed',
                            startedAt: fiveMinutesAgo,
                        }),
                    },
                ],
            });

            const result = await service.executeCheck('heartbeat_diagnose');

            expect(result.checkType).toBe('heartbeat_diagnose');
            expect(result.status).toBe('healthy');
            expect(result.message).toContain('Heartbeat healthy');
        });

        it('should return warning when heartbeat is stale', async () => {
            const now = new Date();
            const fortyMinutesAgo = new Date(now.getTime() - 40 * 60 * 1000);

            mockQuery.get.mockResolvedValue({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            status: 'completed',
                            startedAt: fortyMinutesAgo,
                        }),
                    },
                ],
            });

            const result = await service.executeCheck('heartbeat_diagnose');

            expect(result.status).toBe('warning');
            expect(result.message).toContain("hasn't run in");
        });

        it('should return error when heartbeat last run failed', async () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            mockQuery.get.mockResolvedValue({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            status: 'failed',
                            startedAt: fiveMinutesAgo,
                        }),
                    },
                ],
            });

            const result = await service.executeCheck('heartbeat_diagnose');

            expect(result.status).toBe('error');
            expect(result.message).toContain('failed');
        });

        it('should execute platform_analytics check', async () => {
            mockQuery.get.mockResolvedValue({
                empty: false,
            });

            const result = await service.executeCheck('platform_analytics');

            expect(result.checkType).toBe('platform_analytics');
            expect(result.status).toBe('healthy');
            expect(result.message).toContain('healthy');
        });

        it('should execute database_latency check', async () => {
            mockQuery.get.mockResolvedValue({});

            const result = await service.executeCheck('database_latency');

            expect(result.checkType).toBe('database_latency');
            expect(['healthy', 'warning', 'error']).toContain(result.status);
            expect(result.message).toContain('Database latency');
            expect(result.details?.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should handle unknown check type', async () => {
            const result = await service.executeCheck('unknown_check' as any);

            expect(result.status).toBe('error');
            expect(result.message).toContain('Unknown check type');
        });

        it('should handle check execution errors', async () => {
            mockQuery.get.mockRejectedValue(new Error('Firestore error'));

            const result = await service.executeCheck('system_stats');

            expect(result.status).toBe('error');
            expect(result.message).toContain('Firestore error');
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe('logHealthCheckRun', () => {
        it('should log health check run to Firestore', async () => {
            const docRef = { id: 'run123' };
            mockCollection.add.mockResolvedValue(docRef);

            const run = {
                runId: 'run123',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'completed' as const,
                results: [
                    {
                        checkId: 'check1',
                        checkType: 'system_stats' as const,
                        status: 'healthy' as const,
                        message: 'System healthy',
                        timestamp: new Date(),
                    },
                ],
                durationMs: 1000,
            };

            const docId = await service.logHealthCheckRun(run);

            expect(docId).toBe('run123');
            expect(mockCollection.add).toHaveBeenCalled();

            const call = mockCollection.add.mock.calls[0][0];
            expect(call.runId).toBe('run123');
            expect(call.status).toBe('completed');
            expect(call.results).toHaveLength(1);
        });

        it('should include createdAt timestamp', async () => {
            const docRef = { id: 'run123' };
            mockCollection.add.mockResolvedValue(docRef);

            const run = {
                runId: 'run123',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'completed' as const,
                results: [],
                durationMs: 1000,
            };

            await service.logHealthCheckRun(run);

            const call = mockCollection.add.mock.calls[0][0];
            expect(call.createdAt).toBeDefined();
        });

        it('should handle logging errors', async () => {
            mockCollection.add.mockRejectedValue(new Error('Firestore error'));

            const run = {
                runId: 'run123',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'completed' as const,
                results: [],
                durationMs: 1000,
            };

            await expect(service.logHealthCheckRun(run)).rejects.toThrow('Firestore error');
        });
    });

    describe('getRecentRuns', () => {
        it('should retrieve recent health check runs', async () => {
            const mockDocs = [
                {
                    id: 'run1',
                    data: () => ({
                        runId: 'run1',
                        startedAt: new Date(),
                        completedAt: new Date(),
                        status: 'completed',
                        results: [],
                        durationMs: 1000,
                    }),
                },
                {
                    id: 'run2',
                    data: () => ({
                        runId: 'run2',
                        startedAt: new Date(),
                        completedAt: new Date(),
                        status: 'completed',
                        results: [],
                        durationMs: 1200,
                    }),
                },
            ];

            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            const runs = await service.getRecentRuns(20);

            expect(runs).toHaveLength(2);
            expect(runs[0].runId).toBe('run1');
            expect(mockQuery.limit).toHaveBeenCalledWith(20);
        });

        it('should use default limit of 20', async () => {
            mockQuery.get.mockResolvedValue({ docs: [] });

            await service.getRecentRuns();

            expect(mockQuery.limit).toHaveBeenCalledWith(20);
        });

        it('should handle errors gracefully', async () => {
            mockQuery.get.mockRejectedValue(new Error('Firestore error'));

            const runs = await service.getRecentRuns();

            expect(runs).toEqual([]);
        });
    });

    describe('getHealthStats', () => {
        it('should calculate health statistics', async () => {
            const mockDocs = [
                {
                    id: 'run1',
                    data: () => ({
                        status: 'completed',
                        durationMs: 1000,
                        results: [
                            {
                                checkType: 'system_stats',
                                status: 'healthy',
                            },
                            {
                                checkType: 'heartbeat_diagnose',
                                status: 'healthy',
                            },
                        ],
                    }),
                },
                {
                    id: 'run2',
                    data: () => ({
                        status: 'completed',
                        durationMs: 1200,
                        results: [
                            {
                                checkType: 'system_stats',
                                status: 'healthy',
                            },
                        ],
                    }),
                },
                {
                    id: 'run3',
                    data: () => ({
                        status: 'failed',
                        durationMs: 800,
                        results: [],
                    }),
                },
            ];

            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            const stats = await service.getHealthStats(7);

            expect(stats.totalRuns).toBe(3);
            expect(stats.successfulRuns).toBe(2);
            expect(stats.failedRuns).toBe(1);
            expect(stats.successRate).toBeCloseTo(66.67, 1);
            expect(stats.averageDurationMs).toBe(1000);
            expect(stats.checkBreakdown['system_stats']).toBe(3);
            expect(stats.checkBreakdown['heartbeat_diagnose']).toBe(1);
        });

        it('should handle empty results', async () => {
            mockQuery.get.mockResolvedValue({ docs: [] });

            const stats = await service.getHealthStats(7);

            expect(stats.totalRuns).toBe(0);
            expect(stats.successfulRuns).toBe(0);
            expect(stats.failedRuns).toBe(0);
            expect(stats.successRate).toBe(0);
            expect(stats.averageDurationMs).toBe(0);
            expect(stats.checkBreakdown).toEqual({});
        });

        it('should handle errors gracefully', async () => {
            mockQuery.get.mockRejectedValue(new Error('Firestore error'));

            const stats = await service.getHealthStats(7);

            expect(stats.totalRuns).toBe(0);
            expect(stats.successRate).toBe(0);
        });
    });

    describe('check latency thresholds', () => {
        it('should return healthy status for latency < 200ms', async () => {
            mockQuery.get.mockResolvedValue({});

            // Mock Date.now to control timing
            const originalNow = Date.now;
            let callCount = 0;
            jest.spyOn(global.Date, 'now').mockImplementation(() => {
                callCount++;
                if (callCount === 1) return originalNow(); // queryStart
                return originalNow() + 150; // 150ms latency
            });

            const result = await service.executeCheck('database_latency');

            expect(result.status).toBe('healthy');

            (global.Date.now as jest.Mock).mockRestore();
        });

        it('should return warning status for latency 200-500ms', async () => {
            mockQuery.get.mockResolvedValue({});

            const originalNow = Date.now;
            let callCount = 0;
            jest.spyOn(global.Date, 'now').mockImplementation(() => {
                callCount++;
                if (callCount === 1) return originalNow();
                return originalNow() + 350; // 350ms latency
            });

            const result = await service.executeCheck('database_latency');

            expect(result.status).toBe('warning');

            (global.Date.now as jest.Mock).mockRestore();
        });

        it('should return error status for latency > 500ms', async () => {
            mockQuery.get.mockResolvedValue({});

            const originalNow = Date.now;
            let callCount = 0;
            jest.spyOn(global.Date, 'now').mockImplementation(() => {
                callCount++;
                if (callCount === 1) return originalNow();
                return originalNow() + 600; // 600ms latency
            });

            const result = await service.executeCheck('database_latency');

            expect(result.status).toBe('error');

            (global.Date.now as jest.Mock).mockRestore();
        });
    });
});
