'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently switches between static demo data and live Firestore data
 * based on the global `isUsingDemoData` state.
 * This ensures that both server and client renders are consistent, preventing
 * hydration errors.
 */
export function useMenuData() {
  const { isUsingDemoData, _hasHydrated } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
  }));

  // Fetch both sets of data, but only one will be used.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();

  // Memoize the result to stabilize the array references
  const memoizedData = useMemo(() => {
    if (isUsingDemoData) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false,
        error: null,
      };
    }

    return {
      products: firestoreProducts,
      locations: demoLocations, // In a real app, this would be live data
      isLoading: isFirestoreLoading,
      error: error,
    };
  }, [isUsingDemoData, firestoreProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
