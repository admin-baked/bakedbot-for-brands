'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations).
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
    // While loading from Firestore and not yet hydrated on the client, show a loading state.
    if (isFirestoreLoading && !_hasHydrated) {
       return {
        products: [],
        locations: [],
        isLoading: true,
        error: null,
        isUsingDemoData: true, 
      };
    }
    
    // After hydration and loading, if firestoreProducts is null or empty, use demo data as a fallback.
    const useDemo = !_hasHydrated || !firestoreProducts || firestoreProducts.length === 0;

    if (useDemo) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false,
        error: null,
        isUsingDemoData: true,
      };
    }

    // Otherwise, we have live data from Firestore.
    return {
      products: firestoreProducts,
      locations: storeLocations,
      isLoading: false,
      error: error,
      isUsingDemoData: false,
    };
  }, [firestoreProducts, isFirestoreLoading, _hasHydrated, storeLocations, demoProducts, demoLocations, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
