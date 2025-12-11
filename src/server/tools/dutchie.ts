'use server';

/**
 * Dutchie Tool
 * 
 * Allows agents to interact with Dutchie Ecommerce (Menu, Orders).
 * Requires an API key stored in Firestore at `integrations/dutchie`.
 * 
 * Note: Dutchie Plus / Ecommerce API
 */

import { getAdminFirestore } from '@/firebase/admin';

export type DutchieAction = 'list_menu' | 'list_orders';

export interface DutchieParams {
    action: DutchieAction;
    limit?: number;      // Max results
    search?: string;     // Generic search
}

export interface DutchieResult {
    success: boolean;
    data?: any;
    error?: string;
}

const DUTCHIE_API_BASE = 'https://plus.dutchie.com/api/v1'; // Generic placeholder for Plus API

async function getApiKey(): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('integrations').doc('dutchie').get();
        return doc.data()?.apiKey || null;
    } catch (e) {
        console.error('Failed to fetch Dutchie key', e);
        return null;
    }
}

export async function dutchieAction(params: DutchieParams): Promise<DutchieResult> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        return {
            success: false,
            error: 'Authentication required. Please connect Dutchie in Integrations.'
        };
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    try {
        switch (params.action) {
            case 'list_menu':
                // Endpoint: /products (Hypothetical standard endpoint for Plus)
                const limit = params.limit || 5;
                const searchQ = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
                const menuUrl = `${DUTCHIE_API_BASE}/products?limit=${limit}${searchQ}`;

                const menuRes = await fetch(menuUrl, { headers });

                if (!menuRes.ok) throw new Error(`Dutchie API error: ${menuRes.statusText}`);
                const menuData = await menuRes.json();

                const items = (menuData.data || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    brand: p.brand?.name,
                    price: p.price,
                    stock: p.quantity_available
                }));

                return { success: true, data: items };

            case 'list_orders':
                // Endpoint: /orders
                const orderLimit = params.limit || 5;
                const ordersUrl = `${DUTCHIE_API_BASE}/orders?limit=${orderLimit}`;

                const ordersRes = await fetch(ordersUrl, { headers });

                if (!ordersRes.ok) throw new Error(`Dutchie API error: ${ordersRes.statusText}`);
                const ordersData = await ordersRes.json();

                const orders = (ordersData.data || []).map((o: any) => ({
                    id: o.orderNumber || o.id,
                    customer: `${o.customer?.firstName} ${o.customer?.lastName}`,
                    total: o.orderTotal,
                    status: o.status,
                    created: o.createdAt
                }));

                return { success: true, data: orders };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[dutchieAction] Error:', error);
        return { success: false, error: error.message };
    }
}
