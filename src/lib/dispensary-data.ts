
import { createServerClient } from '@/firebase/server-client';
import { Retailer, Product } from '@/types/domain';
import { DispensarySEOPage } from '@/types/foot-traffic';

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
 * Fetch all discovered SEO pages for listing/index pages
 */
export async function fetchDiscoveredDispensaryPages(limit = 50) {
    try {
        const { firestore } = await createServerClient();
        
        const snapshot = await firestore
            .collection('seo_pages_dispensary')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispensarySEOPage));
    } catch (error) {
        console.error('[fetchDiscoveredDispensaryPages] Error:', error);
        // Return empty array if Firestore fails (e.g., auth issues locally)
        return [];
    }
}
