import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
const mockOrderGet = jest.fn();
const mockPostLinusIncidentSlack = jest.fn();
const mockDispatchLinusIncidentResponse = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn((name: string) => {
            if (name !== 'firebase_deployment_incidents') {
                throw new Error(`Unexpected collection: ${name}`);
            }

            return {
                doc: jest.fn(() => ({
                    get: mockDocGet,
                    set: mockDocSet,
                })),
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: mockOrderGet,
                    })),
                })),
            };
        }),
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('../incident-notifications', () => ({
    postLinusIncidentSlack: mockPostLinusIncidentSlack,
}));

jest.mock('../linus-incident-response', () => ({
    dispatchLinusIncidentResponse: mockDispatchLinusIncidentResponse,
}));

describe('firebase deployment incident service', () => {
    let queueFirebaseDeploymentPlaybookEvent: typeof import('../firebase-deployment-incident').queueFirebaseDeploymentPlaybookEvent;
    const originalSetImmediate = global.setImmediate;

    beforeEach(() => {
        jest.clearAllMocks();
        global.setImmediate = ((fn: (...args: any[]) => void, ...args: any[]) => {
            fn(...args);
            return 0 as any;
        }) as typeof setImmediate;
        queueFirebaseDeploymentPlaybookEvent = require('../firebase-deployment-incident').queueFirebaseDeploymentPlaybookEvent;
    });

    afterEach(() => {
        global.setImmediate = originalSetImmediate;
    });

    it('posts a failure summary to Slack and dispatches Linus for deployment failures', async () => {
        mockDocGet.mockResolvedValue({ exists: false });
        mockDocSet.mockResolvedValue(undefined);
        mockPostLinusIncidentSlack.mockResolvedValue({
            sent: true,
            channelId: 'C123',
            channelName: 'linus-cto',
            ts: '111.222',
            delivery: 'channel',
        });
        mockDispatchLinusIncidentResponse.mockResolvedValue({
            status: 'posted',
            content: 'Root cause was a bad import. Updated the server action and redeployed.',
            decision: 'MISSION_READY',
            model: 'claude-test',
            channelId: 'C123',
            channelName: 'linus-cto',
            threadTs: '111.222',
            delivery: 'thread',
        });

        const result = await queueFirebaseDeploymentPlaybookEvent({
            orgId: 'bakedbot-internal',
            playbookId: 'firebase-deployment-incident-response',
            eventData: {
                eventName: 'deployment.firebase.failed',
                workflowName: 'Deploy to Firebase App Hosting',
                runId: '12345',
                runNumber: '77',
                runUrl: 'https://github.com/test/actions/runs/12345',
                sha: 'abcdef1234567890',
                branch: 'main',
                failureStep: 'Build',
                failureSummary: 'Server Actions must be async functions.',
            },
            step: {
                params: {
                    channelName: 'linus-cto',
                    maxIterations: 6,
                },
            },
        });

        expect(result).toEqual({
            success: true,
            accepted: true,
            mode: 'failure',
            incidentId: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
        });
        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(expect.objectContaining({
            channelName: 'linus-cto',
            incidentId: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
        }));
        expect(mockDispatchLinusIncidentResponse).toHaveBeenCalledWith(expect.objectContaining({
            incidentId: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
            channelName: 'linus-cto',
            threadTs: '111.222',
            maxIterations: 6,
        }));
    });

    it('threads the recovery summary back into Slack when Firebase succeeds', async () => {
        mockOrderGet.mockResolvedValue({
            docs: [
                {
                    id: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
                    data: () => ({
                        orgId: 'bakedbot-internal',
                        workflowName: 'Deploy to Firebase App Hosting',
                        resolvedAt: null,
                        slack: {
                            channelName: 'linus-cto',
                            threadTs: '111.222',
                        },
                        linus: {
                            summary: 'Updated the broken import, validated types, and pushed the fix.',
                        },
                    }),
                },
            ],
        });
        mockPostLinusIncidentSlack.mockResolvedValue({
            sent: true,
            channelId: 'C123',
            channelName: 'linus-cto',
            ts: '111.333',
            delivery: 'thread',
        });
        mockDocSet.mockResolvedValue(undefined);

        const result = await queueFirebaseDeploymentPlaybookEvent({
            orgId: 'bakedbot-internal',
            playbookId: 'firebase-deployment-incident-response',
            eventData: {
                eventName: 'deployment.firebase.succeeded',
                workflowName: 'Deploy to Firebase App Hosting',
                runId: '67890',
                runNumber: '78',
                runUrl: 'https://github.com/test/actions/runs/67890',
                shortSha: 'fedcba9',
                deployTarget: 'bakedbot-prod',
                deployedUrl: 'https://bakedbot.ai',
            },
            step: {
                params: {
                    channelName: 'linus-cto',
                },
            },
        });

        expect(result).toEqual({
            success: true,
            accepted: true,
            mode: 'success',
            incidentId: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
        });
        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(expect.objectContaining({
            incidentId: 'firebase-deployment-deploy-to-firebase-app-hosting-12345-1',
            channelName: 'linus-cto',
            threadTs: '111.222',
        }));
        expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
            status: 'resolved',
            resolvedAt: expect.any(Date),
        }), { merge: true });
    });
});
