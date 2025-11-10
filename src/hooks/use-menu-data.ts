'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';
import { useState, useEffect } from 'react';
import type { Product, Location } from '@/lib/types';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently uses demo data as a fallback and then attempts to load
 * live data from Firestore on the client side.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));

  const { products: demoProducts, locations: demoLocations } = useDemoData();

  // Fetch real-time data from Firestore on the client.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  
  const [products, setProducts] = useState<Product[]>(demoProducts);

  useEffect(() => {
    // Once Firestore has loaded, if it has data, use it.
    // Otherwise, we stick with the demo data.
    if (!isFirestoreLoading) {
        if (firestoreProducts && firestoreProducts.length > 0) {
            setProducts(firestoreProducts);
        } else {
            setProducts(demoProducts);
        }
    }
  }, [firestoreProducts, isFirestoreLoading, demoProducts]);

  // Determine the final set of locations and loading state.
  const finalLocations = _hasHydrated && storeLocations.length > 0 ? storeLocations : demoLocations;
  const isLoading = !_hasHydrated || isFirestoreLoading;

  return {
    products,
    locations: finalLocations,
    isLoading,
    error,
    isHydrated: _hasHydrated,
  };
}
