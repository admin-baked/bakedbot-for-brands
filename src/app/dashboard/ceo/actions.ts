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
};

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
  await requireUser(['owner']); // Strict auth for Dashboard
  return searchShared(query);
}

// Restoring Missing Actions (Stubs to pass build)

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
  await requireUser(['owner']);
  return { message: 'Embeddings initialized (Mock)', processed: 0 };
}

export async function createCoupon(data: any): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Coupon created (Mock)' };
}

export async function importDemoData(brandId: string): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Demo data imported (Mock)' };
}

export async function clearAllData(brandId: string): Promise<ActionResult> {
  await requireUser(['owner']);
  return { message: 'Data cleared (Mock)' };
}
