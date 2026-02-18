'use server';

/**
 * Template Versioning Server Actions
 *
 * UI-friendly wrappers for template version management
 */

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  getTemplateVersionHistory,
  getOrgTemplateAssignment,
  upgradeOrgTemplateVersion,
  bulkUpgradeTemplateVersion,
  type TemplateVersion,
  type OrgTemplateAssignment,
} from '@/server/services/template-version-service';

export async function getTemplateVersions(templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const versions = await getTemplateVersionHistory(templateId);
    const assignments = await getOrgTemplateAssignment(templateId);

    return {
      success: true,
      versions,
      assignments,
      stats: {
        currentVersion: versions[0]?.version || 1,
        totalVersions: versions.length,
        orgsUpToDate: assignments.filter((a) => !a.needsUpdate).length,
        orgsOutOfDate: assignments.filter((a) => a.needsUpdate).length,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[TemplateVersioning] Error fetching versions', { templateId, error: errorMsg });
    return { error: errorMsg };
  }
}

export async function upgradeOrgVersion(orgId: string, playbookId: string, templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const success = await upgradeOrgTemplateVersion(orgId, playbookId, templateId);

    if (!success) {
      return { error: 'Failed to upgrade version' };
    }

    logger.info('[TemplateVersioning] Org upgraded', { orgId, templateId });

    return {
      success: true,
      message: `Upgraded ${orgId} to latest template version`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[TemplateVersioning] Error upgrading', { orgId, templateId, error: errorMsg });
    return { error: errorMsg };
  }
}

export async function bulkUpgradeTemplate(templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const upgraded = await bulkUpgradeTemplateVersion(templateId);

    logger.info('[TemplateVersioning] Bulk upgrade complete', { templateId, upgraded });

    return {
      success: true,
      upgraded,
      message: `Upgraded ${upgraded} active organizations`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[TemplateVersioning] Error bulk upgrading', { templateId, error: errorMsg });
    return { error: errorMsg };
  }
}
