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
 * It will fall back to demo data if the store is not hydrated or if there are no live products.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();

  const memoizedData = useMemo(() => {
    // Before hydration, always use demo data for consistency between server and client.
    if (!_hasHydrated) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false, // Not loading, as it's static data
        error: null,
        isUsingDemoData: true,
      };
    }

    // After hydration, check if Firestore has products.
    // If Firestore is loading, or if it has finished loading and there are no products, use demo data.
    const shouldUseDemoFallback = isFirestoreLoading || (firestoreProducts && firestoreProducts.length === 0);

    if (shouldUseDemoFallback) {
       return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: isFirestoreLoading, // Reflect that it might still be loading in the background
        error: null,
        isUsingDemoData: true,
      };
    }

    // Only use live data if hydration is complete and Firestore has products.
    return {
      products: firestoreProducts,
      locations: storeLocations, // Use live locations from the store
      isLoading: false, // It's not loading anymore if we have products
      error: error,
      isUsingDemoData: false,
    };
  }, [_hasHydrated, firestoreProducts, isFirestoreLoading, storeLocations, demoProducts, demoLocations, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
