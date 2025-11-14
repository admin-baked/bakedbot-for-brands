'use client';

import { useMemo } from 'react';
import { demoProducts, demoLocations } from '@/lib/data';
import type { Product, Location } from '@/firebase/converters';

/**
 * Hook that provides static demo data for products and locations.
 * This is used as a fallback when Firestore is unavailable or empty.
 */
export function useDemoData() {
  const data = useMemo(() => {
    return {
      products: demoProducts as Product[],
      locations: demoLocations as Location[],
    };
  }, []);

  return data;
}
