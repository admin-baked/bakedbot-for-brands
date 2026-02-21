'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { BundleDeal, BundleProduct } from '@/types/bundles';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const BUNDLES_COLLECTION = 'bundles';

/**
 * Derive the brands/{id} doc ID from a brand display name
 * Matches pattern used in featured-brands.ts
 */
function toBrandId(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `brand_${slug.replace(/-/g, '_')}`;
}

/**
 * Select bundle image from products using priority ranking:
 * 1. Logo of most common brand in bundle
 * 2. Image of highest-priced product
 * 3. Fallback to undefined (component will use background color)
 */
export async function selectBundleImageFromProducts(bundleProducts: BundleProduct[]): Promise<string | undefined> {
    try {
        if (!bundleProducts || bundleProducts.length === 0) {
            return undefined;
        }

        const db = getAdminFirestore();

        // Priority 1: Count brands and get most common
        const brandCounts = new Map<string, number>();
        bundleProducts.forEach(p => {
            if (p.brand && p.brand !== 'Unknown') {
                brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1);
            }
        });

        // Find top brand
        let topBrand: string | undefined;
        let maxCount = 0;
        for (const [brand, count] of brandCounts.entries()) {
            if (count > maxCount) {
                topBrand = brand;
                maxCount = count;
            }
        }

        // Try to get brand logo
        if (topBrand) {
            try {
                const brandDoc = await db.collection('brands').doc(toBrandId(topBrand)).get();
                if (brandDoc.exists) {
                    const data = brandDoc.data();
                    if (data?.logoUrl) {
                        return data.logoUrl;
                    }
                }
            } catch (e) {
                logger.warn(`[Bundles] Failed to fetch brand logo for ${topBrand}: ${e}`);
            }
        }

        // Priority 2: Use image from highest-priced product
        const topProduct = bundleProducts.reduce((max, p) =>
            p.originalPrice > max.originalPrice ? p : max
        );

        if (topProduct.imageUrl && !topProduct.imageUrl.includes('placeholder')) {
            return topProduct.imageUrl;
        }

        // Priority 3: No image found
        return undefined;
    } catch (error: unknown) {
        logger.error('[Bundles] Error selecting bundle image:', { error: error instanceof Error ? error.message : String(error) });
        return undefined;
    }
}

// Schema for creation validation
const CreateBundleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string(),
    type: z.enum(['bogo', 'mix_match', 'percentage', 'fixed_price', 'tiered']),
    dispensaryId: z.string().optional(),
    orgId: z.string(),
    status: z.enum(['draft', 'active', 'scheduled', 'paused']).default('draft'),
    // Simplified for MVP - add other fields as needed
});

export async function getBundles(orgId: string): Promise<{ success: boolean; data?: BundleDeal[]; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');

        const db = getAdminFirestore();
        const snapshot = await db.collection(BUNDLES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .get();

        // Helper to convert Firestore Timestamps to ISO strings for serialization
        const toISOString = (val: any): string | undefined => {
            if (!val) return undefined;
            if (val.toDate) return val.toDate().toISOString();
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'string') return val;
            return undefined;
        };

        const bundles = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
                startDate: toISOString(data.startDate),
                endDate: toISOString(data.endDate),
            };
        }) as unknown as BundleDeal[];

        return { success: true, data: bundles };
    } catch (error) {
        console.error('Error fetching bundles:', error);
        return { success: false, error: 'Failed to fetch bundles' };
    }
}

export async function createBundle(data: Partial<BundleDeal>): Promise<{ success: boolean; data?: BundleDeal; error?: string }> {
    try {
        // Validate required minimal fields (or use Zod)
        if (!data.name || !data.orgId) {
            throw new Error('Name and Organization ID are required');
        }

        const id = uuidv4();
        const db = getAdminFirestore();
        const now = new Date(); // Firestore Admin SDK supports Date objects directly usually, or use Timestamp

        const newBundle: BundleDeal = {
            // Defaults
            type: 'mix_match',
            status: 'draft',
            createdBy: 'dispensary',
            products: [],
            currentRedemptions: 0,
            savingsAmount: 0,
            savingsPercent: 0,
            featured: false,
            originalTotal: 0,
            bundlePrice: 0,

            // Override with provided data
            ...data,

            // System fields
            id,
            createdAt: now,
            updatedAt: now,
        } as BundleDeal;

        await db.collection(BUNDLES_COLLECTION).doc(id).set(newBundle);

        revalidatePath('/dashboard/bundles');
        return { success: true, data: newBundle };
    } catch (error) {
        console.error('Error creating bundle:', error);
        return { success: false, error: 'Failed to create bundle' };
    }
}

export async function updateBundle(id: string, data: Partial<BundleDeal>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Bundle ID is required');

        const db = getAdminFirestore();
        await db.collection(BUNDLES_COLLECTION).doc(id).update({
            ...data,
            updatedAt: new Date(),
        });

        revalidatePath('/dashboard/bundles');
        return { success: true };
    } catch (error) {
        console.error('Error updating bundle:', error);
        return { success: false, error: 'Failed to update bundle' };
    }
}

export async function deleteBundle(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) throw new Error('Bundle ID is required');

        const db = getAdminFirestore();
        await db.collection(BUNDLES_COLLECTION).doc(id).delete();

        revalidatePath('/dashboard/bundles');
        return { success: true };
    } catch (error) {
        console.error('Error deleting bundle:', error);
        return { success: false, error: 'Failed to delete bundle' };
    }
}

/**
 * Get active bundles for public menu display (no auth required)
 * Returns serializable data (ISO strings for dates) for Server->Client Component passing
 */
export async function getActiveBundles(orgId: string): Promise<BundleDeal[]> {
    try {
        if (!orgId) return [];

        const db = getAdminFirestore();
        const snapshot = await db.collection(BUNDLES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        // Convert Firestore Timestamps to ISO strings for serialization
        // (Date objects cannot be passed from Server to Client Components)
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const toISOString = (val: any): string | undefined => {
                if (!val) return undefined;
                if (val.toDate) return val.toDate().toISOString();
                if (val instanceof Date) return val.toISOString();
                if (typeof val === 'string') return val;
                return undefined;
            };

            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
                startDate: toISOString(data.startDate),
                endDate: toISOString(data.endDate),
            };
        }) as unknown as BundleDeal[];
    } catch (error: any) {
        if (error?.code === 16 || error?.message?.includes('UNAUTHENTICATED')) {
            // console.warn('[Bundles] Skipped due to missing credentials (local dev)');
            return [];
        }
        console.error('Error fetching active bundles:', error);
        return [];
    }
}
