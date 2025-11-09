
'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';
import type { Location } from '@/hooks/use-store';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently switches between static demo data and live Firestore data.
 * If live data is empty or not available, it reliably falls back to demo data.
 * This hook is now also responsible for populating the Zustand store with locations.
 */
export function useMenuData() {
  const { 
    isUsingDemoData, 
    _hasHydrated, 
    locations: storeLocations, 
    setLocations 
  } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
    setLocations: state.setLocations,
  }));

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();

  // Effect to populate the store with locations if it's empty
  useEffect(() => {
    // Only run on the client, after hydration, and if the store has no locations
    if (_hasHydrated && storeLocations.length === 0) {
      // For now, we use the demoLocations as the canonical source to load into the store.
      // In a real app, this would be where you fetch from an API.
      setLocations(demoLocations);
    }
  }, [_hasHydrated, storeLocations.length, demoLocations, setLocations]);


  // Memoize the result to stabilize the array references
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
    // Fallback to demo if live data is empty AFTER loading.
    const finalProducts = !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0) ? demoProducts : firestoreProducts;
    const finalLocations = !isFirestoreLoading && (!storeLocations || storeLocations.length === 0) ? demoLocations : storeLocations;

    return {
      products: finalProducts,
      locations: finalLocations,
      isLoading: isFirestoreLoading || (storeLocations.length === 0 && _hasHydrated), // Also loading if we are about to populate locations
      error: error,
      isUsingDemoData: !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0),
    };
  }, [isUsingDemoData, _hasHydrated, firestoreProducts, storeLocations, demoProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
