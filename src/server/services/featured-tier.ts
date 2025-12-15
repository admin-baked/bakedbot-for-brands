
import { createServerClient } from '@/firebase/server-client';
import { Brand, Dispensary } from '@/types/seo-engine';

export class FeaturedTierService {

    /**
     * Checks if a user or entity has an active Featured ($100/mo) subscription.
     */
    async isFeatured(entityType: 'brand' | 'dispensary', entityId: string): Promise<boolean> {
        const { firestore } = await createServerClient();

        // check firestore 'featured_placements' collection or metadata on entity
        // Implementation A: Metadata on entity (faster)
        const collection = entityType === 'brand' ? 'brands' : 'retailers'; // 'brand' matches string literal type

        // We'll trust the entity record for speed, but verify optionally
        const doc = await firestore.collection(collection).doc(entityId).get();
        if (!doc.exists) return false;

        const data = doc.data();
        return data?.verificationStatus === 'featured';
    }

    /**
     * Pins featured brands to the top of a list (e.g. Local Rankings or Brand List).
     */
    async getFeaturedEntitiesForZip(zipCode: string, entityType: 'brand' | 'dispensary'): Promise<any[]> {
        const { firestore } = await createServerClient();

        // Query 'featured_placements' where zip == zipCode AND active == true
        // This collection allows brands to buy slots in specific ZIPs

        const snapshot = await firestore.collection('featured_placements')
            .where('zipCode', '==', zipCode)
            .where('entityType', '==', entityType)
            .where('isActive', '==', true)
            .get();

        if (snapshot.empty) return [];

        // Fetch the actual entity details
        // In a real app we might store denormalized data in the placement record to avoid N+1 queries
        // For V1, let's assume we return the placement metadata which includes name/logo

        return snapshot.docs.map(doc => doc.data());
    }

    /**
     * Upgrades an entity to Featured status (e.g. after Stripe webhook).
     */
    async upgradeEntity(entityType: 'brand' | 'dispensary', entityId: string): Promise<void> {
        const { firestore } = await createServerClient();
        const collection = entityType === 'brand' ? 'brands' : 'retailers';

        await firestore.collection(collection).doc(entityId).update({
            verificationStatus: 'featured',
            featuredPlan: 'featured_100',
            updatedAt: new Date()
        });
    }

    /**
     * Downgrades an entity (e.g. cancellation).
     */
    async downgradeEntity(entityType: 'brand' | 'dispensary', entityId: string): Promise<void> {
        const { firestore } = await createServerClient();
        const collection = entityType === 'brand' ? 'brands' : 'retailers';

        await firestore.collection(collection).doc(entityId).update({
            verificationStatus: 'verified', // Fallback to verified, not unverified
            featuredPlan: null,
            updatedAt: new Date()
        });
    }
}
