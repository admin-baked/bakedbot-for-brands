/**
 * Public theme retrieval (no auth required)
 *
 * Used on public pages to get the active theme for a brand/org
 * This is safe because:
 * - Only returns publicly visible theme info
 * - Does not require authentication
 * - Limited to active theme only (not listing all themes)
 */

'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { WordPressTheme } from '@/types/wordpress-theme';

/**
 * Get active theme for an organization (public, no auth)
 *
 * @param orgId Organization ID
 * @returns Active theme metadata or null
 */
export async function getActiveThemePublic(orgId: string): Promise<WordPressTheme | null> {
  try {
    if (!orgId) {
      return null;
    }

    const db = getAdminFirestore();
    const snapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('themes')
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data() as WordPressTheme;
    return {
      ...data,
      uploadedAt: (data.uploadedAt as any).toDate(),
      lastValidatedAt: data.lastValidatedAt ? (data.lastValidatedAt as any).toDate() : undefined,
      lastActivatedAt: data.lastActivatedAt ? (data.lastActivatedAt as any).toDate() : undefined,
    };
  } catch (error) {
    logger.error('[Get Active Theme Public] Error', { orgId, error });
    return null;
  }
}

/**
 * Get theme CSS URL for loading in browser
 *
 * @param themeId Theme ID
 * @param orgId Organization ID
 * @returns URL to fetch CSS or null
 */
export function getThemeCssUrl(themeId: string, orgId: string): string {
  return `/api/themes/css?themeId=${encodeURIComponent(themeId)}&orgId=${encodeURIComponent(orgId)}`;
}
