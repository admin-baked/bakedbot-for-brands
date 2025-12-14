
import { MetadataRoute } from 'next';
import { createServerClient } from '@/firebase/server-client';
import { LocalSEOPage } from '@/types/foot-traffic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://bakedbot.ai';
    const { firestore } = await createServerClient();

    // 1. Static Routes
    const routes = [
        '',
        '/local',
        '/chat',
        '/login',
        '/privacy',
        '/terms',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    // 2. Dynamic Local Pages
    // Fetch all published pages from local_pages collection
    // (We use the new collection, and fallback to legacy if needed manually, 
    // but sitemap should prioritize the new clean data)
    const pagesSnap = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('local_pages')
        .where('published', '==', true)
        .get();

    const localRoutes = pagesSnap.docs.map((doc) => {
        const data = doc.data() as LocalSEOPage;
        return {
            url: `${baseUrl}/local/${data.zipCode}`,
            lastModified: (data.lastRefreshed as any)?.toDate ? (data.lastRefreshed as any).toDate() : new Date(data.lastRefreshed || Date.now()),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        };
    });

    return [...routes, ...localRoutes];
}


