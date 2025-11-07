'use client';

import { products as demoProducts } from '@/lib/data';
import { demoLocations } from '@/lib/data';

/**
 * A simple hook to return static demo data.
 * This ensures that components using this hook are consistent
 * between server and client renders, preventing hydration errors.
 */
export function useDemoData() {
  return {
    products: demoProducts,
    locations: demoLocations,
  };
}
