'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useStore } from '@/hooks/use-store';
import { products as demoProducts } from '@/lib/data';
import { useMemo } from 'react';

/**
 * Hook to fetch products, supporting both live Firestore data and local demo data.
 * It correctly handles the client-side hydration of the store to prevent race conditions.
 *
 * @returns { useCollectionResult<Product> } An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();
  // Select both state values in a single selector to avoid extra re-renders.
  const { isDemoMode, isHydrated } = useStore((state) => ({
    isDemoMode: state.isDemoMode,
    isHydrated: state._hasHydrated,
  }));

  // Memoize the query. It will be null until the store is hydrated and we are in live mode.
  const productsQuery = useMemo(() => {
    if (!isHydrated || isDemoMode || !firestore) {
      return null;
    }
    return query(collection(firestore, 'products'));
  }, [firestore, isDemoMode, isHydrated]);

  // This hook will only execute the query if it's not null.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  // PRIMARY FIX: Do not return any data until the store has rehydrated from localStorage.
  // Before hydration, we cannot know if we should be in demo mode or not.
  // Returning a loading state here prevents a "flash of incorrect content".
  if (!isHydrated) {
    return { data: null, isLoading: true, error: null };
  }

  // Once hydrated, we can definitively decide what data to show.
  if (isDemoMode) {
    // In demo mode, immediately return the static demo products.
    return { data: demoProducts, isLoading: false, error: null };
  }

  // In live mode, return the data and status from the Firestore query.
  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}
