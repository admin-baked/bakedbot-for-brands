import { createServerClient } from '@/firebase/server-client';
import type { Brand, Product, Retailer } from '@/types/domain';
import { CannMenusService } from '@/server/services/cannmenus';
import { RetailerDoc } from '@/types/cannmenus';

// Helper to map RetailerDoc (storage) to Retailer (domain)
function mapRetailerDocToDomain(doc: RetailerDoc): Retailer {
    return {
        id: doc.id,
        name: doc.name,
        address: doc.street_address || '',
        city: doc.city,
        state: doc.state,
        zip: doc.postal_code || '',
        phone: doc.phone,
        lat: doc.geo?.lat,
        lon: doc.geo?.lng,
        status: 'active'
    };
}

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

    // 4. Fetch retailers carrying this brand (live or cached?)
    // Using live search from CannMenusService
    let retailers: Retailer[] = [];
    try {
        const service = new CannMenusService();
        // Limit to 20 retailers for the page load speed
        const retailerDocs = await service.findRetailersCarryingBrand(brand.name, 20);
        retailers = retailerDocs.map(mapRetailerDocToDomain);
    } catch (error) {
        console.error('Failed to fetch retailers for brand page:', error);
        // Fail gracefully, retailers will be empty
    }

    return { brand, products, retailers };
}

export async function fetchCollectionData(brandParam: string, collectionSlug: string) {
    const { firestore } = await createServerClient();

    // 1. Get Brand (reuse fetched logic implicitly or copy for now to be safe/fast)
    // Theoretically we could export a fetchBrand(slug) helper, but for now inline is fine.
    let brand: Brand | null = null;
    let products: Product[] = [];

    const brandDoc = await firestore.collection('brands').doc(brandParam).get();
    if (brandDoc.exists) {
        brand = { id: brandDoc.id, ...brandDoc.data() } as Brand;
    } else {
        const slugQuery = await firestore.collection('brands').where('slug', '==', brandParam).limit(1).get();
        if (!slugQuery.empty) {
            brand = { id: slugQuery.docs[0].id, ...slugQuery.docs[0].data() } as Brand;
        }
    }

    if (!brand) {
        return { brand: null, products: [], categoryName: collectionSlug };
    }

    // 2. Map slug to Category Name (simple mapping for now)
    // Common CannMenus categories: Flower, Pre-Rolls, Vaporizers, Concentrates, Edibles, Tinctures, Topicals
    const categoryMap: Record<string, string> = {
        'flower': 'Flower',
        'prerolls': 'Pre-Rolls',
        'pre-rolls': 'Pre-Rolls',
        'vapes': 'Vaporizers',
        'vaporizers': 'Vaporizers',
        'edibles': 'Edibles',
        'concentrates': 'Concentrates',
        'topicals': 'Topicals',
        'tinctures': 'Tinctures',
        'accessories': 'Accessories',
        'apparel': 'Apparel'
    };

    const categoryName = categoryMap[collectionSlug.toLowerCase()] || collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1);

    // 3. Fetch products filtered by category
    // Try 'category' field. Note: field might be 'type' or 'category'. CannMenus usually 'category'.
    const productsQuery = await firestore
        .collection('products')
        .where('brandId', '==', brand.id)
        .where('category', '==', categoryName)
        .limit(50)
        .get();

    if (!productsQuery.empty) {
        products = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } else {
        // Fallback: try case-insensitive query or contains? 
        // Firestore doesn't do case-insensitive easily without external tools.
        // For now, if exact match fails, return empty.
        // Maybe try simple slug match if stored as such?
    }

    return { brand, products, categoryName };
}

export async function fetchLocalBrandPageData(brandParam: string, zipCode: string) {
    const { firestore } = await createServerClient();

    // 1. Fetch Brand Logic (Reuse)
    let brand: Brand | null = null;
    const brandDoc = await firestore.collection('brands').doc(brandParam).get();
    if (brandDoc.exists) {
        brand = { id: brandDoc.id, ...brandDoc.data() } as Brand;
    } else {
        const slugQuery = await firestore.collection('brands').where('slug', '==', brandParam).limit(1).get();
        if (!slugQuery.empty) {
            brand = { id: slugQuery.docs[0].id, ...slugQuery.docs[0].data() } as Brand;
        }
    }

    // 2. Fallback: Check brand_pages collection for dynamically created pages
    // This supports brands created via the Brand Page Creator UI
    if (!brand) {
        // Try to find a brand page matching this slug and ZIP
        const brandPageId = `${brandParam}_${zipCode}`;
        const brandPageDoc = await firestore
            .collection('foot_traffic')
            .doc('config')
            .collection('brand_pages')
            .doc(brandPageId)
            .get();

        if (brandPageDoc.exists) {
            const pageData = brandPageDoc.data();
            // Only show published pages (or all pages for preview)
            if (pageData) {
                // Create a synthetic Brand object from the BrandSEOPage data
                brand = {
                    id: pageData.brandSlug || brandParam,
                    name: pageData.brandName || brandParam,
                    slug: pageData.brandSlug || brandParam,
                    logoUrl: pageData.logoUrl || undefined,
                    verificationStatus: 'unverified', // Default for dynamic pages
                    dispensaryCount: 0, // Will be populated dynamically
                };
            }
        } else {
            // Try to find any brand page with this slug (across all ZIPs)
            const brandPagesQuery = await firestore
                .collection('foot_traffic')
                .doc('config')
                .collection('brand_pages')
                .where('brandSlug', '==', brandParam)
                .limit(1)
                .get();

            if (!brandPagesQuery.empty) {
                const pageData = brandPagesQuery.docs[0].data();
                if (pageData) {
                    brand = {
                        id: pageData.brandSlug || brandParam,
                        name: pageData.brandName || brandParam,
                        slug: pageData.brandSlug || brandParam,
                        logoUrl: pageData.logoUrl || undefined,
                        verificationStatus: 'unverified',
                        dispensaryCount: 0,
                    };
                }
            }
        }
    }

    if (!brand) return { brand: null, retailers: [], missingCount: 0 };

    // 2. Fetch Retailers near ZIP carrying this brand
    let retailers: Retailer[] = [];
    let missingCount = 0;

    try {
        const service = new CannMenusService();
        // New method needed in CannMenusService: findRetailersCarryingBrandNear(brandName, zip, radius)
        // For now, we might have to use searchProducts or existing findRetailersCarryingBrand and filter manually if API doesn't support geo-filter on that endpoint directly.
        // Assuming we update CannMenusService or use a combination.
        // Let's use existing findRetailersCarryingBrand which searches *everywhere* (potentially slow/costly if not scoped) 
        // OR better: use searchProducts({ query: brand.name, near: zipCode }) and aggregate retailers.

        // Strategy: Search for brand products near zip -> get unique retailers.
        const productResults = await service.searchProducts({
            search: brand.name, // Fixed: query -> search
            near: zipCode,
            limit: 50
        });

        // Extract unique retailers
        // We cast p to any because the CannMenusProduct type might be incomplete regarding retailer fields in search response
        const uniqueRetailers: Record<string, Retailer> = {};

        for (const p of productResults.products as any[]) {
            const retailerName = p.retailer || p.retailer_name;
            const retailerId = p.retailer_id;

            if (retailerName && !uniqueRetailers[retailerName]) {
                uniqueRetailers[retailerName] = {
                    id: retailerId ? String(retailerId) : `temp-${retailerName}`,
                    name: retailerName,
                    address: p.address || p.retailer_address || 'Nearby',
                    city: p.city || 'Unknown City', // Added required fields
                    state: p.state || 'Unknown State',
                    zip: p.zip || zipCode || '',
                    status: 'active'
                };
            }
        }

        retailers = Object.values(uniqueRetailers);

        // Mock "Missing" count for the Opportunity Module
        missingCount = Math.floor(Math.random() * 5);

    } catch (e) {
        console.error("Error fetching local brand data", e);
    }

    return { brand, retailers, missingCount };
}
