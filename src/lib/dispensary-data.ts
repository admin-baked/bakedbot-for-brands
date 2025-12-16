
import { createServerClient } from '@/firebase/server-client';
import { Retailer, Product } from '@/types/domain';

export async function fetchDispensaryPageData(slug: string) {
    const { firestore } = await createServerClient();

    let retailer: Retailer | null = null;
    let products: Product[] = [];

    // 1. Fetch Retailer
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

    if (!retailer) {
        return { retailer: null, products: [] };
    }

    // 2. Fetch Products
    // Products that have this retailer in their 'retailerIds' array
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

    return { retailer, products };
}
