/**
 * BakedBot AI in Chrome - Service Exports
 *
 * Browser automation services for Super Users.
 */

export { BrowserSessionManager, browserSessionManager } from './session-manager';
export { PermissionGuard, permissionGuard } from './permission-guard';
export { ActionValidator, actionValidator, isHighRiskAction } from './action-validator';
export { WorkflowRecorder, workflowRecorder } from './workflow-recorder';
export { TaskScheduler, taskScheduler } from './task-scheduler';

// Re-export types for convenience
export type {
  BrowserSession,
  BrowserTab,
  SessionOptions,
  SessionState,
  BrowserAction,
  ActionResult,
  SitePermission,
  PermissionGrant,
  PermissionResult,
  RecordedWorkflow,
  WorkflowStep,
  BrowserTask,
  BrowserTaskCreate,
  RecordingSession,
} from '@/types/browser-automation';
