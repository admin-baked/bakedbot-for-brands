import { POST } from '@/app/api/jobs/agent/route';
import { runAgentCore } from '@/server/agents/agent-runner';
import { handlePlaybookStageJob } from '@/server/services/playbook-stage-runner';

jest.mock('@/server/agents/agent-runner', () => ({
    runAgentCore: jest.fn(),
}));

jest.mock('@/server/services/playbook-stage-runner', () => ({
    handlePlaybookStageJob: jest.fn().mockResolvedValue(undefined),
}));

let mockFirestore: any;

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockFirestore),
}));

jest.mock('@/server/jobs/job-stream', () => ({
    JobDraftPublisher: jest.fn().mockImplementation(() => ({
        push: jest.fn(),
        close: jest.fn(),
    })),
    markJobRunning: jest.fn().mockResolvedValue({ applied: true, status: 'running' }),
    finalizeJobSuccess: jest.fn().mockResolvedValue({ applied: true, status: 'completed' }),
    finalizeJobFailure: jest.fn().mockResolvedValue({ applied: true, status: 'failed' }),
    sanitizeAgentJobResult: jest.fn((r: any) => r),
    sanitizeAgentJobText: jest.fn((t: string) => t),
}));

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
        const threadRef = { id: 'thread-1' };
        const transaction = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ messages: [] }),
            }),
            update: jest.fn(),
        };

        mockFirestore = {
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
                            collection: jest.fn(() => ({
                                doc: jest.fn(() => ({
                                    get: jest.fn().mockResolvedValue({ exists: false }),
                                })),
                            })),
                        })),
                    };
                }

                if (name === 'jobs') {
                    return {
                        doc: jest.fn(() => ({
                            set: jest.fn().mockResolvedValue(undefined),
                            get: jest.fn().mockResolvedValue({ exists: false }),
                        })),
                    };
                }

                if (name === 'inbox_threads') {
                    return {
                        doc: jest.fn(() => threadRef),
                    };
                }

                return {
                    doc: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({ exists: false }),
                        set: jest.fn().mockResolvedValue(undefined),
                        update: jest.fn().mockResolvedValue(undefined),
                    })),
                };
            }),
            runTransaction: jest.fn(async (handler: (tx: typeof transaction) => Promise<void>) => handler(transaction)),
        };

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
        expect(mockFirestore.runTransaction).toHaveBeenCalled();
        expect(transaction.update).toHaveBeenCalledWith(threadRef, expect.objectContaining({
            preview: expect.stringContaining('This customer has 4 orders.'),
            messages: expect.arrayContaining([
                expect.objectContaining({
                    id: 'job-job-123',
                    type: 'agent',
                    content: 'This customer has 4 orders.',
                }),
            ]),
        }));
    });
});
