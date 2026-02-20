/**
 * Tests for Campaign Sender Cron Route
 *
 * Critical Fix Test Coverage:
 * - CRON_SECRET validation (missing secret → 500)
 * - Authorization header validation (missing/invalid → 401)
 * - Successful authentication → proceeds to campaign processing
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { executeCampaign } from '@/server/services/campaign-sender';
import { sendAgentNotification } from '@/server/services/agent-notifier';
import { getWarmupStatus, recordWarmupSend } from '@/server/services/email-warmup';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/campaign-sender', () => ({
    executeCampaign: jest.fn(),
}));

jest.mock('@/server/services/agent-notifier', () => ({
    sendAgentNotification: jest.fn(),
}));

jest.mock('@/server/services/email-warmup', () => ({
    getWarmupStatus: jest.fn(),
    recordWarmupSend: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('GET /api/cron/campaign-sender', () => {
    let mockDb: any;
    let mockCampaignsQuery: any;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset process.env to a fresh copy
        process.env = { ...originalEnv };

        // Setup mock Firestore
        mockCampaignsQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };

        mockDb = {
            collection: jest.fn((name: string) => {
                if (name === 'campaigns') return mockCampaignsQuery;
                return { get: jest.fn() };
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    afterEach(() => {
        // Restore original env
        process.env = originalEnv;
    });

    // =========================================================================
    // CRON_SECRET VALIDATION (Critical Fix)
    // =========================================================================

    describe('CRON_SECRET validation', () => {
        it('returns 500 when CRON_SECRET is undefined', async () => {
            delete process.env.CRON_SECRET;

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Server misconfiguration');
        });

        it('returns 500 when CRON_SECRET is empty string', async () => {
            process.env.CRON_SECRET = '';

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Server misconfiguration');
        });
    });

    // =========================================================================
    // AUTHORIZATION HEADER VALIDATION (Critical Fix)
    // =========================================================================

    describe('Authorization header validation', () => {
        beforeEach(() => {
            process.env.CRON_SECRET = 'test-secret-123';
        });

        it('returns 401 when authorization header is missing', async () => {
            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 401 when authorization header is empty', async () => {
            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: '',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 401 when authorization header has wrong value', async () => {
            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer wrong-secret',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 401 when authorization header is missing Bearer prefix', async () => {
            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 401 when authorization header has wrong case', async () => {
            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'bearer test-secret-123', // lowercase
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });
    });

    // =========================================================================
    // SUCCESSFUL AUTHENTICATION
    // =========================================================================

    describe('Successful authentication and processing', () => {
        beforeEach(() => {
            process.env.CRON_SECRET = 'test-secret-123';
            (getWarmupStatus as jest.Mock).mockResolvedValue({
                active: false,
            });
        });

        it('proceeds to campaign processing when auth is valid', async () => {
            mockCampaignsQuery.get.mockResolvedValue({
                empty: true,
                docs: [],
            });

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('No campaigns due');
            expect(data.processed).toBe(0);

            // Verify Firestore was queried
            expect(mockDb.collection).toHaveBeenCalledWith('campaigns');
            expect(mockCampaignsQuery.where).toHaveBeenCalledWith('status', '==', 'scheduled');
        });

        it('processes campaigns and returns success', async () => {
            const mockCampaignDoc = {
                id: 'camp_1',
                data: () => ({
                    orgId: 'org_test',
                    name: 'Test Campaign',
                    createdBy: 'user_1',
                    createdByAgent: 'craig',
                }),
            };

            mockCampaignsQuery.get.mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockCampaignDoc],
            });

            (executeCampaign as jest.Mock).mockResolvedValue({
                success: true,
                sent: 10,
                failed: 0,
            });

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.processed).toBe(1);
            expect(data.failed).toBe(0);

            expect(executeCampaign).toHaveBeenCalledWith('camp_1');
            expect(sendAgentNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgId: 'org_test',
                    userId: 'user_1',
                    agent: 'craig',
                    type: 'campaign_sent',
                }),
            );
        });

        it('skips campaign when warmup daily limit reached', async () => {
            (getWarmupStatus as jest.Mock).mockResolvedValue({
                active: true,
                dailyLimit: 50,
                sentToday: 50,
                remainingToday: 0,
            });

            const mockCampaignDoc = {
                id: 'camp_2',
                data: () => ({
                    orgId: 'org_test',
                    name: 'Warmup Limited Campaign',
                }),
            };

            mockCampaignsQuery.get.mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockCampaignDoc],
            });

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.processed).toBe(0);
            expect(data.failed).toBe(0);

            // Campaign should NOT be executed
            expect(executeCampaign).not.toHaveBeenCalled();
        });

        it('marks campaign as failed on execution error', async () => {
            const mockCampaignDoc = {
                id: 'camp_fail',
                data: () => ({
                    orgId: 'org_test',
                    name: 'Failing Campaign',
                }),
            };

            const mockUpdate = jest.fn();
            mockDb.collection = jest.fn((name: string) => {
                if (name === 'campaigns') {
                    return {
                        ...mockCampaignsQuery,
                        doc: () => ({
                            update: mockUpdate,
                        }),
                    };
                }
                return { get: jest.fn() };
            });

            mockCampaignsQuery.get.mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockCampaignDoc],
            });

            (executeCampaign as jest.Mock).mockRejectedValue(new Error('Send failed'));

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.processed).toBe(0);
            expect(data.failed).toBe(1);

            expect(mockUpdate).toHaveBeenCalledWith({
                status: 'failed',
                updatedAt: expect.any(Date),
            });
        });

        it('records warmup sends after successful campaign', async () => {
            (getWarmupStatus as jest.Mock).mockResolvedValue({
                active: true,
                dailyLimit: 50,
                sentToday: 10,
                remainingToday: 40,
            });

            const mockCampaignDoc = {
                id: 'camp_warmup',
                data: () => ({
                    orgId: 'org_test',
                    name: 'Warmup Campaign',
                }),
            };

            mockCampaignsQuery.get.mockResolvedValue({
                empty: false,
                size: 1,
                docs: [mockCampaignDoc],
            });

            (executeCampaign as jest.Mock).mockResolvedValue({
                success: true,
                sent: 5,
                failed: 0,
            });

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            await GET(request);

            expect(recordWarmupSend).toHaveBeenCalledWith('org_test', 5);
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    describe('Error handling', () => {
        beforeEach(() => {
            process.env.CRON_SECRET = 'test-secret-123';
        });

        it('returns 500 on fatal database error', async () => {
            (getAdminFirestore as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Database connection failed');
            });

            const request = new NextRequest('http://localhost/api/cron/campaign-sender', {
                method: 'GET',
                headers: {
                    authorization: 'Bearer test-secret-123',
                },
            });

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal server error');
        });
    });
});
