import { initializeFirebase } from '@/firebase';
import { RetailerDoc, ProductDoc, CannMenusProduct } from '@/types/cannmenus';
import { v4 as uuidv4 } from 'uuid';

const CANNMENUS_BASE_URL = process.env.CANNMENUS_API_BASE || 'https://api.cannmenus.com';
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

export class CannMenusService {
    private db;

    constructor() {
        const { firestore } = initializeFirebase();
        this.db = firestore;
    }

    /**
     * Sync menus for a specific brand
     * 1. Find retailers carrying the brand (or just nearby retailers for now as a proxy)
     * 2. Fetch products for those retailers
     * 3. Update Firestore
     */
    async syncMenusForBrand(brandId: string, brandName: string) {
        console.log(`Starting menu sync for brand: ${brandName} (${brandId})`);

        // Step 1: Find retailers
        // In a real scenario, we might search for retailers carrying the brand specifically.
        // For now, we'll search for retailers in key markets or use a broad search if supported.
        // CannMenus /v2/retailers doesn't filter by brand directly, but /v2/products does.
        // So we might need to find products first to find retailers?
        // Actually, let's search for products by brand name to find which retailers carry them.

        const retailers = await this.findRetailersCarryingBrand(brandName);
        console.log(`Found ${retailers.length} retailers carrying ${brandName}`);

        // Step 2: Store retailers
        await this.storeRetailers(retailers);

        // Step 3: Fetch and store products for these retailers
        // We can do this in batches
        for (const retailer of retailers) {
            await this.syncRetailerMenu(retailer.id, brandName);
        }

        return {
            retailersCount: retailers.length,
            timestamp: new Date().toISOString()
        };
    }

    private async findRetailersCarryingBrand(brandName: string): Promise<RetailerDoc[]> {
        if (!CANNMENUS_API_KEY) {
            console.error('CANNMENUS_API_KEY is not set');
            return [];
        }

        try {
            // Search for products by brand to identify retailers
            const params = new URLSearchParams({
                brand_name: brandName,
                limit: '50' // Adjust limit as needed
            });

            const response = await fetch(`${CANNMENUS_BASE_URL}/v2/products?${params}`, {
                headers: {
                    'Authorization': `Bearer ${CANNMENUS_API_KEY}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`CannMenus API error: ${response.statusText}`);
            }

            const data = await response.json();
            const retailersMap = new Map<string, RetailerDoc>();

            if (data.data?.data) {
                data.data.data.forEach((item: any) => {
                    // Item is a retailer object with a products array
                    if (!retailersMap.has(item.retailer_id)) {
                        retailersMap.set(item.retailer_id, {
                            id: item.retailer_id.toString(),
                            name: item.name,
                            state: item.state,
                            city: item.city,
                            postal_code: item.postal_code || '',
                            country: 'US', // Assumption
                            street_address: item.address || '',
                            homepage_url: item.homepage_url,
                            menu_url: item.menu_url,
                            menu_discovery_status: 'found',
                            geo: {
                                lat: item.latitude,
                                lng: item.longitude
                            },
                            phone: item.phone,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                });
            }

            return Array.from(retailersMap.values());
        } catch (error) {
            console.error('Error finding retailers:', error);
            return [];
        }
    }

    private async storeRetailers(retailers: RetailerDoc[]) {
        const batch = this.db.batch();
        let count = 0;

        for (const retailer of retailers) {
            const ref = this.db.collection('retailers').doc(retailer.id);
            batch.set(ref, retailer, { merge: true });
            count++;

            if (count >= 400) { // Firestore batch limit is 500
                await batch.commit();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }
    }

    private async syncRetailerMenu(retailerId: string, brandName: string) {
        try {
            const params = new URLSearchParams({
                retailers: retailerId,
                brand_name: brandName
            });

            const response = await fetch(`${CANNMENUS_BASE_URL}/v2/products?${params}`, {
                headers: {
                    'Authorization': `Bearer ${CANNMENUS_API_KEY}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const products: ProductDoc[] = [];

            if (data.data?.data) {
                data.data.data.forEach((item: any) => {
                    if (item.products && Array.isArray(item.products)) {
                        item.products.forEach((p: CannMenusProduct) => {
                            products.push({
                                id: uuidv4(), // Generate internal ID
                                brand_id: p.brand_id.toString(),
                                sku_id: p.cann_sku_id,
                                canonical_name: p.product_name,
                                name: p.product_name,
                                category: p.category,
                                imageUrl: p.image_url,
                                price: p.latest_price,
                                thcPercent: p.percentage_thc,
                                cbdPercent: p.percentage_cbd,
                                retailerIds: [retailerId],
                                createdAt: new Date()
                            });
                        });
                    }
                });
            }

            await this.storeProducts(products);

        } catch (error) {
            console.error(`Error syncing menu for retailer ${retailerId}:`, error);
        }
    }

    private async storeProducts(products: ProductDoc[]) {
        const batch = this.db.batch();
        let count = 0;

        for (const product of products) {
            // Use sku_id as document ID if unique enough, or a composite key
            // For now, let's use a composite key of sku_id + brand_id to avoid collisions if sku_ids aren't global
            // Actually, let's query if product exists to merge retailerIds

            // Simplified: just overwrite for now, but in reality we'd want to merge retailerIds
            // To keep it simple for Sprint 4, we'll just store them.
            // Using a deterministic ID based on SKU would be better.
            const docId = `${product.brand_id}_${product.sku_id}`;
            const ref = this.db.collection('products').doc(docId);

            // We need to handle retailerIds merging carefully in a real app
            // For now, we'll just set it.
            batch.set(ref, {
                ...product,
                id: docId,
                updatedAt: new Date()
            }, { merge: true });

            count++;
            if (count >= 400) {
                await batch.commit();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }
    }
}
