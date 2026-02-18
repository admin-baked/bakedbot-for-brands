'use server';

/**
 * Playbook Template Drill-Down Data
 *
 * Fetch detailed execution history and org assignments for a specific template
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface OrgAssignment {
  orgId: string;
  orgName: string;
  assignedAt: string;
  status: 'active' | 'paused' | 'inactive';
  executionCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
}

export interface ExecutionRecord {
  executionId: string;
  orgId: string;
  orgName: string;
  startedAt: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'error' | 'pending';
  duration?: number;
  successfulSteps: number;
  totalSteps: number;
  errorMessage?: string;
  retryCount: number;
}

export interface TemplateExecutionTimeline {
  date: string;
  executions: number;
  successful: number;
  failed: number;
  successRate: number;
}

export interface TemplateDetails {
  id: string;
  name: string;
  tier: string;
  description?: string;
  schedule?: string;
  triggers?: string[];
  createdAt?: string;
}

export async function getTemplateDrilldown(templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { firestore } = await createServerClient();

    logger.info('[TemplateDrilldown] Fetching details for template', { templateId });

    // Get template details
    const templateDoc = await firestore.collection('playbook_templates').doc(templateId).get();

    if (!templateDoc.exists) {
      return { error: 'Template not found' };
    }

    const template = templateDoc.data() as any;
    const templateDetails: TemplateDetails = {
      id: templateId,
      name: template?.name || templateId,
      tier: template?.tier || 'unknown',
      description: template?.description,
      schedule: template?.schedule,
      triggers: template?.triggers,
      createdAt: template?.createdAt,
    };

    // Get all org assignments for this template
    const assignmentsMap = new Map<
      string,
      {
        orgName: string;
        assignedAt: string;
        status: string;
      }
    >();

    try {
      const assignmentSnap = await firestore
        .collectionGroup('playbooks')
        .where('playbookId', '==', templateId)
        .get();

      for (const doc of assignmentSnap.docs) {
        const pb = doc.data();
        const orgId = doc.ref.parent.parent?.id || 'unknown';

        assignmentsMap.set(orgId, {
          orgName: pb.orgName || orgId,
          assignedAt: pb.assignedAt || pb.createdAt || new Date().toISOString(),
          status: pb.status || 'active',
        });
      }
    } catch (err) {
      logger.warn('[TemplateDrilldown] Failed to fetch assignments', { error: String(err) });
    }

    // Get execution history and stats per org
    const orgAssignments: OrgAssignment[] = [];
    const allExecutions: ExecutionRecord[] = [];

    try {
      const execSnap = await firestore
        .collectionGroup('playbook_executions')
        .where('playbookTemplateId', '==', templateId)
        .orderBy('startedAt', 'desc')
        .limit(5000) // Get last 5000 executions
        .get();

      const orgStatsMap = new Map<
        string,
        {
          execCount: number;
          successCount: number;
          failureCount: number;
          lastExec?: Date;
        }
      >();

      for (const doc of execSnap.docs) {
        const exec = doc.data();
        const orgId = doc.ref.parent.parent?.id || 'unknown';
        const orgName = exec.orgName || assignmentsMap.get(orgId)?.orgName || orgId;

        // Track stats per org
        if (!orgStatsMap.has(orgId)) {
          orgStatsMap.set(orgId, {
            execCount: 0,
            successCount: 0,
            failureCount: 0,
          });
        }

        const stats = orgStatsMap.get(orgId)!;
        stats.execCount++;

        if (exec.status === 'completed' || exec.status === 'success') {
          stats.successCount++;
        } else if (exec.status === 'failed' || exec.status === 'error') {
          stats.failureCount++;
        }

        if (exec.startedAt) {
          const execDate = new Date(exec.startedAt);
          if (!stats.lastExec || execDate > stats.lastExec) {
            stats.lastExec = execDate;
          }
        }

        // Add to execution records (limit to last 100 for UI)
        if (allExecutions.length < 100) {
          allExecutions.push({
            executionId: doc.id,
            orgId,
            orgName,
            startedAt: exec.startedAt,
            completedAt: exec.completedAt,
            status: exec.status,
            duration: exec.duration,
            successfulSteps: exec.successfulSteps || 0,
            totalSteps: exec.totalSteps || 0,
            errorMessage: exec.errorMessage,
            retryCount: exec.retryCount || 0,
          });
        }
      }

      // Build org assignments with stats
      for (const [orgId, assignment] of assignmentsMap.entries()) {
        const stats = orgStatsMap.get(orgId);
        const successRate =
          stats && stats.execCount > 0 ? (stats.successCount / stats.execCount) * 100 : 100;

        orgAssignments.push({
          orgId,
          orgName: assignment.orgName,
          assignedAt: assignment.assignedAt,
          status: assignment.status as 'active' | 'paused' | 'inactive',
          executionCount: stats?.execCount || 0,
          successCount: stats?.successCount || 0,
          failureCount: stats?.failureCount || 0,
          successRate,
          lastExecutedAt: stats?.lastExec?.toISOString(),
        });
      }

      // Build timeline (last 30 days)
      const timelineMap = new Map<string, { execs: number; success: number; fail: number }>();
      const now = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        timelineMap.set(dateStr, { execs: 0, success: 0, fail: 0 });
      }

      for (const exec of allExecutions) {
        const dateStr = exec.startedAt.split('T')[0];
        const entry = timelineMap.get(dateStr);
        if (entry) {
          entry.execs++;
          if (exec.status === 'completed') {
            entry.success++;
          } else if (exec.status === 'failed' || exec.status === 'error') {
            entry.fail++;
          }
        }
      }

      const timeline: TemplateExecutionTimeline[] = Array.from(timelineMap.entries())
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, data]) => ({
          date,
          executions: data.execs,
          successful: data.success,
          failed: data.fail,
          successRate: data.execs > 0 ? (data.success / data.execs) * 100 : 0,
        }));

      logger.info('[TemplateDrilldown] Drilldown data fetched', {
        templateId,
        orgCount: orgAssignments.length,
        execCount: allExecutions.length,
      });

      return {
        success: true,
        template: templateDetails,
        orgAssignments: orgAssignments.sort((a, b) => b.executionCount - a.executionCount),
        recentExecutions: allExecutions,
        timeline,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('[TemplateDrilldown] Error fetching execution data', { error: errorMsg });

      return {
        success: true,
        template: templateDetails,
        orgAssignments: Array.from(assignmentsMap.entries()).map(([orgId, assignment]) => ({
          orgId,
          orgName: assignment.orgName,
          assignedAt: assignment.assignedAt,
          status: assignment.status as 'active' | 'paused' | 'inactive',
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
        })),
        recentExecutions: [],
        timeline: [],
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[TemplateDrilldown] Error', { error: errorMsg });
    return { error: errorMsg };
  }
}
