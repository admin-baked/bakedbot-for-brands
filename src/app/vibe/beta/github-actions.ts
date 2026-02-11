'use server';

/**
 * Vibe GitHub Actions
 *
 * Server actions for GitHub integration.
 */

import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { pushToGitHub, validateGitHubToken, listUserRepos } from '@/server/services/vibe-github';
import type { VibeCodeProject } from '@/types/vibe-code';

/**
 * Push project to GitHub
 */
export async function pushProjectToGitHub(
  projectId: string,
  userGitHubToken: string,
  repoName?: string,
  isPrivate?: boolean
): Promise<{ success: boolean; repoUrl?: string; error?: string }> {
  try {
    logger.info('[VIBE-GITHUB-ACTION] Pushing project', { projectId });

    // Get project
    const db = getAdminFirestore();
    const projectDoc = await db.collection('vibe_ide_projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return { success: false, error: 'Project not found' };
    }

    const project = projectDoc.data() as VibeCodeProject;

    // Push to GitHub
    const result = await pushToGitHub({
      project,
      userGitHubToken,
      repoName,
      isPrivate,
    });

    if (result.success) {
      // Save GitHub info to project
      await db.collection('vibe_ide_projects').doc(projectId).update({
        githubRepo: result.repoUrl,
        githubCloneUrl: result.cloneUrl,
        pushedToGitHubAt: new Date().toISOString(),
      });

      logger.info('[VIBE-GITHUB-ACTION] Push successful', {
        projectId,
        repoUrl: result.repoUrl,
      });
    }

    return result;
  } catch (error) {
    logger.error('[VIBE-GITHUB-ACTION] Push failed', { error });
    return {
      success: false,
      error: 'Failed to push to GitHub',
    };
  }
}

/**
 * Validate GitHub token
 */
export async function checkGitHubToken(
  token: string
): Promise<{ valid: boolean; username?: string; error?: string }> {
  return validateGitHubToken(token);
}

/**
 * Get user's GitHub repos
 */
export async function getUserGitHubRepos(
  token: string
): Promise<{ success: boolean; repos?: Array<{ name: string; url: string }>; error?: string }> {
  return listUserRepos(token);
}
