
import { createServerClient } from '@/firebase/server-client';
import { Retailer } from '@/types/domain';

export interface CityPageData {
    name: string;
    state: string;
    slug: string;
    dispensaryCount: number;
    description?: string;
}

export async function fetchCityPageData(citySlug: string) {
    const { firestore } = await createServerClient();

    let cityData: CityPageData | null = null;
    let dispensaries: Retailer[] = [];

    // 1. Fetch City config (from page generator output)
    const cityDoc = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('city_pages')
        .doc(citySlug)
        .get();

    if (cityDoc.exists) {
        cityData = cityDoc.data() as CityPageData;
    } else {
        // Fallback: Try to parse slug "city-state" to find data dynamically?
        // For now, strict match required or 404
        return { city: null, dispensaries: [] };
    }

    // 2. Fetch Dispensaries in this City
    // This relies on the retailers having consistent City/State strings matching the page data
    try {
        const retailersQuery = await firestore
            .collection('retailers')
            .where('city', '==', cityData.name)
            .where('state', '==', cityData.state)
            .limit(50)
            .get();

        if (!retailersQuery.empty) {
            dispensaries = retailersQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Retailer));
        } else {
            // Fallback: Check dispensary_pages collection if retailers not yet synced
            const pagesQuery = await firestore.collection('foot_traffic')
                .doc('config')
                .collection('dispensary_pages')
                .where('city', '==', cityData.name)
                .where('state', '==', cityData.state)
                .limit(50)
                .get();

            dispensaries = pagesQuery.docs.map(doc => {
                const d = doc.data();
                return {
                    id: d.retailerId || doc.id,
                    name: d.name,
                    city: d.city,
                    state: d.state,
                    address: 'Address on file', // pages often lack full address if not minimal
                    zip: '',
                    status: 'active'
                } as Retailer;
            });
        }

    } catch (e) {
        console.error('Error fetching city dispensaries:', e);
    }

    return { city: cityData, dispensaries };
}
