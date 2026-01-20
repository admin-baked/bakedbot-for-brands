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
        const seoDispensaryPages = seoDispSnapshot.data().count;
        const zipPages = zipPagesSnapshot.data().count;

        // Total Pages = (Entity Pages) +  (Generated SEO Pages) + (Nationwide ZIP Landing Pages)
        const totalPages = dispensaries + brands + seoDispensaryPages + zipPages;

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
