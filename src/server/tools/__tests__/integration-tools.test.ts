/**
 * Integration Tools Tests
 *
 * Unit tests for integration status checking and request creation
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
    checkIntegrationStatus,
    requestIntegration,
    executeIntegrationTool,
} from '../integration-tools';
import type { IntegrationProvider } from '@/types/service-integrations';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(),
                set: jest.fn(),
                update: jest.fn(),
                collection: jest.fn(() => ({
                    doc: jest.fn(() => ({
                        get: jest.fn(),
                        set: jest.fn(),
                    })),
                    get: jest.fn(),
                })),
            })),
        })),
        FieldValue: {
            arrayUnion: jest.fn((val) => val),
        },
    })),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('Integration Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkIntegrationStatus', () => {
        it('should return disconnected status for non-existent integration', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            // Mock doc.exists = false
            mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                exists: false,
            });

            const result = await checkIntegrationStatus('test-user-id', 'gmail');

            expect(result).toEqual({
                provider: 'gmail',
                connected: false,
                status: 'disconnected',
            });
        });

        it('should return connected status for valid integration', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            // Mock doc with valid data
            mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    status: 'connected',
                    connectedAt: '2024-01-01T00:00:00Z',
                    expiresAt: '2025-01-01T00:00:00Z', // Future date
                }),
            });

            const result = await checkIntegrationStatus('test-user-id', 'gmail');

            expect(result).toMatchObject({
                provider: 'gmail',
                connected: true,
                status: 'connected',
                connectedAt: '2024-01-01T00:00:00Z',
            });
        });

        it('should return expired status for expired OAuth token', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            // Mock doc with expired token
            mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    status: 'connected',
                    connectedAt: '2024-01-01T00:00:00Z',
                    expiresAt: '2024-06-01T00:00:00Z', // Past date
                }),
            });

            const result = await checkIntegrationStatus('test-user-id', 'gmail');

            expect(result).toMatchObject({
                provider: 'gmail',
                connected: false,
                status: 'expired',
            });
        });

        it('should return status map for all integrations when no provider specified', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            // Mock snapshot with multiple integrations
            mockDb.collection().doc().collection().get.mockResolvedValue({
                forEach: (callback: any) => {
                    callback({
                        id: 'gmail',
                        data: () => ({
                            status: 'connected',
                            connectedAt: '2024-01-01T00:00:00Z',
                        }),
                    });
                    callback({
                        id: 'dutchie',
                        data: () => ({
                            status: 'connected',
                            connectedAt: '2024-01-02T00:00:00Z',
                        }),
                    });
                },
            });

            const result = await checkIntegrationStatus('test-user-id');

            expect(result).toHaveProperty('gmail');
            expect(result).toHaveProperty('dutchie');
            expect((result as any).gmail.connected).toBe(true);
            expect((result as any).dutchie.connected).toBe(true);
        });
    });

    describe('requestIntegration', () => {
        it('should create integration request artifact', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            const mockSet = jest.fn().mockResolvedValue(undefined);
            const mockUpdate = jest.fn().mockResolvedValue(undefined);

            mockDb.collection().doc.mockImplementation((id?: string) => ({
                id: id || 'artifact-123',
                set: mockSet,
                update: mockUpdate,
            }));

            const result = await requestIntegration({
                userId: 'user-123',
                orgId: 'org-456',
                threadId: 'thread-789',
                provider: 'gmail',
                reason: 'To send emails as you',
                enablesAction: 'send_gmail',
            });

            expect(result.success).toBe(true);
            expect(result.artifactId).toBeDefined();
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'integration_request',
                    status: 'draft',
                    data: expect.objectContaining({
                        provider: 'gmail',
                        reason: 'To send emails as you',
                        enablesAction: 'send_gmail',
                    }),
                })
            );
        });

        it('should return error for unknown provider', async () => {
            const result = await requestIntegration({
                userId: 'user-123',
                orgId: 'org-456',
                threadId: 'thread-789',
                provider: 'unknown-provider' as IntegrationProvider,
                reason: 'Test',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown integration provider');
        });

        it('should update thread with artifact ID', async () => {
            const { getAdminFirestore } = await import('@/firebase/admin');
            const mockDb = getAdminFirestore() as any;

            const mockUpdate = jest.fn().mockResolvedValue(undefined);

            mockDb.collection().doc.mockImplementation((id?: string) => ({
                id: id || 'artifact-123',
                set: jest.fn().mockResolvedValue(undefined),
                update: mockUpdate,
            }));

            await requestIntegration({
                userId: 'user-123',
                orgId: 'org-456',
                threadId: 'thread-789',
                provider: 'gmail',
                reason: 'To send emails',
            });

            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('executeIntegrationTool', () => {
        describe('check_integration_status', () => {
            it('should return formatted status for specific provider', async () => {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const mockDb = getAdminFirestore() as any;

                mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                    exists: true,
                    data: () => ({
                        status: 'connected',
                        connectedAt: '2024-01-01T00:00:00Z',
                    }),
                });

                const result = await executeIntegrationTool(
                    'check_integration_status',
                    { provider: 'gmail' },
                    { userId: 'user-123', orgId: 'org-456' }
                );

                expect(result).toMatchObject({
                    provider: 'gmail',
                    connected: true,
                    status: 'connected',
                    message: expect.stringContaining('gmail is connected'),
                });
            });

            it('should return summary for all integrations', async () => {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const mockDb = getAdminFirestore() as any;

                mockDb.collection().doc().collection().get.mockResolvedValue({
                    forEach: (callback: any) => {
                        callback({
                            id: 'gmail',
                            data: () => ({ status: 'connected' }),
                        });
                        callback({
                            id: 'dutchie',
                            data: () => ({ status: 'disconnected' }),
                        });
                    },
                });

                const result = await executeIntegrationTool(
                    'check_integration_status',
                    {},
                    { userId: 'user-123', orgId: 'org-456' }
                );

                expect(result.summary).toBeDefined();
                expect(result.summary.total).toBe(2);
                expect(result.summary.connected).toBeGreaterThan(0);
            });
        });

        describe('request_integration', () => {
            it('should create artifact and return success message', async () => {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const mockDb = getAdminFirestore() as any;

                mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                    exists: false, // Not connected
                });

                mockDb.collection().doc.mockImplementation(() => ({
                    id: 'artifact-123',
                    set: jest.fn().mockResolvedValue(undefined),
                    update: jest.fn().mockResolvedValue(undefined),
                }));

                const result = await executeIntegrationTool(
                    'request_integration',
                    {
                        provider: 'gmail',
                        reason: 'To send emails',
                        enablesAction: 'send_gmail',
                    },
                    {
                        userId: 'user-123',
                        orgId: 'org-456',
                        threadId: 'thread-789',
                    }
                );

                expect(result.success).toBe(true);
                expect(result.message).toContain('Gmail');
                expect(result.authMethod).toBe('oauth');
                expect(result.artifactId).toBeDefined();
            });

            it('should return error if integration already connected', async () => {
                const { getAdminFirestore } = await import('@/firebase/admin');
                const mockDb = getAdminFirestore() as any;

                mockDb.collection().doc().collection().doc().get.mockResolvedValue({
                    exists: true,
                    data: () => ({ status: 'connected' }),
                });

                const result = await executeIntegrationTool(
                    'request_integration',
                    { provider: 'gmail', reason: 'Test' },
                    {
                        userId: 'user-123',
                        orgId: 'org-456',
                        threadId: 'thread-789',
                    }
                );

                expect(result.success).toBe(false);
                expect(result.alreadyConnected).toBe(true);
            });

            it('should throw error if threadId is missing', async () => {
                await expect(
                    executeIntegrationTool(
                        'request_integration',
                        { provider: 'gmail', reason: 'Test' },
                        { userId: 'user-123', orgId: 'org-456' } // No threadId
                    )
                ).rejects.toThrow('threadId is required');
            });
        });

        it('should throw error for unknown tool', async () => {
            await expect(
                executeIntegrationTool(
                    'unknown_tool',
                    {},
                    { userId: 'user-123', orgId: 'org-456' }
                )
            ).rejects.toThrow('Unknown integration tool');
        });
    });

    describe('Integration Metadata', () => {
        it('should have valid metadata for all providers', async () => {
            const { INTEGRATION_METADATA } = await import('@/types/service-integrations');

            const providers: IntegrationProvider[] = [
                'gmail',
                'google_calendar',
                'dutchie',
                'alleaves',
                'mailchimp',
            ];

            providers.forEach((provider) => {
                const metadata = INTEGRATION_METADATA[provider];
                expect(metadata).toBeDefined();
                expect(metadata.name).toBeDefined();
                expect(metadata.description).toBeDefined();
                expect(metadata.icon).toBeDefined();
                expect(metadata.category).toBeDefined();
                expect(metadata.authMethod).toBeDefined();
                expect(metadata.setupTime).toBeDefined();
            });
        });

        it('should have correct auth methods for providers', async () => {
            const { INTEGRATION_METADATA } = await import('@/types/service-integrations');

            expect(INTEGRATION_METADATA.gmail.authMethod).toBe('oauth');
            expect(INTEGRATION_METADATA.dutchie.authMethod).toBe('api_key');
            expect(INTEGRATION_METADATA.alleaves.authMethod).toBe('jwt');
            expect(INTEGRATION_METADATA.mailchimp.authMethod).toBe('api_key');
        });
    });
});
