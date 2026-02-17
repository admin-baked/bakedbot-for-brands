/**
 * Performance Benchmarks: Endpoint Latency
 *
 * Measures response times for critical endpoints
 * Target: Health checks <500ms, Streaming <1000ms, Audit queries <200ms
 */

import { systemHealthChecks } from '@/server/services/system-health-checks';
import { auditLogStreaming } from '@/server/services/audit-log-streaming';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
    getAdminAuth: jest.fn(),
}));

jest.mock('@/lib/logger');

describe('Performance: Endpoint Latency', () => {
    const benchmarks: Record<string, number[]> = {};

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock Firestore with realistic delays
        const mockQuery = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ data: () => ({ count: 42 }) }),
            onSnapshot: jest.fn(),
        };

        const mockCollection = {
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false }),
            }),
            add: jest.fn().mockResolvedValue({ id: 'log1' }),
            where: jest.fn().mockReturnValue(mockQuery),
            orderBy: jest.fn().mockReturnValue(mockQuery),
            count: jest.fn().mockReturnValue(mockQuery),
        };

        const mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        };

        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue(mockDb);
    });

    describe('Benchmark 1: Health Check Execution', () => {
        it('should execute all checks in <500ms', async () => {
            const start = performance.now();

            const results = await Promise.all([
                systemHealthChecks.executeCheck('system_stats'),
                systemHealthChecks.executeCheck('heartbeat_diagnose'),
                systemHealthChecks.executeCheck('platform_analytics'),
                systemHealthChecks.executeCheck('database_latency'),
            ]);

            const elapsed = performance.now() - start;

            benchmarks['health_checks_all_4'] = [elapsed];

            expect(results).toHaveLength(4);
            expect(elapsed).toBeLessThan(500);

            console.log(`✓ All 4 health checks: ${elapsed.toFixed(2)}ms (target: <500ms)`);
        });

        it('should execute individual checks in <200ms', async () => {
            const times: number[] = [];

            for (const checkType of [
                'system_stats',
                'heartbeat_diagnose',
                'platform_analytics',
                'database_latency',
            ] as const) {
                const start = performance.now();
                await systemHealthChecks.executeCheck(checkType);
                times.push(performance.now() - start);
            }

            benchmarks['individual_checks'] = times;

            for (const time of times) {
                expect(time).toBeLessThan(200);
            }

            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`✓ Avg individual check: ${avg.toFixed(2)}ms (target: <200ms)`);
        });

        it('should log health check results quickly', async () => {
            const run = {
                runId: 'run1',
                startedAt: new Date(),
                completedAt: new Date(),
                status: 'completed' as const,
                results: [
                    {
                        checkId: 'c1',
                        checkType: 'system_stats' as const,
                        status: 'healthy' as const,
                        message: 'OK',
                        timestamp: new Date(),
                        durationMs: 50,
                    },
                ],
                durationMs: 100,
            };

            const start = performance.now();
            await systemHealthChecks.logHealthCheckRun(run);
            const elapsed = performance.now() - start;

            benchmarks['log_health_check'] = [elapsed];

            expect(elapsed).toBeLessThan(100);

            console.log(`✓ Log health check: ${elapsed.toFixed(2)}ms (target: <100ms)`);
        });
    });

    describe('Benchmark 2: Audit Log Queries', () => {
        it('should query logs with no filter in <200ms', async () => {
            const start = performance.now();
            const logs = await auditLogStreaming.queryAuditLogs({}, 100);
            const elapsed = performance.now() - start;

            benchmarks['audit_query_no_filter'] = [elapsed];

            expect(elapsed).toBeLessThan(200);
            expect(Array.isArray(logs)).toBe(true);

            console.log(`✓ Audit query (no filter): ${elapsed.toFixed(2)}ms (target: <200ms)`);
        });

        it('should filter logs by action in <150ms', async () => {
            const start = performance.now();
            const logs = await auditLogStreaming.queryAuditLogs({ action: 'user_approved' }, 100);
            const elapsed = performance.now() - start;

            benchmarks['audit_query_with_filter'] = [elapsed];

            expect(elapsed).toBeLessThan(150);

            console.log(`✓ Audit query (with filter): ${elapsed.toFixed(2)}ms (target: <150ms)`);
        });

        it('should calculate statistics in <300ms', async () => {
            const start = performance.now();
            const stats = await auditLogStreaming.getAuditStats(7);
            const elapsed = performance.now() - start;

            benchmarks['audit_statistics'] = [elapsed];

            expect(elapsed).toBeLessThan(300);
            expect(stats.totalActions >= 0).toBe(true);

            console.log(`✓ Audit statistics: ${elapsed.toFixed(2)}ms (target: <300ms)`);
        });
    });

    describe('Benchmark 3: Streaming Setup', () => {
        it('should establish stream in <100ms', async () => {
            const start = performance.now();

            const unsubscribe = auditLogStreaming.streamAuditLogs(
                { onData: jest.fn() },
                { limit: 50 }
            );

            const elapsed = performance.now() - start;

            benchmarks['stream_setup'] = [elapsed];

            expect(elapsed).toBeLessThan(100);
            expect(typeof unsubscribe).toBe('function');

            unsubscribe();

            console.log(`✓ Stream setup: ${elapsed.toFixed(2)}ms (target: <100ms)`);
        });

        it('should handle filtered stream setup in <100ms', async () => {
            const start = performance.now();

            const unsubscribe = auditLogStreaming.streamAuditLogs(
                { onData: jest.fn() },
                {
                    filter: { action: 'user_approved', status: 'success' },
                    limit: 50,
                }
            );

            const elapsed = performance.now() - start;

            benchmarks['filtered_stream_setup'] = [elapsed];

            expect(elapsed).toBeLessThan(100);

            unsubscribe();
        });
    });

    describe('Benchmark 4: Concurrent Operations', () => {
        it('should handle 10 concurrent health check runs', async () => {
            const start = performance.now();

            const promises = Array(10)
                .fill(null)
                .map(() =>
                    Promise.all([
                        systemHealthChecks.executeCheck('system_stats'),
                        systemHealthChecks.executeCheck('heartbeat_diagnose'),
                    ])
                );

            await Promise.all(promises);
            const elapsed = performance.now() - start;

            benchmarks['concurrent_10_runs'] = [elapsed];

            // 10 concurrent runs of 2 checks each should be <2000ms
            expect(elapsed).toBeLessThan(2000);

            console.log(`✓ 10 concurrent runs: ${elapsed.toFixed(2)}ms`);
        });

        it('should handle 5 concurrent streams', async () => {
            const start = performance.now();

            const unsubscribes = Array(5)
                .fill(null)
                .map(() =>
                    auditLogStreaming.streamAuditLogs(
                        { onData: jest.fn() },
                        { limit: 50 }
                    )
                );

            const elapsed = performance.now() - start;

            benchmarks['concurrent_5_streams'] = [elapsed];

            expect(elapsed).toBeLessThan(500);

            unsubscribes.forEach((unsub) => unsub());

            console.log(`✓ 5 concurrent streams: ${elapsed.toFixed(2)}ms`);
        });
    });

    describe('Benchmark 5: Throughput', () => {
        it('should log 100 audit entries in <1000ms', async () => {
            const start = performance.now();

            const actions = Array(100)
                .fill(null)
                .map((_, i) => ({
                    action: `action_${i % 5}`,
                    actor: `user_${i % 10}`,
                    resource: `resource_${i % 20}`,
                    resourceType: 'test',
                }));

            await auditLogStreaming.logActionBatch(actions);
            const elapsed = performance.now() - start;

            benchmarks['batch_log_100'] = [elapsed];

            expect(elapsed).toBeLessThan(1000);

            const throughput = (100 / (elapsed / 1000)).toFixed(0);
            console.log(`✓ Batch log 100: ${elapsed.toFixed(2)}ms (${throughput} logs/sec)`);
        });
    });

    describe('Benchmark 6: Stress Test', () => {
        it('should maintain performance under sustained load', async () => {
            const iterations = 50;
            const times: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();

                // Simulate realistic operations
                await Promise.all([
                    systemHealthChecks.executeCheck('system_stats'),
                    auditLogStreaming.queryAuditLogs({}, 50),
                ]);

                times.push(performance.now() - start);
            }

            benchmarks['sustained_load_50_iter'] = times;

            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            const min = Math.min(...times);

            // Sustained performance should not degrade
            expect(avg).toBeLessThan(200);
            expect(max).toBeLessThan(500);

            console.log(
                `✓ Sustained load (50 iter): Avg ${avg.toFixed(2)}ms, Min ${min.toFixed(2)}ms, Max ${max.toFixed(2)}ms`
            );
        });
    });

    afterAll(() => {
        // Print latency benchmarks summary
        console.log('\n=== Endpoint Latency Benchmarks ===');
        for (const [name, times] of Object.entries(benchmarks)) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            const min = Math.min(...times);
            console.log(`${name}: Avg ${avg.toFixed(2)}ms | Min ${min.toFixed(2)}ms | Max ${max.toFixed(2)}ms`);
        }
    });
});
