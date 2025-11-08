'use client';

import { useCollection, useFirebase, WithId } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import type { OrderDoc } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch all orders across all users from Firestore.
 * This is intended for admin/dashboard use.
 *
 * @returns An object containing the orders data, loading state, and any error.
 */
export function useOrders() {
  const { firestore } = useFirebase();

  // Memoize the query for the 'orders' collection group
  const ordersQuery = useMemo(() => {
    if (!firestore) return null;
    // Querying the 'orders' collection group to get orders from all users
    return query(collectionGroup(firestore, 'orders'), orderBy("orderDate", "desc"));
  }, [firestore]);

  const { data, isLoading, error } = useCollection<OrderDoc>(ordersQuery);

  return { data, isLoading, error };
}
