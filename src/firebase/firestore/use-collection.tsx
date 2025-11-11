
'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseError } from 'firebase/app';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

type AnyQuery =
  | import("firebase/firestore").Query<unknown>
  | import("firebase/firestore").CollectionReference<unknown>
  | import("firebase/firestore").DocumentReference<unknown>
  | { _query?: any; _aggregateQuery?: any; path?: any; _path?: any };

function getPathFromQuery(input: unknown): string {
  try {
    const q = input as AnyQuery;

    // 1) AggregationQuery (count(), avg(), etc.)
    // Firestore uses a different internal slot for these
    const ag = (q as any)?._aggregateQuery;
    if (ag?.query?.collectionGroup) return `**/${ag.query.collectionGroup}`;
    const agCanon = ag?.query?.path?.canonicalString;
    if (typeof agCanon === "string" && agCanon) return agCanon;

    // 2) Normal Query
    const qq = (q as any)?._query;
    if (qq?.collectionGroup) return `**/${qq.collectionGroup}`;
    const qCanon = qq?.path?.canonicalString;
    if (typeof qCanon === "string" && qCanon) return qCanon;

    // 3) Collection/Doc references
    const pCanon =
      (q as any)?._path?.canonicalString ??
      (q as any)?.path?.canonicalString;
    if (typeof pCanon === "string" && pCanon) return pCanon;
  } catch {
    // ignore
  }
  return "unknown/path";
}


/**
 * A hook to fetch a Firestore collection or collection group in real-time.
 * @param {Query | null} query - The Firestore query to execute.
 */
export function useCollection<T = DocumentData>(
  query: Query<T> | null
): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!query);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
        setData(data);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setIsLoading(false);
        // Special handling for permission errors to avoid crashing the page
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          const permissionError = new FirestorePermissionError({
              path: getPathFromQuery(query),
              operation: 'list',
          });
          setError(permissionError); // Set error state for the component to handle
          errorEmitter.emit('permission-error', permissionError); // Also emit for global listeners
          return; // Stop further execution
        }
        // For other errors, re-throw to be caught by a higher-level boundary if needed
        console.error(`Unhandled error fetching collection:`, err);
        setError(err);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
