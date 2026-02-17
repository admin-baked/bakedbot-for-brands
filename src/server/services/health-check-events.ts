/**
 * Health Check Events Service
 *
 * Translates system health check results into playbook events.
 * Enables automated alert playbooks to respond to system issues.
 *
 * Event Types:
 * - health_check.failed — Critical check failure
 * - heartbeat.stale — Heartbeat hasn't run recently
 * - database.slow — Database latency exceeds threshold
 * - analytics.unavailable — Analytics service down
 */

import { dispatchPlaybookEvent } from './playbook-event-dispatcher';
import { logger } from '@/lib/logger';
import type { HealthCheckResult } from './system-health-checks';

export interface HealthCheckEvent {
    eventName: string;
    severity: 'critical' | 'warning' | 'info';
    checkType: string;
    message: string;
    details?: Record<string, any>;
}

class HealthCheckEventsService {
    /**
     * Process health check results and emit events if needed
     */
    async processHealthChecks(
        orgId: string,
        results: HealthCheckResult[]
    ): Promise<HealthCheckEvent[]> {
        const events: HealthCheckEvent[] = [];

        for (const result of results) {
            // Skip healthy checks
            if (result.status === 'healthy') {
                continue;
            }

            // Map check results to events
            const events_from_check = this.mapCheckToEvents(result);
            events.push(...events_from_check);

            // Dispatch each event to playbooks
            for (const event of events_from_check) {
                await this.emitEvent(orgId, event);
            }
        }

        return events;
    }

    /**
     * Map individual health check result to playbook event(s)
     */
    private mapCheckToEvents(result: HealthCheckResult): HealthCheckEvent[] {
        const events: HealthCheckEvent[] = [];

        switch (result.checkType) {
            case 'heartbeat_diagnose':
                if (result.status === 'error') {
                    events.push({
                        eventName: 'heartbeat.failed',
                        severity: 'critical',
                        checkType: 'heartbeat_diagnose',
                        message: result.message,
                        details: result.details,
                    });
                } else if (result.status === 'warning') {
                    events.push({
                        eventName: 'heartbeat.stale',
                        severity: 'warning',
                        checkType: 'heartbeat_diagnose',
                        message: result.message,
                        details: result.details,
                    });
                }
                break;

            case 'database_latency':
                if (result.status === 'error') {
                    events.push({
                        eventName: 'database.critical_slow',
                        severity: 'critical',
                        checkType: 'database_latency',
                        message: `Database latency critical: ${result.details?.latencyMs}ms`,
                        details: result.details,
                    });
                } else if (result.status === 'warning') {
                    events.push({
                        eventName: 'database.slow',
                        severity: 'warning',
                        checkType: 'database_latency',
                        message: `Database latency warning: ${result.details?.latencyMs}ms`,
                        details: result.details,
                    });
                }
                break;

            case 'platform_analytics':
                if (result.status === 'error') {
                    events.push({
                        eventName: 'analytics.unavailable',
                        severity: 'critical',
                        checkType: 'platform_analytics',
                        message: result.message,
                        details: result.details,
                    });
                }
                break;

            case 'system_stats':
                if (result.status === 'error') {
                    events.push({
                        eventName: 'system.stats_error',
                        severity: 'warning',
                        checkType: 'system_stats',
                        message: result.message,
                        details: result.details,
                    });
                }
                break;
        }

        return events;
    }

    /**
     * Emit a health check event to playbooks
     */
    private async emitEvent(orgId: string, event: HealthCheckEvent): Promise<void> {
        try {
            await dispatchPlaybookEvent(orgId, event.eventName, {
                severity: event.severity,
                checkType: event.checkType,
                message: event.message,
                timestamp: new Date().toISOString(),
                details: event.details,
                source: 'health_check_system',
            });

            logger.info('[HealthCheckEvents] Event dispatched', {
                orgId,
                eventName: event.eventName,
                severity: event.severity,
            });
        } catch (error) {
            logger.error('[HealthCheckEvents] Failed to emit event', {
                orgId,
                eventName: event.eventName,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Get available health check event types
     */
    getAvailableEventTypes(): Record<string, string> {
        return {
            'heartbeat.failed': 'Heartbeat execution failed (critical)',
            'heartbeat.stale': 'Heartbeat hasn\'t run recently (warning)',
            'database.critical_slow': 'Database latency >500ms (critical)',
            'database.slow': 'Database latency 200-500ms (warning)',
            'analytics.unavailable': 'Analytics service unavailable (critical)',
            'system.stats_error': 'System stats check failed (warning)',
        };
    }
}

// Singleton instance
const healthCheckEvents = new HealthCheckEventsService();

export { HealthCheckEventsService, healthCheckEvents };
