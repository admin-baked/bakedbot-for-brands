
'use client';

import { useCollection, useFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import type { Review } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch all reviews for all products from Firestore.
 * This is intended for admin/dashboard use.
 *
 * @returns An object containing the reviews data, loading state, and any error.
 */
export function useReviews() {
  const { firestore } = useFirebase();

  // Memoize the query for the 'reviews' collection group
  const reviewsQuery = useMemo(() => {
    if (!firestore) return null;
    // Querying the 'reviews' collection group to get reviews for all products
    return query(collectionGroup(firestore, 'reviews'), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data, isLoading, error } = useCollection<Review>(reviewsQuery);

  return { data, isLoading, error };
}
