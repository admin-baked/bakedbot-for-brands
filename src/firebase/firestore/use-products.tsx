'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useStore } from '@/hooks/use-store';
import { products as demoProducts } from '@/lib/data';
import { useMemo } from 'react';

/**
 * Hook to fetch products, supporting both live Firestore data and local demo data.
 * It correctly handles the client-side hydration of the store.
 *
 * @returns { useCollectionResult<Product> } An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();
  // Get both state values in a single selector to avoid extra re-renders
  const { isDemoMode, isHydrated } = useStore((state) => ({
    isDemoMode: state.isDemoMode,
    isHydrated: state._hasHydrated,
  }));

  // Memoize the query to prevent re-renders.
  const productsQuery = useMemo(() => {
    // A query can only be created if we are in live mode and have a firestore instance.
    if (!firestore || isDemoMode) return null;
    return query(collection(firestore, 'products'));
  }, [firestore, isDemoMode]);

  // This hook will only run the query if it's not null.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  // CRITICAL FIX: Do not return any data until the store has been rehydrated from localStorage.
  // Before hydration, we don't know if we should be in demo mode or not.
  if (!isHydrated) {
    return { data: null, isLoading: true, error: null };
  }

  // Once hydrated, we can decide what to show.
  if (isDemoMode) {
    // In demo mode, return the static demo products.
    return { data: demoProducts, isLoading: false, error: null };
  }

  // In live mode, return the data from Firestore.
  // The loading state and error are passed through from the useCollection hook.
  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}