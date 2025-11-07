'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query, type CollectionReference, type Query, type DocumentData } from 'firebase/firestore';
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
  
  // Memoize the Firestore query. It will be null until Firestore is ready.
  // This is called unconditionally, following the Rules of Hooks.
  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  // Fetch data from Firestore unconditionally.
  // The useCollection hook is designed to handle a null query, so this is safe.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  // Now, determine what to return based on the hydration and demo mode state.
  return useMemo(() => {
    // If the store isn't hydrated yet, we are in a loading state.
    // We also check isFirestoreLoading to ensure we don't flash content if hydration finishes
    // but the Firestore query is still pending.
    if (!isHydrated) {
      return { data: null, isLoading: true, error: null };
    }

    // If hydrated and in demo mode, return the static demo products.
    if (isDemoMode) {
      return { data: demoProducts, isLoading: false, error: null };
    }

    // If hydrated and not in demo mode, return the results from the Firestore query.
    return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
  }, [isHydrated, isDemoMode, firestoreProducts, isFirestoreLoading, error]);
}
