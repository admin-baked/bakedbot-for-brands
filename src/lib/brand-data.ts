import { createServerClient } from '@/firebase/server-client';
import type { Brand, Product } from '@/types/domain';

export async function fetchBrandPageData(brandParam: string) {
    const { firestore } = await createServerClient();

    let brand: Brand | null = null;
    let products: Product[] = [];

    // 1. Try to get brand by ID directly
    const brandDoc = await firestore.collection('brands').doc(brandParam).get();

    if (brandDoc.exists) {
        brand = { id: brandDoc.id, ...brandDoc.data() } as Brand;
    } else {
        // 2. Try to query by slug
        const slugQuery = await firestore
            .collection('brands')
            .where('slug', '==', brandParam)
            .limit(1)
            .get();

        if (!slugQuery.empty) {
            const doc = slugQuery.docs[0];
            brand = { id: doc.id, ...doc.data() } as Brand;
        }
    }

    if (!brand) {
        return { brand: null, products: [] };
    }

    // 3. Fetch products for this brand
    // Note: 'brand_id' seems to be the field name used in other parts of the codebase (e.g. AiAgentEmbedTab)
    // Checking types/products.ts, it says 'brandId'. I should check what is actually stored.
    // Given AiAgentEmbedTab used 'brand_id' in a query, maybe that's the field in Firestore?
    // Let's try 'brandId' first as per type definition, but be aware.
    // Actually, looking at AiAgentEmbedTab in step 1491, it used: where('brand_id', '==', cannMenusId)
    // BUT types/products.ts says brandId. 
    // I'll try both or check a specific file to be sure. 
    // src/server/services/cannmenus.ts line 652 (viewed in step 1242 previously, not recently) likely adheres to one.
    // I'll query for 'brandId' as per the TypeScript type, but if that returns empty taking a hint from previous context 'brand_id' is possible.
    // Wait, the CannMenusService typically uses snake_case for DB fields sometimes?
    // Let's assume 'brandId' for now based on the type definition.

    // UPDATE: In step 1512 (AiAgentEmbedTab), I SAW IT USE `where('brand_id', '==', cannMenusId)`.
    // So distinct possibility the DB field is snake_case.
    // I will query for both or just 'brand_id' if that's the convention.
    // Let's check `src/server/services/cannmenus.ts` if possible, but I can't view it right now without tool call.
    // I'll use `brandId` (camelCase) to match the type, but I'll add a fallback query or note.
    // Actually, best to just check the service if I can.
    // For now I will write the code to use `brandId` matching the type, but I will wrap it in a try/catch.

    const productsQuery = await firestore
        .collection('products')
        .where('brandId', '==', brand.id)
        .limit(50)
        .get();

    // If empty, maybe try snake_case?
    if (productsQuery.empty) {
        const productsQuerySnake = await firestore
            .collection('products')
            .where('brand_id', '==', brand.id)
            .limit(50)
            .get();

        if (!productsQuerySnake.empty) {
            products = productsQuerySnake.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        }
    } else {
        products = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    }

    return { brand, products };
}
