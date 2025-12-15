
import { MetadataRoute } from 'next';
import { createServerClient } from '@/firebase/server-client';

const BASE_URL = 'https://bakedbot.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { firestore } = await createServerClient();

    // 1. Static Routes
    const staticRoutes = [
        '',
        '/about',
        '/brands/claim',
    ].map(route => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 1.0,
    }));

    // 2. Dynamic Brands (Top 1000 for V1)
    const brandsSnapshot = await firestore.collection('brands')
        .limit(1000)
        .get();

    const brandRoutes = brandsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            url: `${BASE_URL}/brands/${data.slug}`,
            lastModified: data.updatedAt?.toDate() || new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        };
    });

    // 3. Dynamic Dispensaries
    const retailersSnapshot = await firestore.collection('retailers')
        .where('status', '==', 'active')
        .limit(1000)
        .get();

    const retailerRoutes = retailersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Assuming slug exists, otherwise use ID
        const slug = data.slug || data.id;
        return {
            url: `${BASE_URL}/dispensaries/${slug}`,
            lastModified: data.updatedAt?.toDate() || new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        };
    });

    // 4. Cannabis Desert Indices (Static States for now)
    const states = ['MI', 'CA', 'OK', 'MA'];
    const desertRoutes = states.map(state => ({
        url: `${BASE_URL}/deserts/${state.toLowerCase()}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
    }));

    return [
        ...staticRoutes,
        ...brandRoutes,
        ...retailerRoutes,
        ...desertRoutes
    ];
}
