import { GET } from '../route';
import { getAdminFirestore } from '@/firebase/admin';

// Mock Firebase
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

describe('GET /api/system/health', () => {
    let mockExecutionsSnapshot: any;
    let mockErrorsSnapshot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockExecutionsSnapshot = {
            empty: false,
            size: 5,
            docs: [
                {
                    data: () => ({
                        executionId: 'hb_test',
                        completedAt: { toDate: () => new Date() },
                        overallStatus: 'all_clear',
                        checksRun: 5,
                        notificationsSent: 0,
                    }),
                },
            ],
        };

        mockErrorsSnapshot = {
            size: 0,
            docs: [],
        };
    });

    function setupMockDb(executionsSnapshot: any = mockExecutionsSnapshot, errorsSnapshot: any = mockErrorsSnapshot) {
        const heartbeatQuery = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(executionsSnapshot),
        };

        const systemLogsQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(errorsSnapshot),
        };

        const mockDb = {
            collection: jest.fn((name: string) => {
                if (name === 'heartbeat_executions') return heartbeatQuery;
                if (name === 'system_logs') return systemLogsQuery;
                return { get: jest.fn().mockResolvedValue({ exists: false }) };
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
        return { mockDb, heartbeatQuery, systemLogsQuery };
    }

    describe('Pulse status determination', () => {
        it('returns alive pulse with 0 errors', async () => {
            setupMockDb();

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('alive');
            expect(data.healthy).toBe(true);
            expect(data.uptime).toBe('99.9%');
        });

        it('returns warning pulse with 5-9 errors', async () => {
            setupMockDb(mockExecutionsSnapshot, {
                size: 7,
                docs: Array(7).fill({ data: () => ({ level: 'error' }) }),
            });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('warning');
            expect(data.healthy).toBe(false);
            expect(data.errors).toBe(7);
            expect(data.uptime).toBe('99.5%');
        });

        it('returns error pulse with 10+ errors', async () => {
            setupMockDb(mockExecutionsSnapshot, {
                size: 15,
                docs: Array(15).fill({ data: () => ({ level: 'error' }) }),
            });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('error');
            expect(data.healthy).toBe(false);
            expect(data.errors).toBe(15);
            expect(data.uptime).toBe('98.0%');
        });

        it('returns unknown pulse when heartbeat not initialized', async () => {
            setupMockDb(
                { empty: true, size: 0, docs: [] },
                { size: 0, docs: [] }
            );

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('unknown');
        });

        it('returns warning when heartbeat is stale (15+ min)', async () => {
            const staleTime = new Date(Date.now() - 16 * 60 * 1000);
            setupMockDb(
                {
                    empty: false,
                    size: 1,
                    docs: [
                        {
                            data: () => ({
                                executionId: 'hb_stale',
                                completedAt: { toDate: () => staleTime },
                                overallStatus: 'all_clear',
                            }),
                        },
                    ],
                },
                { size: 0, docs: [] }
            );

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('warning');
        });
    });

    describe('Uptime calculation', () => {
        it('calculates 99.9% uptime for 0-4 errors', async () => {
            setupMockDb(mockExecutionsSnapshot, {
                size: 2,
                docs: Array(2).fill({ data: () => ({}) }),
            });

            const response = await GET();
            const data = await response.json();

            expect(data.uptime).toBe('99.9%');
        });

        it('calculates 99.5% uptime for 5-19 errors', async () => {
            setupMockDb(mockExecutionsSnapshot, {
                size: 10,
                docs: Array(10).fill({ data: () => ({}) }),
            });

            const response = await GET();
            const data = await response.json();

            expect(data.uptime).toBe('99.5%');
        });

        it('calculates 98.0% uptime for 20+ errors', async () => {
            setupMockDb(mockExecutionsSnapshot, {
                size: 25,
                docs: Array(25).fill({ data: () => ({}) }),
            });

            const response = await GET();
            const data = await response.json();

            expect(data.uptime).toBe('98.0%');
        });
    });

    describe('Response structure', () => {
        it('returns complete health data', async () => {
            setupMockDb();

            const response = await GET();
            const data = await response.json();

            expect(data).toHaveProperty('pulse');
            expect(data).toHaveProperty('timestamp');
            expect(data).toHaveProperty('nextExpected');
            expect(data).toHaveProperty('status');
            expect(data).toHaveProperty('schedulesProcessed');
            expect(data).toHaveProperty('schedulesExecuted');
            expect(data).toHaveProperty('browserTasksProcessed');
            expect(data).toHaveProperty('browserTasksExecuted');
            expect(data).toHaveProperty('errors');
            expect(data).toHaveProperty('uptime');
            expect(data).toHaveProperty('healthy');
        });

        it('includes timestamp in ISO format', async () => {
            const testTime = new Date('2026-02-15T10:00:00Z');
            setupMockDb({
                empty: false,
                size: 1,
                docs: [
                    {
                        data: () => ({
                            completedAt: { toDate: () => testTime },
                            overallStatus: 'all_clear',
                        }),
                    },
                ],
            });

            const response = await GET();
            const data = await response.json();

            expect(data.timestamp).toBe(testTime.toISOString());
        });
    });

    describe('Error handling', () => {
        it('returns error response on exception', async () => {
            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Firebase error');
            });

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.pulse).toBe('error');
            expect(data.message).toContain('Firebase error');
            expect(data.healthy).toBe(false);
        });

        it('continues with errorCount=0 if system_logs unavailable', async () => {
            const { systemLogsQuery } = setupMockDb();
            systemLogsQuery.get.mockRejectedValueOnce(new Error('Collection not found'));

            const response = await GET();
            const data = await response.json();

            // Should fall back to heartbeat status
            expect(data.pulse).toBe('alive');
            expect(data.errors).toBe(0);
        });

        it('defaults to unknown when heartbeat not initialized and no errors', async () => {
            setupMockDb(
                { empty: true, size: 0, docs: [] },
                { size: 0, docs: [] }
            );

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('unknown');
        });
    });

    describe('System logs integration', () => {
        it('queries system_logs and heartbeat_executions with correct filters', async () => {
            const { mockDb } = setupMockDb();

            await GET();

            // Verify collection calls
            expect(mockDb.collection).toHaveBeenCalledWith('heartbeat_executions');
            expect(mockDb.collection).toHaveBeenCalledWith('system_logs');
        });

        it('queries heartbeat_executions for last 15 minutes', async () => {
            const beforeCall = Date.now();
            let capturedWhereArgs: any[] = [];

            const heartbeatQuery = {
                where: jest.fn((...args) => {
                    if (args[0] === 'completedAt') {
                        capturedWhereArgs = args;
                    }
                    return heartbeatQuery;
                }),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue(mockExecutionsSnapshot),
            };

            const systemLogsQuery = {
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ size: 0, docs: [] }),
            };

            const mockDb = {
                collection: jest.fn((name: string) => {
                    if (name === 'heartbeat_executions') return heartbeatQuery;
                    if (name === 'system_logs') return systemLogsQuery;
                    return { get: jest.fn().mockResolvedValue({ exists: false }) };
                }),
            };

            (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

            await GET();

            // Should have called where with completedAt filter
            expect(capturedWhereArgs[0]).toBe('completedAt');
            expect(capturedWhereArgs[1]).toBe('>=');
            const dateArg = capturedWhereArgs[2];

            // Should be approximately 15 minutes ago
            const diffMs = beforeCall - dateArg.getTime();
            expect(diffMs).toBeGreaterThan(14 * 60 * 1000);
            expect(diffMs).toBeLessThan(16 * 60 * 1000);
        });
    });
});
