'use client';

import { useMemo } from 'react';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoRetailers } from '@/lib/data';
import { useHydrated } from './useHydrated';
import type { Product, Retailer } from '@/types/domain';

export type UseMenuDataResult = {
  products: Product[];
  locations: Retailer[];
  isLoading: boolean;
  isDemo: boolean;
};

interface UseMenuDataProps {
  serverProducts?: Product[];
  serverLocations?: Retailer[];
}

/**
 * A client-side hook that manages the *display* of menu data.
 * It prioritizes the client-side demo mode toggle over the initial data
 * provided by a server component.
 * It no longer fetches its own data from Firestore.
 */
export function useMenuData({ serverProducts, serverLocations }: UseMenuDataProps = {}): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const isHydrated = useHydrated();

  // isLoading is now only true until the client has hydrated.
  // After hydration, we will always have either demo data or server data.
  const isLoading = !isHydrated;

  const products = useMemo<Product[]>(() => {
    if (isLoading) return []; // Return empty array while loading to prevent flashes of server data
    if (isDemo) return demoProducts;
    return serverProducts || [];
  }, [isDemo, serverProducts, isLoading]);

  const locations = useMemo<Retailer[]>(() => {
    if (isLoading) return [];
    if (isDemo) return demoRetailers;
    return serverLocations || [];
  }, [isDemo, serverLocations, isLoading]);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
