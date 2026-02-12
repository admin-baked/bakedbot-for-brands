/**
 * System Health Monitoring Types
 *
 * Types for tracking Firebase App Hosting runtime metrics:
 * - Memory usage
 * - CPU utilization
 * - Instance count
 * - Request latency
 * - Error rates
 */

export interface SystemHealthMetrics {
  timestamp: Date;

  // Memory
  memoryAllocatedMB: number;
  memoryUsedMB: number;
  memoryUsagePercent: number;

  // CPU
  cpuCores: number;
  cpuUsagePercent: number;

  // Instances
  instanceCount: number;
  minInstances: number;
  maxInstances: number;

  // Requests
  requestsPerSecond: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;

  // Errors
  errorRate: number; // Percentage
  errorCount: number;

  // Deployment
  deploymentStatus: 'healthy' | 'degraded' | 'unhealthy';
  lastDeployment: Date | null;
  currentVersion: string | null;
}

export interface SystemHealthTimeseries {
  timestamp: Date;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  requestsPerSecond: number;
  errorRate: number;
}

export interface SystemHealthSummary {
  current: SystemHealthMetrics;
  timeseries: SystemHealthTimeseries[];
  alerts: SystemHealthAlert[];
}

export interface SystemHealthAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'memory' | 'cpu' | 'latency' | 'errors' | 'deployment';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

// Thresholds for alerts
export const HEALTH_THRESHOLDS = {
  memory: {
    warning: 70, // %
    critical: 85, // %
  },
  cpu: {
    warning: 60, // %
    critical: 80, // %
  },
  latency: {
    warning: 1000, // ms (p95)
    critical: 3000, // ms (p95)
  },
  errorRate: {
    warning: 1, // %
    critical: 5, // %
  },
} as const;
