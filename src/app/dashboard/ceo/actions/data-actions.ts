'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';
import { searchCannMenusRetailers as searchShared, CannMenusResult } from '@/server/actions/cannmenus';
import { CANNMENUS_CONFIG } from '@/lib/config';
import { ActionResult, EmbeddingActionResult, PlatformAnalyticsData } from './types';
import { formatDistanceToNow } from 'date-fns';
import type { Brand } from '@/types/domain';

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
    try {
        await requireUser(['super_user']);
        const { auth } = await createServerClient();

        const usersList = await auth.listUsers(50);
        const recentSignups = usersList.users.slice(0, 10).map(u => ({
            id: u.uid,
            name: u.displayName || 'Unknown',
            email: u.email || 'N/A',
            plan: 'Standard',
            date: u.metadata.creationTime ? formatDistanceToNow(new Date(u.metadata.creationTime), { addSuffix: true }) : 'N/A',
            role: 'user'
        }));

        return {
            signups: { today: 0, week: 0, month: 0, total: usersList.users.length, trend: 0, trendUp: true },
            activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
            retention: { day1: null, day7: null, day30: null, trend: null, trendUp: null },
            revenue: { mrr: 0, arr: 0, arpu: 0, trend: null, trendUp: null },
            featureAdoption: [],
            recentSignups,
            agentUsage: []
        };
    } catch (error) {
        console.error('Error fetching platform analytics:', error);
        return {
            signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
            activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
            retention: { day1: null, day7: null, day30: null, trend: null, trendUp: null },
            revenue: { mrr: 0, arr: 0, arpu: 0, trend: null, trendUp: null },
            featureAdoption: [],
            recentSignups: [],
            agentUsage: []
        };
    }
}

export async function getBrands(): Promise<Brand[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('brands').get();
        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            logoUrl: doc.data().logoUrl || null,
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        })) as Brand[];
    } catch (error) { return []; }
}

export async function getDispensaries(): Promise<{ id: string; name: string }[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('organizations').where('type', '==', 'dispensary').get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, name: doc.data().name || 'Unknown' }));
    } catch (error) { return []; }
}

export async function createDispensaryAction(data: { name: string; address: string; city: string; state: string; zip: string; }): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const orgId = `disp_${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        await firestore.collection('organizations').doc(orgId).set({ ...data, id: orgId, type: 'dispensary', updatedAt: new Date() });
        return { message: 'Dispensary created' };
    } catch (error: any) { return { message: error.message, error: true }; }
}

export async function getOrders() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

export async function importStripePayments(): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        return { message: 'Stripe payments imported successfully (mock)' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function searchBrandsAction(query: string): Promise<{ id: string; name: string; }[]> {
    if (!query || query.length < 2) return [];
    const base = CANNMENUS_CONFIG?.API_BASE;
    const apiKey = CANNMENUS_CONFIG?.API_KEY;
    if (!base || !apiKey) return [];
    try {
        const res = await fetch(`${base}/v1/brands?name=${encodeURIComponent(query)}`, {
            headers: { "X-Token": apiKey }
        });
        const data = await res.json();
        return data.data?.map((b: any) => ({ id: String(b.id), name: b.brand_name })) || [];
    } catch (error) { return []; }
}

export async function importDemoData(prevState?: ActionResult, formData?: FormData): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const { importDemoData: importInternal } = await import('@/server/demo/import-data');
        await importInternal();
        return { message: 'Demo data imported successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function clearAllData(prevState?: ActionResult, formData?: FormData): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const batchSize = 100;
        const collections = ['products', 'dispensaries', 'orders'];
        for (const coll of collections) {
            const snapshot = await firestore.collection(coll).limit(batchSize).get();
            const batch = firestore.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return { message: 'Data cleared successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function getPlatformSummary() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const [products, dispensaries, orders, users] = await Promise.all([
            firestore.collection('products').count().get(),
            firestore.collection('dispensaries').count().get(),
            firestore.collection('orders').count().get(),
            firestore.collection('users').count().get(),
        ]);
        return {
            totalProducts: products.data().count,
            totalDispensaries: dispensaries.data().count,
            totalOrders: orders.data().count,
            totalUsers: users.data().count,
        };
    } catch (error) {
        console.error('Error fetching platform summary:', error);
        return { totalProducts: 0, totalDispensaries: 0, totalOrders: 0, totalUsers: 0 };
    }
}

export async function getRevenueAnalytics() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
        const orders = snapshot.docs.map(doc => doc.data());
        const totalRevenue = orders.reduce((acc: number, order: any) => acc + (order.total || 0), 0);
        return { totalRevenue, orderCount: orders.length };
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        return { totalRevenue: 0, orderCount: 0 };
    }
}

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
    try {
        await requireUser();
        return await searchShared(query);
    } catch (error) {
        console.error('Error searching retailers:', error);
        return [];
    }
}

export async function getLivePreviewProducts(cannMenusId: string) {
    try {
        const { getProducts } = await import('@/lib/cannmenus-api');
        const products = await getProducts(cannMenusId);
        return products.slice(0, 5).map((p: any) => ({
            id: p.id || p.cann_sku_id,
            name: p.name || p.product_name,
            price: p.price || p.latest_price,
            category: p.category,
            image: p.image || p.image_url
        }));
    } catch (error) {
        console.error('Error fetching preview products:', error);
        return [];
    }
}
