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
    // While loading, we can't make a decision, so we show a loading state.
    // The UI will handle this with skeletons.
    if (isFirestoreLoading && !_hasHydrated) {
       return {
        products: [],
        locations: [],
        isLoading: true,
        error: null,
        isUsingDemoData: true, // Assume demo until we know otherwise
      };
    }
    
    // After loading, if firestoreProducts is null or empty, we use demo data.
    const useDemo = !firestoreProducts || firestoreProducts.length === 0;

    if (useDemo) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false,
        error: null,
        isUsingDemoData: true,
      };
    }

    // Otherwise, we use live data.
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
