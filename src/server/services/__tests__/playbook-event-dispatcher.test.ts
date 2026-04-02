import {
    dispatchPlaybookEvent,
    dispatchPlaybookEventSync,
} from '../playbook-event-dispatcher';
import { executePlaybook } from '../playbook-executor';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/firebase/server-client');
jest.mock('../playbook-executor');
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

function createQuery(result: { empty: boolean; docs?: any[] }) {
    return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
            empty: result.empty,
            docs: result.docs ?? [],
        }),
        add: jest.fn().mockResolvedValue({}),
    };
}

function buildListenerDoc(playbookId: string, eventName: string) {
    return {
        id: `${playbookId}-${eventName}`,
        data: jest.fn(() => ({
            playbookId,
            orgId: 'org-test',
            eventName,
            status: 'active',
        })),
    };
}

function buildFirestore(options?: {
    listeners?: Array<ReturnType<typeof buildListenerDoc>>;
    deduped?: boolean;
    playbooks?: Array<{
        id: string;
        status?: string;
        active?: boolean;
        triggers?: Array<{ type: string; eventName?: string }>;
    }>;
}) {
    const listenerQuery = createQuery({
        empty: !(options?.listeners?.length),
        docs: options?.listeners ?? [],
    });
    const customerCommsQuery = createQuery({
        empty: !options?.deduped,
        docs: options?.deduped ? [{}] : [],
    });
    const playbookQuery = createQuery({
        empty: !(options?.playbooks?.length),
        docs: (options?.playbooks ?? []).map((playbook) => ({
            id: playbook.id,
            data: jest.fn(() => ({
                orgId: 'org-test',
                status: playbook.status ?? 'active',
                active: playbook.active,
                triggers: playbook.triggers ?? [],
            })),
        })),
    });
    const batchSet = jest.fn();
    const batchCommit = jest.fn().mockResolvedValue(undefined);

    return {
        firestore: {
            collection: jest.fn((name: string) => {
                if (name === 'playbook_event_listeners') {
                    return {
                        ...listenerQuery,
                        doc: jest.fn(() => ({})),
                    };
                }

                if (name === 'customer_communications') {
                    return customerCommsQuery;
                }

                if (name === 'playbooks') {
                    return playbookQuery;
                }

                if (name === 'playbook_execution_retries' || name === 'playbook_dead_letter_queue') {
                    return { add: jest.fn().mockResolvedValue({}) };
                }

                return {
                    add: jest.fn().mockResolvedValue({}),
                    where: jest.fn().mockReturnThis(),
                    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
                };
            }),
            batch: jest.fn(() => ({
                set: batchSet,
                commit: batchCommit,
            })),
        },
        listenerQuery,
        customerCommsQuery,
        playbookQuery,
        batchSet,
        batchCommit,
    };
}

describe('playbook event dispatcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (executePlaybook as jest.Mock).mockResolvedValue({
            executionId: 'exec-1',
            status: 'completed',
            startedAt: new Date('2026-03-27T15:00:00Z'),
            completedAt: new Date('2026-03-27T15:00:01Z'),
            stepResults: [],
        });
    });

    it('dispatchPlaybookEventSync returns delivered=true after a successful execution', async () => {
        const firestoreBundle = buildFirestore({
            listeners: [buildListenerDoc('jack-booking-emails', 'executive.booking.jack.confirmed')],
        });
        (createServerClient as jest.Mock).mockResolvedValue(firestoreBundle);

        const summary = await dispatchPlaybookEventSync('org-test', 'executive.booking.jack.confirmed', {
            customerEmail: 'shianne@stoneluxmarketing.com',
            dedupeKey: 'executive_booking:booking-123:confirmation',
        });

        expect(summary).toEqual({
            delivered: true,
            deduped: false,
            results: [{ playbookId: 'jack-booking-emails', status: 'success' }],
        });
        expect(executePlaybook).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'jack-booking-emails',
            orgId: 'org-test',
            userId: 'system',
            triggeredBy: 'event',
            eventData: expect.objectContaining({
                customerEmail: 'shianne@stoneluxmarketing.com',
                dedupeKey: 'executive_booking:booking-123:confirmation',
                eventName: 'executive.booking.jack.confirmed',
            }),
        }));
        expect(firestoreBundle.customerCommsQuery.add).toHaveBeenCalledWith(expect.objectContaining({
            orgId: 'org-test',
            type: 'playbook_event_executive.booking.jack.confirmed',
            playbookId: 'jack-booking-emails',
            dedupeKey: 'executive_booking:booking-123:confirmation',
            metadata: { eventName: 'executive.booking.jack.confirmed' },
        }));
    });

    it('dispatchPlaybookEventSync short-circuits as deduped when a matching dedupe record exists', async () => {
        const firestoreBundle = buildFirestore({
            listeners: [buildListenerDoc('martez-booking-emails', 'executive.booking.martez.followup_ready')],
            deduped: true,
        });
        (createServerClient as jest.Mock).mockResolvedValue(firestoreBundle);

        const summary = await dispatchPlaybookEventSync('org-test', 'executive.booking.martez.followup_ready', {
            customerEmail: 'guest@example.com',
            dedupeKey: 'executive_booking:booking-456:followup',
        });

        expect(summary).toEqual({
            delivered: true,
            deduped: true,
            results: [{ playbookId: 'martez-booking-emails', status: 'deduped' }],
        });
        expect(executePlaybook).not.toHaveBeenCalled();
        expect(firestoreBundle.customerCommsQuery.add).not.toHaveBeenCalled();
    });

    it('dispatchPlaybookEvent keeps the async fire-and-forget path and records dedupe on success', async () => {
        const firestoreBundle = buildFirestore({
            listeners: [buildListenerDoc('jack-booking-emails', 'executive.booking.jack.followup_ready')],
        });
        (createServerClient as jest.Mock).mockResolvedValue(firestoreBundle);

        await dispatchPlaybookEvent('org-test', 'executive.booking.jack.followup_ready', {
            customerEmail: 'shianne@stoneluxmarketing.com',
            dedupeKey: 'executive_booking:booking-123:followup',
        });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(executePlaybook).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'jack-booking-emails',
            triggeredBy: 'event',
        }));
        expect(firestoreBundle.customerCommsQuery.add).toHaveBeenCalledWith(expect.objectContaining({
            type: 'playbook_event_executive.booking.jack.followup_ready',
            dedupeKey: 'executive_booking:booking-123:followup',
        }));
    });

    it('falls back to active playbook definitions when listeners have not been backfilled yet', async () => {
        const firestoreBundle = buildFirestore({
            playbooks: [
                {
                    id: 'playbook_thrive_welcome',
                    status: 'active',
                    triggers: [
                        { type: 'event', eventName: 'customer.signup' },
                        { type: 'event', eventName: 'customer.checkin' },
                    ],
                },
            ],
        });
        (createServerClient as jest.Mock).mockResolvedValue(firestoreBundle);

        const summary = await dispatchPlaybookEventSync('org-test', 'customer.signup', {
            customerEmail: 'martezandco@gmail.com',
            customerName: 'Martez',
        });

        expect(summary).toEqual({
            delivered: true,
            deduped: false,
            results: [{ playbookId: 'playbook_thrive_welcome', status: 'success' }],
        });
        expect(executePlaybook).toHaveBeenCalledWith(expect.objectContaining({
            playbookId: 'playbook_thrive_welcome',
            triggeredBy: 'event',
            eventData: expect.objectContaining({
                eventName: 'customer.signup',
                customerEmail: 'martezandco@gmail.com',
            }),
        }));
        expect(firestoreBundle.batchSet).toHaveBeenCalled();
        expect(firestoreBundle.batchCommit).toHaveBeenCalled();
    });
});
