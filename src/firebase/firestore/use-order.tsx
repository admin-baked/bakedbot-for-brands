'use client';

import { useDoc, useCollection, useFirebase, WithId } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import type { OrderDoc, OrderItemDoc } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch a single order and its associated items from Firestore.
 *
 * @param {string | undefined} orderId - The ID of the order to fetch.
 * @param {string | undefined} userId - The ID of the user who owns the order.
 * @returns An object containing the order data, its items, loading state, and any error.
 */
export function useOrder(orderId: string | undefined, userId: string | undefined) {
  const { firestore } = useFirebase();

  // Memoize the reference to the order document
  const orderRef = useMemo(() => {
    if (!firestore || !userId || !orderId) return null;
    return doc(firestore, 'users', userId, 'orders', orderId);
  }, [firestore, userId, orderId]);

  // Memoize the query for the order items sub-collection
  const itemsQuery = useMemo(() => {
    if (!orderRef) return null;
    return query(collection(orderRef, 'orderItems'));
  }, [orderRef]);

  const { data: orderData, isLoading: isOrderLoading, error: orderError } = useDoc<OrderDoc>(orderRef);
  const { data: itemsData, isLoading: areItemsLoading, error: itemsError } = useCollection<OrderItemDoc>(itemsQuery);

  const combinedData = useMemo(() => {
    if (!orderData) return null;
    return { ...orderData };
  }, [orderData]);

  return {
    data: combinedData,
    items: itemsData || [],
    isLoading: isOrderLoading || areItemsLoading,
    error: orderError || itemsError,
  };
}
