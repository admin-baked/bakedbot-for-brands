'use server';

/**
 * Template Admin Actions
 *
 * Admin actions for reviewing and approving community templates
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  category: string;
  creatorName: string;
  thumbnail?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Get templates for admin review
 */
export async function getPendingTemplates(
  status?: 'pending' | 'approved' | 'rejected'
): Promise<TemplateListItem[]> {
  try {
    const db = getAdminFirestore();
    let query = db.collection('vibe_templates').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(100).get();

    const templates: TemplateListItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      templates.push({
        id: doc.id,
        name: data.name as string,
        description: data.description as string,
        category: data.category as string,
        creatorName: data.creatorName as string,
        thumbnail: data.thumbnail as string | undefined,
        createdAt: data.createdAt as string,
        status: data.status as 'pending' | 'approved' | 'rejected',
      });
    });

    return templates;
  } catch (error) {
    logger.error('[TEMPLATE-ADMIN] Get templates failed:', error as Error);
    return [];
  }
}

/**
 * Approve a template
 */
export async function approveTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    await db.collection('vibe_templates').doc(templateId).update({
      status: 'approved',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info(`[TEMPLATE-ADMIN] Template approved: ${templateId}`);

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-ADMIN] Approve failed:', error as Error);
    return {
      success: false,
      error: 'Failed to approve template',
    };
  }
}

/**
 * Reject a template
 */
export async function rejectTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    await db.collection('vibe_templates').doc(templateId).update({
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });

    logger.info(`[TEMPLATE-ADMIN] Template rejected: ${templateId}`);

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-ADMIN] Reject failed:', error as Error);
    return {
      success: false,
      error: 'Failed to reject template',
    };
  }
}

/**
 * Get template details for preview
 */
export async function getTemplateForPreview(templateId: string) {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('vibe_templates').doc(templateId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    logger.error('[TEMPLATE-ADMIN] Get template failed:', error as Error);
    return null;
  }
}
