/**
 * BakedBot AI in Chrome - Workflow Recorder
 *
 * Records user browser actions into reusable workflows.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import crypto from 'crypto';
import type {
  RecordedWorkflow,
  WorkflowStep,
  WorkflowVariable,
  RecordingSession,
  RecordedAction,
  WorkflowRunResult,
} from '@/types/browser-automation';
import { browserSessionManager } from './session-manager';

const WORKFLOWS_COLLECTION = 'recorded_workflows';
const RECORDINGS_COLLECTION = 'recording_sessions';

export class WorkflowRecorder {
  /**
   * Start a new recording session
   */
  async startRecording(
    userId: string,
    name: string,
    description?: string,
    sessionId?: string
  ): Promise<RecordingSession> {
    try {
      // Check for existing recording
      const existing = await this.getActiveRecording(userId);
      if (existing) {
        throw new Error('A recording is already in progress');
      }

      const now = Timestamp.now();
      const recording: Omit<RecordingSession, 'id'> = {
        userId,
        name,
        description,
        status: 'recording',
        steps: [],
        startedAt: now,
      };

      const docRef = await getAdminFirestore().collection(RECORDINGS_COLLECTION).add({
        ...recording,
        sessionId,
      });

      logger.info('[WorkflowRecorder] Started recording', {
        recordingId: docRef.id,
        userId,
        name,
      });

      return { id: docRef.id, ...recording };
    } catch (error) {
      logger.error('[WorkflowRecorder] Failed to start recording', { error, userId });
      throw error;
    }
  }

  /**
   * Record an action
   */
  async recordAction(
    recordingId: string,
    action: RecordedAction
  ): Promise<void> {
    try {
      const step: WorkflowStep = {
        id: crypto.randomUUID(),
        type: action.type,
        params: {
          selector: action.selector,
          value: action.value,
          url: action.url,
          timestamp: action.timestamp,
        },
      };

      await getAdminFirestore().collection(RECORDINGS_COLLECTION).doc(recordingId).update({
        steps: FieldValue.arrayUnion(step),
      });

      logger.debug('[WorkflowRecorder] Recorded action', {
        recordingId,
        type: action.type,
      });
    } catch (error) {
      logger.error('[WorkflowRecorder] Failed to record action', { error, recordingId });
      throw error;
    }
  }

  /**
   * Pause a recording
   */
  async pauseRecording(recordingId: string): Promise<void> {
    await getAdminFirestore().collection(RECORDINGS_COLLECTION).doc(recordingId).update({
      status: 'paused',
    });
    logger.info('[WorkflowRecorder] Paused recording', { recordingId });
  }

  /**
   * Resume a recording
   */
  async resumeRecording(recordingId: string): Promise<void> {
    await getAdminFirestore().collection(RECORDINGS_COLLECTION).doc(recordingId).update({
      status: 'recording',
    });
    logger.info('[WorkflowRecorder] Resumed recording', { recordingId });
  }

  /**
   * Stop recording and convert to workflow
   */
  async stopRecording(recordingId: string): Promise<RecordedWorkflow> {
    try {
      const doc = await getAdminFirestore().collection(RECORDINGS_COLLECTION).doc(recordingId).get();
      if (!doc.exists) {
        throw new Error('Recording not found');
      }

      const recording = { id: doc.id, ...doc.data() } as RecordingSession;

      // Update recording status
      await doc.ref.update({
        status: 'stopped',
        stoppedAt: FieldValue.serverTimestamp(),
      });

      // Detect variables from recorded steps
      const variables = this.detectVariables(recording.steps);

      // Create workflow
      const now = Timestamp.now();
      const workflow: Omit<RecordedWorkflow, 'id'> = {
        userId: recording.userId,
        name: recording.name,
        description: recording.description || '',
        steps: recording.steps,
        variables,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        runCount: 0,
      };

      const workflowRef = await getAdminFirestore().collection(WORKFLOWS_COLLECTION).add(workflow);

      logger.info('[WorkflowRecorder] Stopped recording, created workflow', {
        recordingId,
        workflowId: workflowRef.id,
        stepCount: recording.steps.length,
      });

      return { id: workflowRef.id, ...workflow };
    } catch (error) {
      logger.error('[WorkflowRecorder] Failed to stop recording', { error, recordingId });
      throw error;
    }
  }

  /**
   * Cancel a recording
   */
  async cancelRecording(recordingId: string): Promise<void> {
    await getAdminFirestore().collection(RECORDINGS_COLLECTION).doc(recordingId).delete();
    logger.info('[WorkflowRecorder] Cancelled recording', { recordingId });
  }

  /**
   * Get active recording for user
   */
  async getActiveRecording(userId: string): Promise<RecordingSession | null> {
    const snapshot = await getAdminFirestore()
      .collection(RECORDINGS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', 'in', ['recording', 'paused'])
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as RecordingSession;
  }

  /**
   * Save a workflow
   */
  async saveWorkflow(
    workflow: Omit<RecordedWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>
  ): Promise<RecordedWorkflow> {
    const now = Timestamp.now();
    const docRef = await getAdminFirestore().collection(WORKFLOWS_COLLECTION).add({
      ...workflow,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
    });

    logger.info('[WorkflowRecorder] Saved workflow', {
      workflowId: docRef.id,
      name: workflow.name,
    });

    return {
      id: docRef.id,
      ...workflow,
      createdAt: now,
      updatedAt: now,
      runCount: 0,
    };
  }

  /**
   * Update a workflow
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<Pick<RecordedWorkflow, 'name' | 'description' | 'steps' | 'variables' | 'status' | 'tags'>>
  ): Promise<void> {
    await getAdminFirestore().collection(WORKFLOWS_COLLECTION).doc(workflowId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[WorkflowRecorder] Updated workflow', { workflowId });
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    await getAdminFirestore().collection(WORKFLOWS_COLLECTION).doc(workflowId).delete();
    logger.info('[WorkflowRecorder] Deleted workflow', { workflowId });
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<RecordedWorkflow | null> {
    const doc = await getAdminFirestore().collection(WORKFLOWS_COLLECTION).doc(workflowId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as RecordedWorkflow;
  }

  /**
   * List workflows for user
   */
  async listWorkflows(
    userId: string,
    options?: { status?: string; limit?: number }
  ): Promise<RecordedWorkflow[]> {
    let query = getAdminFirestore()
      .collection(WORKFLOWS_COLLECTION)
      .where('userId', '==', userId);

    if (options?.status) {
      query = query.where('status', '==', options.status);
    }

    query = query.orderBy('updatedAt', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as RecordedWorkflow));
  }

  /**
   * Run a workflow
   */
  async runWorkflow(
    workflowId: string,
    sessionId: string,
    variables?: Record<string, string>
  ): Promise<WorkflowRunResult> {
    const startTime = Date.now();
    let stepsCompleted = 0;

    try {
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      logger.info('[WorkflowRecorder] Running workflow', {
        workflowId,
        sessionId,
        stepCount: workflow.steps.length,
      });

      // Execute each step
      for (const step of workflow.steps) {
        const params = this.substituteVariables(step.params, variables || {});

        const result = await browserSessionManager.executeAction(sessionId, {
          type: step.type as any,
          ...params,
        });

        if (!result.success) {
          throw new Error(`Step ${step.id} failed: ${result.error}`);
        }

        stepsCompleted++;

        // Brief pause between actions
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update run count
      await getAdminFirestore().collection(WORKFLOWS_COLLECTION).doc(workflowId).update({
        runCount: FieldValue.increment(1),
        lastRunAt: FieldValue.serverTimestamp(),
      });

      const duration = Date.now() - startTime;

      logger.info('[WorkflowRecorder] Workflow completed', {
        workflowId,
        duration,
        stepsCompleted,
      });

      return {
        workflowId,
        success: true,
        stepsCompleted,
        totalSteps: workflow.steps.length,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const workflow = await this.getWorkflow(workflowId);

      logger.error('[WorkflowRecorder] Workflow failed', {
        error,
        workflowId,
        stepsCompleted,
      });

      return {
        workflowId,
        success: false,
        stepsCompleted,
        totalSteps: workflow?.steps.length || 0,
        error: error instanceof Error ? error.message : 'Workflow failed',
        duration,
      };
    }
  }

  /**
   * Detect variables from recorded steps
   */
  private detectVariables(steps: WorkflowStep[]): WorkflowVariable[] {
    const variables: WorkflowVariable[] = [];
    const seen = new Set<string>();

    for (const step of steps) {
      if (step.type === 'type' && step.params.value) {
        const value = String(step.params.value);

        // Detect email-like values
        if (value.includes('@') && !seen.has('email')) {
          seen.add('email');
          variables.push({
            name: 'email',
            description: 'Email address',
            defaultValue: value,
          });
        }

        // Detect URL-like values
        if (value.startsWith('http') && !seen.has('url')) {
          seen.add('url');
          variables.push({
            name: 'url',
            description: 'URL',
            defaultValue: value,
          });
        }
      }

      if (step.type === 'navigate' && step.params.url) {
        if (!seen.has('startUrl')) {
          seen.add('startUrl');
          variables.push({
            name: 'startUrl',
            description: 'Starting URL for the workflow',
            defaultValue: String(step.params.url),
          });
        }
      }
    }

    return variables;
  }

  /**
   * Substitute variables in step params
   */
  private substituteVariables(
    params: Record<string, unknown>,
    variables: Record<string, string>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        let substituted = value;
        for (const [varName, varValue] of Object.entries(variables)) {
          substituted = substituted.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), varValue);
        }
        result[key] = substituted;
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

// Export singleton instance
export const workflowRecorder = new WorkflowRecorder();
