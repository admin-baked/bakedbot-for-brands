'use server';

/**
 * Strain Image Database — Global Brand Asset Library
 *
 * Stores scraped product/strain images in a shared Firestore collection so
 * they can be reused across all dispensary tenants. When a new dispensary
 * signs up and their POS menu syncs, their products get pre-populated with
 * real images from this library without requiring a fresh Leafly scrape.
 *
 * Collection: `strain_images`
 * Document ID: strain slug (e.g. "blue-dream", "og-kush", "wedding-cake")
 *
 * Lookup order at import time:
 *   1. Global strain_images library (instant, no scraping)
 *   2. Org-scoped wm_image_catalog cache (7-day TTL)
 *   3. Live Leafly scrape (adds to library for next time)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface StrainImageDoc {
    /** Slug used as the Firestore document ID (e.g. "blue-dream") */
    strainSlug: string;
    /** Firebase Storage signed URL (long-lived) or CDN URL */
    imageUrl: string;
    /** Original source the image was scraped from */
    source: 'leafly' | 'leafly_cdn' | 'brand_website' | 'manual';
    /** Original CDN URL before we re-hosted (if available) */
    sourceCdnUrl?: string;
    /** Number of times this image has been served to an org product */
    hitCount: number;
    scrapedAt: Date;
    updatedAt: Date;
}

// ============================================================================
// NORMALIZE
// ============================================================================

/** Slugify a string into a stable Firestore document ID */
export function toStrainSlug(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// ============================================================================
// READ
// ============================================================================

/**
 * Look up a strain image by slug.
 * Returns the imageUrl if found, null otherwise.
 * Increments hitCount on every successful lookup (fire-and-forget).
 */
export async function lookupStrainImage(strainSlug: string): Promise<string | null> {
    if (!strainSlug || strainSlug.length < 2) return null;

    try {
        const db = getAdminFirestore();
        const doc = await db.collection('strain_images').doc(strainSlug).get();
        if (!doc.exists) return null;

        const data = doc.data() as StrainImageDoc;
        if (!data.imageUrl) return null;

        // Increment hit count fire-and-forget
        doc.ref.update({ hitCount: (data.hitCount || 0) + 1, updatedAt: new Date() }).catch(() => {});

        logger.debug('[StrainImageDB] Cache hit', { strainSlug, source: data.source });
        return data.imageUrl;
    } catch (err) {
        logger.warn('[StrainImageDB] Lookup failed', { strainSlug, err: String(err) });
        return null;
    }
}

/**
 * Look up images for multiple strain slugs at once (batch read).
 * Returns a map of strainSlug → imageUrl for all hits.
 */
export async function lookupStrainImages(strainSlugs: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!strainSlugs.length) return result;

    const unique = [...new Set(strainSlugs.filter(s => s && s.length >= 2))];
    if (!unique.length) return result;

    try {
        const db = getAdminFirestore();

        // Firestore 'in' operator supports up to 30 values per query
        for (let i = 0; i < unique.length; i += 30) {
            const batch = unique.slice(i, i + 30);
            const snap = await db
                .collection('strain_images')
                .where('__name__', 'in', batch)
                .get();

            for (const doc of snap.docs) {
                const data = doc.data() as StrainImageDoc;
                if (data.imageUrl) {
                    result.set(doc.id, data.imageUrl);
                }
            }
        }

        logger.info('[StrainImageDB] Batch lookup', {
            requested: unique.length,
            found: result.size,
        });
    } catch (err) {
        logger.warn('[StrainImageDB] Batch lookup failed', { err: String(err) });
    }

    return result;
}

// ============================================================================
// WRITE
// ============================================================================

/**
 * Persist a strain image to the global library.
 * Safe to call after every Leafly scrape — uses set({ merge: true }) so
 * existing entries are updated if a better URL is found.
 */
export async function saveStrainImage(
    strainSlug: string,
    imageUrl: string,
    source: StrainImageDoc['source'],
    sourceCdnUrl?: string,
): Promise<void> {
    if (!strainSlug || !imageUrl || strainSlug.length < 2) return;

    try {
        const db = getAdminFirestore();
        await db.collection('strain_images').doc(strainSlug).set(
            {
                strainSlug,
                imageUrl,
                source,
                ...(sourceCdnUrl ? { sourceCdnUrl } : {}),
                hitCount: 0,
                scrapedAt: new Date(),
                updatedAt: new Date(),
            },
            { merge: true },
        );

        logger.debug('[StrainImageDB] Saved', { strainSlug, source });
    } catch (err) {
        logger.warn('[StrainImageDB] Save failed', { strainSlug, err: String(err) });
    }
}

/**
 * Bulk-save a map of strainSlug → imageUrl (e.g. from a full Leafly catalog build).
 * Uses batched Firestore writes for efficiency.
 */
export async function bulkSaveStrainImages(
    entries: Map<string, string>,
    source: StrainImageDoc['source'] = 'leafly',
): Promise<{ saved: number; failed: number }> {
    if (!entries.size) return { saved: 0, failed: 0 };

    const db = getAdminFirestore();
    const now = new Date();
    let saved = 0;
    let failed = 0;

    // Firestore batch limit = 500 operations
    const slugs = Array.from(entries.keys());
    for (let i = 0; i < slugs.length; i += 450) {
        try {
            const batch = db.batch();
            const chunk = slugs.slice(i, i + 450);

            for (const slug of chunk) {
                const imageUrl = entries.get(slug);
                if (!imageUrl || slug.length < 2) continue;

                const ref = db.collection('strain_images').doc(slug);
                batch.set(
                    ref,
                    {
                        strainSlug: slug,
                        imageUrl,
                        source,
                        hitCount: 0,
                        scrapedAt: now,
                        updatedAt: now,
                    },
                    { merge: true },
                );
            }

            await batch.commit();
            saved += chunk.length;
        } catch (err) {
            failed += Math.min(450, slugs.length - i);
            logger.warn('[StrainImageDB] Bulk save batch failed', { i, err: String(err) });
        }
    }

    logger.info('[StrainImageDB] Bulk save complete', { saved, failed });
    return { saved, failed };
}

// ============================================================================
// STATS
// ============================================================================

/** Return top-level stats for the global image library (for dashboard display). */
export async function getStrainImageDbStats(): Promise<{
    totalImages: number;
    topStrains: Array<{ slug: string; hitCount: number }>;
}> {
    try {
        const db = getAdminFirestore();
        const countSnap = await db.collection('strain_images').count().get();
        const totalImages = countSnap.data().count;

        const topSnap = await db
            .collection('strain_images')
            .orderBy('hitCount', 'desc')
            .limit(10)
            .get();

        const topStrains = topSnap.docs.map(d => ({
            slug: d.id,
            hitCount: (d.data() as StrainImageDoc).hitCount || 0,
        }));

        return { totalImages, topStrains };
    } catch {
        return { totalImages: 0, topStrains: [] };
    }
}
