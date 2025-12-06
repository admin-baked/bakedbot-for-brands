'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getPOSClient } from '@/lib/pos/factory';
import type { POSProvider } from '@/lib/pos/types';

export async function saveIntegrationConfig(provider: POSProvider, config: any) {
    const user = await requireUser(['dispensary', 'owner', 'brand']); // Brands might manage this for their retailer partners
    const { firestore } = await createServerClient();

    // Determine target ID (dispensary ID or brand's reference to a retailer)
    // For simplicity, assuming user is a Dispensary Admin configuring their own store
    const targetId = user.uid; // Or user.dispensaryId if that existed

    // In a real app, strict validation of permissions here
    await firestore.collection('dispensaries').doc(targetId).set({
        posConfig: {
            provider,
            ...config,
            updatedAt: new Date()
        }
    }, { merge: true });

    return { success: true };
}

export async function testConnection(provider: POSProvider, config: any) {
    try {
        const client = getPOSClient(provider, config);
        const valid = await client.validateConnection();
        if (!valid) throw new Error('Connection refused by provider.');

        const menuSample = await client.fetchMenu();
        return { success: true, count: menuSample.length, sample: menuSample[0] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function syncMenu(provider: POSProvider, config: any) {
    try {
        const client = getPOSClient(provider, config);
        const products = await client.fetchMenu();

        // TODO: Here we would upsert these products into the 'products' collection
        // matching by externalId or name/brand.

        return { success: true, syncedCount: products.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
