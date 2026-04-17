
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { Retailer, Product } from '@/types/domain';
import { DispensarySEOPage } from '@/types/foot-traffic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidSlug(s: string): boolean {
    return UUID_RE.test(s);
}

/** Generate a URL-safe slug from a dispensary name + city. */
export function generateDispensarySlug(name: string, city: string): string {
    const base = `${name} ${city}`
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
    return base;
}

// Slugs/names that must never appear in the public dispensary directory
const EXCLUDED_DISPENSARY_SLUGS = new Set([
    'andrewsdevelopments', 'andrews-developments', 'andrews_developments',
]);
const EXCLUDED_DISPENSARY_NAMES = ['andrews developments', 'andrewsdevelopments'];

function isExcludedDispensary(name: string, slug: string): boolean {
    const n = name.toLowerCase();
    const s = slug.toLowerCase();
    if (EXCLUDED_DISPENSARY_SLUGS.has(s)) return true;
    if (EXCLUDED_DISPENSARY_NAMES.some(x => n.includes(x))) return true;
    return false;
}

export async function fetchDispensaryPageData(slug: string) {
    const { firestore } = await createServerClient();

    let retailer: Retailer | null = null;
    let products: Product[] = [];
    let seoPage: DispensarySEOPage | null = null;

    // 1. Fetch Retailer from retailers collection
    // Try to find by slug
    let query = firestore.collection('retailers').where('slug', '==', slug).limit(1);
    let snapshot = await query.get();

    // Fallback: search by id if slug not found
    if (snapshot.empty) {
        const doc = await firestore.collection('retailers').doc(slug).get();
        if (doc.exists) {
            retailer = { id: doc.id, ...doc.data() } as Retailer;
        }
    } else {
        retailer = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Retailer;
    }

    // 2. Fallback: Check seo_pages_dispensary for discovered pages
    if (!retailer) {
        const seoQuery = firestore.collection('seo_pages_dispensary').where('dispensarySlug', '==', slug).limit(1);
        const seoSnapshot = await seoQuery.get();
        
        if (!seoSnapshot.empty) {
            seoPage = { id: seoSnapshot.docs[0].id, ...seoSnapshot.docs[0].data() } as DispensarySEOPage;
            // Convert SEO page to Retailer shape for rendering
            retailer = {
                id: seoPage.id,
                name: seoPage.dispensaryName,
                slug: seoPage.dispensarySlug,
                city: seoPage.city,
                state: seoPage.state,
                zip: seoPage.zipCode,
                address: '', // Discovered pages may not have full address
                updatedAt: seoPage.updatedAt
            } as unknown as Retailer;
        }
    }

    if (!retailer) {
        return { retailer: null, products: [], seoPage: null };
    }

    // 3. Fetch Products (only if this is a CannMenus retailer, not a discovered page)
    if (!seoPage && retailer.id) {
        try {
            const productsQuery = await firestore
                .collection('products')
                .where('retailerIds', 'array-contains', retailer.id)
                .limit(50) // Limit for performance
                .get();

            products = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        } catch (error) {
            console.error('Error fetching dispensary products:', error);
            // Fail gracefully with empty products
        }
    }

    return { retailer, products, seoPage };
}

/**
 * Fetch all discovered SEO pages for listing/index pages.
 * Excludes non-cannabis entries.
 */
export async function fetchDiscoveredDispensaryPages(limit = 50) {
    try {
        const { firestore } = await createServerClient();

        const snapshot = await firestore
            .collection('seo_pages_dispensary')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as DispensarySEOPage))
            .filter(p => !isExcludedDispensary(p.dispensaryName ?? '', p.dispensarySlug ?? ''));
    } catch (error) {
        console.error('[fetchDiscoveredDispensaryPages] Error:', error);
        return [];
    }
}

/**
 * Fetch licensed retailers from the CRM for the public dispensary directory.
 * Includes NY OCM-sourced dispensaries and any other claimed/active retailers.
 * Optionally filtered by state (e.g., 'NY', 'IL').
 */
export async function fetchRetailersForDirectory(state?: string, limit = 150): Promise<Retailer[]> {
    try {
        const { firestore } = await createServerClient();
        const col = firestore.collection('retailers');
        const q = state
            ? col.where('state', '==', state).limit(limit)
            : col.limit(limit);
        const snapshot = await q.get();
        return snapshot.docs
            .map(doc => {
                const r = { id: doc.id, ...doc.data() } as Retailer;
                // Ensure slug is never a UUID — generate from name+city when missing or UUID
                if (!r.slug || isUuidSlug(r.slug)) {
                    (r as any).slug = generateDispensarySlug(r.name ?? '', r.city ?? '');
                }
                return r;
            })
            .filter(r => !isExcludedDispensary(r.name ?? '', r.slug ?? r.id ?? ''));
    } catch (error) {
        logger.error('[fetchRetailersForDirectory] Error', { error, state });
        return [];
    }
}
