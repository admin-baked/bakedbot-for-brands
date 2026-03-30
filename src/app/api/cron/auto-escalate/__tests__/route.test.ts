import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockEscalateHeartbeatFailure = jest.fn();
const mockEscalateLatencyBreach = jest.fn();
const mockDispatchPlaybookEvent = jest.fn();

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/server/services/auto-escalator', () => ({
    escalateHeartbeatFailure: mockEscalateHeartbeatFailure,
    escalateLatencyBreach: mockEscalateLatencyBreach,
}));

jest.mock('@/server/services/playbook-event-dispatcher', () => ({
    dispatchPlaybookEvent: mockDispatchPlaybookEvent,
}));

describe('POST /api/cron/auto-escalate', () => {
    let POST: typeof import('../route').POST;
    const originalCronSecret = process.env.CRON_SECRET;
    const originalSetImmediate = global.setImmediate;

    function buildRequest(body: unknown) {
        return {
            headers: {
                get: (name: string) => {
                    if (name.toLowerCase() === 'authorization') {
                        return 'Bearer test-secret';
                    }
                    if (name.toLowerCase() === 'content-type') {
                        return 'application/json';
                    }
                    return null;
                },
            },
            json: async () => body,
        } as any;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CRON_SECRET = 'test-secret';
        mockDispatchPlaybookEvent.mockResolvedValue(undefined);
        global.setImmediate = ((fn: (...args: any[]) => void, ...args: any[]) => {
            fn(...args);
            return 0 as any;
        }) as typeof setImmediate;
        POST = require('../route').POST;
    });

    afterEach(() => {
        process.env.CRON_SECRET = originalCronSecret;
        global.setImmediate = originalSetImmediate;
    });

    it('dispatches the Firebase deployment failure playbook event', async () => {
        const request = buildRequest({
            type: 'deployment_failure',
            data: {
                workflowName: 'Deploy to Firebase App Hosting',
                runId: '12345',
                failureSummary: 'Server Actions must be async functions.',
            },
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(202);
        expect(body).toEqual({
            accepted: true,
            type: 'deployment_failure',
            message: 'Deployment failure playbook queued',
        });
        expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
            'bakedbot-internal',
            'deployment.firebase.failed',
            expect.objectContaining({
                eventName: 'deployment.firebase.failed',
                workflowName: 'Deploy to Firebase App Hosting',
                runId: '12345',
            }),
        );
    });

    it('dispatches the Firebase deployment success playbook event', async () => {
        const request = buildRequest({
            type: 'deployment_success',
            data: {
                workflowName: 'Production Deploy',
                runId: '67890',
                deployedUrl: 'https://bakedbot.ai',
            },
        });

        const response = await POST(request);

        expect(response.status).toBe(202);
        expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
            'bakedbot-internal',
            'deployment.firebase.succeeded',
            expect.objectContaining({
                eventName: 'deployment.firebase.succeeded',
                workflowName: 'Production Deploy',
                runId: '67890',
                deployedUrl: 'https://bakedbot.ai',
            }),
        );
    });
});
