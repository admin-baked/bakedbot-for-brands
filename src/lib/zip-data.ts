
import { createServerClient } from '@/firebase/server-client';
import { ZipSEOPage } from '@/types/seo-pages'; // Ensure this type exists or redefine
import { Product } from '@/types/domain';

export interface ZipPageData {
    zipCode: string;
    city: string;
    state: string;
    dispensaryCount: number;
    nearbyDispensaryIds: string[];
    seoIntro?: string; // Generated text
}

export async function fetchZipPageData(zipCode: string) {
    const { firestore } = await createServerClient();

    let zipData: ZipPageData | null = null;
    let products: Product[] = [];

    // 1. Fetch Zip Page Config
    // ID format in generator is "zip_12345"
    const zipDoc = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .doc(`zip_${zipCode}`)
        .get();

    if (zipDoc.exists) {
        // Correct type mapping
        const d = zipDoc.data();
        zipData = {
            zipCode: d?.zipCode || zipCode,
            city: d?.city || '',
            state: d?.state || '',
            dispensaryCount: d?.dispensaryCount || 0,
            nearbyDispensaryIds: d?.nearbyDispensaryIds || [],
            seoIntro: d?.seoIntro
        };
    } else {
        return { zip: null, products: [] };
    }

    // 2. Fetch Sample Products for this Zip using nearbyDispensaryIds
    if (zipData && zipData.nearbyDispensaryIds.length > 0) {
        // Extract IDs from "dispensary_123" format -> "123"
        const dispensaryIds = zipData.nearbyDispensaryIds
            .map(id => id.replace('dispensary_', ''))
            .slice(0, 10); // Limit to 10 stores for query

        if (dispensaryIds.length > 0) {
            try {
                // Query global products collection where dispensaryId is in list
                const productsQuery = await firestore
                    .collection('products')
                    .where('dispensaryId', 'in', dispensaryIds)
                    .orderBy('rating', 'desc')
                    .limit(20)
                    .get();

                products = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            } catch (error) {
                console.error("Error fetching zip products:", error);
            }
        }
    }

    return { zip: zipData, products };
}
