// src/server/services/auto-page-generator.ts
/**
 * Auto-Page Generator Service
 * Automatically generates local SEO pages for new partners based on their location
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { geocodeZipCode } from '@/lib/cannmenus-api';
import { getRetailersByZipCode } from './geo-discovery';
import { logger } from '@/lib/logger';

/**
 * ZIP code adjacency map for major markets
 * In production, this would use a geocoding API to find nearby ZIPs
 */
const ZIP_ADJACENCY_CACHE: Record<string, string[]> = {};

/**
 * Find nearby ZIP codes using geocoding
 * Uses a simple radius-based approach
 */
async function findNearbyZipCodes(
    centerZip: string,
    count: number = 5
): Promise<string[]> {
    // Check cache first
    if (ZIP_ADJACENCY_CACHE[centerZip]) {
        return ZIP_ADJACENCY_CACHE[centerZip].slice(0, count);
    }

    const coords = await geocodeZipCode(centerZip);
    if (!coords) {
        logger.warn('[AutoPage] Failed to geocode ZIP:', { zip: centerZip });
        return [];
    }

    // Get nearby retailers and extract their ZIP codes
    const retailers = await getRetailersByZipCode(centerZip, 20);

    // Extract unique ZIP codes from nearby retailers
    const nearbyZips = new Set<string>();
    nearbyZips.add(centerZip); // Include the center ZIP

    for (const retailer of retailers) {
        if (retailer.postalCode && retailer.postalCode !== centerZip) {
            nearbyZips.add(retailer.postalCode);
            if (nearbyZips.size >= count + 1) break;
        }
    }

    // If we don't have enough, generate adjacent ZIPs numerically
    // This is a simple heuristic - in reality ZIP codes aren't sequential by location
    if (nearbyZips.size < count + 1) {
        const baseZip = parseInt(centerZip);
        for (let offset = 1; offset <= 10 && nearbyZips.size < count + 1; offset++) {
            const higher = String(baseZip + offset).padStart(5, '0');
            const lower = String(baseZip - offset).padStart(5, '0');
            if (higher.length === 5) nearbyZips.add(higher);
            if (lower.length === 5 && parseInt(lower) > 0) nearbyZips.add(lower);
        }
    }

    const result = Array.from(nearbyZips).filter(z => z !== centerZip).slice(0, count);

    // Cache the result
    ZIP_ADJACENCY_CACHE[centerZip] = result;

    return result;
}

/**
 * Generate SEO pages for a new partner
 * Creates pages for the partner's ZIP and nearby ZIPs
 */
export async function generatePagesForPartner(
    orgId: string,
    zipCode: string,
    orgName: string,
    orgType: 'brand' | 'dispensary'
): Promise<{ generated: number; zipCodes: string[] }> {
    const { firestore } = await createServerClient();

    logger.info('[AutoPage] Generating pages for new partner:', {
        orgId,
        zipCode,
        orgName,
        orgType,
    });

    // Find 5 nearby ZIP codes
    const nearbyZips = await findNearbyZipCodes(zipCode, 5);
    const allZips = [zipCode, ...nearbyZips];

    const generatedZips: string[] = [];

    for (const zip of allZips) {
        try {
            // Check if page already exists
            const existingPage = await firestore
                .collection('foot_traffic')
                .doc('seo_pages')
                .collection('pages')
                .doc(zip)
                .get();

            if (existingPage.exists) {
                // Update existing page with new partner reference
                const { FieldValue } = await import('firebase-admin/firestore');
                await existingPage.ref.update({
                    partnerOrgs: FieldValue.arrayUnion(orgId),
                    lastUpdated: new Date(),
                });
                logger.info('[AutoPage] Updated existing page:', { zip });
            } else {
                // Create new page stub - will be fully generated on first visit
                await firestore
                    .collection('foot_traffic')
                    .doc('seo_pages')
                    .collection('pages')
                    .doc(zip)
                    .set({
                        zipCode: zip,
                        status: 'pending_generation',
                        partnerOrgs: [orgId],
                        createdAt: new Date(),
                        lastUpdated: new Date(),
                        priority: zip === zipCode ? 10 : 5, // Higher priority for partner's home ZIP
                        generatedBy: 'auto_signup',
                        sourceOrg: {
                            id: orgId,
                            name: orgName,
                            type: orgType,
                        },
                    });
                logger.info('[AutoPage] Created page stub:', { zip });
            }

            generatedZips.push(zip);
        } catch (error) {
            logger.error('[AutoPage] Failed to generate page:', { zip, error });
        }
    }

    // Queue background job to fully generate page content
    await queuePageContentGeneration(generatedZips);

    return {
        generated: generatedZips.length,
        zipCodes: generatedZips,
    };
}

/**
 * Queue background content generation for pages
 * In production, this would use a proper job queue
 */
async function queuePageContentGeneration(zipCodes: string[]): Promise<void> {
    const { firestore } = await createServerClient();

    // Create a job record for monitoring
    await firestore.collection('background_jobs').add({
        type: 'seo_page_generation',
        zipCodes,
        status: 'queued',
        createdAt: new Date(),
        priority: 'normal',
    });

    logger.info('[AutoPage] Queued content generation:', { zipCodes });

    // In production, this would trigger a Cloud Function or background worker
    // For now, we'll generate content lazily on page visit
}

/**
 * Check if a ZIP code has an SEO page
 */
export async function hasPageForZip(zipCode: string): Promise<boolean> {
    const { firestore } = await createServerClient();

    const page = await firestore
        .collection('foot_traffic')
        .doc('seo_pages')
        .collection('pages')
        .doc(zipCode)
        .get();

    return page.exists;
}

/**
 * Get all generated pages for an organization
 */
export async function getOrgPages(orgId: string): Promise<string[]> {
    const { firestore } = await createServerClient();

    const pages = await firestore
        .collection('foot_traffic')
        .doc('seo_pages')
        .collection('pages')
        .where('partnerOrgs', 'array-contains', orgId)
        .get();

    return pages.docs.map(doc => doc.id);
}

/**
 * Get page generation stats for dashboard
 */
export async function getPageGenerationStats(): Promise<{
    total: number;
    pending: number;
    generated: number;
    byState: Record<string, number>;
}> {
    const { firestore } = await createServerClient();

    const pages = await firestore
        .collection('foot_traffic')
        .doc('seo_pages')
        .collection('pages')
        .get();

    let pending = 0;
    let generated = 0;
    const byState: Record<string, number> = {};

    pages.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'pending_generation') {
            pending++;
        } else {
            generated++;
        }

        // Extract state from ZIP (first 3 digits give rough state)
        // This is a simplification - proper implementation would geocode
        const stateCode = data.state || 'Unknown';
        byState[stateCode] = (byState[stateCode] || 0) + 1;
    });

    return {
        total: pages.size,
        pending,
        generated,
        byState,
    };
}
