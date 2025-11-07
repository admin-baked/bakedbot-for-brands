'use client';

import { products as demoProducts, demoLocations } from '@/lib/data';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A simple hook to return static demo data.
 * This is useful for development and for providing a fallback
 * when live data is not available.
 */
export function useDemoData() {
  const products: Product[] = demoProducts;
  const locations: Location[] = demoLocations;

  return { products, locations };
}
