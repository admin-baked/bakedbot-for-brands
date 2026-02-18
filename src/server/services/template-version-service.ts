/**
 * Template Version Service
 *
 * Track template versions and org assignments
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface TemplateVersion {
  version: number;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  hash: string;
  schedule?: string;
  triggers?: string[];
  steps?: any[];
  description?: string;
  createdBy?: string;
  changeLog?: string;
}

export interface OrgTemplateAssignment {
  orgId: string;
  orgName: string;
  templateId: string;
  assignedVersion: number;
  latestVersion: number;
  assignedAt: string;
  status: 'active' | 'paused' | 'inactive';
  needsUpdate: boolean;
}

/**
 * Create new template version
 */
export async function createTemplateVersion(
  templateId: string,
  templateData: any,
  changeLog: string,
  createdBy: string
): Promise<TemplateVersion | null> {
  try {
    const firestore = getAdminFirestore();

    // Get current template
    const currentDoc = await firestore.collection('playbook_templates').doc(templateId).get();

    if (!currentDoc.exists) {
      logger.warn('[TemplateVersion] Template not found', { templateId });
      return null;
    }

    // Calculate version number
    const versionsSnap = await firestore
      .collection('template_versions')
      .doc(templateId)
      .collection('history')
      .orderBy('version', 'desc')
      .limit(1)
      .get();

    const nextVersion = versionsSnap.size > 0 ? versionsSnap.docs[0].data().version + 1 : 1;

    // Create hash for detecting changes
    const hash = Buffer.from(JSON.stringify(templateData)).toString('base64').substring(0, 16);

    const versionDoc: TemplateVersion = {
      version: nextVersion,
      templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash,
      schedule: templateData.schedule,
      triggers: templateData.triggers,
      steps: templateData.steps,
      description: templateData.description,
      createdBy,
      changeLog,
    };

    // Save version to history
    await firestore
      .collection('template_versions')
      .doc(templateId)
      .collection('history')
      .doc(`v${nextVersion}`)
      .set(versionDoc);

    // Update main template with version info
    await firestore.collection('playbook_templates').doc(templateId).update({
      ...templateData,
      currentVersion: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy: createdBy,
    });

    logger.info('[TemplateVersion] Version created', {
      templateId,
      version: nextVersion,
    });

    return versionDoc;
  } catch (err) {
    logger.error('[TemplateVersion] Error creating version', {
      templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Get all versions of a template
 */
export async function getTemplateVersionHistory(
  templateId: string
): Promise<TemplateVersion[]> {
  try {
    const firestore = getAdminFirestore();

    const versionsSnap = await firestore
      .collection('template_versions')
      .doc(templateId)
      .collection('history')
      .orderBy('version', 'desc')
      .get();

    return versionsSnap.docs.map((doc) => doc.data() as TemplateVersion);
  } catch (err) {
    logger.warn('[TemplateVersion] Error fetching history', {
      templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Get org's current template version and latest available
 */
export async function getOrgTemplateAssignment(
  templateId: string
): Promise<OrgTemplateAssignment[]> {
  try {
    const firestore = getAdminFirestore();

    // Get latest template version
    const templateDoc = await firestore.collection('playbook_templates').doc(templateId).get();

    if (!templateDoc.exists) {
      return [];
    }

    const latestVersion = templateDoc.data()?.currentVersion || 1;

    // Get all org assignments
    const assignmentsSnap = await firestore
      .collectionGroup('playbooks')
      .where('playbookId', '==', templateId)
      .get();

    const assignments: OrgTemplateAssignment[] = [];

    for (const doc of assignmentsSnap.docs) {
      const playbook = doc.data();
      const orgId = doc.ref.parent.parent?.id || 'unknown';

      assignments.push({
        orgId,
        orgName: playbook.orgName || orgId,
        templateId,
        assignedVersion: playbook.templateVersion || 1,
        latestVersion,
        assignedAt: playbook.assignedAt || playbook.createdAt,
        status: playbook.status as 'active' | 'paused' | 'inactive',
        needsUpdate: (playbook.templateVersion || 1) < latestVersion,
      });
    }

    return assignments;
  } catch (err) {
    logger.error('[TemplateVersion] Error fetching assignments', {
      templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Upgrade org to latest template version
 */
export async function upgradeOrgTemplateVersion(
  orgId: string,
  playbookId: string,
  templateId: string
): Promise<boolean> {
  try {
    const firestore = getAdminFirestore();

    // Get latest template
    const templateDoc = await firestore.collection('playbook_templates').doc(templateId).get();

    if (!templateDoc.exists) {
      return false;
    }

    const latestVersion = templateDoc.data()?.currentVersion || 1;

    // Update playbook with new version
    await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('playbooks')
      .doc(playbookId)
      .update({
        templateVersion: latestVersion,
        lastUpgradedAt: new Date().toISOString(),
      });

    logger.info('[TemplateVersion] Org upgraded', {
      orgId,
      templateId,
      newVersion: latestVersion,
    });

    return true;
  } catch (err) {
    logger.error('[TemplateVersion] Error upgrading org', {
      orgId,
      templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Bulk upgrade all orgs to latest version
 */
export async function bulkUpgradeTemplateVersion(templateId: string): Promise<number> {
  try {
    const firestore = getAdminFirestore();
    const assignments = await getOrgTemplateAssignment(templateId);

    let upgraded = 0;

    for (const assignment of assignments) {
      if (assignment.needsUpdate && assignment.status === 'active') {
        const success = await upgradeOrgTemplateVersion(
          assignment.orgId,
          templateId, // This is actually playbookId
          templateId
        );
        if (success) {
          upgraded++;
        }
      }
    }

    logger.info('[TemplateVersion] Bulk upgrade complete', {
      templateId,
      upgraded,
      total: assignments.length,
    });

    return upgraded;
  } catch (err) {
    logger.error('[TemplateVersion] Error bulk upgrading', {
      templateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}
