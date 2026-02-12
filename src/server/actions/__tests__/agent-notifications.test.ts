/**
 * Agent Notifications Server Actions Tests
 *
 * Tests for getNotifications, getUnreadCount, markNotificationRead,
 * markAllRead, and dismissNotification server actions.
 */

import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllRead,
    dismissNotification,
} from '../agent-notifications';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-1',
        email: 'test@example.com',
        role: 'dispensary',
    }),
}));

// Chainable Firestore mock helper
const createChainableMock = (finalResult: unknown = { docs: [] }) => {
    const mock: Record<string, jest.Mock> = {};
    const chainMethods = ['collection', 'doc', 'where', 'orderBy', 'limit'];

    chainMethods.forEach(method => {
        mock[method] = jest.fn(() => mock);
    });

    mock.get = jest.fn().mockResolvedValue(finalResult);
    mock.update = jest.fn().mockResolvedValue(undefined);
    mock.count = jest.fn(() => mock);

    // batch support
    const batchUpdateFn = jest.fn();
    const batchCommitFn = jest.fn().mockResolvedValue(undefined);
    mock.batch = jest.fn(() => ({
        update: batchUpdateFn,
        commit: batchCommitFn,
    }));
    // expose for assertions
    (mock as any)._batchUpdate = batchUpdateFn;
    (mock as any)._batchCommit = batchCommitFn;

    return mock;
};

const mockFirestore = createChainableMock();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: mockFirestore,
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agent Notifications Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset chain defaults
        ['collection', 'doc', 'where', 'orderBy', 'limit', 'count'].forEach(m => {
            mockFirestore[m]?.mockReturnValue(mockFirestore);
        });
        mockFirestore.get.mockResolvedValue({ docs: [], empty: true, data: () => ({ count: 0 }) });
        mockFirestore.update.mockResolvedValue(undefined);
    });

    // -----------------------------------------------------------------------
    // getNotifications
    // -----------------------------------------------------------------------

    describe('getNotifications', () => {
        it('returns mapped notifications', async () => {
            const fakeDate = new Date('2026-01-15T10:00:00Z');
            mockFirestore.get.mockResolvedValue({
                docs: [
                    {
                        id: 'notif-1',
                        data: () => ({
                            title: 'Low stock alert',
                            message: 'OG Kush is below threshold',
                            type: 'inventory_alert',
                            status: 'unread',
                            createdAt: { toDate: () => fakeDate },
                            updatedAt: { toDate: () => fakeDate },
                        }),
                    },
                    {
                        id: 'notif-2',
                        data: () => ({
                            title: 'Campaign sent',
                            message: 'Weekly promo delivered',
                            type: 'campaign_sent',
                            status: 'read',
                            createdAt: { toDate: () => fakeDate },
                            updatedAt: { toDate: () => fakeDate },
                        }),
                    },
                ],
            });

            const result = await getNotifications();

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('notif-1');
            expect(result[0].title).toBe('Low stock alert');
            expect(result[0].createdAt).toEqual(fakeDate);
            expect(result[1].id).toBe('notif-2');
            expect(result[1].status).toBe('read');
        });

        it('applies where clause when status filter provided', async () => {
            mockFirestore.get.mockResolvedValue({ docs: [] });

            await getNotifications({ status: 'unread' });

            expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'unread');
        });

        it('returns empty array on error', async () => {
            mockFirestore.get.mockRejectedValue(new Error('Firestore timeout'));

            const result = await getNotifications();

            expect(result).toEqual([]);
        });
    });

    // -----------------------------------------------------------------------
    // getUnreadCount
    // -----------------------------------------------------------------------

    describe('getUnreadCount', () => {
        it('returns count from Firestore', async () => {
            mockFirestore.get.mockResolvedValue({
                data: () => ({ count: 7 }),
            });

            const result = await getUnreadCount();

            expect(result).toBe(7);
            expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'unread');
            expect(mockFirestore.count).toHaveBeenCalled();
        });

        it('returns 0 on error', async () => {
            mockFirestore.get.mockRejectedValue(new Error('Permission denied'));

            const result = await getUnreadCount();

            expect(result).toBe(0);
        });
    });

    // -----------------------------------------------------------------------
    // markNotificationRead
    // -----------------------------------------------------------------------

    describe('markNotificationRead', () => {
        it('calls update with status read', async () => {
            mockFirestore.update.mockResolvedValue(undefined);

            const result = await markNotificationRead('notif-42');

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('notif-42');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'read' })
            );
        });

        it('returns false on error', async () => {
            mockFirestore.update.mockRejectedValue(new Error('Not found'));

            const result = await markNotificationRead('bad-id');

            expect(result).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // markAllRead
    // -----------------------------------------------------------------------

    describe('markAllRead', () => {
        it('batch updates all unread notifications', async () => {
            const docRef1 = { id: 'notif-1' };
            const docRef2 = { id: 'notif-2' };
            mockFirestore.get.mockResolvedValue({
                empty: false,
                docs: [
                    { ref: docRef1 },
                    { ref: docRef2 },
                ],
            });

            const batchMock = { update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
            mockFirestore.batch.mockReturnValue(batchMock);

            const result = await markAllRead();

            expect(result).toBe(true);
            expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'unread');
            expect(batchMock.update).toHaveBeenCalledTimes(2);
            expect(batchMock.update).toHaveBeenCalledWith(
                docRef1,
                expect.objectContaining({ status: 'read' })
            );
            expect(batchMock.update).toHaveBeenCalledWith(
                docRef2,
                expect.objectContaining({ status: 'read' })
            );
            expect(batchMock.commit).toHaveBeenCalled();
        });

        it('returns true when no unread notifications', async () => {
            mockFirestore.get.mockResolvedValue({ empty: true, docs: [] });

            const result = await markAllRead();

            expect(result).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // dismissNotification
    // -----------------------------------------------------------------------

    describe('dismissNotification', () => {
        it('calls update with status dismissed', async () => {
            mockFirestore.update.mockResolvedValue(undefined);

            const result = await dismissNotification('notif-99');

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('notif-99');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'dismissed' })
            );
        });
    });
});
