'use server';

/**
 * Template Marketplace Actions
 *
 * Browse and install community templates
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface MarketplaceFilters {
  category?: string;
  sortBy?: 'popular' | 'recent' | 'rating' | 'downloads';
  isOfficial?: boolean;
  isPremium?: boolean;
}

/**
 * Browse approved templates in marketplace
 */
export async function browseTemplates(filters: MarketplaceFilters = {}) {
  try {
    const db = getAdminFirestore();
    let query = db
      .collection('vibe_templates')
      .where('status', '==', 'approved'); // Only approved templates

    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters.isOfficial !== undefined) {
      query = query.where('isOfficial', '==', filters.isOfficial);
    }

    if (filters.isPremium !== undefined) {
      query = query.where('isPremium', '==', filters.isPremium);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'downloads':
        query = query.orderBy('downloads', 'desc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc');
        break;
      case 'recent':
        query = query.orderBy('publishedAt', 'desc');
        break;
      case 'popular':
      default:
        query = query.orderBy('downloads', 'desc');
        break;
    }

    const snapshot = await query.limit(50).get();

    const templates: unknown[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      templates.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        thumbnail: data.thumbnail,
        creatorName: data.creatorName,
        isOfficial: data.isOfficial || false,
        isPremium: data.isPremium || false,
        downloads: data.downloads || 0,
        favorites: data.favorites || 0,
        rating: data.rating || 0,
        ratingCount: data.ratingCount || 0,
      });
    });

    return templates;
  } catch (error) {
    logger.error('[MARKETPLACE] Browse templates failed:', error as Error);
    return [];
  }
}

/**
 * Install a template by creating a new project from it
 */
export async function installTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Get template
    const templateDoc = await db
      .collection('vibe_templates')
      .doc(templateId)
      .get();

    if (!templateDoc.exists) {
      return {
        success: false,
        error: 'Template not found',
      };
    }

    const templateData = templateDoc.data() as Record<string, unknown>;

    // Check if template is approved
    if (templateData.status !== 'approved') {
      return {
        success: false,
        error: 'Template not available',
      };
    }

    // Create new project from template
    const projectData = {
      userId,
      name: `${templateData.name} (Copy)`,
      description: templateData.description,
      html: templateData.html || '',
      css: templateData.css || '',
      components: templateData.components || '[]',
      styles: templateData.styles || '[]',
      status: 'draft',
      visibility: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedAt: new Date().toISOString(),
    };

    const projectRef = await db.collection('vibe_projects').add(projectData);

    // Increment download count
    await db
      .collection('vibe_templates')
      .doc(templateId)
      .update({
        downloads: (templateData.downloads as number || 0) + 1,
      });

    logger.info('[MARKETPLACE] Template installed', {
      templateId,
      projectId: projectRef.id,
      userId,
    });

    return {
      success: true,
      projectId: projectRef.id,
    };
  } catch (error) {
    logger.error('[MARKETPLACE] Install template failed:', error as Error);
    return {
      success: false,
      error: 'Failed to install template',
    };
  }
}

/**
 * Favorite a template
 */
export async function favoriteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Check if already favorited
    const favoriteRef = db
      .collection('user_favorites')
      .doc(userId)
      .collection('templates')
      .doc(templateId);

    const existing = await favoriteRef.get();
    if (existing.exists) {
      // Unfavorite
      await favoriteRef.delete();

      // Decrement count
      const templateRef = db.collection('vibe_templates').doc(templateId);
      const templateData = (await templateRef.get()).data() as Record<string, unknown> | undefined;
      await templateRef.update({
        favorites: Math.max(0, (templateData?.favorites as number || 0) - 1),
      });

      return { success: true };
    } else {
      // Favorite
      await favoriteRef.set({
        templateId,
        createdAt: new Date().toISOString(),
      });

      // Increment count
      const templateRef = db.collection('vibe_templates').doc(templateId);
      const templateData = (await templateRef.get()).data() as Record<string, unknown> | undefined;
      await templateRef.update({
        favorites: (templateData?.favorites as number || 0) + 1,
      });

      return { success: true };
    }
  } catch (error) {
    logger.error('[MARKETPLACE] Favorite failed:', error as Error);
    return {
      success: false,
      error: 'Failed to favorite template',
    };
  }
}
