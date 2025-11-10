'use client';

import { useStore } from './use-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
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
  const { firestore } = useFirebase();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  const memoizedData = useMemo(() => {
    const useDemo = isUsingDemoData || !_hasHydrated;

    if (useDemo) {
      return {
        products: demoProducts as Product[],
        locations: demoLocations as Location[],
        isLoading: false,
        error: null,
        isUsingDemoData: true,
      };
    }

    const finalProducts = !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0) ? demoProducts : firestoreProducts;
    const finalLocations = storeLocations.length > 0 ? storeLocations : demoLocations;

    return {
      products: finalProducts,
      locations: finalLocations,
      isLoading: isFirestoreLoading,
      error: error,
      isUsingDemoData: !isFirestoreLoading && (!firestoreProducts || firestoreProducts.length === 0),
    };
  }, [isUsingDemoData, _hasHydrated, firestoreProducts, storeLocations, demoProducts, demoLocations, isFirestoreLoading, error]);

  return {
    ...memoizedData,
    isHydrated: _hasHydrated,
  };
}
