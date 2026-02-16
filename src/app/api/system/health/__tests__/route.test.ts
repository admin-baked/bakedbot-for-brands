import { GET } from '../route';
import { getAdminFirestore } from '@/firebase/admin';

// Mock Firebase
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

describe('GET /api/system/health', () => {
    let mockDb: any;
    let mockHeartbeatDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockHeartbeatDoc = {
            exists: true,
            data: () => ({
                status: 'ok',
                timestamp: { toDate: () => new Date() },
                nextPulseExpected: { toDate: () => new Date(Date.now() + 60000) },
                schedulesProcessed: 5,
                schedulesExecuted: 5,
                browserTasksProcessed: 2,
                browserTasksExecuted: 2,
                errors: [],
            }),
        };

        mockDb = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockHeartbeatDoc),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    describe('Pulse status determination', () => {
        it('returns alive pulse with 0 errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] }); // No errors

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('alive');
            expect(data.healthy).toBe(true);
            expect(data.uptime).toBe('99.9%');
        });

        it('returns warning pulse with 5-9 errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({
                    size: 7,
                    docs: Array(7).fill({
                        data: () => ({ level: 'error' }),
                    }),
                });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('warning');
            expect(data.healthy).toBe(false);
            expect(data.errors).toBe(7);
            expect(data.uptime).toBe('99.5%');
        });

        it('returns error pulse with 10+ errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({
                    size: 15,
                    docs: Array(15).fill({
                        data: () => ({ level: 'error' }),
                    }),
                });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('error');
            expect(data.healthy).toBe(false);
            expect(data.errors).toBe(15);
            expect(data.uptime).toBe('98.0%');
        });

        it('returns unknown pulse when heartbeat not initialized', async () => {
            mockHeartbeatDoc.exists = false;
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('unknown');
        });

        it('returns warning when heartbeat is stale (15+ min)', async () => {
            const staleTime = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
            mockHeartbeatDoc.data = () => ({
                status: 'ok',
                timestamp: { toDate: () => staleTime },
                schedulesProcessed: 5,
                schedulesExecuted: 5,
            });

            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('warning');
        });
    });

    describe('Uptime calculation', () => {
        it('calculates 99.9% uptime for 0-4 errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({
                    size: 2,
                    docs: Array(2).fill({ data: () => ({}) }),
                });

            const response = await GET();
            const data = await response.json();

            expect(data.uptime).toBe('99.9%');
        });

        it('calculates 99.5% uptime for 5-19 errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({
                    size: 10,
                    docs: Array(10).fill({ data: () => ({}) }),
                });

            const response = await GET();
            const data = await response.json();

            expect(data.uptime).toBe('99.5%');
        });

        it('calculates 98.0% uptime for 20+ errors', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({
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
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

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
            mockHeartbeatDoc.data = () => ({
                timestamp: { toDate: () => testTime },
            });

            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

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
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockRejectedValueOnce(new Error('Collection not found'));

            const response = await GET();
            const data = await response.json();

            // Should fall back to heartbeat status
            expect(data.pulse).toBe('alive');
            expect(data.errors).toBe(0);
        });

        it('defaults to unknown when heartbeat doc missing and no errors', async () => {
            mockHeartbeatDoc.exists = false;
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

            const response = await GET();
            const data = await response.json();

            expect(data.pulse).toBe('unknown');
        });
    });

    describe('System logs integration', () => {
        it('queries system_logs with correct filters', async () => {
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

            await GET();

            // Verify collection calls
            expect(mockDb.collection).toHaveBeenCalledWith('system');
            expect(mockDb.collection).toHaveBeenCalledWith('system_logs');

            // Verify where clauses for system_logs
            expect(mockDb.where).toHaveBeenCalledWith('level', '==', 'error');
            expect(mockDb.where).toHaveBeenCalledWith(
                'timestamp',
                '>=',
                expect.any(Date)
            );

            expect(mockDb.limit).toHaveBeenCalledWith(100);
        });

        it('limits errors query to last 24 hours', async () => {
            const beforeCall = Date.now();
            mockDb.get = jest.fn()
                .mockResolvedValueOnce(mockHeartbeatDoc)
                .mockResolvedValueOnce({ size: 0, docs: [] });

            await GET();

            const afterCall = Date.now();
            const whereCall = mockDb.where.mock.calls.find(
                (call: any) => call[0] === 'timestamp'
            );
            const dateArg = whereCall[2];

            // Should be approximately 24 hours ago
            const diffMs = beforeCall - dateArg.getTime();
            expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
            expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000);
        });
    });
});
