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
    // Determine if we should use demo data as a fallback.
    // Use it if the store isn't hydrated yet, or if there are no products in Firestore.
    const shouldUseDemoFallback = !_hasHydrated || !firestoreProducts || firestoreProducts.length === 0;

    if (shouldUseDemoFallback) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false,
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
  }, [_hasHydrated, firestoreProducts, storeLocations, demoProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
