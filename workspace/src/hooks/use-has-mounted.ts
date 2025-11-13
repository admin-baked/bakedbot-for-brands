// workspace/src/hooks/use-has-mounted.ts

import { useEffect, useState } from "react";

/**
 * Simple hook that returns true only after the component has mounted.
 * Useful to avoid hydration mismatches with browser-only APIs.
 */
export default function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}
