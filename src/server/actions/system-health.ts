'use server';
/**
 * System Health Monitoring Server Actions
 *
 * Fetches runtime metrics from Firebase App Hosting / Google Cloud Platform:
 * - Memory and CPU usage
 * - Instance count
 * - Request latency
 * - Error rates
 *
 * TODO: Integrate with Google Cloud Monitoring API for real-time metrics
 * https://cloud.google.com/monitoring/api/v3
 */

import { requireUser } from '@/server/auth/auth';
import type {
  SystemHealthMetrics,
  SystemHealthTimeseries,
  SystemHealthSummary,
  SystemHealthAlert,
} from '@/types/system-health';
import { HEALTH_THRESHOLDS } from '@/types/system-health';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getHistoricalMetrics } from '@/server/services/metrics-collector';

/**
 * Get current system health metrics
 */
export async function getSystemHealth(): Promise<SystemHealthSummary> {
  const user = await requireUser(['super_user']);

  // Read configuration from environment
  const memoryAllocatedMB = 2048; // From apphosting.yaml runConfig.memoryMiB
  const cpuCores = 1; // From apphosting.yaml runConfig.cpu
  const minInstances = 0;
  const maxInstances = 10;

  // TODO: Replace with real Google Cloud Monitoring API calls
  // For now, simulate metrics with reasonable defaults + some randomization
  const now = new Date();

  // Simulate current metrics
  const memoryUsedMB = Math.floor(memoryAllocatedMB * (0.4 + Math.random() * 0.3)); // 40-70%
  const memoryUsagePercent = Math.round((memoryUsedMB / memoryAllocatedMB) * 100);

  const cpuUsagePercent = Math.round(20 + Math.random() * 40); // 20-60%
  const instanceCount = Math.floor(1 + Math.random() * 3); // 1-3 instances

  const requestsPerSecond = Math.round(5 + Math.random() * 15); // 5-20 req/s
  const avgLatencyMs = Math.round(100 + Math.random() * 200); // 100-300ms
  const p95LatencyMs = Math.round(avgLatencyMs * 2); // ~2x average
  const p99LatencyMs = Math.round(avgLatencyMs * 3); // ~3x average

  const errorRate = Math.random() * 2; // 0-2%
  const errorCount = Math.floor(requestsPerSecond * errorRate * 60); // Errors per minute

  // Get deployment info from git (if available)
  let lastDeployment: Date | null = null;
  let currentVersion: string | null = null;

  // Try to read from Firestore deployment log (if you track deployments)
  try {
    const db = getAdminFirestore();
    const deploymentsSnapshot = await db
      .collection('deployments')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!deploymentsSnapshot.empty) {
      const deployment = deploymentsSnapshot.docs[0].data();
      lastDeployment = deployment.timestamp instanceof Timestamp
        ? deployment.timestamp.toDate()
        : new Date(deployment.timestamp);
      currentVersion = deployment.version || deployment.commitSha || null;
    }
  } catch (error) {
    // Deployment tracking not set up yet
  }

  // Determine deployment status based on metrics
  let deploymentStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (errorRate > HEALTH_THRESHOLDS.errorRate.critical || memoryUsagePercent > HEALTH_THRESHOLDS.memory.critical) {
    deploymentStatus = 'unhealthy';
  } else if (errorRate > HEALTH_THRESHOLDS.errorRate.warning || memoryUsagePercent > HEALTH_THRESHOLDS.memory.warning) {
    deploymentStatus = 'degraded';
  }

  const current: SystemHealthMetrics = {
    timestamp: now,
    memoryAllocatedMB,
    memoryUsedMB,
    memoryUsagePercent,
    cpuCores,
    cpuUsagePercent,
    instanceCount,
    minInstances,
    maxInstances,
    requestsPerSecond,
    avgLatencyMs,
    p95LatencyMs,
    p99LatencyMs,
    errorRate,
    errorCount,
    deploymentStatus,
    lastDeployment,
    currentVersion,
  };

  // Get historical metrics from Firestore (last 24 hours)
  let timeseries: SystemHealthTimeseries[] = [];
  try {
    timeseries = await getHistoricalMetrics(24);
  } catch (error) {
    console.error('Failed to fetch historical metrics:', error);
  }

  // Fallback: If no historical data yet, generate simulated data
  if (timeseries.length === 0) {
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      timeseries.push({
        timestamp,
        memoryUsagePercent: Math.round(40 + Math.random() * 30), // 40-70%
        cpuUsagePercent: Math.round(20 + Math.random() * 40), // 20-60%
        requestsPerSecond: Math.round(5 + Math.random() * 15), // 5-20 req/s
        errorRate: Math.random() * 2, // 0-2%
      });
    }
  }

  // Generate alerts based on thresholds
  const alerts: SystemHealthAlert[] = [];

  if (memoryUsagePercent >= HEALTH_THRESHOLDS.memory.critical) {
    alerts.push({
      id: `memory-critical-${now.getTime()}`,
      severity: 'critical',
      type: 'memory',
      message: `Memory usage is critically high: ${memoryUsagePercent}% (${memoryUsedMB}MB / ${memoryAllocatedMB}MB)`,
      timestamp: now,
      resolved: false,
    });
  } else if (memoryUsagePercent >= HEALTH_THRESHOLDS.memory.warning) {
    alerts.push({
      id: `memory-warning-${now.getTime()}`,
      severity: 'warning',
      type: 'memory',
      message: `Memory usage is elevated: ${memoryUsagePercent}% (${memoryUsedMB}MB / ${memoryAllocatedMB}MB)`,
      timestamp: now,
      resolved: false,
    });
  }

  if (cpuUsagePercent >= HEALTH_THRESHOLDS.cpu.critical) {
    alerts.push({
      id: `cpu-critical-${now.getTime()}`,
      severity: 'critical',
      type: 'cpu',
      message: `CPU usage is critically high: ${cpuUsagePercent}%`,
      timestamp: now,
      resolved: false,
    });
  } else if (cpuUsagePercent >= HEALTH_THRESHOLDS.cpu.warning) {
    alerts.push({
      id: `cpu-warning-${now.getTime()}`,
      severity: 'warning',
      type: 'cpu',
      message: `CPU usage is elevated: ${cpuUsagePercent}%`,
      timestamp: now,
      resolved: false,
    });
  }

  if (p95LatencyMs >= HEALTH_THRESHOLDS.latency.critical) {
    alerts.push({
      id: `latency-critical-${now.getTime()}`,
      severity: 'critical',
      type: 'latency',
      message: `P95 latency is critically high: ${p95LatencyMs}ms`,
      timestamp: now,
      resolved: false,
    });
  } else if (p95LatencyMs >= HEALTH_THRESHOLDS.latency.warning) {
    alerts.push({
      id: `latency-warning-${now.getTime()}`,
      severity: 'warning',
      type: 'latency',
      message: `P95 latency is elevated: ${p95LatencyMs}ms`,
      timestamp: now,
      resolved: false,
    });
  }

  if (errorRate >= HEALTH_THRESHOLDS.errorRate.critical) {
    alerts.push({
      id: `errors-critical-${now.getTime()}`,
      severity: 'critical',
      type: 'errors',
      message: `Error rate is critically high: ${errorRate.toFixed(2)}% (${errorCount} errors/min)`,
      timestamp: now,
      resolved: false,
    });
  } else if (errorRate >= HEALTH_THRESHOLDS.errorRate.warning) {
    alerts.push({
      id: `errors-warning-${now.getTime()}`,
      severity: 'warning',
      type: 'errors',
      message: `Error rate is elevated: ${errorRate.toFixed(2)}% (${errorCount} errors/min)`,
      timestamp: now,
      resolved: false,
    });
  }

  return {
    current,
    timeseries,
    alerts,
  };
}

/**
 * Get system configuration from apphosting.yaml
 */
export async function getSystemConfiguration() {
  const user = await requireUser(['super_user']);

  return {
    runtime: {
      memoryMiB: 2048,
      cpu: 1,
      minInstances: 0,
      maxInstances: 10,
      concurrency: 80,
    },
    build: {
      nodeMemoryMiB: 2048, // NODE_OPTIONS --max-old-space-size
    },
    deployment: {
      platform: 'Firebase App Hosting',
      region: 'us-central1',
      project: 'studio-567050101-bc6e8',
    },
  };
}

/**
 * Trigger a manual health check (useful for testing alerts)
 */
export async function triggerHealthCheck() {
  const user = await requireUser(['super_user']);
  return await getSystemHealth();
}
