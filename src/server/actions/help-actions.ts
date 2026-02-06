'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface HelpArticleMeta {
  slug: string;
  category: string;
  title: string;
  description: string;
  roles: string[]; // Empty = public
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  filePath: string;
  lastUpdated: string;
  author: string;
}

export interface HelpArticle extends HelpArticleMeta {
  content: string;
  views: number;
  avgRating: number;
  totalRatings: number;
}

/**
 * Get article by category and slug
 * Loads MDX content and merges with Firestore metadata
 */
export async function getArticleBySlug(
  category: string,
  slug: string
): Promise<HelpArticle | null> {
  try {
    // Try to load from content registry
    const { articles } = await import('@/content/help/_index');
    const key = `${category}/${slug}`;
    const articleMeta = articles[key];

    if (!articleMeta) {
      return null;
    }

    // Load MDX content from file
    const filePath = join(
      process.cwd(),
      'src/content/help',
      articleMeta.filePath
    );
    const content = await readFile(filePath, 'utf-8');

    // Get Firestore metadata (views, ratings)
    // Replace / with -- for Firestore doc ID
    const docId = key.replace(/\//g, '--');
    const { firestore: db } = await createServerClient();
    const doc = await db.collection('helpArticles').doc(docId).get();
    const metadata = doc.data();

    return {
      ...articleMeta,
      content,
      views: metadata?.views || 0,
      avgRating: metadata?.avgRating || 0,
      totalRatings: metadata?.totalRatings || 0,
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

/**
 * Search articles by query
 * Filters by user role permissions
 */
export async function searchArticles(
  query: string,
  userRole?: string
): Promise<HelpArticleMeta[]> {
  try {
    const { firestore: db } = await createServerClient();

    // Simple Firestore text search (case-insensitive substring match)
    const queryLower = query.toLowerCase();
    const results = await db
      .collection('helpArticles')
      .orderBy('title')
      .limit(20)
      .get();

    // Filter by query match and role permissions
    return results.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((article: any) => {
        // Check if title or description matches query
        const titleMatch = article.title?.toLowerCase().includes(queryLower);
        const descMatch = article.description?.toLowerCase().includes(queryLower);
        if (!titleMatch && !descMatch) return false;

        // Check role permissions
        if (!article.roles || article.roles.length === 0) return true; // Public
        if (!userRole) return false; // Auth required but not logged in
        return article.roles.includes(userRole);
      });
  } catch (error) {
    console.error('Error searching articles:', error);
    return [];
  }
}

/**
 * Track article view
 * Increments view count and logs analytics
 */
export async function trackArticleView(
  articleId: string,
  userId?: string
): Promise<void> {
  try {
    // Convert articleId format (category/slug -> category--slug)
    const docId = articleId.replace(/\//g, '--');
    const { firestore: db } = await createServerClient();

    // Increment view count
    await db
      .collection('helpArticles')
      .doc(docId)
      .update({
        views: FieldValue.increment(1),
      });

    // Track analytics if user is logged in
    if (userId) {
      await db.collection('helpAnalytics').add({
        articleId: docId,
        userId,
        event: 'view',
        timestamp: new Date(),
      });
    }
  } catch (error) {
    // Create article doc if it doesn't exist
    if ((error as any).code === 5) {
      // NOT_FOUND
      const docId = articleId.replace(/\//g, '--');
      const { firestore: db } = await createServerClient();
      await db
        .collection('helpArticles')
        .doc(docId)
        .set({
          views: 1,
          avgRating: 0,
          totalRatings: 0,
          createdAt: new Date(),
        });
    } else {
      console.error('Error tracking article view:', error);
    }
  }
}

/**
 * Rate an article
 * Saves rating and updates article avgRating
 */
export async function rateArticle(
  articleId: string,
  helpful: boolean,
  userId: string
): Promise<void> {
  try {
    // Convert articleId format (category/slug -> category--slug)
    const docId = articleId.replace(/\//g, '--');
    const { firestore: db } = await createServerClient();

    // Check if user already rated this article
    const existingRating = await db
      .collection('helpRatings')
      .where('articleId', '==', docId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingRating.empty) {
      // Update existing rating
      await existingRating.docs[0].ref.update({
        helpful,
        timestamp: new Date(),
      });
    } else {
      // Create new rating
      await db.collection('helpRatings').add({
        articleId: docId,
        userId,
        helpful,
        timestamp: new Date(),
      });
    }

    // Recalculate avgRating
    const ratings = await db
      .collection('helpRatings')
      .where('articleId', '==', docId)
      .get();

    const total = ratings.size;
    const positive = ratings.docs.filter((doc) => doc.data().helpful).length;
    const avgRating = total > 0 ? positive / total : 0;

    await db
      .collection('helpArticles')
      .doc(docId)
      .update({
        avgRating,
        totalRatings: total,
      });
  } catch (error) {
    console.error('Error rating article:', error);
  }
}

/**
 * Get related articles based on shared tags
 */
export async function getRelatedArticles(
  currentArticleId: string,
  tags: string[],
  userRole?: string,
  limit: number = 3
): Promise<HelpArticleMeta[]> {
  try {
    const { firestore: db } = await createServerClient();

    // Get all articles and filter by shared tags
    const allArticles = await db.collection('helpArticles').get();

    const related = allArticles.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((article: any) => {
        // Skip current article
        if (article.id === currentArticleId) return false;

        // Check role permissions
        if (article.roles && article.roles.length > 0) {
          if (!userRole || !article.roles.includes(userRole)) return false;
        }

        // Check for shared tags
        if (!article.tags || !Array.isArray(article.tags)) return false;
        return article.tags.some((tag: string) => tags.includes(tag));
      })
      .slice(0, limit);

    return related;
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

/**
 * Get all articles by category
 * Filters by user role permissions
 */
export async function getArticlesByCategory(
  category: string,
  userRole?: string
): Promise<HelpArticleMeta[]> {
  try {
    const { firestore: db } = await createServerClient();

    const articles = await db
      .collection('helpArticles')
      .where('category', '==', category)
      .orderBy('title')
      .get();

    return articles.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as any))
      .filter((article: any) => {
        if (!article.roles || article.roles.length === 0) return true; // Public
        if (!userRole) return false; // Auth required but not logged in
        return article.roles.includes(userRole);
      });
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }
}
