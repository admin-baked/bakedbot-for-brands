/**
 * Unit tests for health-alerts.ts
 * Tests alert notifications, threshold management, and cooldown logic
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Set env vars FIRST — health-alerts.ts reads these at module load time as constants
// This must be before any import/require of health-alerts
process.env.MAILJET_API_KEY = 'test-key';
process.env.MAILJET_SECRET_KEY = 'test-secret';

// Mutable flag for cooldown behavior (referenced inside hoisted jest.mock)
let mockCooldownEmpty = true;

jest.mock('@/firebase/admin', () => {
    const mockAlertSet = jest.fn().mockResolvedValue(undefined);
    const mockAlertAdd = jest.fn().mockResolvedValue({ id: 'log-1' });
    const mockAlertDocGet = jest.fn().mockResolvedValue({ exists: false, data: () => null });
    const mockAlertDoc = jest.fn().mockReturnValue({
        set: mockAlertSet,
        get: mockAlertDocGet,
    });

    const mockAlertGet = jest.fn().mockImplementation(() => Promise.resolve({
        empty: mockCooldownEmpty,
        docs: [],
    }));

    const mockAlertWhere = jest.fn().mockReturnThis();
    const mockAlertLimit = jest.fn().mockReturnValue({ get: mockAlertGet });

    const mockAlertCollection = jest.fn().mockImplementation((name: string) => {
        if (name === 'health_alert_log') {
            return {
                where: mockAlertWhere,
                limit: mockAlertLimit,
                add: mockAlertAdd,
            };
        }
        if (name === 'system_settings') {
            return { doc: mockAlertDoc };
        }
        return { doc: jest.fn() };
    });

    return {
        getAdminFirestore: jest.fn().mockReturnValue({
            collection: mockAlertCollection,
        }),
        __mocks: {
            mockAlertSet, mockAlertAdd, mockAlertDocGet, mockAlertDoc,
            mockAlertGet, mockAlertWhere, mockAlertLimit, mockAlertCollection,
        },
    };
});

jest.mock('firebase-admin/firestore', () => ({
    Timestamp: {
        fromDate: jest.fn((d: Date) => ({
            toDate: () => d,
            seconds: Math.floor(d.getTime() / 1000),
        })),
    },
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

// Use require() instead of import — import is hoisted above process.env assignments
// but require() runs in place, so env vars are set by the time the module loads
const {
    sendAlertNotification,
    getAlertThresholds,
    saveAlertThresholds,
    processAlertNotifications,
} = require('../health-alerts') as typeof import('../health-alerts');

import type { SystemHealthAlert } from '@/types/system-health';
import { HEALTH_THRESHOLDS } from '@/types/system-health';

// Get mock references
const { __mocks } = require('@/firebase/admin');
const { sendGenericEmail } = require('@/lib/email/dispatcher') as {
    sendGenericEmail: jest.Mock;
};
const {
    mockAlertSet, mockAlertAdd, mockAlertDocGet, mockAlertDoc,
    mockAlertWhere, mockAlertCollection,
} = __mocks;

describe('Health Alerts Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCooldownEmpty = true;
        sendGenericEmail.mockResolvedValue({
            success: true,
            messageId: 'ses-message-1',
        });
    });

    const createMockAlert = (overrides: Partial<SystemHealthAlert> = {}): SystemHealthAlert => ({
        id: 'test-alert-1',
        severity: 'critical',
        type: 'memory',
        message: 'Memory usage critical: 90%',
        timestamp: new Date('2026-02-11T12:00:00Z'),
        resolved: false,
        ...overrides,
    });

    describe('sendAlertNotification', () => {
        it('should return false when no recipients provided', async () => {
            const alert = createMockAlert();
            const result = await sendAlertNotification(alert, []);
            expect(result).toBe(false);
        });

        it('should check cooldown before sending', async () => {
            const alert = createMockAlert();
            await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(mockAlertCollection).toHaveBeenCalledWith('health_alert_log');
            expect(mockAlertWhere).toHaveBeenCalledWith('cooldownKey', '==', 'memory-critical');
        });

        it('should skip sending when alert is on cooldown', async () => {
            mockCooldownEmpty = false;
            const alert = createMockAlert();
            const result = await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(result).toBe(false);
            expect(sendGenericEmail).not.toHaveBeenCalled();
        });

        it('should send email via the dispatcher when not on cooldown', async () => {
            mockCooldownEmpty = true;
            const alert = createMockAlert();
            const result = await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(result).toBe(true);
            expect(sendGenericEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'admin@bakedbot.ai',
                    communicationType: 'transactional',
                })
            );
        });

        it('should log alert after successful send', async () => {
            const alert = createMockAlert();
            await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(mockAlertAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    cooldownKey: 'memory-critical',
                    alertType: 'memory',
                    severity: 'critical',
                    recipients: ['admin@bakedbot.ai'],
                }),
            );
        });

        it('should return false when the dispatcher returns an error', async () => {
            sendGenericEmail.mockResolvedValueOnce({ success: false, error: 'SES failure' });
            const alert = createMockAlert();
            const result = await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(result).toBe(false);
        });

        it('should return false when the dispatcher throws', async () => {
            sendGenericEmail.mockRejectedValueOnce(new Error('Network error'));
            const alert = createMockAlert();
            const result = await sendAlertNotification(alert, ['admin@bakedbot.ai']);

            expect(result).toBe(false);
        });

        it('should format cooldown key as type-severity', async () => {
            const alert = createMockAlert({ type: 'cpu', severity: 'warning' });
            await sendAlertNotification(alert, ['test@test.com']);

            expect(mockAlertWhere).toHaveBeenCalledWith('cooldownKey', '==', 'cpu-warning');
        });

        it('should include subject with severity and type', async () => {
            const alert = createMockAlert({ type: 'latency', severity: 'critical' });
            await sendAlertNotification(alert, ['test@test.com']);

            const payload = sendGenericEmail.mock.calls[0][0];
            expect(payload.subject).toContain('CRITICAL');
            expect(payload.subject).toContain('latency');
        });

        it('should send to multiple recipients', async () => {
            const alert = createMockAlert();
            const recipients = ['admin1@test.com', 'admin2@test.com'];
            await sendAlertNotification(alert, recipients);

            expect(sendGenericEmail).toHaveBeenCalledTimes(2);
            expect(sendGenericEmail).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ to: 'admin1@test.com' })
            );
            expect(sendGenericEmail).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ to: 'admin2@test.com' })
            );
        });
    });

    describe('getAlertThresholds', () => {
        it('should return defaults when no custom thresholds exist', async () => {
            mockAlertDocGet.mockResolvedValueOnce({ exists: false, data: () => null });

            const thresholds = await getAlertThresholds();

            expect(thresholds.memory).toEqual(HEALTH_THRESHOLDS.memory);
            expect(thresholds.cpu).toEqual(HEALTH_THRESHOLDS.cpu);
            expect(thresholds.latency).toEqual(HEALTH_THRESHOLDS.latency);
            expect(thresholds.errorRate).toEqual(HEALTH_THRESHOLDS.errorRate);
            expect(thresholds.notifications.email).toBe(false);
            expect(thresholds.notifications.dashboard).toBe(true);
        });

        it('should return custom thresholds from Firestore', async () => {
            const customThresholds = {
                memory: { warning: 60, critical: 75 },
                cpu: { warning: 50, critical: 70 },
                latency: { warning: 500, critical: 2000 },
                errorRate: { warning: 0.5, critical: 3 },
                notifications: {
                    email: true,
                    emailRecipients: ['test@test.com'],
                    dashboard: true,
                },
                updatedAt: { toDate: () => new Date('2026-02-10') },
                updatedBy: 'user-123',
            };
            mockAlertDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => customThresholds,
            });

            const thresholds = await getAlertThresholds();

            expect(thresholds.memory).toEqual({ warning: 60, critical: 75 });
            expect(thresholds.notifications.email).toBe(true);
        });

        it('should fallback to defaults for missing fields in Firestore doc', async () => {
            mockAlertDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    memory: { warning: 60, critical: 75 },
                    updatedAt: { toDate: () => new Date() },
                    updatedBy: 'user-123',
                }),
            });

            const thresholds = await getAlertThresholds();

            expect(thresholds.memory).toEqual({ warning: 60, critical: 75 });
            expect(thresholds.cpu).toEqual(HEALTH_THRESHOLDS.cpu);
            expect(thresholds.latency).toEqual(HEALTH_THRESHOLDS.latency);
        });

        it('should return defaults on Firestore error', async () => {
            mockAlertDocGet.mockRejectedValueOnce(new Error('Firestore unavailable'));

            const thresholds = await getAlertThresholds();

            expect(thresholds.memory).toEqual(HEALTH_THRESHOLDS.memory);
        });

        it('should read from system_settings/alert_thresholds', async () => {
            await getAlertThresholds();

            expect(mockAlertCollection).toHaveBeenCalledWith('system_settings');
            expect(mockAlertDoc).toHaveBeenCalledWith('alert_thresholds');
        });
    });

    describe('saveAlertThresholds', () => {
        it('should save thresholds to Firestore', async () => {
            const config = {
                memory: { warning: 65, critical: 80 },
                cpu: { warning: 55, critical: 75 },
                latency: { warning: 800, critical: 2500 },
                errorRate: { warning: 0.8, critical: 4 },
                notifications: {
                    email: true,
                    emailRecipients: ['admin@bakedbot.ai'],
                    dashboard: true,
                },
            };

            await saveAlertThresholds(config, 'user-456');

            expect(mockAlertCollection).toHaveBeenCalledWith('system_settings');
            expect(mockAlertDoc).toHaveBeenCalledWith('alert_thresholds');
            expect(mockAlertSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    memory: { warning: 65, critical: 80 },
                    cpu: { warning: 55, critical: 75 },
                    updatedBy: 'user-456',
                }),
                { merge: true },
            );
        });
    });

    describe('processAlertNotifications', () => {
        it('should not send when email notifications disabled', async () => {
            mockAlertDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    memory: HEALTH_THRESHOLDS.memory,
                    cpu: HEALTH_THRESHOLDS.cpu,
                    latency: HEALTH_THRESHOLDS.latency,
                    errorRate: HEALTH_THRESHOLDS.errorRate,
                    notifications: { email: false, emailRecipients: [], dashboard: true },
                    updatedAt: { toDate: () => new Date() },
                    updatedBy: 'system',
                }),
            });

            const alerts = [createMockAlert()];
            await processAlertNotifications(alerts);

            expect(sendGenericEmail).not.toHaveBeenCalled();
        });

        it('should not send when no recipients configured', async () => {
            mockAlertDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    memory: HEALTH_THRESHOLDS.memory,
                    cpu: HEALTH_THRESHOLDS.cpu,
                    latency: HEALTH_THRESHOLDS.latency,
                    errorRate: HEALTH_THRESHOLDS.errorRate,
                    notifications: { email: true, emailRecipients: [], dashboard: true },
                    updatedAt: { toDate: () => new Date() },
                    updatedBy: 'system',
                }),
            });

            const alerts = [createMockAlert()];
            await processAlertNotifications(alerts);

            expect(sendGenericEmail).not.toHaveBeenCalled();
        });

        it('should send notifications for critical and warning alerts', async () => {
            mockAlertDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    memory: HEALTH_THRESHOLDS.memory,
                    cpu: HEALTH_THRESHOLDS.cpu,
                    latency: HEALTH_THRESHOLDS.latency,
                    errorRate: HEALTH_THRESHOLDS.errorRate,
                    notifications: {
                        email: true,
                        emailRecipients: ['admin@bakedbot.ai'],
                        dashboard: true,
                    },
                    updatedAt: { toDate: () => new Date() },
                    updatedBy: 'system',
                }),
            });

            const alerts = [
                createMockAlert({ severity: 'critical', type: 'memory' }),
                createMockAlert({ severity: 'warning', type: 'cpu' }),
                createMockAlert({ severity: 'info', type: 'deployment' }),
            ];
            await processAlertNotifications(alerts);

            // critical + warning should be sent (2 calls), info should not
            expect(sendGenericEmail).toHaveBeenCalledTimes(2);
        });

        it('should handle empty alerts array gracefully', async () => {
            await processAlertNotifications([]);
            // Should not throw
        });
    });
});
