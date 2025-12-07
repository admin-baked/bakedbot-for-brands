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

    return snapshot.docs.map(doc => ({
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

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Coupon[];
  } catch (error) {
    console.error('Error fetching coupons via admin:', error);
    return [];
  }
}

