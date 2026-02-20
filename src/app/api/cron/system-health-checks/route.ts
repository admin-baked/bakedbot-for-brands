/**
 * System Health Checks Cron Endpoint
 *
 * Triggered by Cloud Tasks scheduler for periodic system diagnostics
 * Path: POST /api/cron/system-health-checks
 *
 * Authentication: Bearer token (CRON_SECRET)
 * Expected Payload: { runId?: string }
 *
 * Executes:
 * 1. system_stats: Tenant/user/order counts
 * 2. heartbeat_diagnose: Full system health + issues
 * 3. platform_analytics: Revenue metrics
 * 4. database_latency: Query performance
 *
 * Returns: { success, runId, results, timestamp, durationMs }
 *
 * Cloud Scheduler:
 *   Schedule: "* /30 * * * *"  (every 30 minutes)
 *   gcloud scheduler jobs create http system-health-checks \
 *     --schedule="* /30 * * * *" --time-zone="America/New_York" \
 *     --uri="https://<domain>/api/cron/system-health-checks" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
 *     --message-body="{}"
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemHealthChecks, HealthCheckRun } from '@/server/services/system-health-checks';
import { auditLogStreaming } from '@/server/services/audit-log-streaming';
import { healthCheckEvents } from '@/server/services/health-check-events';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const runId = randomUUID();

    try {
        // Verify CRON_SECRET
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || !authHeader?.startsWith('Bearer ')) {
            logger.warn('[Health Check] Unauthorized cron request', {
                path: request.nextUrl.pathname,
                hasAuth: !!authHeader,
            });
            return NextResponse.json(
                { error: 'Unauthorized', runId },
                { status: 401 }
            );
        }

        const token = authHeader.slice(7);
        if (token !== cronSecret) {
            logger.warn('[Health Check] Invalid cron token', {
                path: request.nextUrl.pathname,
            });
            return NextResponse.json(
                { error: 'Invalid token', runId },
                { status: 403 }
            );
        }

        logger.info('[Health Check] Starting health check run', { runId });

        // Parse request body
        const body = await request.json().catch(() => ({}));
        const customRunId = body.runId || runId;

        // Execute all health checks
        const checkTypes = [
            'system_stats',
            'heartbeat_diagnose',
            'platform_analytics',
            'database_latency',
        ] as const;

        const results = await Promise.all(
            checkTypes.map(checkType =>
                systemHealthChecks.executeCheck(checkType)
            )
        );

        // Determine overall status
        const failedChecks = results.filter(r => r.status === 'error');
        const warningChecks = results.filter(r => r.status === 'warning');
        const overallStatus = failedChecks.length > 0 ? 'failed' : warningChecks.length > 0 ? 'completed' : 'completed';

        // Create health check run record
        const run: HealthCheckRun = {
            runId: customRunId,
            startedAt: new Date(),
            completedAt: new Date(),
            status: overallStatus,
            results,
            durationMs: Date.now() - startTime,
            failureMessage: failedChecks.length > 0
                ? `${failedChecks.length} checks failed: ${failedChecks.map(c => c.checkType).join(', ')}`
                : undefined,
        };

        // Log the health check run to Firestore
        await systemHealthChecks.logHealthCheckRun(run);

        // Log to audit trail
        await auditLogStreaming.logAction(
            'system_health_check_executed',
            'system-health-check-cron',
            customRunId,
            'health_check',
            overallStatus === 'failed' ? 'failed' : 'success',
            {
                checkCount: results.length,
                failedCount: failedChecks.length,
                warningCount: warningChecks.length,
                durationMs: run.durationMs,
            }
        );

        // Emit playbook events for failures/warnings
        try {
            const events = await healthCheckEvents.processHealthChecks('system', results);
            if (events.length > 0) {
                logger.info('[Health Check] Playbook events emitted', {
                    runId: customRunId,
                    eventCount: events.length,
                    events: events.map(e => e.eventName),
                });
            }
        } catch (eventError) {
            logger.error('[Health Check] Failed to emit playbook events', {
                runId: customRunId,
                error: eventError instanceof Error ? eventError.message : 'Unknown error',
            });
        }

        logger.info('[Health Check] Health check run completed', {
            runId: customRunId,
            status: overallStatus,
            checks: results.length,
            failed: failedChecks.length,
            warnings: warningChecks.length,
            durationMs: run.durationMs,
        });

        // Alert on failures or warnings
        if (failedChecks.length > 0) {
            logger.error('[Health Check] System health issues detected', {
                runId: customRunId,
                failures: failedChecks.map(c => ({ type: c.checkType, message: c.message })),
            });
        }

        if (warningChecks.length > 0) {
            logger.warn('[Health Check] System warnings detected', {
                runId: customRunId,
                warnings: warningChecks.map(c => ({ type: c.checkType, message: c.message })),
            });
        }

        return NextResponse.json({
            success: true,
            runId: customRunId,
            status: overallStatus,
            results: results.map(r => ({
                checkType: r.checkType,
                status: r.status,
                message: r.message,
                durationMs: r.durationMs,
            })),
            timestamp: new Date().toISOString(),
            durationMs: run.durationMs,
        });

    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('[Health Check] Failed to execute health check run', {
            runId,
            error: errorMessage,
            durationMs,
        });

        // Log failed run to audit trail
        try {
            await auditLogStreaming.logAction(
                'system_health_check_failed',
                'system-health-check-cron',
                runId,
                'health_check',
                'failed',
                { error: errorMessage }
            );
        } catch (auditError: any) {
            logger.error('[Health Check] Failed to log audit entry', { error: auditError instanceof Error ? auditError.message : String(auditError) });
        }

        return NextResponse.json(
            {
                success: false,
                runId,
                error: 'Health check execution failed',
                message: errorMessage,
                timestamp: new Date().toISOString(),
                durationMs,
            },
            { status: 500 }
        );
    }
}

/**
 * Health check runs are triggered by Cloud Tasks scheduler:
 *
 * gcloud tasks create-app-engine-task system-health-checks \
 *   --queue=system-health-checks \
 *   --schedule-time=... \
 *   --http-method=POST \
 *   --uri=https://bakedbot-prod-backend.web.app/api/cron/system-health-checks \
 *   --headers="Authorization: Bearer $CRON_SECRET"
 *
 * Recommended schedule: Every 30 minutes during business hours
 */
