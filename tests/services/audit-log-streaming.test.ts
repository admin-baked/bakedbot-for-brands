/**
 * Audit Log Streaming Service Tests
 *
 * Tests for real-time Firestore audit log streaming and queries
 */

import { AuditLogStreamingService } from '@/server/services/audit-log-streaming';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

describe('AuditLogStreamingService', () => {
    let service: AuditLogStreamingService;
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
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn(),
            }),
        };

        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue(mockDb);

        service = new AuditLogStreamingService();
    });

    describe('logAction', () => {
        it('should log a single action', async () => {
            const docRef = { id: 'log123' };
            mockCollection.add.mockResolvedValue(docRef);

            const result = await service.logAction(
                'user_approved',
                'leo@bakedbot.ai',
                'user_123',
                'user'
            );

            expect(result).toBe('log123');
            expect(mockCollection.add).toHaveBeenCalled();

            const call = mockCollection.add.mock.calls[0][0];
            expect(call.action).toBe('user_approved');
            expect(call.actor).toBe('leo@bakedbot.ai');
            expect(call.resource).toBe('user_123');
            expect(call.resourceType).toBe('user');
            expect(call.status).toBe('success');
            expect(call.timestamp).toBeDefined();
        });

        it('should accept details parameter', async () => {
            const docRef = { id: 'log123' };
            mockCollection.add.mockResolvedValue(docRef);

            await service.logAction(
                'campaign_scheduled',
                'glenda@bakedbot.ai',
                'campaign_456',
                'campaign',
                'success',
                { segmentCount: 100, sendTime: '2026-02-17T10:00:00Z' }
            );

            const call = mockCollection.add.mock.calls[0][0];
            expect(call.details).toEqual({
                segmentCount: 100,
                sendTime: '2026-02-17T10:00:00Z',
            });
        });

        it('should handle failed status', async () => {
            const docRef = { id: 'log123' };
            mockCollection.add.mockResolvedValue(docRef);

            await service.logAction(
                'user_approve_failed',
                'leo@bakedbot.ai',
                'user_999',
                'user',
                'failed',
                { error: 'User not found' }
            );

            const call = mockCollection.add.mock.calls[0][0];
            expect(call.status).toBe('failed');
        });

        it('should handle errors', async () => {
            mockCollection.add.mockRejectedValue(new Error('Firestore error'));

            await expect(
                service.logAction('test', 'actor', 'resource', 'type')
            ).rejects.toThrow('Firestore error');
        });
    });

    describe('logActionBatch', () => {
        it('should batch log multiple actions', async () => {
            const mockBatch = {
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            };
            mockDb.batch.mockReturnValue(mockBatch);
            mockCollection.doc.mockReturnValue({ id: 'generated' });

            const actions = [
                { action: 'action1', actor: 'leo', resource: 'res1', resourceType: 'type1' },
                { action: 'action2', actor: 'jack', resource: 'res2', resourceType: 'type2' },
            ];

            const result = await service.logActionBatch(actions);

            expect(result).toHaveLength(2);
            expect(mockBatch.set).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });

    describe('queryAuditLogs', () => {
        it('should query logs with no filter', async () => {
            const mockDocs = [
                { id: 'log1', data: () => ({ action: 'test', timestamp: new Date() }) },
            ];
            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            const result = await service.queryAuditLogs({}, 100);

            expect(result).toHaveLength(1);
            expect(mockQuery.limit).toHaveBeenCalledWith(100);
        });

        it('should filter by actor', async () => {
            const mockDocs = [];
            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            await service.queryAuditLogs({ actor: 'leo@bakedbot.ai' }, 50);

            expect(mockQuery.where).toHaveBeenCalledWith('actor', '==', 'leo@bakedbot.ai');
        });

        it('should filter by status', async () => {
            const mockDocs = [];
            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            await service.queryAuditLogs({ status: 'failed' }, 50);

            expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'failed');
        });

        it('should apply default limit', async () => {
            const mockDocs = [];
            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            await service.queryAuditLogs({});

            expect(mockQuery.limit).toHaveBeenCalledWith(100);
        });
    });

    describe('getAuditStats', () => {
        it('should calculate statistics', async () => {
            const mockDocs = [
                {
                    id: 'log1',
                    data: () => ({
                        action: 'user_approved',
                        actor: 'leo@bakedbot.ai',
                        status: 'success',
                        timestamp: new Date(),
                    }),
                },
                {
                    id: 'log2',
                    data: () => ({
                        action: 'user_rejected',
                        actor: 'leo@bakedbot.ai',
                        status: 'success',
                        timestamp: new Date(),
                    }),
                },
                {
                    id: 'log3',
                    data: () => ({
                        action: 'user_approved',
                        actor: 'jack@bakedbot.ai',
                        status: 'failed',
                        timestamp: new Date(),
                    }),
                },
            ];

            mockQuery.get.mockResolvedValue({ docs: mockDocs });

            const stats = await service.getAuditStats(7);

            expect(stats.totalActions).toBe(3);
            expect(stats.actionBreakdown['user_approved']).toBe(2);
            expect(stats.actionBreakdown['user_rejected']).toBe(1);
            expect(stats.actorBreakdown['leo@bakedbot.ai']).toBe(2);
            expect(stats.actorBreakdown['jack@bakedbot.ai']).toBe(1);
            expect(stats.successRate).toBeCloseTo(66.67, 1); // 2 success / 3 total
        });

        it('should handle empty results', async () => {
            mockQuery.get.mockResolvedValue({ docs: [] });

            const stats = await service.getAuditStats(7);

            expect(stats.totalActions).toBe(0);
            expect(stats.successRate).toBe(0);
        });
    });

    describe('streamAuditLogs', () => {
        it('should call callbacks with data', async () => {
            const onData = jest.fn();
            const onError = jest.fn();
            const unsubscribeMock = jest.fn();

            mockQuery.get.mockResolvedValue({ docs: [] });
            mockQuery.onSnapshot.mockReturnValue(unsubscribeMock);

            const unsubscribe = service.streamAuditLogs(
                { onData, onError },
                { limit: 50, returnHistorical: true }
            );

            expect(mockQuery.onSnapshot).toHaveBeenCalled();
            expect(typeof unsubscribe).toBe('function');

            unsubscribe();
            expect(unsubscribeMock).toHaveBeenCalled();
        });

        it('should filter by action', async () => {
            const onData = jest.fn();
            const unsubscribeMock = jest.fn();

            mockQuery.get.mockResolvedValue({ docs: [] });
            mockQuery.onSnapshot.mockReturnValue(unsubscribeMock);

            service.streamAuditLogs(
                { onData },
                { filter: { action: 'user_approved' } }
            );

            expect(mockQuery.onSnapshot).toHaveBeenCalled();
        });

        it('should support multiple actions in filter', async () => {
            const onData = jest.fn();
            const unsubscribeMock = jest.fn();

            mockQuery.get.mockResolvedValue({ docs: [] });
            mockQuery.onSnapshot.mockReturnValue(unsubscribeMock);

            service.streamAuditLogs(
                { onData },
                { filter: { action: ['user_approved', 'user_rejected'] } }
            );

            expect(mockQuery.onSnapshot).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return stream statistics', () => {
            const stats = service.getStats();

            expect(stats).toHaveProperty('activeStreams');
            expect(stats).toHaveProperty('totalStreamsCreated');
            expect(typeof stats.activeStreams).toBe('number');
            expect(typeof stats.totalStreamsCreated).toBe('number');
        });
    });

    describe('stopAllStreams', () => {
        it('should unsubscribe all streams', async () => {
            const unsubscribeMock = jest.fn();

            mockQuery.get.mockResolvedValue({ docs: [] });
            mockQuery.onSnapshot.mockReturnValue(unsubscribeMock);

            // Create a couple of streams
            service.streamAuditLogs({ onData: jest.fn() }, {});
            service.streamAuditLogs({ onData: jest.fn() }, {});

            service.stopAllStreams();

            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });
});
