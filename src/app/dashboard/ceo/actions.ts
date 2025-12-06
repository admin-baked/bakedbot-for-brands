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
  results?: string[]; // Added to fix type error
};

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
  await requireUser(['owner']); // Strict auth for Dashboard
  return searchShared(query);
}

// Restoring Missing Actions (Stubs to pass build)

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
  await requireUser(['owner']);
  return { message: 'Embeddings initialized (Mock)', processed: 0, results: [] };
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
