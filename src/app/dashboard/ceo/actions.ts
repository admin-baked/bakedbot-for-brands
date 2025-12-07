'use server';

import { requireUser } from '@/server/auth/auth';
import { searchCannMenusRetailers as searchShared, CannMenusResult } from '@/server/actions/cannmenus';

export type { CannMenusResult };

export type ActionResult = {
  message: string;
  error?: boolean;
};

export type EmbeddingActionResult = ActionResult & {
  processed?: number;
  results?: { productId: string; status: string; }[]; // Updated to match component usage
};

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
  await requireUser(['owner']); // Strict auth for Dashboard
  return searchShared(query);
}

// Restoring Missing Actions (Stubs to pass build)

import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
  await requireUser(['owner']);

  const cookieStore = await cookies();
  const isMock = cookieStore.get('x-use-mock-data')?.value === 'true';

  if (isMock) {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      message: 'Successfully generated mock embeddings for demo products.',
      processed: 5,
      results: [
        { productId: 'mock_1', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_2', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_3', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_4', status: 'Embedding updated for model text-embedding-004.' },
        { productId: 'mock_5', status: 'Embedding updated for model text-embedding-004.' },
      ]
    };
  }

  try {
    // Live processing
    const { firestore } = await createServerClient();
    const productsSnap = await firestore.collection('products').limit(50).get(); // Safety limit
    const results = [];

    for (const doc of productsSnap.docs) {
      try {
        const res = await updateProductEmbeddings({ productId: doc.id });
        results.push({ productId: doc.id, status: res.status });
      } catch (e: any) {
        results.push({ productId: doc.id, status: `Failed: ${e.message}` });
      }
    }

    return {
      message: `Successfully processed ${results.length} products.`,
      processed: results.length,
      results
    };
  } catch (error: any) {
    return { message: `Initialization failed: ${error.message}`, error: true };
  }
}

export async function createCoupon(data: any): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Coupon created (Mock)' };
}

// Updated signatures to match useFormState
export async function importDemoData(prevState: ActionResult, formData?: FormData): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Demo data imported (Mock)' };
}

export async function clearAllData(prevState: ActionResult, formData?: FormData): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Data cleared (Mock)' };
}

import { getAdminFirestore } from '@/firebase/admin';
import type { Brand } from '@/types/domain';
import type { Coupon } from '@/firebase/converters';

export async function getBrands(): Promise<Brand[]> {
  try {
    // Note: getAdminFirestore() uses firebase-admin which bypasses security rules
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('brands').get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Brand[];
  } catch (error) {
    console.error('Error fetching brands via admin:', error);
    return [];
  }
}

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore.collection('coupons').get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as Coupon[];
  } catch (error) {
    console.error('Error fetching coupons via admin:', error);
    return [];
  }
}

// Analytics Types
export type PlatformAnalyticsData = {
  signups: { today: number; week: number; month: number; total: number; trend: number; trendUp: boolean; };
  activeUsers: { daily: number; weekly: number; monthly: number; trend: number; trendUp: boolean; };
  retention: { day1: number; day7: number; day30: number; trend: number; trendUp: boolean; };
  revenue: { mrr: number; arr: number; arpu: number; trend: number; trendUp: boolean; };
  featureAdoption: { name: string; usage: number; trend: number; status: 'healthy' | 'warning' | 'growing' | 'secondary' }[];
  recentSignups: { id: string; name: string; email: string; plan: string; date: string; role: string }[];
  agentUsage: { agent: string; calls: number; avgDuration: string; successRate: number; costToday: number }[];
};

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
  try {
    const firestore = getAdminFirestore();
    // Example: fetch real totals if they existed
    // const stats = await firestore.collection('system_stats').doc('current').get();

    // Returning empty/zero state for "Live" mode as requested to differentiate from Mock
    return {
      signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
      activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
      retention: { day1: 0, day7: 0, day30: 0, trend: 0, trendUp: true },
      revenue: { mrr: 0, arr: 0, arpu: 0, trend: 0, trendUp: true },
      featureAdoption: [],
      recentSignups: [],
      agentUsage: []
    };
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return {
      signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
      activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
      retention: { day1: 0, day7: 0, day30: 0, trend: 0, trendUp: true },
      revenue: { mrr: 0, arr: 0, arpu: 0, trend: 0, trendUp: true },
      featureAdoption: [],
      recentSignups: [],
      agentUsage: []
    };
  }
}

import type { EzalInsight, Competitor } from '@/types/ezal-scraper';

export async function getEzalInsights(tenantId: string, limitVal: number = 20): Promise<EzalInsight[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('ezal_insights')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(limitVal)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as EzalInsight[];
  } catch (error) {
    console.error('Error fetching ezal insights:', error);
    return [];
  }
}

export async function getEzalCompetitors(tenantId: string): Promise<Competitor[]> {
  try {
    const firestore = getAdminFirestore();
    const snapshot = await firestore
      .collection('competitors')
      .where('tenantId', '==', tenantId)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Competitor[];
  } catch (error) {
    console.error('Error fetching ezal competitors:', error);
    return [];
  }
}

export async function createEzalCompetitor(tenantId: string, data: any): Promise<ActionResult> {
  try {
    const firestore = getAdminFirestore();

    // Basic validation
    if (!data.name || !data.menuUrl) {
      return { message: 'Name and Menu URL are required', error: true };
    }

    // Creating competitor doc
    const newComp = {
      tenantId,
      name: data.name,
      menuUrl: data.menuUrl,
      type: data.type || 'dispensary',
      city: data.city || '',
      state: data.state || '',
      zip: data.zip || '',
      brandsFocus: [],
      active: true,
      primaryDomain: data.menuUrl, // simplified
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await firestore.collection('competitors').add(newComp);

    return { message: 'Competitor created successfully' };
  } catch (error: any) {
    console.error('Error creating competitor:', error);
    return { message: `Failed to create competitor: ${error.message}`, error: true };
  }
}


