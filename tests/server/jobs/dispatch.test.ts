/**
 * Cloud Tasks Dispatch Tests
 *
 * @jest-environment node
 */

const mockTasksCreate = jest.fn();
const mockGetClient = jest.fn();
const mockJobSet = jest.fn().mockResolvedValue(undefined);
const mockJobUpdate = jest.fn().mockResolvedValue(undefined);
const mockJobDoc = jest.fn(() => ({
    set: mockJobSet,
    update: mockJobUpdate,
}));
const mockCollection = jest.fn(() => ({
    doc: mockJobDoc,
}));
const mockCreateServerClient = jest.fn();

jest.mock('googleapis', () => ({
    google: {
        auth: {
            GoogleAuth: jest.fn().mockImplementation(() => ({
                getClient: mockGetClient,
            })),
        },
        cloudtasks: jest.fn().mockImplementation(() => ({
            projects: {
                locations: {
                    queues: {
                        tasks: {
                            create: mockTasksCreate,
                        },
                    },
                },
            },
        })),
    },
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock('@/server/utils/secrets', () => ({
    getSecret: jest.fn().mockResolvedValue(null),
}));

import { google } from 'googleapis';
import { dispatchAgentJob } from '@/server/jobs/dispatch';
import { getCloudTasksClient, getQueuePath } from '@/server/jobs/client';

describe('Cloud Tasks Dispatch', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        mockGetClient.mockResolvedValue({ credentials: {} });
        mockTasksCreate.mockResolvedValue({ data: { name: 'task-123' } });
        mockCreateServerClient.mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });

        delete process.env.FIREBASE_PROJECT_ID;
        delete process.env.GCLOUD_PROJECT;
        delete process.env.FIREBASE_REGION;
        delete process.env.NEXT_PUBLIC_APP_URL;
    });

    describe('dispatchAgentJob', () => {
        it('returns success when dispatch succeeds', async () => {
            const payload = {
                userId: 'user-123',
                userInput: 'Review Recent Signups',
                persona: 'leo' as const,
                options: {
                    modelLevel: 'standard' as const,
                },
                jobId: 'job-123',
            };

            const result = await dispatchAgentJob(payload);

            expect(result).toEqual({ success: true, taskId: 'task-123' });
            expect(mockJobDoc).toHaveBeenCalledWith('job-123');
            expect(mockJobSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'pending',
                    userId: 'user-123',
                    agentId: 'leo',
                }),
            );
        });

        it('returns an error object and marks the job failed when task creation fails', async () => {
            mockTasksCreate.mockRejectedValue(new Error('Queue not found'));

            const payload = {
                userId: 'user-123',
                userInput: 'Test message',
                persona: 'puff' as const,
                options: {
                    modelLevel: 'standard' as const,
                },
                jobId: 'job-456',
            };

            const result = await dispatchAgentJob(payload);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cloud Tasks dispatch failed: Queue not found');
            expect(mockJobUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'failed',
                    error: 'Cloud Tasks dispatch failed: Queue not found',
                }),
            );
        });

        it('returns an error object when auth client initialization fails', async () => {
            mockGetClient.mockRejectedValue(new Error('Could not load default credentials'));

            const payload = {
                userId: 'user-123',
                userInput: 'Test message',
                persona: 'puff' as const,
                options: {
                    modelLevel: 'standard' as const,
                },
                jobId: 'job-789',
            };

            const result = await dispatchAgentJob(payload);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Could not load default credentials');
            expect(mockJobUpdate).toHaveBeenCalled();
        });

        it('includes the proper URL and headers in the task request', async () => {
            process.env.NEXT_PUBLIC_APP_URL = 'https://preview.bakedbot.ai';

            const payload = {
                userId: 'user-123',
                userInput: 'Review Recent Signups',
                persona: 'leo' as const,
                options: {
                    modelLevel: 'genius' as const,
                    brandId: 'brand-456',
                },
                jobId: 'job-abc',
            };

            await dispatchAgentJob(payload);

            expect(mockTasksCreate).toHaveBeenCalledTimes(1);
            const request = mockTasksCreate.mock.calls[0][0];

            expect(request.parent).toBe('projects/studio-567050101-bc6e8/locations/us-central1/queues/agent-queue');
            expect(request.requestBody.task.httpRequest.url).toBe('https://preview.bakedbot.ai/api/jobs/agent');
            expect(request.requestBody.task.httpRequest.headers['Content-Type']).toBe('application/json');
            expect(request.requestBody.task.httpRequest.httpMethod).toBe('POST');
        });
    });

    describe('getCloudTasksClient', () => {
        it('initializes GoogleAuth with the cloud-platform scope', async () => {
            await getCloudTasksClient();

            expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
                scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            });
            expect(google.cloudtasks).toHaveBeenCalledWith(
                expect.objectContaining({
                    version: 'v2',
                    auth: { credentials: {} },
                }),
            );
        });

        it('throws a descriptive error when auth fails', async () => {
            mockGetClient.mockRejectedValue(new Error('Auth failed'));

            await expect(getCloudTasksClient()).rejects.toThrow(
                'Cloud Tasks client initialization failed: Auth failed',
            );
        });
    });

    describe('getQueuePath', () => {
        it('constructs the correct queue path', async () => {
            process.env.GCLOUD_PROJECT = 'project-123';
            process.env.FIREBASE_REGION = 'us-east1';

            const path = await getQueuePath('agent-queue');

            expect(path).toBe('projects/project-123/locations/us-east1/queues/agent-queue');
        });

        it('uses the default queue name when none is specified', async () => {
            const path = await getQueuePath();

            expect(path).toBe('projects/studio-567050101-bc6e8/locations/us-central1/queues/default');
        });
    });
});
