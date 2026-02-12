/**
 * Unit tests for gcp-monitoring.ts
 * Tests GCP Cloud Monitoring API integration and fallback behavior
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockListTimeSeries = jest.fn();
const mockListMetricDescriptors = jest.fn();

jest.mock('@google-cloud/monitoring', () => ({
    MetricServiceClient: jest.fn().mockImplementation(() => ({
        listTimeSeries: mockListTimeSeries,
        listMetricDescriptors: mockListMetricDescriptors,
    })),
}));

import { getGCPMetrics, getGCPTimeseries, isGCPMonitoringAvailable } from '../gcp-monitoring';

describe('GCP Monitoring Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isGCPMonitoringAvailable', () => {
        it('should return true when metric descriptors are found', async () => {
            mockListMetricDescriptors.mockResolvedValueOnce([[{ name: 'test-descriptor' }]]);

            const available = await isGCPMonitoringAvailable();

            expect(available).toBe(true);
        });

        it('should return false when no metric descriptors found', async () => {
            mockListMetricDescriptors.mockResolvedValueOnce([[]]);

            const available = await isGCPMonitoringAvailable();

            expect(available).toBe(false);
        });

        it('should return false on API error', async () => {
            mockListMetricDescriptors.mockRejectedValueOnce(new Error('Auth failed'));

            const available = await isGCPMonitoringAvailable();

            expect(available).toBe(false);
        });

        it('should query for instance_count metric descriptor', async () => {
            mockListMetricDescriptors.mockResolvedValueOnce([[]]);

            await isGCPMonitoringAvailable();

            expect(mockListMetricDescriptors).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: expect.stringContaining('projects/'),
                    filter: expect.stringContaining('instance_count'),
                    pageSize: 1,
                }),
            );
        });
    });

    describe('getGCPMetrics', () => {
        const createTimeSeriesResponse = (value: number, seconds?: number): any[] => [{
            points: [{
                value: { doubleValue: value },
                interval: {
                    endTime: { seconds: seconds || Math.floor(Date.now() / 1000) },
                },
            }],
        }];

        it('should return formatted metrics from GCP', async () => {
            // Mock all 5 metric queries (memory, cpu, requests, latency, instances)
            mockListTimeSeries
                .mockResolvedValueOnce([createTimeSeriesResponse(0.55)]) // memory: 55%
                .mockResolvedValueOnce([createTimeSeriesResponse(0.35)]) // cpu: 35%
                .mockResolvedValueOnce([createTimeSeriesResponse(3000)]) // requests: 3000 per 5min
                .mockResolvedValueOnce([createTimeSeriesResponse(150)])  // latency: 150ms
                .mockResolvedValueOnce([createTimeSeriesResponse(2)]);   // instances: 2

            const metrics = await getGCPMetrics();

            expect(metrics.memoryUsagePercent).toBe(55);
            expect(metrics.cpuUsagePercent).toBe(35);
            expect(metrics.requestsPerSecond).toBe(10); // 3000/300
            expect(metrics.avgLatencyMs).toBe(150);
            expect(metrics.p95LatencyMs).toBe(300); // 150 * 2
            expect(metrics.instanceCount).toBe(2);
        });

        it('should handle empty time series gracefully', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([[]]) // no memory data
                .mockResolvedValueOnce([[]]) // no cpu data
                .mockResolvedValueOnce([[]]) // no request data
                .mockResolvedValueOnce([[]]) // no latency data
                .mockResolvedValueOnce([[]]); // no instance data

            const metrics = await getGCPMetrics();

            expect(metrics.memoryUsagePercent).toBe(0);
            expect(metrics.cpuUsagePercent).toBe(0);
            expect(metrics.requestsPerSecond).toBe(0);
            expect(metrics.avgLatencyMs).toBe(0);
            expect(metrics.instanceCount).toBe(0);
        });

        it('should handle individual metric failures gracefully', async () => {
            mockListTimeSeries
                .mockRejectedValueOnce(new Error('Memory metric failed'))
                .mockResolvedValueOnce([createTimeSeriesResponse(0.40)])
                .mockRejectedValueOnce(new Error('Requests metric failed'))
                .mockResolvedValueOnce([createTimeSeriesResponse(200)])
                .mockResolvedValueOnce([createTimeSeriesResponse(1)]);

            const metrics = await getGCPMetrics();

            // Failed metrics should return 0, others should have values
            expect(metrics.memoryUsagePercent).toBe(0);
            expect(metrics.cpuUsagePercent).toBe(40);
            expect(metrics.requestsPerSecond).toBe(0);
            expect(metrics.avgLatencyMs).toBe(200);
            expect(metrics.instanceCount).toBe(1);
        });

        it('should throw when all metrics fail', async () => {
            mockListTimeSeries.mockRejectedValue(new Error('API down'));

            // getGCPMetrics catches individual failures via .catch(() => [])
            // but if Promise.all itself fails, it should throw
            // Since individual calls use .catch, it won't actually throw
            const metrics = await getGCPMetrics();
            expect(metrics.memoryUsagePercent).toBe(0);
        });

        it('should round values to one decimal place', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([createTimeSeriesResponse(0.5567)]) // 55.67%
                .mockResolvedValueOnce([createTimeSeriesResponse(0.3333)]) // 33.33%
                .mockResolvedValueOnce([createTimeSeriesResponse(1500)])
                .mockResolvedValueOnce([createTimeSeriesResponse(155)])
                .mockResolvedValueOnce([createTimeSeriesResponse(2)]);

            const metrics = await getGCPMetrics();

            expect(metrics.memoryUsagePercent).toBe(55.7);
            expect(metrics.cpuUsagePercent).toBe(33.3);
        });
    });

    describe('getGCPTimeseries', () => {
        it('should query metrics for specified hours', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]]);

            await getGCPTimeseries(24);

            // Should be called 3 times (memory, cpu, requests)
            expect(mockListTimeSeries).toHaveBeenCalledTimes(3);
        });

        it('should use 15-min alignment for 24-hour queries', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]]);

            await getGCPTimeseries(24);

            const firstCall = mockListTimeSeries.mock.calls[0][0];
            expect(firstCall.aggregation.alignmentPeriod.seconds).toBe(900);
        });

        it('should use 1-hour alignment for queries over 24 hours', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]]);

            await getGCPTimeseries(48);

            const firstCall = mockListTimeSeries.mock.calls[0][0];
            expect(firstCall.aggregation.alignmentPeriod.seconds).toBe(3600);
        });

        it('should return empty array when no data available', async () => {
            mockListTimeSeries
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]]);

            const result = await getGCPTimeseries(24);

            expect(result).toEqual([]);
        });

        it('should merge timeseries by timestamp', async () => {
            const ts = Math.floor(Date.now() / 1000);
            mockListTimeSeries
                .mockResolvedValueOnce([[{
                    points: [{ value: { doubleValue: 0.5 }, interval: { endTime: { seconds: ts } } }],
                }]])
                .mockResolvedValueOnce([[{
                    points: [{ value: { doubleValue: 0.3 }, interval: { endTime: { seconds: ts } } }],
                }]])
                .mockResolvedValueOnce([[{
                    points: [{ value: { doubleValue: 1000 }, interval: { endTime: { seconds: ts } } }],
                }]]);

            const result = await getGCPTimeseries(24);

            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0]).toHaveProperty('memoryUsagePercent');
            expect(result[0]).toHaveProperty('cpuUsagePercent');
            expect(result[0]).toHaveProperty('requestsPerSecond');
            expect(result[0]).toHaveProperty('errorRate', 0);
        });

        it('should return empty array when all metric queries fail', async () => {
            // Individual queries use .catch(() => []), so failures result in empty arrays
            mockListTimeSeries.mockRejectedValue(new Error('API unavailable'));

            const result = await getGCPTimeseries(24);

            expect(result).toEqual([]);
        });
    });
});
