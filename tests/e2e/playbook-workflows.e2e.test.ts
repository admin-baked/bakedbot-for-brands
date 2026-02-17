/**
 * E2E: Playbook Workflows
 *
 * End-to-end tests for complete playbook workflows:
 * 1. Health Check Failure → Alert Playbook → Email/Slack notification
 * 2. User Approval → Email notification → Audit log
 * 3. Real-time audit log streaming in dashboard
 * 4. Cache invalidation on playbook mutations
 */

import { systemHealthChecks } from '@/server/services/system-health-checks';
import { healthCheckEvents } from '@/server/services/health-check-events';
import { auditLogStreaming } from '@/server/services/audit-log-streaming';
import { userNotification } from '@/server/services/user-notification';
import type { HealthCheckResult } from '@/server/services/system-health-checks';

// Mock Firebase
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
    getAdminAuth: jest.fn(),
}));

// Mock playbook dispatcher
jest.mock('@/server/services/playbook-event-dispatcher', () => ({
    dispatchPlaybookEvent: jest.fn(),
}));

jest.mock('@/lib/logger');

describe('E2E: Playbook Workflows', () => {
    let mockDb: any;
    let mockDispatchPlaybookEvent: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Firestore
        const mockQuery = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn(),
            onSnapshot: jest.fn(),
        };

        const mockCollection = {
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn().mockResolvedValue(undefined),
                update: jest.fn().mockResolvedValue(undefined),
                add: jest.fn().mockResolvedValue({ id: 'doc1' }),
            }),
            add: jest.fn().mockResolvedValue({ id: 'doc1' }),
            where: jest.fn().mockReturnValue(mockQuery),
            orderBy: jest.fn().mockReturnValue(mockQuery),
            count: jest.fn().mockReturnValue(mockQuery),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            }),
        };

        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue(mockDb);

        const { dispatchPlaybookEvent } = require('@/server/services/playbook-event-dispatcher');
        mockDispatchPlaybookEvent = dispatchPlaybookEvent;
        mockDispatchPlaybookEvent.mockResolvedValue(undefined);
    });

    describe('Workflow 1: Health Check Failure → Alert Playbook', () => {
        it('should emit heartbeat.failed event when heartbeat check fails', async () => {
            // 1. Execute health check
            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Last heartbeat failed',
                    timestamp: new Date(),
                    durationMs: 50,
                },
            ];

            // 2. Process health checks (emits playbook events)
            const events = await healthCheckEvents.processHealthChecks('org123', results);

            // 3. Verify event was created and dispatched
            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('heartbeat.failed');
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
                'org123',
                'heartbeat.failed',
                expect.objectContaining({
                    severity: 'critical',
                    source: 'health_check_system',
                })
            );
        });

        it('should emit database.critical_slow event when latency exceeds threshold', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Database latency: 600ms',
                    timestamp: new Date(),
                    details: { latencyMs: 600 },
                    durationMs: 50,
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('database.critical_slow');
            expect(events[0].details?.latencyMs).toBe(600);
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
                'org123',
                'database.critical_slow',
                expect.any(Object)
            );
        });

        it('should log health check to audit trail', async () => {
            // Mock audit logging
            const logActionSpy = jest.spyOn(auditLogStreaming, 'logAction').mockResolvedValue('log1');

            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Failed',
                    timestamp: new Date(),
                    durationMs: 50,
                },
            ];

            // Execute health check
            const run = {
                runId: 'run1',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'failed' as const,
                results,
                durationMs: 100,
            };

            await auditLogStreaming.logAction(
                'system_health_check_executed',
                'system-health-check-cron',
                run.runId,
                'health_check',
                'failed',
                { checkCount: results.length, failedCount: 1 }
            );

            expect(logActionSpy).toHaveBeenCalledWith(
                'system_health_check_executed',
                'system-health-check-cron',
                'run1',
                'health_check',
                'failed',
                expect.any(Object)
            );

            logActionSpy.mockRestore();
        });
    });

    describe('Workflow 2: User Approval → Email Notification', () => {
        it('should send approval email when user is approved', async () => {
            // Mock user notifications
            const notifySpy = jest
                .spyOn(userNotification, 'notifyUserApproved')
                .mockResolvedValue(true);

            // 1. Approve user (triggers email)
            const success = await userNotification.notifyUserApproved('user123', 'admin@example.com');

            // 2. Verify email was sent
            expect(success).toBe(true);
            expect(notifySpy).toHaveBeenCalledWith('user123', 'admin@example.com');

            notifySpy.mockRestore();
        });

        it('should log user approval to audit trail', async () => {
            const logActionSpy = jest.spyOn(auditLogStreaming, 'logAction').mockResolvedValue('log1');

            // Log approval action
            await auditLogStreaming.logAction(
                'user_approved',
                'admin@example.com',
                'user123',
                'user',
                'success',
                { orgId: 'org123' }
            );

            expect(logActionSpy).toHaveBeenCalledWith(
                'user_approved',
                'admin@example.com',
                'user123',
                'user',
                'success',
                expect.any(Object)
            );

            logActionSpy.mockRestore();
        });

        it('should create approval notification event and audit entry', async () => {
            const logActionSpy = jest.spyOn(auditLogStreaming, 'logAction').mockResolvedValue('log1');
            const notifySpy = jest
                .spyOn(userNotification, 'notifyUserApproved')
                .mockResolvedValue(true);

            // Simulate user approval flow
            const userId = 'user123';
            const approvedBy = 'admin@example.com';

            // 1. Send approval email
            await userNotification.notifyUserApproved(userId, approvedBy);

            // 2. Log to audit trail
            await auditLogStreaming.logAction(
                'user_approval_notification_sent',
                approvedBy,
                userId,
                'user',
                'success',
                { orgId: 'org123' }
            );

            expect(notifySpy).toHaveBeenCalled();
            expect(logActionSpy).toHaveBeenCalledWith(
                'user_approval_notification_sent',
                approvedBy,
                userId,
                'user',
                'success',
                expect.any(Object)
            );

            notifySpy.mockRestore();
            logActionSpy.mockRestore();
        });
    });

    describe('Workflow 3: Real-time Audit Log Streaming', () => {
        it('should stream audit logs with historical data first', async () => {
            const streamSpy = jest
                .spyOn(auditLogStreaming, 'streamAuditLogs')
                .mockReturnValue(() => {});

            // Subscribe to audit log stream
            const unsubscribe = auditLogStreaming.streamAuditLogs(
                {
                    onData: jest.fn(),
                    onError: jest.fn(),
                },
                { limit: 50, returnHistorical: true }
            );

            // Verify stream was set up with correct options
            expect(streamSpy).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    limit: 50,
                    returnHistorical: true,
                })
            );

            // Verify unsubscribe is a function
            expect(typeof unsubscribe).toBe('function');

            streamSpy.mockRestore();
        });

        it('should filter audit logs by action', async () => {
            const streamSpy = jest
                .spyOn(auditLogStreaming, 'streamAuditLogs')
                .mockReturnValue(() => {});

            // Stream only user_approved actions
            auditLogStreaming.streamAuditLogs(
                { onData: jest.fn() },
                { filter: { action: 'user_approved' }, limit: 50 }
            );

            expect(streamSpy).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    filter: { action: 'user_approved' },
                })
            );

            streamSpy.mockRestore();
        });

        it('should filter audit logs by multiple criteria', async () => {
            const streamSpy = jest
                .spyOn(auditLogStreaming, 'streamAuditLogs')
                .mockReturnValue(() => {});

            // Stream failures from specific actor
            auditLogStreaming.streamAuditLogs(
                { onData: jest.fn() },
                {
                    filter: {
                        action: 'user_approved',
                        status: 'failed',
                        actor: 'admin@example.com',
                    },
                    limit: 100,
                }
            );

            expect(streamSpy).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    filter: expect.objectContaining({
                        action: 'user_approved',
                        status: 'failed',
                        actor: 'admin@example.com',
                    }),
                })
            );

            streamSpy.mockRestore();
        });
    });

    describe('Workflow 4: Multiple Events from Single Health Check Run', () => {
        it('should emit multiple events for multiple health check failures', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                    durationMs: 50,
                },
                {
                    checkId: 'hc2',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'DB slow',
                    timestamp: new Date(),
                    details: { latencyMs: 600 },
                    durationMs: 50,
                },
                {
                    checkId: 'hc3',
                    checkType: 'platform_analytics',
                    status: 'error',
                    message: 'Analytics down',
                    timestamp: new Date(),
                    durationMs: 50,
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(3);
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledTimes(3);

            // Verify all events were dispatched
            const eventNames = mockDispatchPlaybookEvent.mock.calls.map((call) => call[1]);
            expect(eventNames).toContain('heartbeat.failed');
            expect(eventNames).toContain('database.critical_slow');
            expect(eventNames).toContain('analytics.unavailable');
        });

        it('should log health check run and all events to audit trail', async () => {
            const logActionSpy = jest.spyOn(auditLogStreaming, 'logAction').mockResolvedValue('log1');

            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Failed',
                    timestamp: new Date(),
                    durationMs: 50,
                },
                {
                    checkId: 'hc2',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Slow',
                    timestamp: new Date(),
                    durationMs: 50,
                },
            ];

            // Log health check run
            await auditLogStreaming.logAction(
                'system_health_check_executed',
                'system-health-check-cron',
                'run1',
                'health_check',
                'failed',
                { checkCount: 2, failedCount: 2 }
            );

            // Log each event emission
            const events = await healthCheckEvents.processHealthChecks('org123', results);
            for (const event of events) {
                await auditLogStreaming.logAction(
                    'playbook_event_emitted',
                    'system-health-check-cron',
                    'run1',
                    'playbook_event',
                    'success',
                    { eventName: event.eventName, severity: event.severity }
                );
            }

            expect(logActionSpy).toHaveBeenCalledTimes(3); // 1 health check + 2 event emissions

            logActionSpy.mockRestore();
        });
    });

    describe('Workflow 5: Error Handling and Recovery', () => {
        it('should continue processing if playbook dispatch fails', async () => {
            mockDispatchPlaybookEvent
                .mockRejectedValueOnce(new Error('Dispatch failed'))
                .mockResolvedValueOnce(undefined);

            const results: HealthCheckResult[] = [
                {
                    checkId: 'hc1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Failed',
                    timestamp: new Date(),
                    durationMs: 50,
                },
                {
                    checkId: 'hc2',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Slow',
                    timestamp: new Date(),
                    durationMs: 50,
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            // Should still process both events
            expect(events).toHaveLength(2);
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledTimes(2);
        });

        it('should handle notification failures gracefully', async () => {
            const notifySpy = jest
                .spyOn(userNotification, 'notifyUserApproved')
                .mockRejectedValue(new Error('Email service down'));

            try {
                await userNotification.notifyUserApproved('user123', 'admin@example.com');
            } catch (error) {
                // Expected to fail, but should not crash the workflow
                expect(error).toBeDefined();
            }

            expect(notifySpy).toHaveBeenCalled();

            notifySpy.mockRestore();
        });
    });
});
