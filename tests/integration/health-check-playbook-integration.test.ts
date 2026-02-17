/**
 * Health Check → Playbook Integration Tests
 *
 * Tests the full flow from health check failures to playbook event dispatch
 */

import { healthCheckEvents } from '@/server/services/health-check-events';
import type { HealthCheckResult } from '@/server/services/system-health-checks';

// Mock playbook event dispatcher
jest.mock('@/server/services/playbook-event-dispatcher', () => ({
    dispatchPlaybookEvent: jest.fn(),
}));

jest.mock('@/lib/logger');

describe('Health Check → Playbook Integration', () => {
    let mockDispatchPlaybookEvent: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        const { dispatchPlaybookEvent } = require('@/server/services/playbook-event-dispatcher');
        mockDispatchPlaybookEvent = dispatchPlaybookEvent;
    });

    describe('processHealthChecks', () => {
        it('should emit heartbeat.failed event on critical heartbeat failure', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Last heartbeat failed 5 minutes ago',
                    timestamp: new Date(),
                    details: { lastExecution: { status: 'failed' } },
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('heartbeat.failed');
            expect(events[0].severity).toBe('critical');
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
                'org123',
                'heartbeat.failed',
                expect.objectContaining({
                    severity: 'critical',
                    checkType: 'heartbeat_diagnose',
                    source: 'health_check_system',
                })
            );
        });

        it('should emit heartbeat.stale event on stale heartbeat warning', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'warning',
                    message: 'Heartbeat hasn\'t run in 40 minutes (expected: 30)',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('heartbeat.stale');
            expect(events[0].severity).toBe('warning');
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledWith(
                'org123',
                'heartbeat.stale',
                expect.objectContaining({
                    severity: 'warning',
                })
            );
        });

        it('should emit database.critical_slow event on severe latency', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Database latency: 650ms',
                    timestamp: new Date(),
                    details: { latencyMs: 650 },
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('database.critical_slow');
            expect(events[0].severity).toBe('critical');
            expect(events[0].details?.latencyMs).toBe(650);
        });

        it('should emit database.slow event on warning latency', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'database_latency',
                    status: 'warning',
                    message: 'Database latency: 350ms',
                    timestamp: new Date(),
                    details: { latencyMs: 350 },
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('database.slow');
            expect(events[0].severity).toBe('warning');
        });

        it('should emit analytics.unavailable event on service down', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'platform_analytics',
                    status: 'error',
                    message: 'Analytics service unavailable',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('analytics.unavailable');
            expect(events[0].severity).toBe('critical');
        });

        it('should skip healthy checks and not emit events', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'system_stats',
                    status: 'healthy',
                    message: 'System healthy',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check2',
                    checkType: 'heartbeat_diagnose',
                    status: 'healthy',
                    message: 'Heartbeat healthy',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(0);
            expect(mockDispatchPlaybookEvent).not.toHaveBeenCalled();
        });

        it('should emit multiple events for multiple failures', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check2',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Database slow',
                    timestamp: new Date(),
                    details: { latencyMs: 600 },
                },
                {
                    checkId: 'check3',
                    checkType: 'platform_analytics',
                    status: 'error',
                    message: 'Analytics down',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(3);
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledTimes(3);
        });

        it('should handle mixed health/failure results', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'system_stats',
                    status: 'healthy',
                    message: 'System stats OK',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check2',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check3',
                    checkType: 'database_latency',
                    status: 'healthy',
                    message: 'Database latency good',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check4',
                    checkType: 'platform_analytics',
                    status: 'warning',
                    message: 'Analytics warning',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            // Should emit 2 events (1 error + 1 warning, skipping healthies)
            expect(events).toHaveLength(2);
            expect(events.map(e => e.eventName)).toContain('heartbeat.failed');
            expect(events.map(e => e.eventName)).toContain('analytics.unavailable');
        });

        it('should include correct timestamp in event data', async () => {
            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                },
            ];

            await healthCheckEvents.processHealthChecks('org123', results);

            const call = mockDispatchPlaybookEvent.mock.calls[0];
            const eventData = call[2];
            expect(eventData.timestamp).toBeDefined();
            expect(eventData.source).toBe('health_check_system');
        });
    });

    describe('mapCheckToEvents', () => {
        it('should map heartbeat_diagnose error to heartbeat.failed', () => {
            const check: HealthCheckResult = {
                checkId: 'c1',
                checkType: 'heartbeat_diagnose',
                status: 'error',
                message: 'Failed',
                timestamp: new Date(),
            };

            // Access private method via any type
            const events = (healthCheckEvents as any).mapCheckToEvents(check);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('heartbeat.failed');
        });

        it('should map database_latency error to database.critical_slow', () => {
            const check: HealthCheckResult = {
                checkId: 'c1',
                checkType: 'database_latency',
                status: 'error',
                message: 'Slow',
                timestamp: new Date(),
                details: { latencyMs: 600 },
            };

            const events = (healthCheckEvents as any).mapCheckToEvents(check);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('database.critical_slow');
        });

        it('should map system_stats error to system.stats_error', () => {
            const check: HealthCheckResult = {
                checkId: 'c1',
                checkType: 'system_stats',
                status: 'error',
                message: 'Stats error',
                timestamp: new Date(),
            };

            const events = (healthCheckEvents as any).mapCheckToEvents(check);

            expect(events).toHaveLength(1);
            expect(events[0].eventName).toBe('system.stats_error');
        });
    });

    describe('getAvailableEventTypes', () => {
        it('should return list of available event types', () => {
            const types = healthCheckEvents.getAvailableEventTypes();

            expect(types['heartbeat.failed']).toBeDefined();
            expect(types['heartbeat.stale']).toBeDefined();
            expect(types['database.critical_slow']).toBeDefined();
            expect(types['database.slow']).toBeDefined();
            expect(types['analytics.unavailable']).toBeDefined();
            expect(types['system.stats_error']).toBeDefined();
        });

        it('should include severity information in descriptions', () => {
            const types = healthCheckEvents.getAvailableEventTypes();

            expect(types['heartbeat.failed']).toContain('critical');
            expect(types['heartbeat.stale']).toContain('warning');
        });
    });

    describe('error handling', () => {
        it('should handle dispatch errors gracefully', async () => {
            mockDispatchPlaybookEvent.mockRejectedValue(new Error('Dispatch failed'));

            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                },
            ];

            // Should not throw, just log error
            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(1);
            // Event is still created even if dispatch fails
            expect(mockDispatchPlaybookEvent).toHaveBeenCalled();
        });

        it('should continue processing other checks even if one fails', async () => {
            mockDispatchPlaybookEvent
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Dispatch failed'))
                .mockResolvedValueOnce(undefined);

            const results: HealthCheckResult[] = [
                {
                    checkId: 'check1',
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: 'Heartbeat failed',
                    timestamp: new Date(),
                },
                {
                    checkId: 'check2',
                    checkType: 'database_latency',
                    status: 'error',
                    message: 'Database slow',
                    timestamp: new Date(),
                    details: { latencyMs: 600 },
                },
                {
                    checkId: 'check3',
                    checkType: 'platform_analytics',
                    status: 'error',
                    message: 'Analytics down',
                    timestamp: new Date(),
                },
            ];

            const events = await healthCheckEvents.processHealthChecks('org123', results);

            expect(events).toHaveLength(3);
            expect(mockDispatchPlaybookEvent).toHaveBeenCalledTimes(3);
        });
    });
});
