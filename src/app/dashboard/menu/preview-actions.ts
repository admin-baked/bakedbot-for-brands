'use server';

/**
 * Menu Preview Actions
 *
 * Server actions for fetching all data needed to render
 * the customer-facing menu experience in the dashboard.
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getCarousels } from '@/app/actions/carousels';
import { getActiveBundles } from '@/app/actions/bundles';
import { getFeaturedBrands, type FeaturedBrand } from '@/server/actions/featured-brands';
import { getActiveHero } from '@/app/actions/heroes';
import { logger } from '@/lib/logger';
import type { Carousel } from '@/types/carousels';
import type { BundleDeal } from '@/types/bundles';
import type { Hero } from '@/types/heroes';
import type { Product, Brand } from '@/types/products';
import type { VibeConfig } from '@/types/vibe';
import { getPublishedVibe } from '@/app/actions/vibe';

export interface MenuPreviewData {
    products: Product[];
    carousels: Carousel[];
    bundles: BundleDeal[];
    featuredBrands: FeaturedBrand[];
    activeHero: Hero | null;
    brand: Brand | null;
    vibe: VibeConfig | null;
    source: string;
    lastSyncedAt: string | null;
}

/**
 * Resolve the user's orgId from claims or Firestore profile
 */
async function resolveOrgId(
    firestore: FirebaseFirestore.Firestore,
    user: { uid: string; orgId?: string; brandId?: string; currentOrgId?: string; locationId?: string }
): Promise<string | undefined> {
    // Try claims first
    const fromClaims = user.orgId || user.brandId || user.currentOrgId || user.locationId;
    if (fromClaims) return fromClaims;

    // Fallback: check Firestore user profile
    try {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            const fromProfile = data?.orgId || data?.currentOrgId || data?.locationId || data?.dispensaryId;
            if (fromProfile) {
                logger.info('[PREVIEW] Found orgId from user profile', { uid: user.uid, orgId: fromProfile });
                return fromProfile;
            }
        }
    } catch (e) {
        logger.warn('[PREVIEW] Failed to read user profile', { uid: user.uid });
    }

    return undefined;
}

/**
 * Fetch brand/organization configuration for preview display
 */
async function getBrandConfig(
    firestore: FirebaseFirestore.Firestore,
    orgId: string
): Promise<Brand | null> {
    try {
        // Try organizations collection first (for dispensaries/tenants)
        const orgDoc = await firestore.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
            const data = orgDoc.data();
            return {
                id: orgDoc.id,
                name: data?.name || 'Unknown',
                logoUrl: data?.logoUrl,
                useLogoInHeader: data?.useLogoInHeader,
                tagline: data?.tagline,
                chatbotConfig: data?.chatbotConfig,
                theme: data?.theme,
                verificationStatus: data?.verificationStatus,
                type: data?.type || 'dispensary',
                purchaseModel: data?.purchaseModel || 'local_pickup',
                shipsNationwide: data?.shipsNationwide,
                menuDesign: data?.menuDesign || 'dispensary',
                location: data?.location,
                address: data?.address,
                city: data?.city,
                state: data?.state,
                zip: data?.zip,
                phone: data?.phone,
                hours: data?.hours,
            } as Brand;
        }

        // Try brands collection
        const brandDoc = await firestore.collection('brands').doc(orgId).get();
        if (brandDoc.exists) {
            const data = brandDoc.data();
            return {
                id: brandDoc.id,
                name: data?.name || 'Unknown',
                logoUrl: data?.logoUrl,
                useLogoInHeader: data?.useLogoInHeader,
                tagline: data?.tagline,
                chatbotConfig: data?.chatbotConfig,
                theme: data?.theme,
                verificationStatus: data?.verificationStatus,
                type: data?.type || 'brand',
                purchaseModel: data?.purchaseModel || 'local_pickup',
                shipsNationwide: data?.shipsNationwide,
                menuDesign: data?.menuDesign || 'brand',
            } as Brand;
        }

        // Try query by orgId field
        const orgsQuery = await firestore.collection('organizations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();
        if (!orgsQuery.empty) {
            const doc = orgsQuery.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                name: data?.name || 'Unknown',
                logoUrl: data?.logoUrl,
                useLogoInHeader: data?.useLogoInHeader,
                tagline: data?.tagline,
                chatbotConfig: data?.chatbotConfig,
                theme: data?.theme,
                verificationStatus: data?.verificationStatus,
                type: data?.type || 'dispensary',
                purchaseModel: data?.purchaseModel || 'local_pickup',
                shipsNationwide: data?.shipsNationwide,
                menuDesign: data?.menuDesign || 'dispensary',
                location: data?.location,
                address: data?.address,
                city: data?.city,
                state: data?.state,
                zip: data?.zip,
                phone: data?.phone,
            } as Brand;
        }

        return null;
    } catch (error) {
        logger.error('[PREVIEW] Failed to fetch brand config', { orgId, error });
        return null;
    }
}

/**
 * Fetch products from tenant catalog
 */
async function getProducts(
    firestore: FirebaseFirestore.Firestore,
    orgId: string
): Promise<Product[]> {
    try {
        const productsSnapshot = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        if (productsSnapshot.empty) {
            return [];
        }

        return productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Unknown Product',
                category: data.category || 'Other',
                price: data.price || 0,
                imageUrl: data.imageUrl || '',
                imageHint: data.imageHint || data.name || '',
                description: data.description || '',
                brandId: data.brandId || orgId,
                thcPercent: data.thcPercent,
                cbdPercent: data.cbdPercent,
                strainType: data.strainType,
                effects: data.effects,
                likes: data.likes || 0,
            } as Product;
        });
    } catch (error) {
        logger.error('[PREVIEW] Failed to fetch products', { orgId, error });
        return [];
    }
}

/**
 * Get all data needed for menu preview mode
 * Fetches products, carousels, bundles, featured brands, hero, and brand config in parallel
 */
export async function getMenuPreviewData(): Promise<MenuPreviewData> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender',
            'super_user'
        ]);

        const orgId = await resolveOrgId(firestore, user as any);

        if (!orgId) {
            logger.warn('[PREVIEW] No orgId found for user', { uid: user.uid });
            return {
                products: [],
                carousels: [],
                bundles: [],
                featuredBrands: [],
                activeHero: null,
                brand: null,
                vibe: null,
                source: 'none',
                lastSyncedAt: null,
            };
        }

        logger.info('[PREVIEW] Fetching preview data', { orgId });

        // Fetch all data in parallel for performance
        const [
            products,
            carouselsResult,
            bundles,
            featuredBrands,
            heroResult,
            brand,
            vibeResult
        ] = await Promise.all([
            getProducts(firestore, orgId),
            getCarousels(orgId),
            getActiveBundles(orgId),
            getFeaturedBrands(orgId),
            getActiveHero(orgId),
            getBrandConfig(firestore, orgId),
            getPublishedVibe(orgId),
        ]);

        // Filter to only active carousels
        const activeCarousels = carouselsResult.success && carouselsResult.data
            ? carouselsResult.data.filter(c => c.active)
            : [];

        // Get active hero
        const activeHero = heroResult.success && heroResult.data
            ? heroResult.data
            : null;

        // Get published vibe
        const vibe = vibeResult.success && vibeResult.data
            ? vibeResult.data
            : null;

        logger.info('[PREVIEW] Data fetched successfully', {
            orgId,
            productCount: products.length,
            carouselCount: activeCarousels.length,
            bundleCount: bundles.length,
            featuredBrandCount: featuredBrands.length,
            hasHero: !!activeHero,
            hasBrand: !!brand,
            hasVibe: !!vibe,
        });

        return {
            products,
            carousels: activeCarousels,
            bundles,
            featuredBrands,
            activeHero,
            brand,
            vibe,
            source: products.length > 0 ? 'pos' : 'none',
            lastSyncedAt: new Date().toISOString(),
        };
    } catch (error) {
        logger.error('[PREVIEW] Failed to fetch preview data', { error });
        throw error;
    }
}
