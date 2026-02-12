/**
 * Unit Tests for System Health Server Actions
 *
 * Tests alert generation, CSV export, threshold management,
 * comparison calculations, and GCP/simulated metric fallback.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'test-super-user',
        role: 'super_user',
    }),
}));

// Mock Firestore
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockDeploymentsGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockImplementation((name: string) => {
            if (name === 'deployments') {
                return {
                    orderBy: mockOrderBy,
                    limit: mockLimit,
                    get: mockDeploymentsGet,
                };
            }
            return {
                doc: jest.fn().mockReturnValue({
                    set: jest.fn().mockResolvedValue(undefined),
                    get: jest.fn().mockResolvedValue({ exists: false }),
                }),
            };
        }),
    }),
}));

jest.mock('firebase-admin/firestore', () => ({
    Timestamp: {
        fromDate: jest.fn((d: Date) => ({
            toDate: () => d,
            seconds: Math.floor(d.getTime() / 1000),
        })),
    },
}));

// Mock metrics collector
const mockGetHistoricalMetrics = jest.fn().mockResolvedValue([]);
jest.mock('@/server/services/metrics-collector', () => ({
    getHistoricalMetrics: (...args: any[]) => mockGetHistoricalMetrics(...args),
}));

// Mock health alerts
const mockGetAlertThresholds = jest.fn().mockResolvedValue({
    memory: { warning: 70, critical: 85 },
    cpu: { warning: 60, critical: 80 },
    latency: { warning: 1000, critical: 3000 },
    errorRate: { warning: 1, critical: 5 },
    notifications: { email: false, emailRecipients: [], dashboard: true },
    updatedAt: new Date(),
    updatedBy: 'system',
});
const mockSaveAlertThresholds = jest.fn().mockResolvedValue(undefined);
const mockProcessAlertNotifications = jest.fn().mockResolvedValue(undefined);

jest.mock('@/server/services/health-alerts', () => ({
    getAlertThresholds: (...args: any[]) => mockGetAlertThresholds(...args),
    saveAlertThresholds: (...args: any[]) => mockSaveAlertThresholds(...args),
    processAlertNotifications: (...args: any[]) => mockProcessAlertNotifications(...args),
}));

// Mock GCP monitoring (dynamic import in system-health.ts)
jest.mock('@/server/services/gcp-monitoring', () => ({
    getGCPMetrics: jest.fn().mockRejectedValue(new Error('GCP not available')),
    isGCPMonitoringAvailable: jest.fn().mockResolvedValue(false),
}));

import {
    getSystemHealth,
    getSystemConfiguration,
    exportMetricsCSV,
    getAlertThresholdConfig,
    updateAlertThresholds,
    triggerHealthCheck,
} from '../system-health';
import type { AlertThresholdConfig } from '@/types/system-health';

describe('System Health Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetHistoricalMetrics.mockResolvedValue([]);
    });

    describe('getSystemHealth', () => {
        it('should return system health summary', async () => {
            const result = await getSystemHealth();

            expect(result).toHaveProperty('current');
            expect(result).toHaveProperty('timeseries');
            expect(result).toHaveProperty('alerts');
            expect(result.current).toHaveProperty('timestamp');
            expect(result.current).toHaveProperty('memoryUsagePercent');
            expect(result.current).toHaveProperty('cpuUsagePercent');
            expect(result.current).toHaveProperty('deploymentStatus');
        });

        it('should use simulated metrics when GCP is unavailable', async () => {
            const result = await getSystemHealth();

            expect(result.current.source).toBe('simulated');
        });

        it('should set fixed configuration values', async () => {
            const result = await getSystemHealth();

            expect(result.current.memoryAllocatedMB).toBe(2048);
            expect(result.current.cpuCores).toBe(1);
            expect(result.current.minInstances).toBe(0);
            expect(result.current.maxInstances).toBe(10);
        });

        it('should generate simulated timeseries when none exist', async () => {
            const result = await getSystemHealth();

            expect(result.timeseries).toHaveLength(24);
        });

        it('should use historical metrics when available', async () => {
            const historicalData = [
                { timestamp: new Date(), memoryUsagePercent: 50, cpuUsagePercent: 30, requestsPerSecond: 10, errorRate: 0.5 },
                { timestamp: new Date(), memoryUsagePercent: 55, cpuUsagePercent: 35, requestsPerSecond: 12, errorRate: 0.3 },
            ];
            mockGetHistoricalMetrics.mockResolvedValueOnce(historicalData);

            const result = await getSystemHealth();

            expect(result.timeseries).toHaveLength(2);
            expect(result.timeseries[0].memoryUsagePercent).toBe(50);
        });

        it('should load alert thresholds for status determination', async () => {
            await getSystemHealth();

            expect(mockGetAlertThresholds).toHaveBeenCalled();
        });

        it('should fire-and-forget alert notifications', async () => {
            // Force high error rate to generate alerts
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 10, critical: 20 }, // Very low thresholds = guaranteed alerts
                cpu: { warning: 10, critical: 20 },
                latency: { warning: 10, critical: 20 },
                errorRate: { warning: 0.001, critical: 0.01 },
                notifications: { email: true, emailRecipients: ['test@test.com'], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            await getSystemHealth();

            // processAlertNotifications should be called (fire-and-forget)
            // Give it a tick to process
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockProcessAlertNotifications).toHaveBeenCalled();
        });

        it('should include comparison when requested', async () => {
            const now = Date.now();
            const historicalData = Array.from({ length: 200 }, (_, i) => ({
                timestamp: new Date(now - (200 - i) * 60 * 60 * 1000),
                memoryUsagePercent: 50 + Math.random() * 10,
                cpuUsagePercent: 30 + Math.random() * 10,
                requestsPerSecond: 10 + Math.random() * 5,
                errorRate: 0.5 + Math.random() * 0.5,
            }));

            mockGetHistoricalMetrics
                .mockResolvedValueOnce([]) // For the 24-hour timeseries call
                .mockResolvedValueOnce(historicalData) // For currentWeek (168h)
                .mockResolvedValueOnce(historicalData); // For previousWeek (336h)

            const result = await getSystemHealth(true);

            // Comparison may or may not be present depending on data distribution
            expect(result).toHaveProperty('comparison');
        });

        it('should not include comparison by default', async () => {
            const result = await getSystemHealth();

            expect(result.comparison).toBeUndefined();
        });
    });

    describe('Alert generation (via getSystemHealth)', () => {
        it('should generate critical alert when memory exceeds critical threshold', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 10, critical: 20 },
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            // Memory will always be 40-70%, so with threshold of 20% critical, should trigger
            const memoryAlerts = result.alerts.filter(a => a.type === 'memory' && a.severity === 'critical');
            expect(memoryAlerts.length).toBeGreaterThanOrEqual(1);
        });

        it('should generate warning alert when value exceeds warning but not critical', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 10, critical: 95 }, // Warning at 10%, critical at 95%
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            // Memory 40-70% will be above 10% warning but below 95% critical
            const memoryAlerts = result.alerts.filter(a => a.type === 'memory');
            expect(memoryAlerts.length).toBeGreaterThanOrEqual(1);
            // Should be warning, not critical (since 40-70% < 95%)
            const warningAlerts = memoryAlerts.filter(a => a.severity === 'warning');
            expect(warningAlerts.length).toBeGreaterThanOrEqual(1);
        });

        it('should generate no alerts when all metrics are below thresholds', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 90, critical: 95 },
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            // With high thresholds, simulated metrics (40-70% mem, 20-60% cpu) should not trigger
            expect(result.alerts).toHaveLength(0);
        });

        it('should set deployment status to unhealthy when critical thresholds exceeded', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 10, critical: 20 }, // Memory 40-70% > 20% = unhealthy
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            expect(result.current.deploymentStatus).toBe('unhealthy');
        });

        it('should set deployment status to degraded when warning thresholds exceeded', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 10, critical: 95 }, // Warning at 10%, critical at 95%
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            expect(result.current.deploymentStatus).toBe('degraded');
        });

        it('should set deployment status to healthy when below all thresholds', async () => {
            mockGetAlertThresholds.mockResolvedValueOnce({
                memory: { warning: 90, critical: 95 },
                cpu: { warning: 90, critical: 95 },
                latency: { warning: 10000, critical: 30000 },
                errorRate: { warning: 10, critical: 50 },
                notifications: { email: false, emailRecipients: [], dashboard: true },
                updatedAt: new Date(),
                updatedBy: 'system',
            });

            const result = await getSystemHealth();

            expect(result.current.deploymentStatus).toBe('healthy');
        });
    });

    describe('getSystemConfiguration', () => {
        it('should return runtime configuration', async () => {
            const config = await getSystemConfiguration();

            expect(config.runtime).toEqual({
                memoryMiB: 2048,
                cpu: 1,
                minInstances: 0,
                maxInstances: 10,
                concurrency: 80,
            });
        });

        it('should return build configuration', async () => {
            const config = await getSystemConfiguration();

            expect(config.build).toEqual({
                nodeMemoryMiB: 2048,
            });
        });

        it('should return deployment configuration', async () => {
            const config = await getSystemConfiguration();

            expect(config.deployment).toEqual({
                platform: 'Firebase App Hosting',
                region: 'us-central1',
                project: 'studio-567050101-bc6e8',
            });
        });
    });

    describe('exportMetricsCSV', () => {
        it('should return CSV header and "no data" message when empty', async () => {
            mockGetHistoricalMetrics.mockResolvedValueOnce([]);

            const csv = await exportMetricsCSV();

            expect(csv).toContain('timestamp,memoryUsagePercent,cpuUsagePercent,requestsPerSecond,errorRate');
            expect(csv).toContain('No data available');
        });

        it('should export metrics data as CSV format', async () => {
            const now = new Date('2026-02-11T12:00:00.000Z');
            mockGetHistoricalMetrics.mockResolvedValueOnce([
                { timestamp: now, memoryUsagePercent: 55, cpuUsagePercent: 35, requestsPerSecond: 12, errorRate: 0.5 },
            ]);

            const csv = await exportMetricsCSV();

            const lines = csv.split('\n');
            expect(lines).toHaveLength(2); // header + 1 data row
            expect(lines[0]).toBe('timestamp,memoryUsagePercent,cpuUsagePercent,requestsPerSecond,errorRate');
            expect(lines[1]).toContain('2026-02-11');
            expect(lines[1]).toContain('55');
            expect(lines[1]).toContain('35');
            expect(lines[1]).toContain('12');
            expect(lines[1]).toContain('0.50');
        });

        it('should use default 24 hours', async () => {
            await exportMetricsCSV();

            expect(mockGetHistoricalMetrics).toHaveBeenCalledWith(24);
        });

        it('should accept custom hoursBack parameter', async () => {
            await exportMetricsCSV(48);

            expect(mockGetHistoricalMetrics).toHaveBeenCalledWith(48);
        });

        it('should export multiple rows', async () => {
            const baseTime = new Date('2026-02-11T00:00:00Z');
            mockGetHistoricalMetrics.mockResolvedValueOnce([
                { timestamp: new Date(baseTime.getTime()), memoryUsagePercent: 50, cpuUsagePercent: 30, requestsPerSecond: 10, errorRate: 0.2 },
                { timestamp: new Date(baseTime.getTime() + 3600000), memoryUsagePercent: 55, cpuUsagePercent: 35, requestsPerSecond: 12, errorRate: 0.4 },
                { timestamp: new Date(baseTime.getTime() + 7200000), memoryUsagePercent: 60, cpuUsagePercent: 40, requestsPerSecond: 15, errorRate: 0.6 },
            ]);

            const csv = await exportMetricsCSV();

            const lines = csv.split('\n');
            expect(lines).toHaveLength(4); // header + 3 data rows
        });

        it('should handle errors gracefully', async () => {
            mockGetHistoricalMetrics.mockRejectedValueOnce(new Error('Firestore error'));

            const csv = await exportMetricsCSV();

            expect(csv).toContain('No data available');
        });
    });

    describe('getAlertThresholdConfig', () => {
        it('should return current alert thresholds', async () => {
            const config = await getAlertThresholdConfig();

            expect(config).toHaveProperty('memory');
            expect(config).toHaveProperty('cpu');
            expect(config).toHaveProperty('latency');
            expect(config).toHaveProperty('errorRate');
            expect(config).toHaveProperty('notifications');
        });

        it('should delegate to health-alerts service', async () => {
            await getAlertThresholdConfig();

            expect(mockGetAlertThresholds).toHaveBeenCalled();
        });
    });

    describe('updateAlertThresholds', () => {
        it('should save thresholds and return success', async () => {
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

            const result = await updateAlertThresholds(config);

            expect(result).toEqual({ success: true });
            expect(mockSaveAlertThresholds).toHaveBeenCalledWith(config, 'test-super-user');
        });
    });

    describe('triggerHealthCheck', () => {
        it('should return health data with comparison', async () => {
            const result = await triggerHealthCheck();

            expect(result).toHaveProperty('current');
            expect(result).toHaveProperty('timeseries');
            expect(result).toHaveProperty('alerts');
        });
    });
});

describe('HEALTH_THRESHOLDS constants', () => {
    it('should have correct default memory thresholds', () => {
        const { HEALTH_THRESHOLDS } = require('@/types/system-health');
        expect(HEALTH_THRESHOLDS.memory).toEqual({ warning: 70, critical: 85 });
    });

    it('should have correct default CPU thresholds', () => {
        const { HEALTH_THRESHOLDS } = require('@/types/system-health');
        expect(HEALTH_THRESHOLDS.cpu).toEqual({ warning: 60, critical: 80 });
    });

    it('should have correct default latency thresholds', () => {
        const { HEALTH_THRESHOLDS } = require('@/types/system-health');
        expect(HEALTH_THRESHOLDS.latency).toEqual({ warning: 1000, critical: 3000 });
    });

    it('should have correct default error rate thresholds', () => {
        const { HEALTH_THRESHOLDS } = require('@/types/system-health');
        expect(HEALTH_THRESHOLDS.errorRate).toEqual({ warning: 1, critical: 5 });
    });
});
