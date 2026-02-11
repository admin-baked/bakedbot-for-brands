/**
 * Vibe Template Service
 *
 * Manages community-submitted templates for Vibe IDE
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { VibeTemplate } from '@/types/vibe-template';

const TEMPLATES_COLLECTION = 'vibe_templates';

export interface TemplateSearchFilters {
  category?: 'dispensary' | 'brand' | 'delivery' | 'cultivation' | 'accessories';
  tags?: string[];
  features?: string[];
  sortBy?: 'popular' | 'recent' | 'rating';
  isPremium?: boolean;
  isOfficial?: boolean;
}

/**
 * Search templates with filters
 */
export async function searchTemplates(
  filters: TemplateSearchFilters = {},
  page = 1,
  limit = 20
): Promise<{
  templates: VibeTemplate[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const db = getAdminFirestore();
    let query = db.collection(TEMPLATES_COLLECTION)
      .where('status', '==', 'approved'); // Only show approved templates

    // Apply filters
    if (filters.category) {
      query = query.where('category', '==', filters.category);
    }

    if (filters.isPremium !== undefined) {
      query = query.where('isPremium', '==', filters.isPremium);
    }

    if (filters.isOfficial !== undefined) {
      query = query.where('isOfficial', '==', filters.isOfficial);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'popular':
        query = query.orderBy('downloads', 'desc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc');
        break;
      case 'recent':
      default:
        query = query.orderBy('createdAt', 'desc');
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit + 1); // Fetch one extra to check hasMore

    const snapshot = await query.get();
    const templates: VibeTemplate[] = [];

    snapshot.docs.slice(0, limit).forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data(),
      } as VibeTemplate);
    });

    // Get total count (expensive, cache this!)
    const countSnapshot = await db
      .collection(TEMPLATES_COLLECTION)
      .where('status', '==', 'approved')
      .count()
      .get();

    return {
      templates,
      total: countSnapshot.data().count,
      hasMore: snapshot.docs.length > limit,
    };
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Search failed:', error);
    return {
      templates: [],
      total: 0,
      hasMore: false,
    };
  }
}

/**
 * Get single template by ID
 */
export async function getTemplateById(
  templateId: string
): Promise<VibeTemplate | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(TEMPLATES_COLLECTION).doc(templateId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as VibeTemplate;
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Get template failed:', error);
    return null;
  }
}

/**
 * Increment download count
 */
export async function incrementDownloads(templateId: string): Promise<void> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);

    await docRef.update({
      downloads: (await docRef.get()).data()?.downloads + 1 || 1,
      lastDownloadedAt: new Date().toISOString(),
    });

    logger.info(`[TEMPLATE-SERVICE] Incremented downloads for ${templateId}`);
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Increment downloads failed:', error);
  }
}

/**
 * Submit template for review
 */
export async function submitTemplate(
  template: Omit<VibeTemplate, 'id' | 'createdAt' | 'status'>,
  userId: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    const templateData = {
      ...template,
      creatorId: userId,
      status: 'pending', // Requires admin approval
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      downloads: 0,
      favorites: 0,
      rating: 0,
      ratingCount: 0,
    };

    const docRef = await db.collection(TEMPLATES_COLLECTION).add(templateData);

    logger.info(`[TEMPLATE-SERVICE] Template submitted for review: ${docRef.id}`);

    return {
      success: true,
      templateId: docRef.id,
    };
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Submit template failed:', error);
    return {
      success: false,
      error: 'Failed to submit template',
    };
  }
}

/**
 * Get featured templates (curated by BakedBot)
 */
export async function getFeaturedTemplates(
  limit = 6
): Promise<VibeTemplate[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(TEMPLATES_COLLECTION)
      .where('status', '==', 'approved')
      .where('isOfficial', '==', true)
      .orderBy('downloads', 'desc')
      .limit(limit)
      .get();

    const templates: VibeTemplate[] = [];
    snapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data(),
      } as VibeTemplate);
    });

    return templates;
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Get featured templates failed:', error);
    return [];
  }
}

/**
 * Add template to user favorites
 */
export async function favoriteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const favoriteRef = db
      .collection('user_favorites')
      .doc(userId)
      .collection('templates')
      .doc(templateId);

    // Check if already favorited
    const existing = await favoriteRef.get();
    if (existing.exists) {
      return {
        success: false,
        error: 'Already favorited',
      };
    }

    // Add to user favorites
    await favoriteRef.set({
      templateId,
      createdAt: new Date().toISOString(),
    });

    // Increment template favorite count
    const templateRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);
    await templateRef.update({
      favorites: (await templateRef.get()).data()?.favorites + 1 || 1,
    });

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Favorite template failed:', error);
    return {
      success: false,
      error: 'Failed to favorite template',
    };
  }
}

/**
 * Unfavorite template
 */
export async function unfavoriteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Remove from user favorites
    await db
      .collection('user_favorites')
      .doc(userId)
      .collection('templates')
      .doc(templateId)
      .delete();

    // Decrement template favorite count
    const templateRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);
    const currentFavorites = (await templateRef.get()).data()?.favorites || 0;
    await templateRef.update({
      favorites: Math.max(0, currentFavorites - 1),
    });

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Unfavorite template failed:', error);
    return {
      success: false,
      error: 'Failed to unfavorite template',
    };
  }
}

/**
 * Get user's favorited templates
 */
export async function getUserFavorites(
  userId: string
): Promise<VibeTemplate[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('user_favorites')
      .doc(userId)
      .collection('templates')
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    // Fetch actual template data
    const templateIds = snapshot.docs.map((doc) => doc.id);
    const templates: VibeTemplate[] = [];

    for (const id of templateIds) {
      const template = await getTemplateById(id);
      if (template) {
        templates.push(template);
      }
    }

    return templates;
  } catch (error) {
    logger.error('[TEMPLATE-SERVICE] Get user favorites failed:', error);
    return [];
  }
}
