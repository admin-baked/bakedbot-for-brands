'use server';

/**
 * Vibe Publishing Actions
 *
 * Publish websites to BakedBot hosting
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

/**
 * Check if subdomain is available
 */
export async function checkSubdomainAvailability(
  subdomain: string
): Promise<{ available: boolean; error?: string }> {
  try {
    // Validate subdomain format
    if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
      return {
        available: false,
        error: 'Invalid subdomain format',
      };
    }

    // Reserved subdomains
    const reserved = [
      'www',
      'api',
      'admin',
      'app',
      'dashboard',
      'mail',
      'smtp',
      'ftp',
      'test',
      'staging',
      'dev',
      'bakedbot',
    ];

    if (reserved.includes(subdomain)) {
      return { available: false };
    }

    const db = getAdminFirestore();

    // Check if subdomain is already taken
    const existing = await db
      .collection('vibe_published_sites')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    return { available: existing.empty };
  } catch (error) {
    logger.error('[PUBLISH] Check subdomain failed:', error as Error);
    return {
      available: false,
      error: 'Failed to check availability',
    };
  }
}

/**
 * Publish a website to BakedBot hosting
 */
export async function publishWebsite(
  projectId: string,
  subdomain: string,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Get project
    const projectDoc = await db.collection('vibe_projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: 'Project not found',
      };
    }

    const projectData = projectDoc.data() as Record<string, unknown>;

    // Verify ownership
    if (projectData.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Check subdomain availability
    const availability = await checkSubdomainAvailability(subdomain);
    if (!availability.available) {
      return {
        success: false,
        error: 'Subdomain not available',
      };
    }

    // Create published site document
    const publishedSiteData = {
      projectId,
      userId,
      subdomain,
      url: `https://${subdomain}.bakedbot.site`,

      // Website content
      html: projectData.html as string,
      css: projectData.css as string,
      components: projectData.components as string,
      styles: projectData.styles as string,

      // Metadata
      name: projectData.name as string,
      description: projectData.description as string | undefined,
      thumbnail: projectData.thumbnail as string | undefined,

      // Status
      status: 'published',
      publishedAt: new Date().toISOString(),
      lastPublishedAt: new Date().toISOString(),

      // Analytics
      views: 0,
      uniqueVisitors: 0,

      // Custom domain (optional)
      customDomain: null,
    };

    // Save published site
    const publishedSiteRef = await db
      .collection('vibe_published_sites')
      .add(publishedSiteData);

    // Update project with published URL
    await db.collection('vibe_projects').doc(projectId).update({
      status: 'published',
      publishedUrl: publishedSiteData.url,
      lastPublishedAt: publishedSiteData.lastPublishedAt,
    });

    logger.info('[PUBLISH] Website published', {
      projectId,
      subdomain,
      siteId: publishedSiteRef.id,
    });

    return {
      success: true,
      url: publishedSiteData.url,
    };
  } catch (error) {
    logger.error('[PUBLISH] Publish failed:', error as Error);
    return {
      success: false,
      error: 'Failed to publish website',
    };
  }
}

/**
 * Unpublish a website
 */
export async function unpublishWebsite(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Find published site
    const sitesSnapshot = await db
      .collection('vibe_published_sites')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (sitesSnapshot.empty) {
      return {
        success: false,
        error: 'Published site not found',
      };
    }

    const siteDoc = sitesSnapshot.docs[0];

    // Update status to unpublished
    await siteDoc.ref.update({
      status: 'unpublished',
      unpublishedAt: new Date().toISOString(),
    });

    // Update project
    await db.collection('vibe_projects').doc(projectId).update({
      status: 'draft',
    });

    logger.info('[PUBLISH] Website unpublished', { projectId });

    return { success: true };
  } catch (error) {
    logger.error('[PUBLISH] Unpublish failed:', error as Error);
    return {
      success: false,
      error: 'Failed to unpublish website',
    };
  }
}

/**
 * Get published site by subdomain
 */
export async function getPublishedSite(subdomain: string) {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection('vibe_published_sites')
      .where('subdomain', '==', subdomain)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as Record<string, unknown>;

    // Increment view count
    await doc.ref.update({
      views: (data.views as number || 0) + 1,
    });

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    logger.error('[PUBLISH] Get site failed:', error as Error);
    return null;
  }
}
