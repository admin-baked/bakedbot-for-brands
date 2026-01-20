'use server';

import { createServerClient } from '@/firebase/server-client';

export interface PlatformStats {
    dispensaries: number;
    brands: number;
    pages: number; // ZIP pages + Brand pages + Dispensary pages
}

export async function getPlatformStats(): Promise<PlatformStats> {
    try {
        const { firestore } = await createServerClient();


        // Run counts in parallel
        const [dispensariesSnapshot, brandsSnapshot, seoDispSnapshot, zipPagesSnapshot] = await Promise.all([
            firestore.collection('dispensaries').count().get(),
            firestore.collection('brands').count().get(),
            firestore.collection('seo_pages_dispensary').count().get(),
            firestore.collection('foot_traffic').doc('config').collection('zip_pages').count().get()
        ]);

        const dispensaries = dispensariesSnapshot.data().count;
        const brands = brandsSnapshot.data().count;

        // Estimate pages: (Brands * 50 states) + (Dispensaries) + (ZIPs covered)
        // Detailed count is expensive. We'll use a heuristic or stored counter if available.
        // For MVP National Rollout, let's assume 1 page per entity + 250 ZIPs (placeholder)
        // Or check if 'seo_pages' collection exists

        let pages = 0;
        try {
            const pagesSnapshot = await firestore.collection('seo_pages').count().get();
            pages = pagesSnapshot.data().count;
        } catch {
            // collection might not exist
        }

        // Add entity pages count (since they act as pages too)
        const totalPages = pages + dispensaries + brands;

        return {
            dispensaries,
            brands,
            pages: totalPages
        };

    } catch (error) {
        console.error('Error fetching platform stats:', error);
        // Return zeros on error to prevent UI crash
        return { dispensaries: 0, brands: 0, pages: 0 };
    }
}
