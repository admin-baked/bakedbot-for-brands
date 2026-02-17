/**
 * Audit Log Streaming API Endpoint Tests
 *
 * Tests for real-time audit log SSE endpoint
 */

import { GET } from '@/app/api/ceo/audit-logs/stream/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/server/auth/auth');
jest.mock('@/server/services/audit-log-streaming');

describe('GET /api/ceo/audit-logs/stream', () => {
    let mockRequest: Partial<NextRequest>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRequest = {
            headers: new Map([['authorization', 'Bearer test-token']]),
            url: 'http://localhost:3000/api/ceo/audit-logs/stream?limit=50&filter=action:user_approved',
        } as any;
    });

    it('should return 401 when not authenticated', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        requireSuperUser.mockResolvedValue(null);

        const response = await GET(mockRequest as NextRequest);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('should return SSE stream on success', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        const mockUser = { uid: 'user123', email: 'leo@bakedbot.ai' };
        requireSuperUser.mockResolvedValue(mockUser);

        const mockUnsubscribe = jest.fn();
        auditLogStreaming.streamAuditLogs.mockReturnValue(mockUnsubscribe);

        const response = await GET(mockRequest as NextRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(response.headers.get('Cache-Control')).toBe('no-cache');
        expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should parse limit query parameter', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        mockRequest.url = 'http://localhost:3000/api/ceo/audit-logs/stream?limit=100';

        await GET(mockRequest as NextRequest);

        const call = auditLogStreaming.streamAuditLogs.mock.calls[0];
        expect(call[1].limit).toBe(100);
    });

    it('should parse filter query parameter', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        mockRequest.url = 'http://localhost:3000/api/ceo/audit-logs/stream?filter=action:user_approved,status:success';

        await GET(mockRequest as NextRequest);

        const call = auditLogStreaming.streamAuditLogs.mock.calls[0];
        expect(call[1].filter.action).toContain('user_approved');
        expect(call[1].filter.status).toBe('success');
    });

    it('should support multiple actions in filter', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        mockRequest.url = 'http://localhost:3000/api/ceo/audit-logs/stream?filter=action:user_approved|user_rejected';

        await GET(mockRequest as NextRequest);

        const call = auditLogStreaming.streamAuditLogs.mock.calls[0];
        expect(Array.isArray(call[1].filter.action)).toBe(true);
        expect(call[1].filter.action).toContain('user_approved');
        expect(call[1].filter.action).toContain('user_rejected');
    });

    it('should use default values when params not provided', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        mockRequest.url = 'http://localhost:3000/api/ceo/audit-logs/stream';

        await GET(mockRequest as NextRequest);

        const call = auditLogStreaming.streamAuditLogs.mock.calls[0];
        expect(call[1].limit).toBe(50); // default
        expect(call[1].filter).toEqual({}); // empty filter
    });

    it('should include correct SSE headers', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        const response = await GET(mockRequest as NextRequest);

        expect(response.headers.get('X-Accel-Buffering')).toBe('no'); // Disable proxy buffering
    });

    it('should handle streaming setup errors gracefully', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        requireSuperUser.mockRejectedValue(new Error('Auth error'));

        const response = await GET(mockRequest as NextRequest);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Failed to start stream');
    });

    it('should call streamAuditLogs with correct options', async () => {
        const { requireSuperUser } = require('@/server/auth/auth');
        const { auditLogStreaming } = require('@/server/services/audit-log-streaming');

        requireSuperUser.mockResolvedValue({ uid: 'user123', email: 'test@bakedbot.ai' });
        auditLogStreaming.streamAuditLogs.mockReturnValue(jest.fn());

        mockRequest.url = 'http://localhost:3000/api/ceo/audit-logs/stream?limit=75&filter=actor:leo@bakedbot.ai';

        await GET(mockRequest as NextRequest);

        const call = auditLogStreaming.streamAuditLogs.mock.calls[0];
        expect(call[1]).toEqual({
            limit: 75,
            filter: { actor: 'leo@bakedbot.ai' },
            returnHistorical: true,
        });
    });
});
