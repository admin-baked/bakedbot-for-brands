/**
 * User Notification Service Tests
 *
 * Tests email notifications for user approval, rejection, and promotion.
 */

import { UserNotificationService } from '@/server/services/user-notification';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { auditLogStreaming } from '@/server/services/audit-log-streaming';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('@/server/services/audit-log-streaming', () => ({
    auditLogStreaming: {
        logAction: jest.fn(),
    },
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('UserNotificationService', () => {
    const mockSendGenericEmail = sendGenericEmail as jest.MockedFunction<typeof sendGenericEmail>;
    const mockAuditLog = auditLogStreaming.logAction as jest.MockedFunction<typeof auditLogStreaming.logAction>;
    const { getAdminFirestore } = require('@/firebase/admin') as {
        getAdminFirestore: jest.Mock;
    };

    let service: UserNotificationService;
    let mockUsersDocGet: jest.Mock;
    let mockTenantDocGet: jest.Mock;
    let mockUsersQueryGet: jest.Mock;
    let usersCollection: {
        doc: jest.Mock;
        where: jest.Mock;
    };
    let tenantsCollection: {
        doc: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUsersDocGet = jest.fn();
        mockTenantDocGet = jest.fn();
        mockUsersQueryGet = jest.fn();

        const mockUsersQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: mockUsersQueryGet,
        };

        usersCollection = {
            doc: jest.fn(() => ({
                get: mockUsersDocGet,
            })),
            where: jest.fn(() => mockUsersQuery),
        };

        tenantsCollection = {
            doc: jest.fn(() => ({
                get: mockTenantDocGet,
            })),
        };

        getAdminFirestore.mockReturnValue({
            collection: jest.fn((name: string) => {
                if (name === 'users') return usersCollection;
                if (name === 'tenants') return tenantsCollection;
                throw new Error(`Unexpected collection: ${name}`);
            }),
        });

        mockSendGenericEmail.mockResolvedValue({
            success: true,
            messageId: 'msg-1',
        });

        mockAuditLog.mockResolvedValue(undefined as never);

        service = new UserNotificationService();
    });

    function seedUser(data?: Partial<{ email: string; name: string; orgId: string }>) {
        mockUsersDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                email: 'user@example.com',
                name: 'John Doe',
                orgId: 'org123',
                ...data,
            }),
        });
    }

    function seedTenant(data?: Partial<{ name: string; adminEmail: string }>) {
        mockTenantDocGet.mockResolvedValue({
            exists: true,
            data: () => ({
                name: 'Test Org',
                adminEmail: 'admin@test-org.com',
                ...data,
            }),
        });
    }

    describe('notifyUserApproved', () => {
        it('sends approval emails to the user and org admin', async () => {
            seedUser();
            seedTenant();

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(true);
            expect(mockSendGenericEmail).toHaveBeenCalledTimes(2);
            expect(mockSendGenericEmail).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({
                    to: 'user@example.com',
                    name: 'John Doe',
                    subject: 'Welcome to BakedBot!',
                    fromEmail: 'hello@bakedbot.ai',
                })
            );
            expect(mockSendGenericEmail).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    to: 'admin@test-org.com',
                    subject: '[Admin] Welcome to BakedBot!',
                })
            );
            expect(mockAuditLog).toHaveBeenCalledWith(
                'user_approval_notification_sent',
                'admin@example.com',
                'user123',
                'user',
                'success',
                expect.objectContaining({ orgId: 'org123', recipientCount: 2 })
            );
        });

        it('includes the user and org in the approval email body', async () => {
            seedUser({ name: 'Jane Smith', orgId: 'org456' });
            seedTenant({ name: 'North Star' });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const payload = mockSendGenericEmail.mock.calls[0][0];
            expect(payload.htmlBody).toContain('Jane Smith');
            expect(payload.htmlBody).toContain('North Star');
            expect(payload.htmlBody).toContain('Dashboard');
        });

        it('returns false when the user does not exist', async () => {
            mockUsersDocGet.mockResolvedValue({ exists: false });

            const result = await service.notifyUserApproved('missing-user', 'admin@example.com');

            expect(result).toBe(false);
            expect(mockSendGenericEmail).not.toHaveBeenCalled();
        });

        it('returns false when the user email send fails', async () => {
            seedUser();
            seedTenant();
            mockSendGenericEmail.mockResolvedValueOnce({
                success: false,
                error: 'SES down',
            });

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });
    });

    describe('notifyUserRejected', () => {
        it('includes the rejection reason in the email body', async () => {
            seedUser({ name: 'Jane Smith' });
            seedTenant();

            const result = await service.notifyUserRejected(
                'user123',
                'admin@example.com',
                'Background check did not pass'
            );

            expect(result).toBe(true);
            expect(mockSendGenericEmail).toHaveBeenCalledTimes(2);
            expect(mockSendGenericEmail.mock.calls[0][0].htmlBody).toContain('Background check did not pass');
        });

        it('handles rejection without a reason', async () => {
            seedUser();
            seedTenant();

            const result = await service.notifyUserRejected('user123', 'admin@example.com');

            expect(result).toBe(true);
            expect(mockSendGenericEmail.mock.calls[0][0].htmlBody).toContain('Application Update');
        });
    });

    describe('notifyUserPromoted', () => {
        it('sends the promotion email with the new role in the body', async () => {
            mockUsersDocGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'Jane Smith',
                }),
            });

            const result = await service.notifyUserPromoted('user123', 'admin@example.com', 'brand_admin');

            expect(result).toBe(true);
            expect(mockSendGenericEmail).toHaveBeenCalledTimes(1);
            expect(mockSendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'user@example.com',
                    subject: "You've been promoted to Super User!",
                    htmlBody: expect.stringContaining('brand_admin'),
                })
            );
        });

        it('returns false when the promoted user does not exist', async () => {
            mockUsersDocGet.mockResolvedValue({ exists: false });

            const result = await service.notifyUserPromoted('missing-user', 'admin@example.com', 'super_user');

            expect(result).toBe(false);
        });
    });

    describe('getOrgAdminEmail behavior', () => {
        it('falls back to querying dispensary users when tenant adminEmail is missing', async () => {
            seedUser();
            seedTenant({ adminEmail: undefined as unknown as string });
            mockUsersQueryGet.mockResolvedValue({
                empty: false,
                docs: [{ data: () => ({ email: 'dispensary@test-org.com' }) }],
            });

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(true);
            expect(usersCollection.where).toHaveBeenCalledWith('orgId', '==', 'org123');
            const chainedWhere = usersCollection.where.mock.results[0].value.where;
            expect(chainedWhere).toHaveBeenCalledWith('role', '==', 'dispensary');
            expect(mockSendGenericEmail).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ to: 'dispensary@test-org.com' })
            );
        });
    });

    describe('error handling', () => {
        it('returns false on Firestore errors', async () => {
            mockUsersDocGet.mockRejectedValue(new Error('Firestore error'));

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });

        it('returns false when the dispatcher rejects', async () => {
            seedUser();
            seedTenant();
            mockSendGenericEmail.mockRejectedValueOnce(new Error('Network error'));

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });
    });
});
