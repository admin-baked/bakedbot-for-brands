/**
 * Cloud Tasks Dispatch Tests
 * Tests for the agent job dispatch functionality with proper error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis
const mockTasksCreate = vi.fn();
const mockGetClient = vi.fn();

vi.mock('googleapis', () => ({
    google: {
        auth: {
            GoogleAuth: vi.fn().mockImplementation(() => ({
                getClient: mockGetClient
            }))
        },
        cloudtasks: vi.fn().mockImplementation(() => ({
            projects: {
                locations: {
                    queues: {
                        tasks: {
                            create: mockTasksCreate
                        }
                    }
                }
            }
        }))
    }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
    }
}));

// Mock secrets
vi.mock('@/server/utils/secrets', () => ({
    getSecret: vi.fn().mockResolvedValue(null)
}));

describe('Cloud Tasks Dispatch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetClient.mockResolvedValue({ credentials: {} });
        mockTasksCreate.mockResolvedValue({ data: { name: 'task-123' } });
    });

    describe('dispatchAgentJob', () => {
        it('should return success when dispatch succeeds', async () => {
            const { dispatchAgentJob } = await import('@/server/jobs/dispatch');

            const payload = {
                userId: 'user-123',
                userInput: 'Review Recent Signups',
                persona: 'leo' as const,
                options: {
                    modelLevel: 'standard' as const
                },
                jobId: 'job-123'
            };

            const result = await dispatchAgentJob(payload);

            expect(result.success).toBe(true);
            expect(result.taskId).toBe('task-123');
        });

        it('should return error object instead of throwing when Cloud Tasks create fails', async () => {
            mockTasksCreate.mockRejectedValue(new Error('Queue not found'));

            const { dispatchAgentJob } = await import('@/server/jobs/dispatch');

            const payload = {
                userId: 'user-123',
                userInput: 'Test message',
                persona: 'puff' as const,
                options: {
                    modelLevel: 'standard' as const
                },
                jobId: 'job-456'
            };

            const result = await dispatchAgentJob(payload);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cloud Tasks dispatch failed');
            expect(result.error).toContain('Queue not found');
        });

        it('should return error object when auth client initialization fails', async () => {
            mockGetClient.mockRejectedValue(new Error('Could not load default credentials'));

            // Re-import to get fresh module with new mock behavior
            vi.resetModules();

            // Re-setup mocks after reset
            vi.doMock('googleapis', () => ({
                google: {
                    auth: {
                        GoogleAuth: vi.fn().mockImplementation(() => ({
                            getClient: vi.fn().mockRejectedValue(new Error('Could not load default credentials'))
                        }))
                    },
                    cloudtasks: vi.fn()
                }
            }));

            const { dispatchAgentJob } = await import('@/server/jobs/dispatch');

            const payload = {
                userId: 'user-123',
                userInput: 'Test message',
                persona: 'puff' as const,
                options: {
                    modelLevel: 'standard' as const
                },
                jobId: 'job-789'
            };

            const result = await dispatchAgentJob(payload);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should include proper URL and headers in task request', async () => {
            const { dispatchAgentJob } = await import('@/server/jobs/dispatch');

            const payload = {
                userId: 'user-123',
                userInput: 'Review Recent Signups',
                persona: 'leo' as const,
                options: {
                    modelLevel: 'genius' as const,
                    brandId: 'brand-456'
                },
                jobId: 'job-abc'
            };

            await dispatchAgentJob(payload);

            expect(mockTasksCreate).toHaveBeenCalled();
            const callArg = mockTasksCreate.mock.calls[0][0];
            expect(callArg.requestBody.task.httpRequest.headers['Content-Type']).toBe('application/json');
            expect(callArg.requestBody.task.httpRequest.httpMethod).toBe('POST');
        });
    });

    describe('getCloudTasksClient', () => {
        it('should initialize with correct scopes', async () => {
            const { google } = await import('googleapis');
            const { getCloudTasksClient } = await import('@/server/jobs/client');

            await getCloudTasksClient();

            expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
        });

        it('should throw with descriptive error when auth fails', async () => {
            vi.resetModules();

            vi.doMock('googleapis', () => ({
                google: {
                    auth: {
                        GoogleAuth: vi.fn().mockImplementation(() => ({
                            getClient: vi.fn().mockRejectedValue(new Error('Auth failed'))
                        }))
                    },
                    cloudtasks: vi.fn()
                }
            }));
            vi.doMock('@/lib/logger', () => ({
                logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
            }));

            const { getCloudTasksClient } = await import('@/server/jobs/client');

            await expect(getCloudTasksClient()).rejects.toThrow('Cloud Tasks client initialization failed');
        });
    });

    describe('getQueuePath', () => {
        it('should construct correct queue path', async () => {
            const { getQueuePath } = await import('@/server/jobs/client');

            const path = await getQueuePath('agent-queue');

            expect(path).toMatch(/^projects\/.*\/locations\/.*\/queues\/agent-queue$/);
        });

        it('should use default queue name when not specified', async () => {
            const { getQueuePath } = await import('@/server/jobs/client');

            const path = await getQueuePath();

            expect(path).toContain('/queues/default');
        });
    });
});
