
'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useMemo, useEffect } from 'react';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently switches between static demo data and live Firestore data.
 * If live data is empty or not available, it reliably falls back to demo data.
 * This ensures that both server and client renders are consistent, preventing hydration errors.
 */
export function useMenuData() {
  const { isUsingDemoData, _hasHydrated } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
  }));

  // Fetch both sets of data, but only one will be used based on conditions.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  // Memoize the result to stabilize the array references and prevent unnecessary re-renders.
  const memoizedData = useMemo(() => {
    // Determine if we should use demo data.
    // Use demo data if the store flag is set OR if the store hasn't hydrated yet.
    // This provides a stable SSR output and prevents flicker on initial client load.
    const useDemo = isUsingDemoData || !_hasHydrated;

    if (useDemo) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false, // Not loading when using static demo data
        error: null,
        isUsingDemoData: true,
      };
    }

    // Once hydrated and if not using demo data, switch to live data.
    // Fallback to demo data if live data is empty AFTER loading has completed.
    const finalProducts = !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0) ? demoProducts : firestoreProducts;
    
    // For locations, we now rely on the persistent store, but the demoLocations serve as a fallback if the store is empty.
    const finalLocations = demoLocations;

    return {
      products: finalProducts,
      locations: finalLocations,
      isLoading: isFirestoreLoading,
      error: error,
      isUsingDemoData: !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0),
    };
  }, [isUsingDemoData, _hasHydrated, firestoreProducts, demoProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
