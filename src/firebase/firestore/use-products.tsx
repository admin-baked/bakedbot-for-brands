
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
  const isDemoMode = useStore((state) => state.isDemoMode);
  const isHydrated = useStore((state) => state._hasHydrated);

  // Memoize the query to prevent re-renders. The query is stable.
  const productsQuery = useMemo(() => {
    // Wait until the store is hydrated and we have a firestore instance.
    if (!isHydrated || !firestore) return null;
    // If in demo mode, we don't need a Firestore query.
    if (isDemoMode) return null;
    return query(collection(firestore, 'products'));
  }, [firestore, isHydrated, isDemoMode]);

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

