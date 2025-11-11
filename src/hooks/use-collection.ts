'use client';

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, Query, DocumentData } from 'firebase/firestore';

type UseCollectionResult<T> = {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
};

export function useCollection<T = DocumentData>(query: Query<T> | null): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!query);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the string representation of the query to use as a dependency.
  // This is a simple way to detect if the query has meaningfully changed.
  const queryKey = useMemo(() => {
    return query ? JSON.stringify({
      path: 'path' in query ? query.path : '',
      // Add other query properties you might use, like filters or limits
    }) : null;
  }, [query]);

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
        const resultData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(resultData);
        setIsLoading(false);
      },
      (err) => {
        console.error(`Error fetching collection`, err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]); // Depend on the stable queryKey

  return { data, isLoading, error };
}
