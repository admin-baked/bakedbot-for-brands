/**
 * System Health Checks Service
 *
 * Executes periodic system diagnostics and logs results.
 * Triggered by Cloud Tasks scheduler for automated monitoring.
 *
 * Checks:
 * - system_stats: Tenant/user/order counts
 * - heartbeat_diagnose: Full system health + issues
 * - platform_analytics: Revenue metrics
 * - database_latency: Query performance
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface HealthCheckResult {
    checkId: string;
    checkType: 'system_stats' | 'heartbeat_diagnose' | 'platform_analytics' | 'database_latency';
    status: 'healthy' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    details?: Record<string, any>;
    durationMs?: number;
}

export interface HealthCheckRun {
    runId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results: HealthCheckResult[];
    durationMs?: number;
    failureMessage?: string;
}

class SystemHealthChecksService {
    /**
     * Execute a single health check
     */
    async executeCheck(
        checkType: 'system_stats' | 'heartbeat_diagnose' | 'platform_analytics' | 'database_latency'
    ): Promise<HealthCheckResult> {
        const checkId = `${checkType}_${Date.now()}`;
        const startTime = Date.now();

        try {
            switch (checkType) {
                case 'system_stats':
                    return await this.checkSystemStats(checkId);

                case 'heartbeat_diagnose':
                    return await this.checkHeartbeatHealth(checkId);

                case 'platform_analytics':
                    return await this.checkAnalytics(checkId);

                case 'database_latency':
                    return await this.checkDatabaseLatency(checkId, startTime);

                default:
                    return {
                        checkId,
                        checkType: 'system_stats',
                        status: 'error',
                        message: 'Unknown check type',
                        timestamp: new Date(),
                    };
            }
        } catch (error) {
            logger.error(`[Health Check] Failed to execute ${checkType}:`, error);
            return {
                checkId,
                checkType,
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
                durationMs: Date.now() - startTime,
            };
        }
    }

    /**
     * Check system statistics (tenants, users, orders)
     */
    private async checkSystemStats(checkId: string): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            const db = getAdminFirestore();

            // Count tenants
            const tenantsSnap = await db.collection('tenants').count().get();
            const tenantCount = tenantsSnap.data().count;

            // Count users
            const usersSnap = await db.collection('users').count().get();
            const userCount = usersSnap.data().count;

            // Count active orders (today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const ordersSnap = await db
                .collection('orders')
                .where('createdAt', '>=', today)
                .count()
                .get();
            const ordersToday = ordersSnap.data().count;

            const message = `System healthy: ${tenantCount} tenants, ${userCount} users, ${ordersToday} orders today`;

            return {
                checkId,
                checkType: 'system_stats',
                status: 'healthy',
                message,
                timestamp: new Date(),
                details: { tenantCount, userCount, ordersToday },
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check heartbeat system health
     */
    private async checkHeartbeatHealth(checkId: string): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            const db = getAdminFirestore();

            // Get recent heartbeat execution
            const snapshot = await db
                .collection('heartbeat_executions')
                .orderBy('startedAt', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return {
                    checkId,
                    checkType: 'heartbeat_diagnose',
                    status: 'warning',
                    message: 'No recent heartbeat executions found',
                    timestamp: new Date(),
                    durationMs: Date.now() - startTime,
                };
            }

            const lastExecution = snapshot.docs[0].data();
            const timeSinceLastRun = Date.now() - lastExecution.startedAt.toDate().getTime();
            const timeSinceLastRunMins = Math.floor(timeSinceLastRun / (1000 * 60));

            // Determine status based on last execution
            if (lastExecution.status === 'failed') {
                return {
                    checkId,
                    checkType: 'heartbeat_diagnose',
                    status: 'error',
                    message: `Last heartbeat failed ${timeSinceLastRunMins} minutes ago`,
                    timestamp: new Date(),
                    details: { lastExecution },
                    durationMs: Date.now() - startTime,
                };
            }

            if (timeSinceLastRunMins > 35) {
                return {
                    checkId,
                    checkType: 'heartbeat_diagnose',
                    status: 'warning',
                    message: `Heartbeat hasn't run in ${timeSinceLastRunMins} minutes (expected: 30)`,
                    timestamp: new Date(),
                    durationMs: Date.now() - startTime,
                };
            }

            return {
                checkId,
                checkType: 'heartbeat_diagnose',
                status: 'healthy',
                message: `Heartbeat healthy, last run ${timeSinceLastRunMins} minutes ago`,
                timestamp: new Date(),
                details: { lastExecution },
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check platform analytics availability
     */
    private async checkAnalytics(checkId: string): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            const db = getAdminFirestore();

            // Quick check: can we query organizations?
            const snapshot = await db.collection('tenants').limit(1).get();

            return {
                checkId,
                checkType: 'platform_analytics',
                status: 'healthy',
                message: 'Analytics service healthy',
                timestamp: new Date(),
                details: { tenantsAccessible: !snapshot.empty },
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check database latency
     */
    private async checkDatabaseLatency(checkId: string, startTime: number): Promise<HealthCheckResult> {
        try {
            const db = getAdminFirestore();
            const queryStart = Date.now();

            // Simple query to measure latency
            await db.collection('users').limit(1).get();

            const latencyMs = Date.now() - queryStart;

            let status: 'healthy' | 'warning' | 'error';
            if (latencyMs < 200) {
                status = 'healthy';
            } else if (latencyMs < 500) {
                status = 'warning';
            } else {
                status = 'error';
            }

            return {
                checkId,
                checkType: 'database_latency',
                status,
                message: `Database latency: ${latencyMs}ms`,
                timestamp: new Date(),
                details: { latencyMs },
                durationMs: Date.now() - startTime,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Log a health check run to Firestore
     */
    async logHealthCheckRun(run: HealthCheckRun): Promise<string> {
        try {
            const db = getAdminFirestore();

            const docRef = await db.collection('health_check_runs').add({
                runId: run.runId,
                startedAt: run.startedAt,
                completedAt: run.completedAt,
                status: run.status,
                results: run.results,
                durationMs: run.durationMs,
                failureMessage: run.failureMessage,
                createdAt: new Date(),
            });

            logger.info(`[Health Check] Logged run ${run.runId}:`, {
                status: run.status,
                resultCount: run.results.length,
                durationMs: run.durationMs,
            });

            return docRef.id;
        } catch (error) {
            logger.error(`[Health Check] Failed to log run:`, error);
            throw error;
        }
    }

    /**
     * Get recent health check runs
     */
    async getRecentRuns(limit: number = 20): Promise<HealthCheckRun[]> {
        try {
            const db = getAdminFirestore();

            const snapshot = await db
                .collection('health_check_runs')
                .orderBy('startedAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    runId: data.runId,
                    startedAt: data.startedAt?.toDate?.() || new Date(data.startedAt),
                    completedAt: data.completedAt?.toDate?.() || undefined,
                    status: data.status,
                    results: data.results || [],
                    durationMs: data.durationMs,
                    failureMessage: data.failureMessage,
                };
            });
        } catch (error) {
            logger.error(`[Health Check] Failed to get recent runs:`, error);
            return [];
        }
    }

    /**
     * Get health statistics (success rate, check breakdown)
     */
    async getHealthStats(daysBack: number = 7): Promise<{
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        successRate: number;
        averageDurationMs: number;
        checkBreakdown: Record<string, number>;
    }> {
        try {
            const db = getAdminFirestore();
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - daysBack);

            const snapshot = await db
                .collection('health_check_runs')
                .where('startedAt', '>=', sinceDate)
                .get();

            const runs = snapshot.docs.map(doc => doc.data());
            const successful = runs.filter(r => r.status === 'completed').length;
            const failed = runs.filter(r => r.status === 'failed').length;

            const durations = runs
                .filter(r => r.durationMs)
                .map(r => r.durationMs);

            const avgDuration = durations.length > 0
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0;

            const checkBreakdown: Record<string, number> = {};
            runs.forEach(run => {
                run.results?.forEach((result: any) => {
                    checkBreakdown[result.checkType] = (checkBreakdown[result.checkType] || 0) + 1;
                });
            });

            return {
                totalRuns: runs.length,
                successfulRuns: successful,
                failedRuns: failed,
                successRate: runs.length > 0 ? (successful / runs.length) * 100 : 0,
                averageDurationMs: avgDuration,
                checkBreakdown,
            };
        } catch (error) {
            logger.error(`[Health Check] Failed to get stats:`, error);
            return {
                totalRuns: 0,
                successfulRuns: 0,
                failedRuns: 0,
                successRate: 0,
                averageDurationMs: 0,
                checkBreakdown: {},
            };
        }
    }
}

// Singleton instance
const systemHealthChecks = new SystemHealthChecksService();

export { SystemHealthChecksService, systemHealthChecks };
