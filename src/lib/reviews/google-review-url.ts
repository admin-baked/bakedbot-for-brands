import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export async function getGoogleReviewUrl(orgId: string): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const dispensaryDoc = await db.collection('dispensaries').doc(orgId).get();

        if (!dispensaryDoc.exists) {
            return null;
        }

        const placeId = dispensaryDoc.data()?.gmapsPlaceId;
        if (typeof placeId !== 'string' || !placeId.trim()) {
            return null;
        }

        return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    } catch (error) {
        logger.warn('[Reviews] Could not resolve Google review URL', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}
