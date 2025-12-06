'use server';

import { requireUser } from '@/server/auth/auth';

export type CannMenusResult = {
  name: string;
  id: string; // CannMenus ID (e.g. cm_123)
  type: 'dispensary' | 'brand';
};

// Mock Database of CannMenus customers for Autocomplete
const MOCK_RETAILERS: CannMenusResult[] = [
  { name: 'Green Valley Dispensary', id: 'cm_gv_101', type: 'dispensary' },
  { name: 'Higher Ground', id: 'cm_hg_202', type: 'dispensary' },
  { name: 'Blue Dream Collective', id: 'cm_bd_303', type: 'dispensary' },
  { name: 'Urban Leaf', id: 'cm_ul_404', type: 'dispensary' },
  { name: 'Cookies Los Angeles', id: 'cm_cookies_la', type: 'dispensary' },
  { name: 'Stiiizy DTLA', id: 'cm_stiiizy_dtla', type: 'brand' },
  { name: 'Wyld Edibles', id: 'cm_wyld_global', type: 'brand' },
  { name: 'Kiva Confections', id: 'cm_kiva_global', type: 'brand' },
  { name: 'Raw Garden', id: 'cm_raw_garden', type: 'brand' },
  { name: 'Jeeter', id: 'cm_jeeter', type: 'brand' },
];

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
  await requireUser(['owner']); // Super Admin only

  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return MOCK_RETAILERS.filter(r =>
    r.name.toLowerCase().includes(lowerQuery) ||
    r.id.toLowerCase().includes(lowerQuery)
  ).slice(0, 10); // Limit results
}
