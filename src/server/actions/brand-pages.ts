/**
 * Brand Pages Server Actions
 *
 * CRUD operations for editable brand/dispensary pages
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import {
    BrandPageDoc,
    BrandPageType,
    AboutPageContent,
    CareersPageContent,
    LocationsPageContent,
    ContactPageContent,
    LoyaltyPageContent,
    PressPageContent,
    DEFAULT_ABOUT_CONTENT,
    DEFAULT_CAREERS_CONTENT,
    DEFAULT_LOCATIONS_CONTENT,
    DEFAULT_CONTACT_CONTENT,
    DEFAULT_LOYALTY_CONTENT,
    DEFAULT_PRESS_CONTENT,
} from '@/types/brand-pages';
import { Timestamp } from '@google-cloud/firestore';
import { requireUser } from '@/lib/auth-helpers';
import { logger } from '@/lib/logger';

// ============================================================================
// Get Brand Page
// ============================================================================

/**
 * Get brand page content
 */
export async function getBrandPage(
    orgId: string,
    pageType: BrandPageType
): Promise<BrandPageDoc | null> {
    try {
        const { firestore } = await createServerClient();

        const doc = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('brand_pages')
            .doc(pageType)
            .get();

        if (!doc.exists) {
            // Return default content if page doesn't exist
            return createDefaultBrandPage(orgId, pageType);
        }

        return { ...doc.data(), orgId, pageType } as BrandPageDoc;
    } catch (error) {
        logger.error('[getBrandPage] Error fetching brand page', { error, orgId, pageType });
        return null;
    }
}

/**
 * Get all brand pages for an organization
 */
export async function getAllBrandPages(orgId: string): Promise<BrandPageDoc[]> {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('brand_pages')
            .get();

        const pages = snapshot.docs.map(doc => ({
            orgId,
            pageType: doc.id as BrandPageType,
            ...doc.data()
        })) as BrandPageDoc[];

        // Ensure all page types exist
        const pageTypes: BrandPageType[] = ['about', 'careers', 'locations', 'contact', 'loyalty', 'press'];
        const existingTypes = new Set(pages.map(p => p.pageType));

        for (const type of pageTypes) {
            if (!existingTypes.has(type)) {
                pages.push(createDefaultBrandPage(orgId, type));
            }
        }

        return pages;
    } catch (error) {
        logger.error('[getAllBrandPages] Error fetching brand pages', { error, orgId });
        return [];
    }
}

// ============================================================================
// Update Brand Page
// ============================================================================

/**
 * Update brand page content
 */
export async function updateBrandPage(
    orgId: string,
    pageType: BrandPageType,
    content: Partial<BrandPageDoc>
): Promise<BrandPageDoc> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const now = Timestamp.now();
        const updateData = {
            ...content,
            pageType,
            lastEditedBy: user.uid,
            updatedAt: now,
        };

        // Check if document exists
        const docRef = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('brand_pages')
            .doc(pageType);

        const doc = await docRef.get();

        if (!doc.exists) {
            // Create new document with defaults
            const defaultPage = createDefaultBrandPage(orgId, pageType);
            await docRef.set({
                ...defaultPage,
                ...updateData,
                createdAt: now,
            });
        } else {
            // Update existing document
            await docRef.update(updateData);
        }

        logger.info('[updateBrandPage] Updated brand page', {
            orgId,
            pageType,
            userId: user.uid
        });

        const updated = await docRef.get();
        return { orgId, pageType, ...updated.data() } as BrandPageDoc;
    } catch (error) {
        logger.error('[updateBrandPage] Error updating brand page', { error, orgId, pageType });
        throw new Error('Failed to update brand page');
    }
}

/**
 * Publish/unpublish a brand page
 */
export async function toggleBrandPagePublish(
    orgId: string,
    pageType: BrandPageType,
    isPublished: boolean
): Promise<BrandPageDoc> {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    try {
        const { firestore } = await createServerClient();

        const docRef = firestore
            .collection('tenants')
            .doc(orgId)
            .collection('brand_pages')
            .doc(pageType);

        await docRef.update({
            isPublished,
            lastEditedBy: user.uid,
            updatedAt: Timestamp.now(),
        });

        logger.info('[toggleBrandPagePublish] Toggled brand page publish status', {
            orgId,
            pageType,
            isPublished
        });

        const updated = await docRef.get();
        return { orgId, pageType, ...updated.data() } as BrandPageDoc;
    } catch (error) {
        logger.error('[toggleBrandPagePublish] Error toggling publish status', {
            error,
            orgId,
            pageType
        });
        throw new Error('Failed to update publish status');
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default brand page with template content
 */
function createDefaultBrandPage(orgId: string, pageType: BrandPageType): BrandPageDoc {
    const now = Timestamp.now();
    const base = {
        orgId,
        pageType,
        isPublished: false,
        lastEditedBy: '',
        createdAt: now,
        updatedAt: now,
    };

    switch (pageType) {
        case 'about':
            return { ...base, aboutContent: DEFAULT_ABOUT_CONTENT };
        case 'careers':
            return { ...base, careersContent: DEFAULT_CAREERS_CONTENT };
        case 'locations':
            return { ...base, locationsContent: DEFAULT_LOCATIONS_CONTENT };
        case 'contact':
            return { ...base, contactContent: DEFAULT_CONTACT_CONTENT };
        case 'loyalty':
            return { ...base, loyaltyContent: DEFAULT_LOYALTY_CONTENT };
        case 'press':
            return { ...base, pressContent: DEFAULT_PRESS_CONTENT };
    }
}

/**
 * Get brand page by slug (for public pages)
 */
export async function getBrandPageBySlug(
    brandSlug: string,
    pageType: BrandPageType
): Promise<BrandPageDoc | null> {
    try {
        const { firestore } = await createServerClient();

        // First, find the org by slug
        const orgsQuery = await firestore
            .collection('organizations')
            .where('slug', '==', brandSlug)
            .limit(1)
            .get();

        if (orgsQuery.empty) {
            // Try brands collection
            const brandsQuery = await firestore
                .collection('brands')
                .where('slug', '==', brandSlug)
                .limit(1)
                .get();

            if (brandsQuery.empty) {
                return null;
            }

            const brandId = brandsQuery.docs[0].id;
            return getBrandPage(brandId, pageType);
        }

        const orgId = orgsQuery.docs[0].id;
        return getBrandPage(orgId, pageType);
    } catch (error) {
        logger.error('[getBrandPageBySlug] Error fetching brand page by slug', {
            error,
            brandSlug,
            pageType
        });
        return null;
    }
}
