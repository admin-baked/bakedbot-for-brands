'use client';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useStore } from '@/hooks/use-store';
import { products as demoProducts } from '@/lib/data';

/**
 * Hook to fetch products, supporting both live Firestore data and local demo data.
 *
 * @returns {UseCollectionResult<Product>} An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();
  const isDemoMode = useStore((state) => state.isDemoMode);
  const hasHydrated = useStore((state) => state._hasHydrated);

  const productsQuery = useMemoFirebase(() => {
    // If the store isn't hydrated yet, we can't know the mode, so we must wait.
    // If in demo mode, or if firestore isn't ready, we also don't query.
    if (!hasHydrated || isDemoMode || !firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore, isDemoMode, hasHydrated]);

  // Pass the memoized query to useCollection.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  // If the store is not hydrated, we are definitely in a loading state.
  if (!hasHydrated) {
    return { data: null, isLoading: true, error: null };
  }

  // If in demo mode, return the static demo products.
  if (isDemoMode) {
    return { data: demoProducts, isLoading: false, error: null };
  }

  // In live mode, return the data from Firestore.
  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}
