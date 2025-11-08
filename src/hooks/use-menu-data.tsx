'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently switches between static demo data and live Firestore data.
 * If live data is empty or not available, it reliably falls back to demo data.
 * This ensures that both server and client renders are consistent, preventing hydration errors.
 */
export function useMenuData() {
  const { isUsingDemoData, _hasHydrated, locations: storeLocations } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));

  // Fetch both sets of data, but only one will be used.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();

  // Memoize the result to stabilize the array references
  const memoizedData = useMemo(() => {
    // Determine if we should use demo data.
    // Use demo data if the store flag is set, if the store hasn't hydrated yet,
    // or if there are no products in Firestore after loading.
    const useDemo = isUsingDemoData || !_hasHydrated || (!isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0));

    if (useDemo) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false, // Not loading when using static demo data
        error: null,
        isUsingDemoData: true,
      };
    }

    return {
      products: firestoreProducts,
      locations: storeLocations, // Use live locations from the store
      isLoading: isFirestoreLoading,
      error: error,
      isUsingDemoData: false,
    };
  }, [isUsingDemoData, _hasHydrated, firestoreProducts, storeLocations, demoProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
