'use server';

/**
 * LeafLink Tool
 * 
 * Allows agents to interact with LeafLink (Orders, Products, Inventory).
 * Uses User-Scoped Authentication via `requireUser`.
 * 
 * Note: LeafLink API v2
 */

import { requireUser } from '@/server/auth/auth';
import { getLeafLinkKey } from '@/server/integrations/leaflink/token-storage';

export type LeafLinkAction = 'list_orders' | 'list_products' | 'update_inventory';

export interface LeafLinkParams {
    action: LeafLinkAction;
    status?: string;     // For 'list_orders' (e.g., "Accepted")
    limit?: number;      // Max results
    productId?: string;  // For 'update_inventory'
    quantity?: number;   // For 'update_inventory'
}

export interface LeafLinkResult {
    success: boolean;
    data?: any;
    error?: string;
}

const LEAFLINK_API_BASE = 'https://www.leaflink.com/api/v2';

import { DecodedIdToken } from 'firebase-admin/auth';

export async function leaflinkAction(params: LeafLinkParams, injectedUser?: DecodedIdToken): Promise<LeafLinkResult> {
    try {
        // 1. Authenticate User
        const user = injectedUser || await requireUser();

        // 2. Get User-Specific Key
        const apiKey = await getLeafLinkKey(user.uid);

        if (!apiKey) {
            return {
                success: false,
                error: 'LeafLink is not connected. Please connect your account in Settings > Integrations.'
            };
        }

        const headers = {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
        };

        switch (params.action) {
            case 'list_orders':
                // Endpoint: /orders-received/
                const statusQuery = params.status ? `&status=${params.status}` : '';
                const limit = params.limit || 5;
                const ordersUrl = `${LEAFLINK_API_BASE}/orders-received/?limit=${limit}${statusQuery}`;

                const ordersRes = await fetch(ordersUrl, { headers });

                if (!ordersRes.ok) throw new Error(`LeafLink API error: ${ordersRes.statusText}`);
                const ordersData = await ordersRes.json();

                // Map to simpler format
                const orders = (ordersData.results || []).map((o: any) => ({
                    id: o.number,
                    customer: o.customer?.name,
                    status: o.status,
                    total: o.total,
                    date: o.created_on
                }));

                return { success: true, data: orders };

            case 'list_products':
                // Endpoint: /products/
                const prodLimit = params.limit || 5;
                const prodUrl = `${LEAFLINK_API_BASE}/products/?limit=${prodLimit}`;

                const prodRes = await fetch(prodUrl, { headers });

                if (!prodRes.ok) throw new Error(`LeafLink API error: ${prodRes.statusText}`);
                const prodData = await prodRes.json();

                const products = (prodData.results || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    brand: p.brand?.name,
                    sku: p.sku,
                    inventory: p.inventory_quantity
                }));

                return { success: true, data: products };

            case 'update_inventory':
                if (!params.productId || params.quantity === undefined) {
                    return { success: false, error: 'Missing productId or quantity' };
                }

                // Endpoint: /products/{id}/ (PATCH)
                const updateUrl = `${LEAFLINK_API_BASE}/products/${params.productId}/`;

                const updateRes = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        inventory_quantity: params.quantity
                    })
                });

                if (!updateRes.ok) throw new Error(`LeafLink API error: ${updateRes.statusText}`);
                const updateData = await updateRes.json();

                return { success: true, data: { id: updateData.id, new_inventory: updateData.inventory_quantity } };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[leaflinkAction] Error:', error);
        return { success: false, error: error.message };
    }
}
