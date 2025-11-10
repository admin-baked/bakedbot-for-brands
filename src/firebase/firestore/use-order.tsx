
'use client';

import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase } from '@/firebase/provider';
import { doc, collection, query } from 'firebase/firestore';
import type { OrderDoc, OrderItemDoc } from '@/lib/types';
import { useMemo } from 'react';

/**
 * Hook to fetch a single order and its associated items from Firestore.
 *
 * @param {string | undefined} orderId - The ID of the order to fetch.
 * @param {string | undefined} userId - The ID of the user who owns the order. Can be undefined or 'guest'.
 * @returns An object containing the order data, its items, loading state, and any error.
 */
export function useOrder(orderId: string | undefined, userId: string | undefined) {
  const { firestore } = useFirebase();

  // For guest users, the client does not have read access to the guest order path
  // due to the tightened security rules. In a production app, this data would be fetched
  // via a secure server action or the user would be encouraged to create an account.
  // For this demo, we will gracefully handle the 'permission-denied' error on the client
  // by not attempting to fetch if the user is a guest. The confirmation page will
  // still need to handle the case where 'order' is null.
  // A better long-term solution is using Firebase Anonymous Auth.
  const canFetch = !!firestore && !!userId && !!orderId && userId !== 'guest';

  // Memoize the reference to the order document
  const orderRef = useMemo(() => {
    if (!canFetch) return null;
    return doc(firestore!, 'users', userId!, 'orders', orderId!);
  }, [firestore, userId, orderId, canFetch]);

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

  // If the user is a guest, we can't fetch data, so we'll simulate a loading state
  // and then return null. The order confirmation page will need to rely on passed-in state or server-rendering.
  const isLoading = (userId === 'guest') ? false : (isOrderLoading || areItemsLoading);
  const data = (userId === 'guest') ? null : combinedData;

  return {
    data: data,
    items: itemsData || [],
    isLoading: isLoading,
    error: orderError || itemsError,
  };
}
