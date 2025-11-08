'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useMemo } from 'react';
import type { Product } from '@/lib/types';
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

  const memoizedData = useMemo(() => {
    // While loading from Firestore and not yet hydrated on the client, show a loading state.
    if (isFirestoreLoading && !_hasHydrated) {
       return {
        products: null,
        locations: [],
        isLoading: true,
        error: null,
      };
    }

    return {
      products: firestoreProducts,
      locations: storeLocations,
      isLoading: isFirestoreLoading,
      error: error,
    };
  }, [firestoreProducts, isFirestoreLoading, _hasHydrated, storeLocations, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
