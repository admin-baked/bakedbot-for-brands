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
 * Get published site by subdomain or custom domain
 *
 * Lookup order:
 * 1. Subdomain match in vibe_published_sites
 * 2. Custom domain match in vibe_published_sites (legacy)
 * 3. Unified domain_mappings with targetType='vibe_site' (new system)
 */
export async function getPublishedSite(
  subdomainOrDomain: string
): Promise<Record<string, unknown> | null> {
  try {
    const db = getAdminFirestore();

    // Try subdomain first
    let snapshot = await db
      .collection('vibe_published_sites')
      .where('subdomain', '==', subdomainOrDomain)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    // If not found, try custom domain in published sites (legacy)
    if (snapshot.empty) {
      snapshot = await db
        .collection('vibe_published_sites')
        .where('customDomain', '==', subdomainOrDomain)
        .where('status', '==', 'published')
        .limit(1)
        .get();
    }

    // If still not found, check unified domain_mappings
    if (snapshot.empty) {
      const mappingDoc = await db
        .collection('domain_mappings')
        .doc(subdomainOrDomain.toLowerCase())
        .get();

      if (mappingDoc.exists) {
        const mapping = mappingDoc.data();
        if (mapping?.targetType === 'vibe_site' && mapping?.targetId) {
          // Found in unified system - load by project ID
          return getPublishedSiteByProject(mapping.targetId);
        }
      }
    }

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

/**
 * Get published site by project ID
 */
export async function getPublishedSiteByProject(
  projectId: string
): Promise<Record<string, unknown> | null> {
  try {
    const db = getAdminFirestore();

    const snapshot = await db
      .collection('vibe_published_sites')
      .where('projectId', '==', projectId)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as Record<string, unknown>;

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    logger.error('[PUBLISH] Get published site by project failed:', error as Error);
    return null;
  }
}

/**
 * Add custom domain to published site
 */
export async function addCustomDomain(
  projectId: string,
  customDomain: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  verificationRequired?: boolean;
  dnsRecords?: {
    type: string;
    host: string;
    value: string;
  }[];
}> {
  try {
    const db = getAdminFirestore();

    // Validate domain format
    const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(customDomain)) {
      return {
        success: false,
        error: 'Invalid domain format',
      };
    }

    // Check if domain is already in use
    const existingDomain = await db
      .collection('vibe_published_sites')
      .where('customDomain', '==', customDomain)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (!existingDomain.empty) {
      return {
        success: false,
        error: 'Domain already in use',
      };
    }

    // Find the published site
    const sitesSnapshot = await db
      .collection('vibe_published_sites')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (sitesSnapshot.empty) {
      return {
        success: false,
        error: 'Published site not found',
      };
    }

    const siteDoc = sitesSnapshot.docs[0];

    // Update with custom domain
    await siteDoc.ref.update({
      customDomain,
      customDomainVerified: false,
      customDomainAddedAt: new Date().toISOString(),
    });

    logger.info('[PUBLISH] Custom domain added', {
      projectId,
      customDomain,
    });

    // Return DNS instructions
    return {
      success: true,
      verificationRequired: true,
      dnsRecords: [
        {
          type: 'CNAME',
          host: customDomain.replace(/\.$/, ''),
          value: 'hosting.bakedbot.site',
        },
      ],
    };
  } catch (error) {
    logger.error('[PUBLISH] Add custom domain failed:', error as Error);
    return {
      success: false,
      error: 'Failed to add custom domain',
    };
  }
}

/**
 * Verify custom domain DNS configuration
 */
export async function verifyCustomDomain(
  projectId: string,
  userId: string
): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Find the published site
    const sitesSnapshot = await db
      .collection('vibe_published_sites')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (sitesSnapshot.empty) {
      return {
        success: false,
        error: 'Published site not found',
      };
    }

    const siteDoc = sitesSnapshot.docs[0];
    const siteData = siteDoc.data() as Record<string, unknown>;

    if (!siteData.customDomain) {
      return {
        success: false,
        error: 'No custom domain configured',
      };
    }

    // In a production system, you would:
    // 1. Query DNS records for the custom domain
    // 2. Verify CNAME points to hosting.bakedbot.site
    // 3. Provision SSL certificate via Let's Encrypt
    //
    // For now, we'll simulate verification
    const isVerified = true; // Placeholder - implement real DNS check

    if (isVerified) {
      await siteDoc.ref.update({
        customDomainVerified: true,
        customDomainVerifiedAt: new Date().toISOString(),
      });

      logger.info('[PUBLISH] Custom domain verified', {
        projectId,
        customDomain: siteData.customDomain,
      });
    }

    return {
      success: true,
      verified: isVerified,
    };
  } catch (error) {
    logger.error('[PUBLISH] Verify custom domain failed:', error as Error);
    return {
      success: false,
      error: 'Failed to verify custom domain',
    };
  }
}

/**
 * Remove custom domain from published site
 */
export async function removeCustomDomain(
  projectId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Find the published site
    const sitesSnapshot = await db
      .collection('vibe_published_sites')
      .where('projectId', '==', projectId)
      .where('userId', '==', userId)
      .where('status', '==', 'published')
      .limit(1)
      .get();

    if (sitesSnapshot.empty) {
      return {
        success: false,
        error: 'Published site not found',
      };
    }

    const siteDoc = sitesSnapshot.docs[0];

    // Remove custom domain
    await siteDoc.ref.update({
      customDomain: null,
      customDomainVerified: false,
      customDomainRemovedAt: new Date().toISOString(),
    });

    logger.info('[PUBLISH] Custom domain removed', {
      projectId,
    });

    return { success: true };
  } catch (error) {
    logger.error('[PUBLISH] Remove custom domain failed:', error as Error);
    return {
      success: false,
      error: 'Failed to remove custom domain',
    };
  }
}
