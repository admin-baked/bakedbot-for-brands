'use server';

/**
 * BakedBot AI in Chrome - Server Actions
 *
 * Server actions for browser automation features.
 * All actions require Super User authentication.
 */

import { requireSuperUser } from '@/server/auth/auth';
import {
  browserSessionManager,
  permissionGuard,
  actionValidator,
  workflowRecorder,
  taskScheduler,
} from '@/server/services/browser-automation';
import { logger } from '@/lib/logger';
import type {
  BrowserSession,
  SessionOptions,
  SessionState,
  BrowserAction,
  ActionResult,
  SitePermission,
  PermissionGrant,
  RecordedWorkflow,
  BrowserTask,
  BrowserTaskCreate,
  WorkflowRunResult,
  PendingConfirmation,
  RecordingSession,
} from '@/types/browser-automation';
import { isHighRiskAction } from '@/server/services/browser-automation/action-validator';

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create a new browser session
 */
export async function createBrowserSession(
  options?: SessionOptions
): Promise<ActionResult<BrowserSession>> {
  try {
    const session = await requireSuperUser();
    return browserSessionManager.createSession(session.uid, options);
  } catch (error) {
    logger.error('[BrowserAutomation] createBrowserSession failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create session' };
  }
}

/**
 * Get active browser session
 */
export async function getActiveBrowserSession(): Promise<ActionResult<BrowserSession | null>> {
  try {
    const session = await requireSuperUser();
    const browserSession = await browserSessionManager.getActiveSession(session.uid);
    return { success: true, data: browserSession };
  } catch (error) {
    logger.error('[BrowserAutomation] getActiveBrowserSession failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

/**
 * Get browser session by ID
 */
export async function getBrowserSession(
  sessionId: string
): Promise<ActionResult<SessionState>> {
  try {
    await requireSuperUser();
    return browserSessionManager.getSessionState(sessionId);
  } catch (error) {
    logger.error('[BrowserAutomation] getBrowserSession failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get session' };
  }
}

/**
 * Pause browser session
 */
export async function pauseBrowserSession(sessionId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    return browserSessionManager.pauseSession(sessionId);
  } catch (error) {
    logger.error('[BrowserAutomation] pauseBrowserSession failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to pause session' };
  }
}

/**
 * Resume browser session
 */
export async function resumeBrowserSession(
  sessionId: string
): Promise<ActionResult<BrowserSession>> {
  try {
    await requireSuperUser();
    return browserSessionManager.resumeSession(sessionId);
  } catch (error) {
    logger.error('[BrowserAutomation] resumeBrowserSession failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to resume session' };
  }
}

/**
 * End browser session
 */
export async function endBrowserSession(sessionId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    return browserSessionManager.endSession(sessionId);
  } catch (error) {
    logger.error('[BrowserAutomation] endBrowserSession failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to end session' };
  }
}

/**
 * Get session history
 */
export async function getBrowserSessionHistory(
  limit?: number
): Promise<ActionResult<BrowserSession[]>> {
  try {
    const session = await requireSuperUser();
    const sessions = await browserSessionManager.getSessionHistory(session.uid, limit);
    return { success: true, data: sessions };
  } catch (error) {
    logger.error('[BrowserAutomation] getBrowserSessionHistory failed', { error });
    return { success: true, data: [] }; // Return empty array instead of failing
  }
}

// ============================================================================
// BROWSER ACTIONS
// ============================================================================

/**
 * Execute a browser action with permission checking
 */
export async function executeBrowserAction(
  sessionId: string,
  action: BrowserAction
): Promise<ActionResult> {
  let session;
  try {
    session = await requireSuperUser();
  } catch (error) {
    logger.error('[BrowserAutomation] executeBrowserAction auth failed', { error });
    return { success: false, error: 'Authentication required' };
  }

  // Get current session state for URL context
  const stateResult = await browserSessionManager.getSessionState(sessionId);
  if (!stateResult.success || !stateResult.data) {
    return { success: false, error: stateResult.error || 'Session not found' };
  }

  const currentUrl = action.url || stateResult.data.currentUrl;

  // Validate action
  const validation = actionValidator.validate(action, currentUrl);
  if (!validation.isValid) {
    return { success: false, error: validation.reason };
  }

  // Check permissions for the domain
  if (currentUrl && action.type !== 'navigate') {
    const permResult = await permissionGuard.checkPermission(
      session.uid,
      currentUrl,
      action.type
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason };
    }
  }

  // For navigation, check the target URL
  if (action.type === 'navigate' && action.url) {
    const permResult = await permissionGuard.checkPermission(
      session.uid,
      action.url,
      'navigate'
    );

    if (!permResult.allowed) {
      return { success: false, error: permResult.reason };
    }
  }

  // Check if high-risk action requires confirmation
  if (validation.isHighRisk && validation.riskType) {
    const domain = currentUrl ? new URL(currentUrl).hostname : 'unknown';
    const description = actionValidator.describeAction(action, currentUrl);

    const confirmToken = await permissionGuard.requireConfirmation(
      session.uid,
      validation.riskType,
      domain,
      description
    );

    if (confirmToken) {
      return {
        success: false,
        requiresConfirmation: true,
        confirmationToken: confirmToken,
        error: `This action requires confirmation: ${description}`,
      };
    }
  }

  // Execute the action
  return browserSessionManager.executeAction(sessionId, action);
}

/**
 * Navigate to URL
 */
export async function browserNavigate(
  sessionId: string,
  url: string
): Promise<ActionResult> {
  return executeBrowserAction(sessionId, { type: 'navigate', url });
}

/**
 * Click an element
 */
export async function browserClick(
  sessionId: string,
  selector: string
): Promise<ActionResult> {
  return executeBrowserAction(sessionId, { type: 'click', selector });
}

/**
 * Type text into an element
 */
export async function browserType(
  sessionId: string,
  selector: string,
  text: string
): Promise<ActionResult> {
  return executeBrowserAction(sessionId, { type: 'type', selector, value: text });
}

/**
 * Take a screenshot
 */
export async function browserScreenshot(sessionId: string): Promise<ActionResult<string>> {
  return executeBrowserAction(sessionId, { type: 'screenshot' }) as Promise<ActionResult<string>>;
}

/**
 * Execute JavaScript
 */
export async function browserExecuteScript(
  sessionId: string,
  script: string
): Promise<ActionResult> {
  return executeBrowserAction(sessionId, { type: 'execute_script', script });
}

/**
 * Get browser tabs
 */
export async function getBrowserTabs(
  sessionId: string
): Promise<ActionResult<{ id: number; url: string; title: string }[]>> {
  try {
    await requireSuperUser();
    return browserSessionManager.getTabs(sessionId);
  } catch (error) {
    logger.error('[BrowserAutomation] getBrowserTabs failed', { error });
    return { success: true, data: [] }; // Return empty array instead of failing
  }
}

// ============================================================================
// SITE PERMISSIONS
// ============================================================================

/**
 * Grant site permission
 */
export async function grantSitePermission(
  domain: string,
  permissions: PermissionGrant
): Promise<ActionResult<SitePermission>> {
  try {
    const session = await requireSuperUser();
    const permission = await permissionGuard.grantAccess(session.uid, domain, permissions);
    return { success: true, data: permission };
  } catch (error) {
    logger.error('[BrowserAutomation] grantSitePermission failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant permission',
    };
  }
}

/**
 * Revoke site permission
 */
export async function revokeSitePermission(domain: string): Promise<ActionResult> {
  try {
    const session = await requireSuperUser();
    await permissionGuard.revokeAccess(session.uid, domain);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] revokeSitePermission failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke permission',
    };
  }
}

/**
 * Block a domain
 */
export async function blockSiteDomain(domain: string): Promise<ActionResult> {
  try {
    const session = await requireSuperUser();
    await permissionGuard.blockDomain(session.uid, domain);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] blockSiteDomain failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to block domain',
    };
  }
}

/**
 * List site permissions
 */
export async function listSitePermissions(): Promise<ActionResult<SitePermission[]>> {
  try {
    const session = await requireSuperUser();
    const permissions = await permissionGuard.listPermissions(session.uid);
    return { success: true, data: permissions };
  } catch (error) {
    logger.error('[BrowserAutomation] listSitePermissions failed', { error });
    return { success: true, data: [] }; // Return empty array instead of failing
  }
}

/**
 * Get permission for a specific domain
 */
export async function getSitePermission(
  domain: string
): Promise<ActionResult<SitePermission | null>> {
  try {
    const session = await requireSuperUser();
    const permission = await permissionGuard.getPermissionForDomain(session.uid, domain);
    return { success: true, data: permission };
  } catch (error) {
    logger.error('[BrowserAutomation] getSitePermission failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

// ============================================================================
// ACTION CONFIRMATION
// ============================================================================

/**
 * Get pending confirmation
 */
export async function getPendingConfirmation(
  token: string
): Promise<ActionResult<PendingConfirmation | null>> {
  try {
    await requireSuperUser();
    const confirmation = await permissionGuard.getPendingConfirmation(token);
    return { success: true, data: confirmation };
  } catch (error) {
    logger.error('[BrowserAutomation] getPendingConfirmation failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

/**
 * Confirm a high-risk action
 */
export async function confirmBrowserAction(token: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    const result = await permissionGuard.confirmAction(token);

    if (!result.allowed) {
      return { success: false, error: result.reason };
    }

    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] confirmBrowserAction failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm action' };
  }
}

/**
 * Deny a high-risk action
 */
export async function denyBrowserAction(token: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await permissionGuard.denyAction(token);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] denyBrowserAction failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to deny action' };
  }
}

// ============================================================================
// WORKFLOW RECORDING
// ============================================================================

/**
 * Start workflow recording
 */
export async function startWorkflowRecording(
  name: string,
  description?: string
): Promise<ActionResult<RecordingSession>> {
  try {
    const session = await requireSuperUser();
    // Get active browser session
    const browserSession = await browserSessionManager.getActiveSession(session.uid);

    const recording = await workflowRecorder.startRecording(
      session.uid,
      name,
      description,
      browserSession?.id
    );

    return { success: true, data: recording };
  } catch (error) {
    logger.error('[BrowserAutomation] startWorkflowRecording failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start recording',
    };
  }
}

/**
 * Pause workflow recording
 */
export async function pauseWorkflowRecording(recordingId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await workflowRecorder.pauseRecording(recordingId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] pauseWorkflowRecording failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pause recording',
    };
  }
}

/**
 * Resume workflow recording
 */
export async function resumeWorkflowRecording(recordingId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await workflowRecorder.resumeRecording(recordingId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] resumeWorkflowRecording failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resume recording',
    };
  }
}

/**
 * Stop workflow recording
 */
export async function stopWorkflowRecording(
  recordingId: string
): Promise<ActionResult<RecordedWorkflow>> {
  try {
    await requireSuperUser();
    const workflow = await workflowRecorder.stopRecording(recordingId);
    return { success: true, data: workflow };
  } catch (error) {
    logger.error('[BrowserAutomation] stopWorkflowRecording failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop recording',
    };
  }
}

/**
 * Cancel workflow recording
 */
export async function cancelWorkflowRecording(recordingId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await workflowRecorder.cancelRecording(recordingId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] cancelWorkflowRecording failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel recording',
    };
  }
}

/**
 * Get active recording
 */
export async function getActiveRecording(): Promise<ActionResult<RecordingSession | null>> {
  try {
    const session = await requireSuperUser();
    const recording = await workflowRecorder.getActiveRecording(session.uid);
    return { success: true, data: recording };
  } catch (error) {
    logger.error('[BrowserAutomation] getActiveRecording failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

// ============================================================================
// WORKFLOW MANAGEMENT
// ============================================================================

/**
 * Save a workflow
 */
export async function saveWorkflow(
  workflow: Omit<RecordedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'userId'>
): Promise<ActionResult<RecordedWorkflow>> {
  try {
    const session = await requireSuperUser();
    const saved = await workflowRecorder.saveWorkflow({
      ...workflow,
      userId: session.uid,
    });
    return { success: true, data: saved };
  } catch (error) {
    logger.error('[BrowserAutomation] saveWorkflow failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save workflow',
    };
  }
}

/**
 * Update a workflow
 */
export async function updateWorkflow(
  workflowId: string,
  updates: Partial<Pick<RecordedWorkflow, 'name' | 'description' | 'steps' | 'variables' | 'status' | 'tags'>>
): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await workflowRecorder.updateWorkflow(workflowId, updates);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] updateWorkflow failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update workflow',
    };
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await workflowRecorder.deleteWorkflow(workflowId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] deleteWorkflow failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete workflow',
    };
  }
}

/**
 * Get workflow by ID
 */
export async function getWorkflow(
  workflowId: string
): Promise<ActionResult<RecordedWorkflow | null>> {
  try {
    await requireSuperUser();
    const workflow = await workflowRecorder.getWorkflow(workflowId);
    return { success: true, data: workflow };
  } catch (error) {
    logger.error('[BrowserAutomation] getWorkflow failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

/**
 * List workflows
 */
export async function listWorkflows(options?: {
  status?: string;
  limit?: number;
}): Promise<ActionResult<RecordedWorkflow[]>> {
  try {
    const session = await requireSuperUser();
    const workflows = await workflowRecorder.listWorkflows(session.uid, options);
    return { success: true, data: workflows };
  } catch (error) {
    logger.error('[BrowserAutomation] listWorkflows failed', { error });
    return { success: true, data: [] }; // Return empty array instead of failing
  }
}

/**
 * Run a workflow
 */
export async function runWorkflow(
  workflowId: string,
  variables?: Record<string, string>
): Promise<ActionResult<WorkflowRunResult>> {
  try {
    const session = await requireSuperUser();

    // Get or create browser session
    let browserSession = await browserSessionManager.getActiveSession(session.uid);

    if (!browserSession) {
      const result = await browserSessionManager.createSession(session.uid, {
        taskDescription: `Running workflow: ${workflowId}`,
      });
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to create session' };
      }
      browserSession = result.data;
    }

    const result = await workflowRecorder.runWorkflow(
      workflowId,
      browserSession.id,
      variables
    );

    return { success: result.success, data: result, error: result.error };
  } catch (error) {
    logger.error('[BrowserAutomation] runWorkflow failed', { error });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to run workflow' };
  }
}

// ============================================================================
// TASK SCHEDULING
// ============================================================================

/**
 * Schedule a browser task
 */
export async function scheduleBrowserTask(
  task: BrowserTaskCreate
): Promise<ActionResult<BrowserTask>> {
  try {
    const session = await requireSuperUser();
    const scheduled = await taskScheduler.scheduleTask(session.uid, task);
    return { success: true, data: scheduled };
  } catch (error) {
    logger.error('[BrowserAutomation] scheduleBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule task',
    };
  }
}

/**
 * Update a browser task
 */
export async function updateBrowserTask(
  taskId: string,
  updates: Partial<Pick<BrowserTask, 'name' | 'description' | 'schedule' | 'enabled' | 'workflowId'>>
): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await taskScheduler.updateTask(taskId, updates);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] updateBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update task',
    };
  }
}

/**
 * Cancel a browser task
 */
export async function cancelBrowserTask(taskId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await taskScheduler.cancelTask(taskId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] cancelBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel task',
    };
  }
}

/**
 * Delete a browser task
 */
export async function deleteBrowserTask(taskId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await taskScheduler.deleteTask(taskId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] deleteBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete task',
    };
  }
}

/**
 * Get browser task by ID
 */
export async function getBrowserTask(
  taskId: string
): Promise<ActionResult<BrowserTask | null>> {
  try {
    await requireSuperUser();
    const task = await taskScheduler.getTask(taskId);
    return { success: true, data: task };
  } catch (error) {
    logger.error('[BrowserAutomation] getBrowserTask failed', { error });
    return { success: true, data: null }; // Return null instead of failing
  }
}

/**
 * List browser tasks
 */
export async function listBrowserTasks(options?: {
  limit?: number;
}): Promise<ActionResult<BrowserTask[]>> {
  try {
    const session = await requireSuperUser();
    const tasks = await taskScheduler.listTasks(session.uid, options);
    return { success: true, data: tasks };
  } catch (error) {
    logger.error('[BrowserAutomation] listBrowserTasks failed', { error });
    return { success: true, data: [] }; // Return empty array instead of failing
  }
}

/**
 * Run a browser task immediately
 */
export async function runBrowserTaskNow(
  taskId: string
): Promise<ActionResult<WorkflowRunResult>> {
  try {
    await requireSuperUser();
    const result = await taskScheduler.runNow(taskId);
    return { success: result.success, data: result, error: result.error };
  } catch (error) {
    logger.error('[BrowserAutomation] runBrowserTaskNow failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run task',
    };
  }
}

/**
 * Enable a browser task
 */
export async function enableBrowserTask(taskId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await taskScheduler.enableTask(taskId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] enableBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable task',
    };
  }
}

/**
 * Disable a browser task
 */
export async function disableBrowserTask(taskId: string): Promise<ActionResult> {
  try {
    await requireSuperUser();
    await taskScheduler.disableTask(taskId);
    return { success: true };
  } catch (error) {
    logger.error('[BrowserAutomation] disableBrowserTask failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable task',
    };
  }
}
