jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('@/server/tools/playbook-manager', () => ({
    executePlaybook: jest.fn(),
}));

import {
    runSuperUserPlaybook,
    toggleSuperUserPlaybook,
    updateSuperUserPlaybook,
} from '../playbook-actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

function buildPlaybook(overrides: Record<string, unknown> = {}) {
    return {
        id: 'martez-booking-emails',
        name: 'Martez Booking Emails',
        description: 'Booking emails',
        agent: 'craig',
        agentId: 'craig',
        category: 'marketing',
        triggers: [{ type: 'event', eventName: 'executive.booking.martez.confirmed' }],
        steps: [],
        orgId: 'bakedbot-internal',
        status: 'paused',
        active: false,
        metadata: {
            requiresEventContext: true,
        },
        ...overrides,
    };
}

describe('super user playbook actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({
            uid: 'super-user-1',
            email: 'owner@bakedbot.ai',
            name: 'Owner',
        } as any);
    });

    it('blocks manual runs for playbooks that require event context', async () => {
        const docRef = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => buildPlaybook(),
            }),
            update: jest.fn(),
        };
        const firestore = {
            collection: jest.fn(() => ({
                doc: jest.fn(() => docRef),
            })),
        };
        mockCreateServerClient.mockResolvedValue({ firestore } as any);

        const result = await runSuperUserPlaybook('martez-booking-emails');

        expect(result).toEqual({
            success: false,
            error: 'This playbook runs from event context and cannot be run manually.',
        });
        expect(docRef.update).not.toHaveBeenCalled();
    });

    it('activating an event playbook upserts active listener docs', async () => {
        const docRef = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => buildPlaybook(),
            }),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const listenerCollection = {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [] }),
            doc: jest.fn((id: string) => ({ id })),
        };
        const scheduleCollection = {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            add: jest.fn().mockResolvedValue({}),
        };
        const batch = {
            set: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };
        const firestore = {
            batch: jest.fn(() => batch),
            collection: jest.fn((name: string) => {
                if (name === 'playbooks') {
                    return { doc: jest.fn(() => docRef) };
                }
                if (name === 'playbook_event_listeners') {
                    return listenerCollection;
                }
                if (name === 'schedules') {
                    return scheduleCollection;
                }
                return { add: jest.fn().mockResolvedValue({}) };
            }),
        };
        mockCreateServerClient.mockResolvedValue({ firestore } as any);

        const result = await toggleSuperUserPlaybook('martez-booking-emails', true);

        expect(result).toEqual({ success: true });
        expect(batch.set).toHaveBeenCalledWith(
            { id: 'super-user-listener:martez-booking-emails:executive.booking.martez.confirmed' },
            expect.objectContaining({
                playbookId: 'martez-booking-emails',
                orgId: 'bakedbot-internal',
                eventName: 'executive.booking.martez.confirmed',
                status: 'active',
                source: 'super_user_playbooks',
            }),
            { merge: true },
        );
    });

    it('updating event triggers removes stale listener docs and upserts the current ones', async () => {
        const docRef = {
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => buildPlaybook({
                    status: 'active',
                    active: true,
                    triggers: [{ type: 'event', eventName: 'executive.booking.martez.confirmed' }],
                }),
            }),
            update: jest.fn().mockResolvedValue(undefined),
        };
        const oldListenerRef = { id: 'super-user-listener:martez-booking-emails:executive.booking.martez.confirmed' };
        const listenerCollection = {
            where: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ docs: [{ id: oldListenerRef.id, ref: oldListenerRef, data: () => ({ createdAt: new Date('2026-03-20T14:00:00Z') }) }] }),
            doc: jest.fn((id: string) => ({ id })),
        };
        const batch = {
            set: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };
        const firestore = {
            batch: jest.fn(() => batch),
            collection: jest.fn((name: string) => {
                if (name === 'playbooks') {
                    return { doc: jest.fn(() => docRef) };
                }
                if (name === 'playbook_event_listeners') {
                    return listenerCollection;
                }
                return { add: jest.fn().mockResolvedValue({}) };
            }),
        };
        mockCreateServerClient.mockResolvedValue({ firestore } as any);

        const result = await updateSuperUserPlaybook('martez-booking-emails', {
            triggers: [{ type: 'event', eventName: 'executive.booking.martez.followup_ready' }],
        });

        expect(result).toEqual({ success: true });
        expect(batch.delete).toHaveBeenCalledWith(oldListenerRef);
        expect(batch.set).toHaveBeenCalledWith(
            { id: 'super-user-listener:martez-booking-emails:executive.booking.martez.followup_ready' },
            expect.objectContaining({
                eventName: 'executive.booking.martez.followup_ready',
                status: 'active',
            }),
            { merge: true },
        );
    });
});
