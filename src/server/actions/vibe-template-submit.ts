'use server';

/**
 * Vibe Builder Template Submission
 *
 * Submit a builder project as a community template
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface TemplateSubmissionData {
  projectId: string;
  name: string;
  description: string;
  category: 'dispensary' | 'brand' | 'delivery' | 'cultivation' | 'accessories';
  tags: string[];
  features: string[];
  isPremium: boolean;
}

/**
 * Submit a Vibe Builder project as a template
 */
export async function submitProjectAsTemplate(
  data: TemplateSubmissionData,
  userId: string,
  creatorName: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Get the project
    const projectDoc = await db
      .collection('vibe_projects')
      .doc(data.projectId)
      .get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    const projectData = projectDoc.data() as Record<string, unknown>;

    // Verify ownership
    if (projectData.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Create template document
    const templateData = {
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      features: data.features,

      // Store builder project data
      html: projectData.html as string,
      css: projectData.css as string,
      components: projectData.components as string,
      styles: projectData.styles as string,

      // Preview
      thumbnail: projectData.thumbnail as string | undefined,
      previewImages: [],

      // Creator info
      creatorId: userId,
      creatorName,
      isOfficial: false,

      // Stats
      downloads: 0,
      favorites: 0,
      rating: 0,
      ratingCount: 0,

      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending', // Awaiting approval

      // Monetization
      isPremium: data.isPremium,
    };

    const docRef = await db.collection('vibe_templates').add(templateData);

    logger.info(`[TEMPLATE-SUBMIT] Template submitted: ${docRef.id}`, {
      userId,
      projectId: data.projectId,
    });

    return {
      success: true,
      templateId: docRef.id,
    };
  } catch (error) {
    logger.error('[TEMPLATE-SUBMIT] Submission failed:', error as Error);
    return {
      success: false,
      error: 'Failed to submit template',
    };
  }
}
