jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
jest.mock('@/server/actions/playbook-revenue-attribution', () => ({
    recordPlaybookExecution: jest.fn(),
}));
jest.mock('@/server/services/playbook-infra-adapters', () => ({
    FirestorePlaybookAdapter: jest.fn().mockImplementation(() => ({})),
    CloudTasksDispatcher: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@/server/services/playbook-artifact-runtime', () => ({
    getPlaybookArtifactRuntime: jest.fn(() => ({ artifactService: {} })),
}));
jest.mock('@/server/services/playbook-artifact-memory', () => ({
    PlaybookArtifactMemoryService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('@/server/services/playbook-run-coordinator', () => ({
    PlaybookRunCoordinator: jest.fn().mockImplementation(() => ({
        startRun: jest.fn(),
    })),
}));
jest.mock('@/server/services/playbook-validation', () => ({
    runValidationHarness: jest.fn(),
}));
jest.mock('@/server/services/playbook-cron-step', () => ({
    executePlaybookCronStep: jest.fn(),
}));

import { createServerClient } from '@/firebase/server-client';
import { executePlaybook, executeRunCron } from '../playbook-executor';
import { executePlaybookCronStep } from '../playbook-cron-step';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockExecutePlaybookCronStep = executePlaybookCronStep as jest.MockedFunction<typeof executePlaybookCronStep>;

describe('playbook executor run_cron handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExecutePlaybookCronStep.mockResolvedValue({
            action: 'run_cron',
            message: 'Deployment incident routed',
            data: { success: true },
        });
    });

    it('executeRunCron reuses the shared cron-step helper with event context', async () => {
        const result = await executeRunCron(
            {
                action: 'run_cron',
                params: {
                    endpoint: '/api/cron/playbooks/firebase-deployment-incident',
                },
            },
            {
                orgId: 'bakedbot-internal',
                userId: 'system',
                variables: {
                    playbookId: 'firebase-deployment-incident-response',
                    playbookName: 'Firebase Deployment Incident Response',
                    trigger: {
                        type: 'event',
                        data: {
                            eventName: 'deployment.firebase.failed',
                            workflowName: 'Deploy to Firebase App Hosting',
                        },
                    },
                },
                previousResults: {},
            } as any,
        );

        expect(mockExecutePlaybookCronStep).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'firebase-deployment-incident-response',
            playbookName: 'Firebase Deployment Incident Response',
            orgId: 'bakedbot-internal',
            triggeredBy: 'event',
            eventData: {
                eventName: 'deployment.firebase.failed',
                workflowName: 'Deploy to Firebase App Hosting',
            },
        }));
        expect(result.message).toBe('Deployment incident routed');
    });

    it('executePlaybook completes a legacy playbook that contains a run_cron step', async () => {
        const playbookRef = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    id: 'firebase-deployment-incident-response',
                    name: 'Firebase Deployment Incident Response',
                    orgId: 'bakedbot-internal',
                    version: 1,
                    steps: [
                        {
                            id: 'route-deploy-incident',
                            action: 'run_cron',
                            params: {
                                endpoint: '/api/cron/playbooks/firebase-deployment-incident',
                            },
                        },
                    ],
                }),
            }),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const executionRef = {
            id: 'execution-1',
            update: jest.fn().mockResolvedValue(undefined),
        };
        const firestore = {
            collection: jest.fn((name: string) => {
                if (name === 'playbooks') {
                    return {
                        doc: jest.fn(() => playbookRef),
                    };
                }

                if (name === 'playbook_executions') {
                    return {
                        add: jest.fn().mockResolvedValue(executionRef),
                    };
                }

                throw new Error(`Unexpected collection ${name}`);
            }),
        };

        mockCreateServerClient.mockResolvedValue({ firestore } as any);

        const result = await executePlaybook({
            playbookId: 'firebase-deployment-incident-response',
            orgId: 'bakedbot-internal',
            userId: 'system',
            triggeredBy: 'event',
            eventData: {
                eventName: 'deployment.firebase.failed',
                workflowName: 'Deploy to Firebase App Hosting',
            },
        });

        expect(result.status).toBe('completed');
        expect(result.stepResults).toHaveLength(1);
        expect(result.stepResults[0]).toEqual(expect.objectContaining({
            action: 'run_cron',
            status: 'completed',
        }));
        expect(mockExecutePlaybookCronStep).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'firebase-deployment-incident-response',
            playbookName: 'Firebase Deployment Incident Response',
        }));
    });
});
