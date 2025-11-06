
'use client';

import { useMemo } from 'react';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useMemoFirebase } from '../provider';

/**
 * Hook to fetch all products from the Firestore 'products' collection.
 *
 * @returns {UseCollectionResult<Product>} An object containing the products data, loading state, and error.
 */
export function useProducts() {
  const { firestore } = useFirebase();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

  return { data: products, isLoading, error };
}
