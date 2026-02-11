'use server';

/**
 * Vibe Project Server Actions
 *
 * CRUD operations for visual website builder projects
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
  VibeProject,
  CreateVibeProjectInput,
  UpdateVibeProjectInput,
  VibeProjectListItem,
} from '@/types/vibe-project';

const PROJECTS_COLLECTION = 'vibe_projects';

/**
 * Create a new project
 */
export async function createVibeProject(
  input: CreateVibeProjectInput
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    const projectData: Omit<VibeProject, 'id'> = {
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
    };

    const docRef = await db.collection(PROJECTS_COLLECTION).add(projectData);

    logger.info(`[VIBE-PROJECTS] Created project: ${docRef.id}`);

    return {
      success: true,
      projectId: docRef.id,
    };
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Create failed:', error as Error);
    return {
      success: false,
      error: 'Failed to create project',
    };
  }
}

/**
 * Get project by ID
 */
export async function getVibeProject(
  projectId: string
): Promise<VibeProject | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      ...data,
    } as VibeProject;
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Get project failed:', error as Error);
    return null;
  }
}

/**
 * Update existing project
 */
export async function updateVibeProject(
  projectId: string,
  updates: UpdateVibeProjectInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
    };

    await db.collection(PROJECTS_COLLECTION).doc(projectId).update(updateData);

    logger.info(`[VIBE-PROJECTS] Updated project: ${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Update failed:', error as Error);
    return {
      success: false,
      error: 'Failed to update project',
    };
  }
}

/**
 * Auto-save project (lightweight update)
 */
export async function autoSaveVibeProject(
  projectId: string,
  editorData: {
    html: string;
    css: string;
    components: string;
    styles: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    await db
      .collection(PROJECTS_COLLECTION)
      .doc(projectId)
      .update({
        ...editorData,
        lastAutoSaveAt: new Date().toISOString(),
        hasUnsavedChanges: false,
      });

    logger.info(`[VIBE-PROJECTS] Auto-saved project: ${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Auto-save failed:', error as Error);
    return {
      success: false,
      error: 'Auto-save failed',
    };
  }
}

/**
 * Get user's projects
 */
export async function getUserVibeProjects(
  userId: string,
  status?: 'draft' | 'published' | 'archived'
): Promise<VibeProjectListItem[]> {
  try {
    const db = getAdminFirestore();
    let query = db
      .collection(PROJECTS_COLLECTION)
      .where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('updatedAt', 'desc').get();

    const projects: VibeProjectListItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      projects.push({
        id: doc.id,
        name: data.name as string,
        thumbnail: data.thumbnail as string | undefined,
        status: data.status as 'draft' | 'published' | 'archived',
        updatedAt: data.updatedAt as string,
        lastEditedAt: data.lastEditedAt as string,
      });
    });

    return projects;
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Get user projects failed:', error as Error);
    return [];
  }
}

/**
 * Delete project
 */
export async function deleteVibeProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    await db.collection(PROJECTS_COLLECTION).doc(projectId).delete();

    logger.info(`[VIBE-PROJECTS] Deleted project: ${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Delete failed:', error as Error);
    return {
      success: false,
      error: 'Failed to delete project',
    };
  }
}

/**
 * Publish project
 */
export async function publishVibeProject(
  projectId: string,
  publishedUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    await db
      .collection(PROJECTS_COLLECTION)
      .doc(projectId)
      .update({
        status: 'published',
        publishedUrl,
        lastPublishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    logger.info(`[VIBE-PROJECTS] Published project: ${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error('[VIBE-PROJECTS] Publish failed:', error as Error);
    return {
      success: false,
      error: 'Failed to publish project',
    };
  }
}
