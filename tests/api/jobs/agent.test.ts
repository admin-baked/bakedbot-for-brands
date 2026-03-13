import { POST } from '@/app/api/jobs/agent/route';
import { runAgentCore } from '@/server/agents/agent-runner';
import { handlePlaybookStageJob } from '@/server/services/playbook-stage-runner';

jest.mock('@/server/agents/agent-runner', () => ({
    runAgentCore: jest.fn(),
}));

jest.mock('@/server/services/playbook-stage-runner', () => ({
    handlePlaybookStageJob: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/agent-response-formatter', () => ({
    formatAgentResponse: jest.fn((value: string) => value),
}));

const { createServerClient } = require('@/firebase/server-client');

describe('POST /api/jobs/agent', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('routes playbook stage jobs into the stage runner instead of the generic agent core', async () => {
        const req = {
            json: async () => ({
                userId: 'system-playbook-runtime',
                userInput: 'Execute playbook stage: resolving_scope',
                persona: 'ezal',
                jobId: 'run_1:resolving_scope:1',
                options: {
                    context: {
                        isPlaybookStage: true,
                        runId: 'run_1',
                        playbookId: 'pb_1',
                        stageName: 'resolving_scope',
                        attempt: 1,
                        triggerEvent: { type: 'manual' },
                    },
                },
            }),
            headers: new Headers(),
        } as any;

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(handlePlaybookStageJob).toHaveBeenCalledWith(expect.objectContaining({
            isPlaybookStage: true,
            runId: 'run_1',
            stageName: 'resolving_scope',
        }));
        expect(runAgentCore).not.toHaveBeenCalled();
    });

    it('persists completed inbox job responses back into the inbox thread', async () => {
        const mockJobSet = jest.fn().mockResolvedValue(undefined);
        const threadRef = { id: 'thread-1' };
        const transaction = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ messages: [] }),
            }),
            update: jest.fn(),
        };

        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'users') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({
                                    email: 'crm@example.com',
                                    role: 'dispensary_admin',
                                    brandId: 'org_test',
                                }),
                            }),
                        })),
                    };
                }

                if (name === 'jobs') {
                    return {
                        doc: jest.fn(() => ({
                            set: mockJobSet,
                        })),
                    };
                }

                if (name === 'inbox_threads') {
                    return {
                        doc: jest.fn(() => threadRef),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
            runTransaction: jest.fn(async (handler: (transactionArg: typeof transaction) => Promise<void>) => handler(transaction)),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore });
        (runAgentCore as jest.Mock).mockResolvedValue({
            content: 'This customer has 4 orders.',
            toolCalls: [],
            metadata: {},
        });

        const req = {
            json: async () => ({
                userId: 'user_123',
                userInput: 'How many times has this customer shopped?',
                persona: 'mrs_parker',
                jobId: 'job-123',
                options: {
                    source: 'inbox',
                    context: {
                        threadId: 'thread-1',
                    },
                },
            }),
            headers: new Headers(),
        } as any;

        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(firestore.runTransaction).toHaveBeenCalled();
        expect(transaction.update).toHaveBeenCalledWith(threadRef, expect.objectContaining({
            preview: 'This customer has 4 orders.',
            messages: [
                expect.objectContaining({
                    id: 'job-job-123',
                    type: 'agent',
                    content: 'This customer has 4 orders.',
                }),
            ],
        }));
        expect(mockJobSet).toHaveBeenCalledWith(expect.objectContaining({
            status: 'completed',
            result: expect.objectContaining({
                content: 'This customer has 4 orders.',
            }),
        }), { merge: true });
    });
});
