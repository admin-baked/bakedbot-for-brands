
'use client';

import { useState, useEffect } from 'react';
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
  const { isDemoMode } = useStore();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const productsQuery = useMemoFirebase(() => {
    // Don't create a query if in demo mode or if firestore isn't ready
    if (!firestore || isDemoMode) return null;
    return query(collection(firestore, 'products'));
  }, [firestore, isDemoMode]);

  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useCollection<Product>(productsQuery);

  if (!hasMounted) {
    // On the server or before client-side hydration is complete, return a loading state.
    return { data: null, isLoading: true, error: null };
  }

  if (isDemoMode) {
    // If in demo mode, return the static demo products.
    return { data: demoProducts, isLoading: false, error: null };
  }

  // In live mode, return the data from Firestore.
  return { data: firestoreProducts, isLoading: isFirestoreLoading, error };
}
