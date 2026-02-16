/**
 * Blog Server Actions
 *
 * CRUD operations, publishing workflows, SEO slug generation, and analytics
 * for the multi-tenant blog system.
 */

'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import {
    BlogPost,
    BlogStatus,
    BlogCategory,
    CreateBlogPostInput,
    UpdateBlogPostInput,
    BlogFilters,
    QueryOptions,
    BlogAnalytics,
    BlogSettings,
    BLOG_DEFAULTS
} from '@/types/blog';
import { Timestamp } from '@google-cloud/firestore';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';
import { generateBlogDraft as generateDraft, BlogGeneratorInput } from '@/server/services/blog-generator';
import { checkBlogCompliance } from '@/server/services/blog-compliance';

// ============================================================================
// Validation Schemas
// ============================================================================

const createBlogPostSchema = z.object({
    orgId: z.string().min(1),
    title: z.string().min(1).max(BLOG_DEFAULTS.TITLE_MAX_LENGTH),
    subtitle: z.string().max(BLOG_DEFAULTS.SUBTITLE_MAX_LENGTH).optional(),
    excerpt: z.string().min(1).max(BLOG_DEFAULTS.EXCERPT_MAX_LENGTH),
    content: z.string().min(1),
    category: z.enum([
        'education', 'product_spotlight', 'industry_news', 'company_update',
        'strain_profile', 'compliance', 'cannabis_culture', 'wellness'
    ]),
    tags: z.array(z.string()).max(BLOG_DEFAULTS.MAX_TAGS).optional(),
    seoKeywords: z.array(z.string()).max(BLOG_DEFAULTS.MAX_KEYWORDS).optional(),
});

const updateBlogPostSchema = z.object({
    title: z.string().min(1).max(BLOG_DEFAULTS.TITLE_MAX_LENGTH).optional(),
    subtitle: z.string().max(BLOG_DEFAULTS.SUBTITLE_MAX_LENGTH).optional(),
    excerpt: z.string().min(1).max(BLOG_DEFAULTS.EXCERPT_MAX_LENGTH).optional(),
    content: z.string().min(1).optional(),
    category: z.enum([
        'education', 'product_spotlight', 'industry_news', 'company_update',
        'strain_profile', 'compliance', 'cannabis_culture', 'wellness'
    ]).optional(),
    tags: z.array(z.string()).max(BLOG_DEFAULTS.MAX_TAGS).optional(),
});

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new blog post
 */
export async function createBlogPost(input: CreateBlogPostInput): Promise<BlogPost> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        // Validate input
        const validated = createBlogPostSchema.parse(input);

        const { firestore } = await createServerClient();

        // Generate slug from title
        const slug = await generateSlug(validated.title, validated.orgId);

        // Create blog post document
        const now = Timestamp.now();
        const postData: Omit<BlogPost, 'id'> = {
            orgId: validated.orgId,
            slug,
            title: validated.title,
            subtitle: validated.subtitle,
            excerpt: validated.excerpt,
            content: validated.content,
            category: validated.category,
            tags: validated.tags || [],
            featuredImage: input.featuredImage,
            contentImages: input.contentImages || [],
            status: 'draft',
            publishedAt: null,
            scheduledAt: input.scheduledAt || null,
            author: input.author || {
                id: user.uid,
                name: user.email || 'Unknown',
            },
            createdBy: user.uid,
            seo: {
                title: validated.title.substring(0, BLOG_DEFAULTS.SEO_TITLE_MAX_LENGTH),
                metaDescription: validated.excerpt.substring(0, BLOG_DEFAULTS.SEO_DESCRIPTION_MAX_LENGTH),
                slug,
                keywords: input.seoKeywords || [],
            },
            viewCount: 0,
            version: 1,
            versionHistory: [],
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await firestore
            .collection('tenants')
            .doc(validated.orgId)
            .collection('blog_posts')
            .add(postData);

        logger.info('[createBlogPost] Created blog post', {
            postId: docRef.id,
            orgId: validated.orgId,
            title: validated.title
        });

        return { id: docRef.id, ...postData };
    } catch (error) {
        logger.error('[createBlogPost] Error creating blog post', { error, input });
        throw new Error('Failed to create blog post');
    }
}

/**
 * Update an existing blog post
 */
export async function updateBlogPost(
    postId: string,
    updates: UpdateBlogPostInput
): Promise<BlogPost> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        // Validate input
        const validated = updateBlogPostSchema.parse(updates);

        const { firestore } = await createServerClient();

        // Get existing post to determine collection path
        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            throw new Error('Blog post not found');
        }

        const postDoc = postsQuery.docs[0];
        const existingPost = { id: postDoc.id, ...postDoc.data() } as BlogPost;

        // Create version snapshot
        const versionHistory = existingPost.versionHistory || [];
        if (versionHistory.length >= BLOG_DEFAULTS.VERSION_HISTORY_LIMIT) {
            versionHistory.shift(); // Remove oldest version
        }

        versionHistory.push({
            version: existingPost.version,
            timestamp: Timestamp.now(),
            updatedBy: user.uid,
            changes: 'Manual edit',
            snapshot: {
                title: existingPost.title,
                content: existingPost.content,
                excerpt: existingPost.excerpt,
            },
        });

        // Update post
        const updateData = {
            ...validated,
            version: existingPost.version + 1,
            versionHistory,
            updatedAt: Timestamp.now(),
        };

        await postDoc.ref.update(updateData);

        const updatedPost = { ...existingPost, ...updateData };

        logger.info('[updateBlogPost] Updated blog post', {
            postId,
            version: updatedPost.version
        });

        return updatedPost as BlogPost;
    } catch (error) {
        logger.error('[updateBlogPost] Error updating blog post', { error, postId });
        throw new Error('Failed to update blog post');
    }
}

/**
 * Delete a blog post
 */
export async function deleteBlogPost(postId: string): Promise<void> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            throw new Error('Blog post not found');
        }

        await postsQuery.docs[0].ref.delete();

        logger.info('[deleteBlogPost] Deleted blog post', { postId });
    } catch (error) {
        logger.error('[deleteBlogPost] Error deleting blog post', { error, postId });
        throw new Error('Failed to delete blog post');
    }
}

/**
 * Get a single blog post by ID
 */
export async function getBlogPost(postId: string): Promise<BlogPost | null> {
    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            return null;
        }

        const doc = postsQuery.docs[0];
        return { id: doc.id, ...doc.data() } as BlogPost;
    } catch (error) {
        logger.error('[getBlogPost] Error fetching blog post', { error, postId });
        return null;
    }
}

/**
 * Get blog posts with filtering and pagination
 */
export async function getBlogPosts(
    filters: BlogFilters,
    options: QueryOptions = {}
): Promise<BlogPost[]> {
    try {
        const { firestore } = await createServerClient();

        let query = firestore
            .collection('tenants')
            .doc(filters.orgId)
            .collection('blog_posts') as any;

        // Apply status filter
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                query = query.where('status', 'in', filters.status);
            } else {
                query = query.where('status', '==', filters.status);
            }
        }

        // Apply category filter
        if (filters.category) {
            if (Array.isArray(filters.category)) {
                query = query.where('category', 'in', filters.category);
            } else {
                query = query.where('category', '==', filters.category);
            }
        }

        // Apply ordering
        const orderBy = options.orderBy || 'publishedAt';
        const order = options.order || 'desc';
        query = query.orderBy(orderBy, order);

        // Apply pagination
        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.offset(options.offset);
        }

        const snapshot = await query.get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })) as BlogPost[];
    } catch (error) {
        logger.error('[getBlogPosts] Error fetching blog posts', { error, filters });
        return [];
    }
}

// ============================================================================
// Publishing Operations
// ============================================================================

/**
 * Publish a blog post immediately
 */
export async function publishBlogPost(postId: string): Promise<BlogPost> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            throw new Error('Blog post not found');
        }

        const postDoc = postsQuery.docs[0];
        const post = { id: postDoc.id, ...postDoc.data() } as BlogPost;

        // Check if approved
        if (post.status !== 'approved' && post.status !== 'scheduled') {
            throw new Error('Blog post must be approved before publishing');
        }

        await postDoc.ref.update({
            status: 'published',
            publishedAt: Timestamp.now(),
            scheduledAt: null,
        });

        logger.info('[publishBlogPost] Published blog post', { postId });

        return { ...post, status: 'published', publishedAt: Timestamp.now() };
    } catch (error) {
        logger.error('[publishBlogPost] Error publishing blog post', { error, postId });
        throw new Error('Failed to publish blog post');
    }
}

/**
 * Schedule a blog post for future publication
 */
export async function scheduleBlogPost(postId: string, publishAt: Date): Promise<BlogPost> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            throw new Error('Blog post not found');
        }

        const postDoc = postsQuery.docs[0];
        const post = { id: postDoc.id, ...postDoc.data() } as BlogPost;

        await postDoc.ref.update({
            status: 'scheduled',
            scheduledAt: Timestamp.fromDate(publishAt),
        });

        logger.info('[scheduleBlogPost] Scheduled blog post', {
            postId,
            publishAt: publishAt.toISOString()
        });

        return { ...post, status: 'scheduled', scheduledAt: Timestamp.fromDate(publishAt) };
    } catch (error) {
        logger.error('[scheduleBlogPost] Error scheduling blog post', { error, postId });
        throw new Error('Failed to schedule blog post');
    }
}

/**
 * Unpublish a blog post (move to draft)
 */
export async function unpublishBlogPost(postId: string): Promise<BlogPost> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            throw new Error('Blog post not found');
        }

        const postDoc = postsQuery.docs[0];
        const post = { id: postDoc.id, ...postDoc.data() } as BlogPost;

        await postDoc.ref.update({
            status: 'draft',
            publishedAt: null,
        });

        logger.info('[unpublishBlogPost] Unpublished blog post', { postId });

        return { ...post, status: 'draft', publishedAt: null };
    } catch (error) {
        logger.error('[unpublishBlogPost] Error unpublishing blog post', { error, postId });
        throw new Error('Failed to unpublish blog post');
    }
}

// ============================================================================
// SEO & Slug Generation
// ============================================================================

/**
 * Generate a unique URL slug from title
 */
export async function generateSlug(title: string, orgId: string): Promise<string> {
    try {
        // Create base slug
        let slug = title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Remove duplicate hyphens
            .substring(0, 60); // Limit length

        // Check for uniqueness
        const { firestore } = await createServerClient();
        let uniqueSlug = slug;
        let counter = 1;

        while (true) {
            const existing = await firestore
                .collection('tenants')
                .doc(orgId)
                .collection('blog_posts')
                .where('slug', '==', uniqueSlug)
                .limit(1)
                .get();

            if (existing.empty) {
                break;
            }

            uniqueSlug = `${slug}-${counter}`;
            counter++;
        }

        return uniqueSlug;
    } catch (error) {
        logger.error('[generateSlug] Error generating slug', { error, title });
        // Fallback to timestamp-based slug
        return `post-${Date.now()}`;
    }
}

/**
 * Get blog post by slug
 */
export async function getBlogPostBySlug(
    orgId: string,
    slug: string
): Promise<BlogPost | null> {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .where('slug', '==', slug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BlogPost;
    } catch (error) {
        logger.error('[getBlogPostBySlug] Error fetching blog post by slug', { error, slug });
        return null;
    }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get published posts (public-facing)
 */
export async function getPublishedPosts(
    orgId: string,
    options: QueryOptions = {}
): Promise<BlogPost[]> {
    return getBlogPosts(
        { orgId, status: 'published' },
        {
            orderBy: 'publishedAt',
            order: 'desc',
            ...options
        }
    );
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(
    orgId: string,
    category: BlogCategory,
    options: QueryOptions = {}
): Promise<BlogPost[]> {
    return getBlogPosts(
        { orgId, status: 'published', category },
        {
            orderBy: 'publishedAt',
            order: 'desc',
            ...options
        }
    );
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(
    orgId: string,
    tag: string,
    options: QueryOptions = {}
): Promise<BlogPost[]> {
    try {
        const { firestore } = await createServerClient();

        let query = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .where('status', '==', 'published')
            .where('tags', 'array-contains', tag) as any;

        query = query.orderBy('publishedAt', 'desc');

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })) as BlogPost[];
    } catch (error) {
        logger.error('[getPostsByTag] Error fetching posts by tag', { error, tag });
        return [];
    }
}

/**
 * Get related posts (same category, different post)
 */
export async function getRelatedPosts(postId: string, limit = 3): Promise<BlogPost[]> {
    try {
        const post = await getBlogPost(postId);
        if (!post) return [];

        return getPostsByCategory(post.orgId, post.category, { limit: limit + 1 })
            .then(posts => posts.filter(p => p.id !== postId).slice(0, limit));
    } catch (error) {
        logger.error('[getRelatedPosts] Error fetching related posts', { error, postId });
        return [];
    }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Increment view count for a blog post
 */
export async function incrementViewCount(postId: string): Promise<void> {
    try {
        const { firestore } = await createServerClient();

        const postsQuery = await firestore
            .collectionGroup('blog_posts')
            .where('__name__', '==', postId)
            .limit(1)
            .get();

        if (postsQuery.empty) {
            return;
        }

        await postsQuery.docs[0].ref.update({
            viewCount: (postsQuery.docs[0].data().viewCount || 0) + 1,
            lastViewedAt: Timestamp.now(),
        });
    } catch (error) {
        logger.error('[incrementViewCount] Error incrementing view count', { error, postId });
    }
}

/**
 * Get blog analytics for dashboard
 */
export async function getBlogAnalytics(orgId: string): Promise<BlogAnalytics> {
    try {
        const { firestore } = await createServerClient();

        const allPosts = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .get();

        const posts = allPosts.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPost[];

        const publishedPosts = posts.filter(p => p.status === 'published');
        const draftPosts = posts.filter(p => p.status === 'draft');
        const scheduledPosts = posts.filter(p => p.status === 'scheduled');

        // Calculate total views
        const totalViews = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

        // Top posts by views
        const topPosts = [...publishedPosts]
            .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
            .slice(0, 10)
            .map(p => ({
                postId: p.id,
                title: p.title,
                views: p.viewCount || 0,
            }));

        // Views by category
        const viewsByCategory = publishedPosts.reduce((acc, post) => {
            acc[post.category] = (acc[post.category] || 0) + (post.viewCount || 0);
            return acc;
        }, {} as Record<BlogCategory, number>);

        return {
            orgId,
            totalPosts: posts.length,
            publishedPosts: publishedPosts.length,
            draftPosts: draftPosts.length,
            scheduledPosts: scheduledPosts.length,
            totalViews,
            viewsLast30Days: totalViews, // TODO: Implement time-based filtering
            topPosts,
            viewsByCategory,
            publishingFrequency: {
                daily: 0, // TODO: Calculate from publishedAt timestamps
                weekly: 0,
                monthly: publishedPosts.length,
            },
        };
    } catch (error) {
        logger.error('[getBlogAnalytics] Error fetching analytics', { error, orgId });
        throw new Error('Failed to fetch blog analytics');
    }
}

// ============================================================================
// Settings
// ============================================================================

/**
 * Get blog settings for an organization
 */
export async function getBlogSettings(orgId: string): Promise<BlogSettings | null> {
    try {
        const { firestore } = await createServerClient();

        const doc = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('settings')
            .doc('blog')
            .get();

        if (!doc.exists) {
            return null;
        }

        return { orgId, ...doc.data() } as BlogSettings;
    } catch (error) {
        logger.error('[getBlogSettings] Error fetching blog settings', { error, orgId });
        return null;
    }
}

/**
 * Update blog settings
 */
export async function updateBlogSettings(
    orgId: string,
    settings: Partial<BlogSettings>
): Promise<BlogSettings> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('settings')
            .doc('blog')
            .set(settings, { merge: true });

        logger.info('[updateBlogSettings] Updated blog settings', { orgId });

        return { orgId, ...settings } as BlogSettings;
    } catch (error) {
        logger.error('[updateBlogSettings] Error updating blog settings', { error, orgId });
        throw new Error('Failed to update blog settings');
    }
}

// ============================================================================
// AI Generation
// ============================================================================

/**
 * Generate a blog post draft using AI
 */
export async function generateBlogDraft(input: BlogGeneratorInput): Promise<BlogPost> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        logger.info('[generateBlogDraft] Generating blog draft with AI', {
            orgId: input.orgId,
            category: input.category,
            length: input.length
        });

        // Generate draft using AI service
        const output = await generateDraft(input);

        // Create the blog post
        const blogPost = await createBlogPost({
            orgId: input.orgId,
            title: output.title,
            subtitle: output.subtitle,
            excerpt: output.excerpt,
            content: output.content,
            category: input.category,
            tags: output.tags,
            seoKeywords: output.seoKeywords,
            createdBy: `agent:craig`,
        });

        logger.info('[generateBlogDraft] Successfully generated blog draft', {
            postId: blogPost.id,
            orgId: input.orgId
        });

        return blogPost;
    } catch (error) {
        logger.error('[generateBlogDraft] Error generating blog draft', { error, input });
        throw new Error('Failed to generate blog post. Please try again.');
    }
}

// ============================================================================
// Compliance
// ============================================================================

/**
 * Run compliance check on a blog post and update its compliance field
 */
export async function runComplianceCheck(postId: string): Promise<BlogPost> {
    await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        // Get the post
        const post = await getBlogPost(postId);
        if (!post) {
            throw new Error('Blog post not found');
        }

        logger.info('[runComplianceCheck] Running compliance check', { postId, orgId: post.orgId });

        // Fetch brand compliance data if available
        const brandDoc = await firestore.collection('brands').doc(post.orgId).get();
        const brandData = brandDoc.data();
        const brandCompliance = brandData?.brandGuide?.compliance;

        // Run compliance check
        const compliance = await checkBlogCompliance(post, brandCompliance);

        // Update post with compliance results
        await firestore
            .collection('tenants')
            .doc(post.orgId)
            .collection('blog_posts')
            .doc(postId)
            .update({
                compliance,
                updatedAt: Timestamp.now(),
                // Auto-approve if passed
                status: compliance.status === 'passed' ? 'approved' : post.status,
            });

        logger.info('[runComplianceCheck] Compliance check complete', {
            postId,
            status: compliance.status,
            issueCount: compliance.issues.length,
        });

        // Return updated post
        const updatedPost = await getBlogPost(postId);
        return updatedPost!;
    } catch (error) {
        logger.error('[runComplianceCheck] Error during compliance check', { error, postId });
        throw new Error('Failed to run compliance check');
    }
}
