
'use server';

import { createServerClient } from '@/firebase/server-client';
import { LocalSEOPage } from '@/types/foot-traffic';

/**
 * Get seeded configuration for a ZIP code from Firestore
 * Supports both new 'local_pages' collection and legacy 'seo_pages' fallback
 */
export async function getSeededConfig(zipCode: string): Promise<LocalSEOPage | null> {
    const { firestore } = await createServerClient();

    // 1. Try Config (zip_pages) -> The new schema
    const configDoc = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .doc(zipCode)
        .get();

    if (configDoc.exists) {
        return configDoc.data() as LocalSEOPage;
    }

    // 2. Fallback to Legacy (seo_pages)
    const legacyDoc = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('seo_pages')
        .doc(zipCode)
        .get();

    if (legacyDoc.exists) {
        return legacyDoc.data() as LocalSEOPage;
    }

    return null;
}
