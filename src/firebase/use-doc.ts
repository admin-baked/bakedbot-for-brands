
import { useEffect, useState } from 'react';

type UseDocResult<T = any> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Temporary stub for useDoc.
 * Replace with real Firestore doc fetching logic when ready.
 */
export function useDoc<T = any>(): UseDocResult<T> {
  const [state, setState] = useState<UseDocResult<T>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    // no-op for now
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  return state;
}
