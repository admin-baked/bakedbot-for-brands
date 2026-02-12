/**
 * Unit tests for metrics-collector.ts
 * Tests metric collection, historical retrieval, and cleanup
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// jest.mock calls are hoisted — use inline closures to avoid TDZ errors

let mockSnapshotDocs: any[] = [];

jest.mock('@/firebase/admin', () => {
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
    const mockDeleteBatch = jest.fn().mockResolvedValue(undefined);
    const mockBatch = jest.fn().mockReturnValue({
        delete: jest.fn(),
        commit: mockDeleteBatch,
    });

    const mockGet = jest.fn().mockImplementation(() => Promise.resolve({
        docs: mockSnapshotDocs,
        empty: mockSnapshotDocs.length === 0,
    }));

    const mockWhere = jest.fn().mockReturnThis();
    const mockOrderBy = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockReturnThis();

    const mockCollection = jest.fn().mockReturnValue({
        doc: mockDoc,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
    });

    return {
        getAdminFirestore: jest.fn().mockReturnValue({
            collection: mockCollection,
            batch: mockBatch,
        }),
        // Expose mocks for assertions
        __mocks: { mockSet, mockDoc, mockCollection, mockBatch, mockDeleteBatch, mockGet, mockWhere, mockOrderBy, mockLimit },
    };
});

jest.mock('firebase-admin/firestore', () => ({
    Timestamp: {
        fromDate: jest.fn((d: Date) => ({
            toDate: () => d,
            seconds: Math.floor(d.getTime() / 1000),
        })),
    },
}));

// Import after mocks
import {
    collectAndStoreMetrics,
    getHistoricalMetrics,
    cleanupOldMetrics,
} from '../metrics-collector';

// Get mock references
const { __mocks } = require('@/firebase/admin');
const { mockSet, mockDoc, mockCollection, mockBatch, mockDeleteBatch, mockWhere, mockOrderBy, mockLimit } = __mocks;

describe('Metrics Collector Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSnapshotDocs = [];
    });

    describe('collectAndStoreMetrics', () => {
        it('should store metrics to system_metrics collection', async () => {
            await collectAndStoreMetrics();

            expect(mockCollection).toHaveBeenCalledWith('system_metrics');
            expect(mockDoc).toHaveBeenCalled();
            expect(mockSet).toHaveBeenCalledTimes(1);
        });

        it('should store metrics with required fields', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData).toHaveProperty('memoryAllocatedMB', 2048);
            expect(storedData).toHaveProperty('memoryUsedMB');
            expect(storedData).toHaveProperty('memoryUsagePercent');
            expect(storedData).toHaveProperty('cpuCores', 1);
            expect(storedData).toHaveProperty('cpuUsagePercent');
            expect(storedData).toHaveProperty('instanceCount');
            expect(storedData).toHaveProperty('requestsPerSecond');
            expect(storedData).toHaveProperty('avgLatencyMs');
            expect(storedData).toHaveProperty('p95LatencyMs');
            expect(storedData).toHaveProperty('p99LatencyMs');
            expect(storedData).toHaveProperty('errorRate');
            expect(storedData).toHaveProperty('errorCount');
            expect(storedData).toHaveProperty('source', 'simulated');
            expect(storedData).toHaveProperty('timestamp');
            expect(storedData).toHaveProperty('collectedAt');
        });

        it('should generate memory usage between 40-70%', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.memoryUsagePercent).toBeGreaterThanOrEqual(40);
            expect(storedData.memoryUsagePercent).toBeLessThanOrEqual(70);
        });

        it('should generate CPU usage between 20-60%', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.cpuUsagePercent).toBeGreaterThanOrEqual(20);
            expect(storedData.cpuUsagePercent).toBeLessThanOrEqual(60);
        });

        it('should generate 1-3 instances', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.instanceCount).toBeGreaterThanOrEqual(1);
            expect(storedData.instanceCount).toBeLessThanOrEqual(3);
        });

        it('should generate p95 latency as 2x avg', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.p95LatencyMs).toBe(Math.round(storedData.avgLatencyMs * 2));
        });

        it('should generate p99 latency as 3x avg', async () => {
            await collectAndStoreMetrics();

            const storedData = mockSet.mock.calls[0][0];
            expect(storedData.p99LatencyMs).toBe(Math.round(storedData.avgLatencyMs * 3));
        });
    });

    describe('getHistoricalMetrics', () => {
        it('should query system_metrics collection with timestamp filter', async () => {
            await getHistoricalMetrics(24);

            expect(mockCollection).toHaveBeenCalledWith('system_metrics');
            expect(mockWhere).toHaveBeenCalledWith('timestamp', '>=', expect.anything());
            expect(mockOrderBy).toHaveBeenCalledWith('timestamp', 'asc');
        });

        it('should return empty array when no metrics exist', async () => {
            mockSnapshotDocs = [];
            const results = await getHistoricalMetrics(24);
            expect(results).toEqual([]);
        });

        it('should return formatted metrics from Firestore docs', async () => {
            const now = new Date();
            mockSnapshotDocs = [
                {
                    data: () => ({
                        timestamp: { toDate: () => now },
                        memoryUsagePercent: 55,
                        cpuUsagePercent: 35,
                        requestsPerSecond: 12,
                        errorRate: 0.5,
                    }),
                },
            ];

            const results = await getHistoricalMetrics(24);

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                timestamp: now,
                memoryUsagePercent: 55,
                cpuUsagePercent: 35,
                requestsPerSecond: 12,
                errorRate: 0.5,
            });
        });

        it('should default missing fields to 0', async () => {
            mockSnapshotDocs = [
                {
                    data: () => ({
                        timestamp: { toDate: () => new Date() },
                    }),
                },
            ];

            const results = await getHistoricalMetrics(24);

            expect(results[0].memoryUsagePercent).toBe(0);
            expect(results[0].cpuUsagePercent).toBe(0);
            expect(results[0].requestsPerSecond).toBe(0);
            expect(results[0].errorRate).toBe(0);
        });
    });

    describe('cleanupOldMetrics', () => {
        it('should query for metrics older than 7 days', async () => {
            mockSnapshotDocs = [];
            await cleanupOldMetrics();

            expect(mockCollection).toHaveBeenCalledWith('system_metrics');
            expect(mockWhere).toHaveBeenCalledWith('timestamp', '<', expect.anything());
            expect(mockLimit).toHaveBeenCalledWith(500);
        });

        it('should not delete when no old metrics exist', async () => {
            mockSnapshotDocs = [];
            await cleanupOldMetrics();

            expect(mockBatch).not.toHaveBeenCalled();
        });

        it('should batch delete old metrics', async () => {
            mockSnapshotDocs = [
                { ref: { id: 'old-metric-1' } },
                { ref: { id: 'old-metric-2' } },
            ];

            await cleanupOldMetrics();

            expect(mockBatch).toHaveBeenCalled();
            expect(mockDeleteBatch).toHaveBeenCalled();
        });
    });
});
