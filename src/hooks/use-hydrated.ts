
'use client';

import { useEffect, useState } from 'react';

/**
 * A hook that returns `true` once the component has been hydrated on the client.
 * This is useful for preventing hydration mismatches when rendering client-side only UI.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

    