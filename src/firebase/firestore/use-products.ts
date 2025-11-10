
'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch products from Firestore.
 *
 * @returns { useCollectionResult<Product> } An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}
