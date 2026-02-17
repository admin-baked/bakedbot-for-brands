/**
 * User Notification Service Tests
 *
 * Tests for email notifications on user approval/rejection/promotion
 */

import { UserNotificationService } from '@/server/services/user-notification';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
    getAdminAuth: jest.fn(),
}));

jest.mock('@/server/services/audit-log-streaming');
jest.mock('@/lib/logger');

global.fetch = jest.fn();

describe('UserNotificationService', () => {
    let service: UserNotificationService;
    let mockDb: any;
    let mockCollection: any;
    let mockQuery: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Firestore
        mockQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue({
                get: jest.fn(),
                update: jest.fn(),
            }),
            where: jest.fn().mockReturnValue(mockQuery),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue(mockDb);

        service = new UserNotificationService();

        // Mock fetch
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });
    });

    describe('notifyUserApproved', () => {
        it('should send approval email to user', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            mockCollection.doc().update.mockResolvedValue({});

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalled();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[0]).toContain('mailjet.com');
        });

        it('should include user and org info in email', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'Jane Smith',
                    orgId: 'org456',
                }),
            });

            // Mock org doc
            mockDb.collection = jest.fn((collName) => {
                if (collName === 'tenants') {
                    return {
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({ name: 'Test Org' }),
                            }),
                        })),
                    };
                }
                return mockCollection;
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.Messages[0]['Html-part']).toContain('Jane Smith');
        });

        it('should return false if user not found', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: false,
            });

            const result = await service.notifyUserApproved('nonexistent', 'admin@example.com');

            expect(result).toBe(false);
        });

        it('should return false if Mailjet fails', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ error: 'Invalid email' }),
            });

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });

        it('should return false if Mailjet credentials missing', async () => {
            const originalEnv = process.env;
            process.env = { ...originalEnv, MAILJET_API_KEY: undefined, MAILJET_API_SECRET: undefined };

            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);

            process.env = originalEnv;
        });
    });

    describe('notifyUserRejected', () => {
        it('should send rejection email with reason', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            const result = await service.notifyUserRejected('user123', 'admin@example.com', 'Verification failed');

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalled();

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.Messages[0]['Html-part']).toContain('Verification failed');
        });

        it('should include rejection reason in email', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'Jane Smith',
                    orgId: 'org456',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            const reason = 'Background check did not pass';
            await service.notifyUserRejected('user123', 'admin@example.com', reason);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.Messages[0]['Html-part']).toContain(reason);
        });

        it('should handle rejection without reason', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            const result = await service.notifyUserRejected('user123', 'admin@example.com');

            expect(result).toBe(true);
        });

        it('should return false if user not found', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: false,
            });

            const result = await service.notifyUserRejected('nonexistent', 'admin@example.com');

            expect(result).toBe(false);
        });
    });

    describe('notifyUserPromoted', () => {
        it('should send promotion email', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                }),
            });

            const result = await service.notifyUserPromoted('user123', 'admin@example.com', 'super_user');

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalled();
        });

        it('should include role in promotion email', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'Jane Smith',
                }),
            });

            const newRole = 'brand_admin';
            await service.notifyUserPromoted('user123', 'admin@example.com', newRole);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            expect(body.Messages[0]['Html-part']).toContain('promoted');
            expect(body.Messages[0]['Html-part']).toContain('brand_admin');
        });

        it('should return false if user not found', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: false,
            });

            const result = await service.notifyUserPromoted('nonexistent', 'admin@example.com', 'super_user');

            expect(result).toBe(false);
        });
    });

    describe('sendEmailViaMailjet', () => {
        it('should use correct Mailjet endpoint', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[0]).toBe('https://api.mailjet.com/v3.1/send');
            expect(fetchCall[1].method).toBe('POST');
        });

        it('should include Mailjet authentication', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[1].headers.Authorization).toMatch(/^Basic /);
        });

        it('should set correct content type', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
        });
    });

    describe('getOrgAdminEmail', () => {
        it('should query users collection for dispensary role', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            // Should query for dispensary role
            expect(mockQuery.where).toHaveBeenCalled();
        });
    });

    describe('email templates', () => {
        it('approval email should contain welcome message', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserApproved('user123', 'admin@example.com');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            const html = body.Messages[0]['Html-part'];

            expect(html).toContain('Welcome');
            expect(html).toContain('approved');
            expect(html).toContain('Dashboard');
        });

        it('rejection email should be professional', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            await service.notifyUserRejected('user123', 'admin@example.com', 'Test reason');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            const html = body.Messages[0]['Html-part'];

            expect(html).toContain('Application Update');
            expect(html).toContain('Thank you');
        });

        it('promotion email should highlight new features', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                }),
            });

            await service.notifyUserPromoted('user123', 'admin@example.com', 'super_user');

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);
            const html = body.Messages[0]['Html-part'];

            expect(html).toContain('Promoted');
            expect(html).toContain('Analytics');
            expect(html).toContain('User Management');
        });
    });

    describe('error handling', () => {
        it('should handle Firestore errors gracefully', async () => {
            mockCollection.doc().get.mockRejectedValue(new Error('Firestore error'));

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });

        it('should handle network errors gracefully', async () => {
            mockCollection.doc().get.mockResolvedValue({
                exists: true,
                data: () => ({
                    email: 'user@example.com',
                    name: 'John Doe',
                    orgId: 'org123',
                }),
            });

            mockQuery.get.mockResolvedValue({
                empty: true,
            });

            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await service.notifyUserApproved('user123', 'admin@example.com');

            expect(result).toBe(false);
        });
    });
});
