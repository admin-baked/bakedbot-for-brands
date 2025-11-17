
'use client';

import { useMemo } from 'react';
import { demoProducts, demoRetailers } from '@/lib/data';
import type { Product, Retailer } from '@/types/domain';

/**
 * Hook that provides static demo data for products and locations.
 * This is used as a fallback when Firestore is unavailable or empty.
 */
export function useDemoData() {
  const data = useMemo(() => {
    return {
      products: demoProducts as Product[],
      locations: demoRetailers as Retailer[],
    };
  }, []);

  return data;
}
