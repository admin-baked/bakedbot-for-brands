/**
 * BakedBot AI in Chrome - Type Definitions
 *
 * Browser automation capabilities for Super Users, powered by RTRVR MCP.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// BROWSER SESSION TYPES
// ============================================================================

export type BrowserSessionStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface BrowserTab {
  id: number;
  url: string;
  title: string;
  active?: boolean;
  favIconUrl?: string;
}

export interface BrowserSession {
  id: string;
  userId: string;
  status: BrowserSessionStatus;
  deviceId?: string;
  tabs: BrowserTab[];
  taskDescription?: string;
  startedAt: Timestamp;
  lastActivityAt: Timestamp;
}

export interface SessionOptions {
  deviceId?: string;
  taskDescription?: string;
  initialUrl?: string;
}

export interface SessionState {
  session: BrowserSession;
  currentUrl?: string;
  pageTitle?: string;
  screenshot?: string;
  isRecording: boolean;
}

// ============================================================================
// BROWSER ACTION TYPES
// ============================================================================

export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'submit'
  | 'scroll'
  | 'select'
  | 'screenshot'
  | 'wait'
  | 'execute_script';

export interface BrowserAction {
  type: BrowserActionType;
  tabId?: number;
  selector?: string;
  value?: string;
  url?: string;
  script?: string;
  waitMs?: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  creditsUsed?: number;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
}

// ============================================================================
// SITE PERMISSION TYPES
// ============================================================================

export type AccessLevel = 'full' | 'read-only' | 'blocked';

export type AllowedAction = 'navigate' | 'click' | 'type' | 'submit' | 'screenshot' | 'scroll' | 'select' | 'wait' | 'execute_script';

export type HighRiskAction = 'purchase' | 'publish' | 'delete' | 'share' | 'login' | 'payment';

export interface SitePermission {
  id: string;
  userId: string;
  domain: string;
  accessLevel: AccessLevel;
  allowedActions: AllowedAction[];
  requiresConfirmation: HighRiskAction[];
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface PermissionGrant {
  accessLevel: AccessLevel;
  allowedActions: AllowedAction[];
  requiresConfirmation?: HighRiskAction[];
  expiresInDays?: number;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  confirmationToken?: string;
}

export interface PendingConfirmation {
  token: string;
  userId: string;
  action: HighRiskAction;
  domain: string;
  description: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

export type WorkflowStepType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'wait'
  | 'screenshot'
  | 'extract'
  | 'condition'
  | 'loop';

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name?: string;
  params: Record<string, unknown>;
  // For conditional/loop steps
  condition?: string;
  children?: WorkflowStep[];
}

export interface WorkflowVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface RecordedWorkflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  status: WorkflowStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  runCount: number;
  lastRunAt?: Timestamp;
  tags?: string[];
}

export interface WorkflowRunResult {
  workflowId: string;
  success: boolean;
  stepsCompleted: number;
  totalSteps: number;
  error?: string;
  output?: Record<string, unknown>;
  duration: number; // ms
}

// ============================================================================
// BROWSER TASK (SCHEDULED) TYPES
// ============================================================================

export type TaskScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'cron';

export type TaskStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskSchedule {
  type: TaskScheduleType;
  cron?: string;
  runAt?: Timestamp;
  timezone: string;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number;
  time?: string; // HH:mm format
}

export interface BrowserTask {
  id: string;
  userId: string;
  workflowId?: string;
  name: string;
  description?: string;
  schedule: TaskSchedule;
  status: TaskStatus;
  enabled: boolean;
  lastRunAt?: Timestamp;
  nextRunAt?: Timestamp;
  result?: WorkflowRunResult;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  runCount: number;
  maxRetries?: number;
  retryCount?: number;
}

export interface BrowserTaskCreate {
  name: string;
  description?: string;
  workflowId?: string;
  schedule: Omit<TaskSchedule, 'timezone'> & { timezone?: string };
  enabled?: boolean;
}

// ============================================================================
// RECORDING TYPES
// ============================================================================

export interface RecordingSession {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'recording' | 'paused' | 'stopped';
  steps: WorkflowStep[];
  startedAt: Timestamp;
  stoppedAt?: Timestamp;
}

export interface RecordedAction {
  timestamp: number;
  type: WorkflowStepType;
  url: string;
  selector?: string;
  value?: string;
  screenshot?: string;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface BrowserAutomationState {
  activeSession: BrowserSession | null;
  permissions: SitePermission[];
  workflows: RecordedWorkflow[];
  tasks: BrowserTask[];
  recording: RecordingSession | null;
  pendingConfirmation: PendingConfirmation | null;
}

export interface BrowserCommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}
