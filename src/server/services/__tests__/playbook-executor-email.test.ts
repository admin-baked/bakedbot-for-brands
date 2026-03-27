jest.mock('@/firebase/server-client');
jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));
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

import { createServerClient } from '@/firebase/server-client';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { executePlaybook, executeSendEmail } from '../playbook-executor';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockSendGenericEmail = sendGenericEmail as jest.MockedFunction<typeof sendGenericEmail>;

describe('playbook executor email handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('executeSendEmail resolves templated email fields and sends them through sendGenericEmail', async () => {
        mockSendGenericEmail.mockResolvedValue({ success: true });

        const result = await executeSendEmail(
            {
                action: 'send_email',
                params: {
                    to: '{{guest.email}}',
                    subject: 'Your recap with {{executive.displayName}}',
                    htmlBody: '<p>{{meeting.notes}}</p>',
                    textBody: '{{meeting.notes}}',
                    communicationType: 'transactional',
                    fromName: '{{executive.displayName}}',
                },
            },
            {
                orgId: 'bakedbot-internal',
                userId: 'system',
                variables: {
                    guest: { email: 'guest@example.com' },
                    executive: { displayName: 'Jack' },
                    meeting: { notes: 'Reviewed rollout plan.' },
                },
                previousResults: {},
            } as any,
        );

        expect(mockSendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'guest@example.com',
            subject: 'Your recap with Jack',
            htmlBody: '<p>Reviewed rollout plan.</p>',
            textBody: 'Reviewed rollout plan.',
            fromName: 'Jack',
            communicationType: 'transactional',
            orgId: 'bakedbot-internal',
        }));
        expect(result).toEqual({
            success: true,
            sentTo: 'guest@example.com',
            subject: 'Your recap with Jack',
        });
    });

    it('executePlaybook marks the run as failed when send_email returns success=false', async () => {
        const playbookRef = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                    id: 'jack-booking-emails',
                    orgId: 'bakedbot-internal',
                    version: 1,
                    steps: [
                        {
                            id: 'send-followup',
                            action: 'send_email',
                            params: {
                                to: 'guest@example.com',
                                subject: 'Follow-up',
                                htmlBody: '<p>Recap</p>',
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

                return {
                    add: jest.fn().mockResolvedValue({}),
                    doc: jest.fn(),
                };
            }),
        };

        mockCreateServerClient.mockResolvedValue({ firestore } as any);
        mockSendGenericEmail.mockResolvedValue({ success: false, error: 'provider outage' });

        const result = await executePlaybook({
            playbookId: 'jack-booking-emails',
            orgId: 'bakedbot-internal',
            userId: 'system',
            triggeredBy: 'event',
            eventData: {
                customerEmail: 'guest@example.com',
            },
        });

        expect(result.status).toBe('failed');
        expect(result.error).toBe('One or more steps failed.');
        expect(executionRef.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'failed',
            error: 'One or more steps failed.',
        }));

        const playbookUpdate = playbookRef.update.mock.calls.at(-1)?.[0] as Record<string, unknown>;
        expect(playbookUpdate.lastRunAt).toBeInstanceOf(Date);
        expect(playbookUpdate).toHaveProperty('runCount');
        expect(playbookUpdate).toHaveProperty('failureCount');
        expect(playbookUpdate).not.toHaveProperty('successCount');
    });
});
