
import { MetadataRoute } from 'next';
import { createServerClient } from '@/firebase/server-client';

const BASE_URL = 'https://bakedbot.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    try {
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
        let brandRoutes: any[] = [];
        try {
            const brandsSnapshot = await firestore.collection('brands')
                .limit(500) // Reduced limit for build stability
                .get();

            brandRoutes = brandsSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    if (!data.slug) return null;
                    return {
                        url: `${BASE_URL}/brands/${data.slug}`,
                        lastModified: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : new Date(),
                        changeFrequency: 'daily' as const,
                        priority: 0.8,
                    };
                })
                .filter(Boolean);
        } catch (e) {
            console.error('[Sitemap] Failed to fetch brands:', e);
        }

        // 3. Dynamic Dispensaries
        let retailerRoutes: any[] = [];
        try {
            const retailersSnapshot = await firestore.collection('retailers')
                .where('status', '==', 'active')
                .limit(500)
                .get();

            retailerRoutes = retailersSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const slug = data.slug || data.id;
                    if (!slug) return null;
                    return {
                        url: `${BASE_URL}/dispensaries/${slug}`,
                        lastModified: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : new Date(),
                        changeFrequency: 'daily' as const,
                        priority: 0.8,
                    };
                })
                .filter(Boolean);
        } catch (e) {
            console.error('[Sitemap] Failed to fetch retailers:', e);
        }

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
    } catch (error) {
        console.error('[Sitemap] Root failure:', error);
        // Return at least static routes so the build doesn't fail
        return [
            {
                url: BASE_URL,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1,
            },
        ];
    }
}
