
'use client';

import { useDoc, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch a single product from Firestore by its ID.
 *
 * @param {string | undefined} productId - The ID of the product to fetch.
 * @returns { useDocResult<Product> } An object containing the product data, loading state, and error.
 */
export function useProduct(productId: string | undefined) {
  const { firestore } = useFirebase();

  const productRef = useMemo(() => {
    if (!firestore || !productId) return null;
    return doc(firestore, 'products', productId);
  }, [firestore, productId]);

  const { data: product, isLoading, error } = useDoc<Product>(productRef);

  return { data: product, isLoading, error };
}
