'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useMemo } from 'react';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations) from Firestore.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();

  // Memoize the result to stabilize the array references
  const memoizedData = useMemo(() => {
    return {
      products: firestoreProducts,
      locations: storeLocations as Location[],
      isLoading: isFirestoreLoading || !_hasHydrated,
      error: error,
      isUsingDemoData: false, // Always false now
    };
  }, [_hasHydrated, firestoreProducts, storeLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
