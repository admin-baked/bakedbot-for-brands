'use server';

/**
 * Vibe IDE Beta Actions
 *
 * Server actions for code generation and project management.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateVibeCode, refineVibeCode } from '@/server/services/vibe-code-generator';
import type { VibeConfig } from '@/types/vibe';
import type { VibeCodeProject, VibeCodeGenerationResult } from '@/types/vibe-code';
import JSZip from 'jszip';

const VIBE_IDE_PROJECTS_COLLECTION = 'vibe_ide_projects';

// ============================================
// GENERATE CODE FROM VIBE
// ============================================

export async function generateCodeFromVibe(
  vibeConfig: Partial<VibeConfig>,
  prompt: string
): Promise<VibeCodeGenerationResult> {
  try {
    logger.info('[VIBE-IDE] Generating code from vibe', {
      vibeName: vibeConfig.name,
      prompt: prompt.substring(0, 50),
    });

    const result = await generateVibeCode(vibeConfig, prompt);

    if (result.success && result.project) {
      // Save project to Firestore
      const db = getAdminFirestore();
      await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(result.project.id).set({
        ...result.project,
        type: 'public_beta',
      });

      logger.info('[VIBE-IDE] Project saved', { projectId: result.project.id });
    }

    return result;
  } catch (error) {
    logger.error('[VIBE-IDE] Code generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to generate code',
    };
  }
}

// ============================================
// REFINE EXISTING CODE
// ============================================

export async function refineCode(
  projectId: string,
  refinementPrompt: string
): Promise<VibeCodeGenerationResult> {
  try {
    const db = getAdminFirestore();

    // Get existing project
    const projectDoc = await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    const project = projectDoc.data() as VibeCodeProject;

    logger.info('[VIBE-IDE] Refining code', {
      projectId,
      prompt: refinementPrompt.substring(0, 50),
    });

    const result = await refineVibeCode(project, refinementPrompt);

    if (result.success && result.project) {
      // Update project in Firestore
      await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).update({
        files: result.project.files,
        updatedAt: result.project.updatedAt,
      });

      logger.info('[VIBE-IDE] Project updated', { projectId });
    }

    return result;
  } catch (error) {
    logger.error('[VIBE-IDE] Code refinement failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to refine code',
    };
  }
}

// ============================================
// GET PROJECT
// ============================================

export async function getProject(
  projectId: string
): Promise<{ success: boolean; project?: VibeCodeProject; error?: string }> {
  try {
    const db = getAdminFirestore();
    const projectDoc = await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    return {
      success: true,
      project: projectDoc.data() as VibeCodeProject,
    };
  } catch (error) {
    logger.error('[VIBE-IDE] Failed to get project', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to load project',
    };
  }
}

// ============================================
// EXPORT PROJECT AS ZIP
// ============================================

export async function exportProjectAsZip(
  projectId: string
): Promise<{ success: boolean; zipData?: Buffer; filename?: string; error?: string }> {
  try {
    const db = getAdminFirestore();
    const projectDoc = await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    const project = projectDoc.data() as VibeCodeProject;

    logger.info('[VIBE-IDE] Exporting project as zip', {
      projectId,
      fileCount: project.files.length,
    });

    // Create ZIP
    const zip = new JSZip();

    // Add all files to zip
    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    // Add .gitignore
    zip.file(
      '.gitignore',
      `node_modules
.next
.env.local
.DS_Store
*.log
`
    );

    // Add vercel.json for easy deployment
    zip.file(
      'vercel.json',
      JSON.stringify(
        {
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          installCommand: 'npm install',
        },
        null,
        2
      )
    );

    // Generate ZIP buffer
    const zipData = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}.zip`;

    logger.info('[VIBE-IDE] ZIP export successful', {
      projectId,
      size: zipData.length,
    });

    return {
      success: true,
      zipData,
      filename,
    };
  } catch (error) {
    logger.error('[VIBE-IDE] ZIP export failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to export project',
    };
  }
}

// ============================================
// UPDATE SINGLE FILE
// ============================================

export async function updateProjectFile(
  projectId: string,
  filePath: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const projectDoc = await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    const project = projectDoc.data() as VibeCodeProject;

    // Update file in array
    const fileIndex = project.files.findIndex((f) => f.path === filePath);
    if (fileIndex >= 0) {
      project.files[fileIndex].content = content;
    } else {
      // Add new file
      project.files.push({
        path: filePath,
        content,
        language: detectLanguage(filePath),
      });
    }

    // Save to Firestore
    await db.collection(VIBE_IDE_PROJECTS_COLLECTION).doc(projectId).update({
      files: project.files,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    logger.error('[VIBE-IDE] File update failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to update file',
    };
  }
}

function detectLanguage(filePath: string): 'typescript' | 'javascript' | 'css' | 'json' | 'html' {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.json')) return 'json';
  return 'html';
}
