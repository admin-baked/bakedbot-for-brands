
'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useStore } from '@/hooks/use-store';
import { products as demoProducts } from '@/lib/data';
import { useEffect, useState } from 'react';

/**
 * Hook to fetch products, supporting both live Firestore data and local demo data.
 * It now correctly handles the client-side hydration of the store.
 *
 * @returns { useCollectionResult<Product> } An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();
  const isDemoMode = useStore((state) => state.isDemoMode);
  const isHydrated = useStore((state) => !!state.isCeoMode || state._hasHydrated);
  
  const productsQuery = useMemoFirebase(() => {
    // Only return a query if we are in live mode and firestore is available.
    if (isHydrated && !isDemoMode && firestore) {
      return query(collection(firestore, 'products'));
    }
    return null; // Return null if in demo mode, not hydrated, or firestore is not ready.
  }, [firestore, isDemoMode, isHydrated]);

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);
  
  // If the store is not hydrated yet, we are in a loading state.
  if (!isHydrated) {
    return { data: null, isLoading: true, error: null };
  }

  // If in demo mode, return the static demo products.
  if (isDemoMode) {
    return { data: demoProducts, isLoading: false, error: null };
  }

  // In live mode, return the data from Firestore.
  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}
