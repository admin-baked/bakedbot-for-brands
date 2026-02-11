'use server';

/**
 * Vibe Template Marketplace Actions
 *
 * Browse, download, and submit community templates.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
  VibeTemplate,
  TemplateFilter,
  TemplateSearchResult,
  TemplateReview,
} from '@/types/vibe-template';

const TEMPLATES_COLLECTION = 'vibe_templates';
const REVIEWS_COLLECTION = 'vibe_template_reviews';
const FAVORITES_COLLECTION = 'vibe_template_favorites';
const DOWNLOADS_COLLECTION = 'vibe_template_downloads';

/**
 * Search templates with filters
 */
export async function searchTemplates(
  filter: TemplateFilter = {},
  page: number = 1,
  limit: number = 20
): Promise<TemplateSearchResult> {
  try {
    const db = getAdminFirestore();
    let query = db.collection(TEMPLATES_COLLECTION).where('status', '==', 'published');

    // Apply filters
    if (filter.category) {
      query = query.where('category', '==', filter.category);
    }

    if (filter.isOfficial !== undefined) {
      query = query.where('isOfficial', '==', filter.isOfficial);
    }

    if (filter.isPremium !== undefined) {
      query = query.where('isPremium', '==', filter.isPremium);
    }

    // Apply sorting
    const sortBy = filter.sortBy || 'popular';
    switch (sortBy) {
      case 'popular':
        query = query.orderBy('downloads', 'desc');
        break;
      case 'recent':
        query = query.orderBy('publishedAt', 'desc');
        break;
      case 'rating':
        query = query.orderBy('rating', 'desc');
        break;
      case 'downloads':
        query = query.orderBy('downloads', 'desc');
        break;
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit + 1); // +1 to check hasMore

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const templates = snapshot.docs
      .slice(0, limit)
      .map((doc) => ({ id: doc.id, ...doc.data() } as VibeTemplate));

    // Client-side filter for tags/features (Firestore array-contains limitations)
    let filtered = templates;

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((t) =>
        filter.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    if (filter.features && filter.features.length > 0) {
      filtered = filtered.filter((t) =>
        filter.features!.some((feature) => t.features.includes(feature))
      );
    }

    if (filter.minRating) {
      filtered = filtered.filter((t) => t.rating >= filter.minRating!);
    }

    logger.info('[TEMPLATE-MARKETPLACE] Search complete', {
      total: filtered.length,
      page,
      filter: filter.category,
    });

    return {
      templates: filtered,
      total: filtered.length,
      hasMore,
    };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Search failed', { error });
    return { templates: [], total: 0, hasMore: false };
  }
}

/**
 * Get template by ID
 */
export async function getTemplate(
  templateId: string
): Promise<{ template: VibeTemplate | null; error?: string }> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection(TEMPLATES_COLLECTION).doc(templateId).get();

    if (!doc.exists) {
      return { template: null, error: 'Template not found' };
    }

    const template = { id: doc.id, ...doc.data() } as VibeTemplate;

    return { template };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Get template failed', { error });
    return { template: null, error: 'Failed to load template' };
  }
}

/**
 * Download template (creates new project from template)
 */
export async function downloadTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Get template
    const { template } = await getTemplate(templateId);
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    // Create new project from template
    const projectRef = await db.collection('vibe_ide_projects').add({
      name: `${template.name} (Copy)`,
      description: template.description,
      userId,
      templateId,
      files: template.codeFiles || [],
      vibeConfig: template.vibeConfig,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Record download
    await db.collection(DOWNLOADS_COLLECTION).add({
      templateId,
      userId,
      createdAt: new Date().toISOString(),
    });

    // Increment download count
    await db
      .collection(TEMPLATES_COLLECTION)
      .doc(templateId)
      .update({
        downloads: (template.downloads || 0) + 1,
      });

    logger.info('[TEMPLATE-MARKETPLACE] Template downloaded', {
      templateId,
      projectId: projectRef.id,
    });

    return { success: true, projectId: projectRef.id };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Download failed', { error });
    return { success: false, error: 'Failed to download template' };
  }
}

/**
 * Submit template for review
 */
export async function submitTemplate(
  template: Omit<VibeTemplate, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  userId: string
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Create template with pending status
    const templateRef = await db.collection(TEMPLATES_COLLECTION).add({
      ...template,
      creatorId: userId,
      status: 'pending',
      downloads: 0,
      favorites: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    logger.info('[TEMPLATE-MARKETPLACE] Template submitted', {
      templateId: templateRef.id,
      userId,
    });

    return { success: true, templateId: templateRef.id };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Submission failed', { error });
    return { success: false, error: 'Failed to submit template' };
  }
}

/**
 * Add to favorites
 */
export async function favoriteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Check if already favorited
    const existing = await db
      .collection(FAVORITES_COLLECTION)
      .where('templateId', '==', templateId)
      .where('userId', '==', userId)
      .get();

    if (!existing.empty) {
      return { success: false, error: 'Already favorited' };
    }

    // Add favorite
    await db.collection(FAVORITES_COLLECTION).add({
      templateId,
      userId,
      createdAt: new Date().toISOString(),
    });

    // Increment favorite count
    const templateRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);
    const template = await templateRef.get();
    if (template.exists) {
      await templateRef.update({
        favorites: (template.data()?.favorites || 0) + 1,
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Favorite failed', { error });
    return { success: false, error: 'Failed to favorite template' };
  }
}

/**
 * Remove from favorites
 */
export async function unfavoriteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Find and delete favorite
    const snapshot = await db
      .collection(FAVORITES_COLLECTION)
      .where('templateId', '==', templateId)
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'Not favorited' };
    }

    await snapshot.docs[0].ref.delete();

    // Decrement favorite count
    const templateRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);
    const template = await templateRef.get();
    if (template.exists) {
      await templateRef.update({
        favorites: Math.max(0, (template.data()?.favorites || 0) - 1),
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Unfavorite failed', { error });
    return { success: false, error: 'Failed to unfavorite template' };
  }
}

/**
 * Add review
 */
export async function addReview(
  templateId: string,
  userId: string,
  userName: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Validate rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if user already reviewed
    const existing = await db
      .collection(REVIEWS_COLLECTION)
      .where('templateId', '==', templateId)
      .where('userId', '==', userId)
      .get();

    if (!existing.empty) {
      return { success: false, error: 'You already reviewed this template' };
    }

    // Add review
    const reviewRef = await db.collection(REVIEWS_COLLECTION).add({
      templateId,
      userId,
      userName,
      rating,
      comment,
      helpful: 0,
      createdAt: new Date().toISOString(),
    });

    // Update template rating
    const templateRef = db.collection(TEMPLATES_COLLECTION).doc(templateId);
    const template = await templateRef.get();

    if (template.exists) {
      const data = template.data();
      const currentRating = data?.rating || 0;
      const currentCount = data?.ratingCount || 0;
      const newCount = currentCount + 1;
      const newRating = (currentRating * currentCount + rating) / newCount;

      await templateRef.update({
        rating: newRating,
        ratingCount: newCount,
      });
    }

    return { success: true, reviewId: reviewRef.id };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Review failed', { error });
    return { success: false, error: 'Failed to add review' };
  }
}

/**
 * Get reviews for template
 */
export async function getTemplateReviews(
  templateId: string,
  limit: number = 10
): Promise<{ reviews: TemplateReview[]; error?: string }> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(REVIEWS_COLLECTION)
      .where('templateId', '==', templateId)
      .orderBy('helpful', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const reviews = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as TemplateReview)
    );

    return { reviews };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Get reviews failed', { error });
    return { reviews: [], error: 'Failed to load reviews' };
  }
}

/**
 * Get user's favorites
 */
export async function getUserFavorites(
  userId: string
): Promise<{ templateIds: string[]; error?: string }> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection(FAVORITES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const templateIds = snapshot.docs.map((doc) => doc.data().templateId as string);

    return { templateIds };
  } catch (error) {
    logger.error('[TEMPLATE-MARKETPLACE] Get favorites failed', { error });
    return { templateIds: [], error: 'Failed to load favorites' };
  }
}
