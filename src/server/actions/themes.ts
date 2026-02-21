'use server';

/**
 * Server Actions for WordPress Theme Management
 *
 * All actions require:
 * - Authentication via requireUser()
 * - Organization membership verification
 * - RBAC check: brand_admin or dispensary_admin role
 *
 * Protected via 'use server' directive
 */

import { requireUser } from '@/server/auth/auth';
import { wordPressThemeService } from '@/server/services/wordpress-theme-service';
import { logger } from '@/lib/logger';
import {
  WordPressTheme,
  ThemeUploadResponse,
  ThemeListResponse,
  ThemeActivationResponse,
  ThemeDeletionResponse,
} from '@/types/wordpress-theme';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * Verify user is brand_admin or dispensary_admin for the given org
 */
async function verifyOrgAdminAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return false;
    }

    const userData = userDoc.data();
    const role = userData?.role;

    // Check if user is brand_admin or dispensary_admin
    if (role !== 'brand_admin' && role !== 'dispensary_admin') {
      return false;
    }

    // For brand_admin, check if they belong to this org
    if (role === 'brand_admin') {
      const memberships = userData?.orgMemberships || {};
      return orgId in memberships;
    }

    // For dispensary_admin, check if they manage this dispensary/org
    if (role === 'dispensary_admin') {
      const memberships = userData?.orgMemberships || {};
      return orgId in memberships;
    }

    return false;
  } catch (error) {
    logger.error('[Themes Action] Access verification error', { userId, orgId, error });
    return false;
  }
}

/**
 * Upload a WordPress theme for an organization
 *
 * @param orgId Organization ID
 * @param formData FormData containing file
 * @returns Upload response with theme or error
 */
export async function uploadThemeAction(
  orgId: string,
  formData: FormData,
): Promise<ThemeUploadResponse> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme upload', { userId, orgId });
      return {
        success: false,
        error: 'You do not have permission to manage themes for this organization',
      };
    }

    // Extract file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Call service to upload
    const result = await wordPressThemeService.uploadTheme(orgId, buffer, file.name, userId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        validationErrors: result.validationErrors,
      };
    }

    logger.info('[Themes Action] Theme uploaded successfully', {
      userId,
      orgId,
      themeId: result.theme?.id,
      themeName: result.theme?.name,
    });

    return {
      success: true,
      themeId: result.theme?.id,
      theme: result.theme,
    };
  } catch (error) {
    logger.error('[Themes Action] Upload error', { orgId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * List themes for an organization
 *
 * @param orgId Organization ID
 * @param pageSize Themes per page
 * @param pageNumber Page number (1-indexed)
 * @returns Paginated list of themes
 */
export async function listThemesAction(
  orgId: string,
  pageSize: number = 5,
  pageNumber: number = 1,
): Promise<ThemeListResponse> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme list', { userId, orgId });
      return {
        success: false,
        themes: [],
        total: 0,
        pageSize,
        hasMore: false,
        error: 'You do not have permission to view themes for this organization',
      };
    }

    // Call service
    const result = await wordPressThemeService.listThemesByOrg(orgId, pageSize, pageNumber);

    return {
      success: true,
      themes: result.themes,
      total: result.total,
      pageSize,
      hasMore: result.hasMore,
    };
  } catch (error) {
    logger.error('[Themes Action] List error', { orgId, error });
    return {
      success: false,
      themes: [],
      total: 0,
      pageSize,
      hasMore: false,
      error: error instanceof Error ? error.message : 'List failed',
    };
  }
}

/**
 * Get a specific theme by ID
 *
 * @param orgId Organization ID
 * @param themeId Theme ID
 * @returns Theme object or error
 */
export async function getThemeByIdAction(orgId: string, themeId: string): Promise<WordPressTheme | null> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme access', { userId, orgId, themeId });
      return null;
    }

    // Call service
    return await wordPressThemeService.getThemeById(orgId, themeId);
  } catch (error) {
    logger.error('[Themes Action] Get theme error', { orgId, themeId, error });
    return null;
  }
}

/**
 * Activate a theme for an organization
 *
 * @param orgId Organization ID
 * @param themeId Theme ID to activate
 * @returns Activation response
 */
export async function activateThemeAction(orgId: string, themeId: string): Promise<ThemeActivationResponse> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme activation', { userId, orgId, themeId });
      return {
        success: false,
        error: 'You do not have permission to manage themes for this organization',
      };
    }

    // Verify theme exists
    const theme = await wordPressThemeService.getThemeById(orgId, themeId);
    if (!theme) {
      return { success: false, error: 'Theme not found' };
    }

    // Call service
    const result = await wordPressThemeService.activateTheme(orgId, themeId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    logger.info('[Themes Action] Theme activated', {
      userId,
      orgId,
      themeId,
      themeName: theme.name,
    });

    return {
      success: true,
      activeThemeId: themeId,
    };
  } catch (error) {
    logger.error('[Themes Action] Activate error', { orgId, themeId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Activation failed',
    };
  }
}

/**
 * Delete a theme
 *
 * @param orgId Organization ID
 * @param themeId Theme ID to delete
 * @returns Deletion response
 */
export async function deleteThemeAction(orgId: string, themeId: string): Promise<ThemeDeletionResponse> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme deletion', { userId, orgId, themeId });
      return {
        success: false,
        error: 'You do not have permission to manage themes for this organization',
      };
    }

    // Verify theme exists
    const theme = await wordPressThemeService.getThemeById(orgId, themeId);
    if (!theme) {
      return { success: false, error: 'Theme not found' };
    }

    // Call service
    const result = await wordPressThemeService.deleteTheme(orgId, themeId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        deletedThemeId: undefined,
      };
    }

    logger.info('[Themes Action] Theme deleted', {
      userId,
      orgId,
      themeId,
      themeName: theme.name,
      revertedToDefault: result.revertedToDefault,
    });

    return {
      success: true,
      deletedThemeId: themeId,
      fallbackToDefault: result.revertedToDefault,
    };
  } catch (error) {
    logger.error('[Themes Action] Delete error', { orgId, themeId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deletion failed',
    };
  }
}

/**
 * Get the active theme for an organization
 *
 * @param orgId Organization ID
 * @returns Active theme or null
 */
export async function getActiveThemeAction(orgId: string): Promise<WordPressTheme | null> {
  try {
    // Verify authentication
    const session = await requireUser();

    // For public access, we could skip this check, but for now require auth
    // This can be changed to a public API route if needed
    const userId = session.uid;

    // Verify membership (any authenticated user from this org can see active theme)
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized theme access', { userId, orgId });
      return null;
    }

    // Call service
    return await wordPressThemeService.getActiveTheme(orgId);
  } catch (error) {
    logger.error('[Themes Action] Get active theme error', { orgId, error });
    return null;
  }
}

/**
 * Get theme count for an organization (for quota checking)
 *
 * @param orgId Organization ID
 * @returns Number of themes
 */
export async function getThemeCountAction(orgId: string): Promise<number> {
  try {
    // Verify authentication
    const session = await requireUser();
    const userId = session.uid;

    // Verify admin access
    const hasAccess = await verifyOrgAdminAccess(userId, orgId);
    if (!hasAccess) {
      logger.warn('[Themes Action] Unauthorized quota check', { userId, orgId });
      return 0;
    }

    // Call service
    return await wordPressThemeService.getThemeCount(orgId);
  } catch (error) {
    logger.error('[Themes Action] Get count error', { orgId, error });
    return 0;
  }
}
