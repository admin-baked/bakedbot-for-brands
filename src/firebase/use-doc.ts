
import { useEffect, useState } from 'react';

export type UseDocResult<T = any> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Temporary stub for useDoc.
 * Replace with real Firestore doc fetching logic when ready.
 */
export function useDoc<T = any>(_ref: unknown): UseDocResult<T> {
  const [state, setState] = useState<UseDocResult<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // no-op stub
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  return state;
}
