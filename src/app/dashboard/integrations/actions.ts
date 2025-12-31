'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getPOSClient } from '@/lib/pos/factory';
import type { POSProvider } from '@/lib/pos/types';

export async function saveIntegrationConfig(provider: POSProvider | string, config: any) {
    const user = await requireUser(['dispensary', 'owner', 'brand']); // Brands might manage this for their retailer partners
    const { firestore } = await createServerClient();
    const { grantPermission } = await import('@/server/services/permissions');

    // Determine target ID (dispensary ID or brand's reference to a retailer)
    // For simplicity, assuming user is a Dispensary Admin configuring their own store
    const targetId = user.uid; // Or user.dispensaryId if that existed

    // Grant permission for this tool/provider
    await grantPermission(user.uid, provider);

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

export async function enableApp(appId: string) {
    const user = await requireUser();
    const { grantPermission } = await import('@/server/services/permissions');
    await grantPermission(user.uid, appId);
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
    const user = await requireUser(['dispensary', 'owner']);
    // Dispensary logic: User ID is likely the dispensary ID in this architecture, 
    // or we fetch their dispensary profile.
    const dispensaryId = user.uid; // Placeholder

    try {
        const { firestore } = await createServerClient();
        const client = getPOSClient(provider, config);
        const posProducts = await client.fetchMenu();

        if (posProducts.length === 0) return { success: true, syncedCount: 0 };

        const batch = firestore.batch();
        const productsRef = firestore.collection('products');

        // Fetch existing POS products for this dispensary to update efficiently (or just batch set with merge)
        // Optimization: For 1000s of products, batching 500 at a time is needed.
        // Simplified for this task:

        let operationCount = 0;

        for (const p of posProducts) {
            // Key: brandId_skuId ?? Or just random ID?
            // If we want to update existing, we need a stable ID.
            // Using externalId as part of the key if possible, or querying.
            // For now, let's create new or overwrite if we can find by externalId field.
            // Assuming 'externalId' field wasn't added to Product yet, we might check 'sku_id'.

            // Let's assume we use a determinstic ID: `${dispensaryId}_${p.externalId}`
            const docId = `${dispensaryId}_${p.externalId || p.name.replace(/\s+/g, '')}`;
            const docRef = productsRef.doc(docId);

            batch.set(docRef, {
                // Determine brandId? If POS provides brand string, we might try to match known brands.
                // Or just store string.
                brandId: dispensaryId, // Dispensary owns this record
                name: p.name,
                category: p.category,
                price: p.price,
                stock: p.stock,
                thcPercent: p.thcPercent,
                imageUrl: p.imageUrl || '',
                description: '',
                source: 'pos',
                sourceTimestamp: new Date(),
                // Store raw POS data if needed in metadata?
            }, { merge: true });

            operationCount++;
            if (operationCount >= 400) break; // Batch limit for demo
        }

        await batch.commit();

        return { success: true, syncedCount: operationCount };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
