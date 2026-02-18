'use server';

/**
 * Playbook Template Admin Actions
 *
 * Server actions for managing and monitoring playbook templates
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser, getUserRole, getUserOrgContext } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { PLAYBOOK_TEMPLATE_METADATA } from '@/config/tier-playbook-templates';

export interface TemplateStats {
  templateId: string;
  templateName: string;
  tier: string;
  assignedCount: number;
  executedCount: number;
  successRate: number;
  lastExecuted?: string;
  activePlaybooks: number;
  failureCount: number;
}

export interface TierStats {
  tier: string;
  templateCount: number;
  totalAssigned: number;
  avgSuccessRate: number;
}

export async function getPlaybookTemplateStats(): Promise<
  | {
      templates: TemplateStats[];
      tierStats: TierStats[];
    }
  | { error: string }
> {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Allow super_user, brand admins/members, and dispensary admins/staff
    const userRole = await getUserRole();
    const allowedRoles = ['super_user', 'brand_admin', 'brand_member', 'dispensary_admin', 'dispensary_staff'];

    if (!allowedRoles.includes(userRole || '')) {
      return { error: 'Not authorized. Only admins and team members can view playbook templates.' };
    }

    // Get user's org context (super users see all, others see only their org)
    const orgContext = await getUserOrgContext();
    const isSuperUser = userRole === 'super_user';
    const filterOrgId = isSuperUser ? null : orgContext?.currentOrgId;

    const { firestore } = await createServerClient();

    logger.info('[PlaybookTemplateAdmin] Fetching template stats');

    // Get all templates from playbook_templates collection
    const templatesSnap = await firestore.collection('playbook_templates').get();

    const templateStats: TemplateStats[] = [];
    const tierMap = new Map<string, { count: number; totalAssigned: number; rates: number[] }>();

    // Process each template
    for (const templateDoc of templatesSnap.docs) {
      const template = templateDoc.data();
      const templateId = templateDoc.id;

      // Get metadata
      const metadata = PLAYBOOK_TEMPLATE_METADATA[templateId as keyof typeof PLAYBOOK_TEMPLATE_METADATA];
      const templateName = metadata?.name || template.name || templateId;
      const tier = template.tier || 'unknown';

      // Count assignments (look across all orgs)
      let assignedCount = 0;
      let activePlaybooks = 0;

      try {
        // Query playbooks with this template ID, filtered by org if not super_user
        let query = firestore
          .collectionGroup('playbooks')
          .where('playbookId', '==', templateId);

        if (filterOrgId) {
          query = query.where('orgId', '==', filterOrgId);
        }

        const tenantSnap = await query.get();

        assignedCount = tenantSnap.size;

        for (const pbDoc of tenantSnap.docs) {
          const pb = pbDoc.data();
          if (pb.status === 'active') {
            activePlaybooks++;
          }
        }
      } catch (err) {
        // If collection group query fails, count manually
        logger.warn('[PlaybookTemplateAdmin] Failed to query playbooks', { templateId, error: String(err) });
        assignedCount = 0;
        activePlaybooks = 0;
      }

      // Get execution stats
      let executedCount = 0;
      let successCount = 0;
      let failureCount = 0;
      let lastExecuted: string | undefined;

      try {
        // Query executions with this template ID, filtered by org if not super_user
        let execQuery = firestore
          .collectionGroup('playbook_executions')
          .where('playbookTemplateId', '==', templateId);

        if (filterOrgId) {
          execQuery = execQuery.where('orgId', '==', filterOrgId);
        }

        const execSnap = await execQuery
          .orderBy('startedAt', 'desc')
          .limit(1000)
          .get();

        executedCount = execSnap.size;

        for (const execDoc of execSnap.docs) {
          const exec = execDoc.data();
          if (exec.status === 'completed' || exec.status === 'success') {
            successCount++;
          } else if (exec.status === 'failed' || exec.status === 'error') {
            failureCount++;
          }

          if (!lastExecuted && exec.startedAt) {
            lastExecuted = exec.startedAt;
          }
        }
      } catch (err) {
        // If query fails, set to 0
        executedCount = 0;
        successCount = 0;
        failureCount = 0;
      }

      const successRate = executedCount > 0 ? (successCount / executedCount) * 100 : 100;

      const stats: TemplateStats = {
        templateId,
        templateName,
        tier,
        assignedCount,
        executedCount,
        successRate,
        lastExecuted,
        activePlaybooks,
        failureCount,
      };

      templateStats.push(stats);

      // Aggregate by tier
      if (!tierMap.has(tier)) {
        tierMap.set(tier, { count: 0, totalAssigned: 0, rates: [] });
      }

      const tierData = tierMap.get(tier)!;
      tierData.count++;
      tierData.totalAssigned += assignedCount;
      tierData.rates.push(successRate);
    }

    // Build tier stats
    const tierStats: TierStats[] = Array.from(tierMap.entries()).map(([tier, data]) => ({
      tier,
      templateCount: data.count,
      totalAssigned: data.totalAssigned,
      avgSuccessRate: data.rates.length > 0 ? data.rates.reduce((a, b) => a + b) / data.rates.length : 0,
    }));

    logger.info('[PlaybookTemplateAdmin] Stats fetched successfully', {
      templateCount: templateStats.length,
      tierCount: tierStats.length,
    });

    return {
      templates: templateStats,
      tierStats,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[PlaybookTemplateAdmin] Error fetching stats', { error: errorMsg });
    return { error: errorMsg };
  }
}

/**
 * Get details for a single template
 */
export async function getTemplateDetails(templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { firestore } = await createServerClient();

    const templateDoc = await firestore.collection('playbook_templates').doc(templateId).get();

    if (!templateDoc.exists) {
      return { error: 'Template not found' };
    }

    return {
      success: true,
      data: {
        id: templateId,
        ...templateDoc.data(),
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { error: errorMsg };
  }
}
