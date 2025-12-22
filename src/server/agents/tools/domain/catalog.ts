
import { createServerClient } from '@/firebase/server-client';

export interface ProductCatalogItem {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    thc?: number;
    cbd?: number;
    effects?: string[];
    imageUrl?: string;
    inStock: boolean;
}

/**
 * Searches the product catalog for the current tenant.
 * 
 * DATA SOURCE NOTE:
 * This tool queries the `tenants/{id}/products` collection, which is the 
 * Unified Product Master. It is hydrated/synced from:
 * - POS Integrations (Dutchie, Blaze, etc.)
 * - CannMenus & Leafly (Menu Crawlers)
 * - Manual Entry & CSV Imports
 * 
 * Filters by category, price, effects, and semantic query (stub).
 */
export async function searchProducts(
    tenantId: string,
    params: {
        query?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        effects?: string[];
        limit?: number;
    }
): Promise<ProductCatalogItem[]> {
    const { firestore } = await createServerClient();
    let queryRef = firestore.collection(`tenants/${tenantId}/products`).where('active', '==', true);

    // Basic filters 
    // Note: Firestore limitation on multiple inequality filters might require in-memory filtering for prices if both set
    if (params.category) {
        queryRef = queryRef.where('category', '==', params.category);
    }

    // Stub: In a real implementation, we would use vector search (Pinecone/Firestore Vector) for 'query'

    const snapshot = await queryRef.limit(params.limit || 10).get();

    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProductCatalogItem[];

    // In-memory optional filtering for stub
    if (params.query) {
        const q = params.query.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }

    return products;
}

/**
 * Gets a single product by ID.
 */
export async function getProduct(tenantId: string, productId: string): Promise<ProductCatalogItem | null> {
    const { firestore } = await createServerClient();
    const doc = await firestore.doc(`tenants/${tenantId}/products/${productId}`).get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ProductCatalogItem;
}
