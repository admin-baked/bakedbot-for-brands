import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';
import { Product } from '@/types/domain';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const retailerId = searchParams.get('retailerId');

    if (!productId || !retailerId) {
        return NextResponse.json({ error: 'Missing productId or retailerId' }, { status: 400 });
    }

    try {
        const { firestore } = await createServerClient();

        // 1. Get Product from Firestore
        const productDoc = await firestore.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const product = { id: productDoc.id, ...productDoc.data() } as Product;

        // 2. Search CannMenus for this product at this retailer
        const service = new CannMenusService();
        const { products: liveProducts } = await service.searchProducts({
            retailers: retailerId,
            search: product.name, // Search by name
            limit: 10
        });

        // 3. Match logic
        // We look for a product that matches our SKU (if we have it) or name closely
        // Note: product.sku_id refers to CannMenus SKU usually
        // @ts-ignore - access raw data field if property missing on type, but typical Product has generic fields
        const targetSku = product.sku_id || ''; // Accessing raw field if not in domain type

        const match = liveProducts.find(p => {
            // Exact SKU match if available
            if (targetSku && p.cann_sku_id === targetSku) return true;
            // Name match (generous)
            return p.product_name.toLowerCase() === product.name.toLowerCase();
        });

        // 4. Update Firestore & Return Result
        if (match) {
            // In Stock!
            // Update price if different
            const newPrice = match.latest_price;

            // We want to update the retailer-specific price in the 'prices' map
            // products/{id} -> prices: { [retailerId]: price }

            const updates: any = {
                updatedAt: new Date()
            };

            // If we have a prices map, update it
            // Note: Domain type `Product` has `prices?: Record<string, number>`
            const prices = product.prices || {};
            if (prices[retailerId] !== newPrice) {
                updates[`prices.${retailerId}`] = newPrice;
            }

            // Ensure retailerId is in the list
            if (!product.retailerIds?.includes(retailerId)) {
                updates.retailerIds = [...(product.retailerIds || []), retailerId];
            }

            await firestore.collection('products').doc(productId).update(updates);

            return NextResponse.json({
                available: true,
                price: newPrice,
                lastUpdated: new Date()
            });

        } else {
            // Out of Stock (or at least not visible via search)
            // Remove from this retailer if present
            if (product.retailerIds?.includes(retailerId)) {
                const newRetailerIds = product.retailerIds.filter(id => id !== retailerId);
                const updates: any = {
                    retailerIds: newRetailerIds, // This effectively marks it OOS for this retailer
                    updatedAt: new Date()
                };

                // Remove price for this retailer? Or keep historical? 
                // Better to keep price but maybe we need an 'availability' map?
                // For now, removing from retailerIds makes it disappear from 'Where to Buy'

                await firestore.collection('products').doc(productId).update(updates);
            }

            return NextResponse.json({
                available: false,
                reason: 'Product not found in live inventory search'
            });
        }

    } catch (error: any) {
        console.error('Inventory check failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
