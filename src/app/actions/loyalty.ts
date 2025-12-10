'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { LoyaltySettings } from '@/types/customers';
import { revalidatePath } from 'next/cache';

const SETTINGS_COLLECTION = 'loyalty_settings';

export async function getLoyaltySettings(orgId: string): Promise<{ success: boolean; data?: LoyaltySettings; error?: string }> {
    try {
        if (!orgId) throw new Error('Org ID is required');

        const db = getAdminFirestore();
        const doc = await db.collection(SETTINGS_COLLECTION).doc(orgId).get();

        if (doc.exists) {
            return { success: true, data: doc.data() as LoyaltySettings };
        }

        // Default settings if not exists
        const defaults: LoyaltySettings = {
            pointsPerDollar: 1,
            equityMultiplier: 1.0,
            tiers: [
                { id: 'bronze', name: 'Bronze', threshold: 0, color: '#CD7F32', benefits: ['Earn 1pt per $1'] },
                { id: 'silver', name: 'Silver', threshold: 500, color: '#C0C0C0', benefits: ['Earn 1.2pts per $1', 'Birthday Gift'] },
                { id: 'gold', name: 'Gold', threshold: 1000, color: '#FFD700', benefits: ['Earn 1.5pts per $1', 'Early Access'] },
            ]
        };

        return { success: true, data: defaults };
    } catch (error) {
        console.error('Error fetching loyalty settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

export async function updateLoyaltySettings(orgId: string, data: LoyaltySettings): Promise<{ success: boolean; error?: string }> {
    try {
        if (!orgId) throw new Error('Org ID is required');

        const db = getAdminFirestore();
        await db.collection(SETTINGS_COLLECTION).doc(orgId).set(data);

        revalidatePath('/dashboard/loyalty');
        return { success: true };
    } catch (error) {
        console.error('Error updating loyalty settings:', error);
        return { success: false, error: 'Failed to update settings' };
    }
}
