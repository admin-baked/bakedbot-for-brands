
'use client';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase } from '@/firebase/provider';
import { doc, collection, query, DocumentReference, Query } from 'firebase/firestore';
import type { OrderDoc, OrderItemDoc } from '@/lib/types';
import { useMemo } from 'react';
import { orderConverter } from '@/firebase/converters/order';
import { orderItemConverter } from '@/firebase/converters/orderItem';


/**
 * Hook to fetch a single order and its associated items from Firestore.
 *
 * @param {string | undefined} orderId - The ID of the order to fetch.
 * @param {string | undefined} userId - The ID of the user who owns the order. Can be undefined or 'guest'.
 * @returns An object containing the order data, its items, loading state, and any error.
 */
export function useOrder(orderId: string | undefined, userId: string | undefined) {
  const { firestore } = useFirebase();

  const canFetch = !!firestore && !!userId && !!orderId && userId !== 'guest';

  // Memoize the typed document reference for the order
  const orderRef: DocumentReference<OrderDoc> | null = useMemo(() => {
    if (!canFetch) return null;
    return doc(firestore!, 'users', userId!, 'orders', orderId!).withConverter(orderConverter);
  }, [firestore, userId, orderId, canFetch]);

  // Memoize the typed query for the order items sub-collection
  const itemsQuery: Query<OrderItemDoc> | null = useMemo(() => {
    if (!orderRef) return null;
    return collection(orderRef, 'orderItems').withConverter(orderItemConverter);
  }, [orderRef]);

  const { data: orderData, isLoading: isOrderLoading, error: orderError } = useDoc<OrderDoc>(orderRef);
  const { data: itemsData, isLoading: areItemsLoading, error: itemsError } = useCollection<OrderItemDoc>(itemsQuery);

  const combinedData = useMemo(() => {
    if (!orderData) return null;
    return { ...orderData };
  }, [orderData]);

  const isLoading = (userId === 'guest') ? false : (isOrderLoading || areItemsLoading);
  const data = (userId === 'guest') ? null : combinedData;

  return {
    data: data,
    items: itemsData || [],
    isLoading: isLoading,
    error: orderError || itemsError,
  };
}
