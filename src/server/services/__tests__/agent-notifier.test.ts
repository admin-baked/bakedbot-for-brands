/**
 * Unit tests for agent-notifier.ts
 * Tests sendAgentNotification multi-channel dispatch logic
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Mocks — jest.mock calls are hoisted above all variable declarations.
// For Firestore we use variables that are referenced in closures (safe),
// for email/push we access the mocked module after import via require().
// ---------------------------------------------------------------------------

const mockSet = jest.fn().mockResolvedValue(undefined);
const mockNotifDoc = jest.fn().mockReturnValue({ set: mockSet, id: 'notif-123' });
const mockSubcollection = jest.fn().mockReturnValue({ doc: mockNotifDoc });
const mockUserGet = jest.fn().mockResolvedValue({
    data: () => ({ email: 'test@example.com' }),
});

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockImplementation((name: string) => {
            if (name === 'users') {
                return {
                    doc: jest.fn().mockReturnValue({
                        collection: mockSubcollection,
                        get: mockUserGet,
                    }),
                };
            }
            return { doc: jest.fn() };
        }),
    }),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/notifications/push-service', () => ({
    sendPushNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { sendAgentNotification } from '../agent-notifier';
import { getAdminFirestore } from '@/firebase/admin';
import { sendGenericEmail } from '@/lib/email/dispatcher';

// Access the push mock through require since it is dynamically imported
const { sendPushNotification } = jest.requireMock('@/lib/notifications/push-service') as {
    sendPushNotification: jest.Mock;
};

// Cast the email mock for assertion convenience
const mockSendGenericEmail = sendGenericEmail as jest.Mock;
const mockSendPushNotification = sendPushNotification as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseParams(overrides: Record<string, unknown> = {}) {
    return {
        orgId: 'org_test',
        userId: 'user_123',
        agent: 'smokey' as const,
        type: 'insight' as const,
        priority: 'medium' as const,
        title: 'Test Notification',
        message: 'Something interesting happened.',
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sendAgentNotification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Creates notification document in users/{userId}/agent_notifications
    it('creates notification document in users/{userId}/agent_notifications', async () => {
        await sendAgentNotification(baseParams());

        // Verify the Firestore chain was traversed correctly
        const db = getAdminFirestore();
        expect(db.collection).toHaveBeenCalledWith('users');

        expect(mockSubcollection).toHaveBeenCalledWith('agent_notifications');
        expect(mockNotifDoc).toHaveBeenCalled();
        expect(mockSet).toHaveBeenCalledTimes(1);

        // Verify the document shape
        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc).toMatchObject({
            orgId: 'org_test',
            userId: 'user_123',
            agent: 'smokey',
            type: 'insight',
            priority: 'medium',
            title: 'Test Notification',
            message: 'Something interesting happened.',
        });
    });

    // 2. Returns notification ID on success
    it('returns notification ID on success', async () => {
        const id = await sendAgentNotification(baseParams());
        expect(id).toBe('notif-123');
    });

    // 3. Returns null on Firestore error
    it('returns null on Firestore error', async () => {
        mockSet.mockRejectedValueOnce(new Error('Firestore write failed'));

        const id = await sendAgentNotification(baseParams());
        expect(id).toBeNull();
    });

    // 4. Default channels for urgent: dashboard + email + push
    it('defaults to dashboard, email, push for urgent priority', async () => {
        await sendAgentNotification(baseParams({ priority: 'urgent' }));

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.channels).toEqual(['dashboard', 'email', 'push']);
    });

    // 5. Default channels for high: dashboard + email
    it('defaults to dashboard, email for high priority', async () => {
        await sendAgentNotification(baseParams({ priority: 'high' }));

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.channels).toEqual(['dashboard', 'email']);
    });

    // 6. Default channels for medium: dashboard only
    it('defaults to dashboard only for medium priority', async () => {
        await sendAgentNotification(baseParams({ priority: 'medium' }));

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.channels).toEqual(['dashboard']);
    });

    // 7. Default channels for low: dashboard only
    it('defaults to dashboard only for low priority', async () => {
        await sendAgentNotification(baseParams({ priority: 'low' }));

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.channels).toEqual(['dashboard']);
    });

    // 8. Uses custom channels when provided
    it('uses custom channels when provided', async () => {
        await sendAgentNotification(
            baseParams({ channels: ['email', 'sms'] }),
        );

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.channels).toEqual(['email', 'sms']);
    });

    // 9. Dispatches email when channels include 'email'
    it('dispatches email when channels include email', async () => {
        await sendAgentNotification(
            baseParams({ priority: 'high' }), // default channels: dashboard + email
        );

        // Allow fire-and-forget promises to settle
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockSendGenericEmail).toHaveBeenCalledTimes(1);
        expect(mockSendGenericEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'test@example.com',
                orgId: 'org_test',
                communicationType: 'transactional',
                agentName: 'smokey',
            }),
        );
    });

    // 10. Dispatches push when channels include 'push'
    it('dispatches push when channels include push', async () => {
        await sendAgentNotification(
            baseParams({ priority: 'urgent' }), // default channels: dashboard + email + push
        );

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockSendPushNotification).toHaveBeenCalledTimes(1);
        expect(mockSendPushNotification).toHaveBeenCalledWith(
            'user_123',
            expect.objectContaining({
                title: 'Test Notification',
                body: 'Something interesting happened.',
            }),
        );
    });

    // 11. Does NOT dispatch email for dashboard-only
    it('does not dispatch email for dashboard-only channels', async () => {
        await sendAgentNotification(baseParams({ priority: 'low' })); // dashboard only

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockSendGenericEmail).not.toHaveBeenCalled();
        expect(mockSendPushNotification).not.toHaveBeenCalled();
    });

    // 12. Sets status to 'unread' on creation
    it('sets status to unread on creation', async () => {
        await sendAgentNotification(baseParams());

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.status).toBe('unread');
    });

    // 13. Includes heartbeatCheckId when provided
    it('includes heartbeatCheckId when provided', async () => {
        await sendAgentNotification(
            baseParams({
                heartbeatCheckId: 'low_stock',
                heartbeatExecutionId: 'exec_abc',
            }),
        );

        const savedDoc = mockSet.mock.calls[0][0];
        expect(savedDoc.heartbeatCheckId).toBe('low_stock');
        expect(savedDoc.heartbeatExecutionId).toBe('exec_abc');
    });
});
