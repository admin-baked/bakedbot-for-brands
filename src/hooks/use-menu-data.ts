// workspace/src/hooks/use-menu-data.ts

// TEMP DIAGNOSTIC STUB:
// This file intentionally has no imports and no references to useHasMounted
// or ./use-has-mounted. If Firebase still complains about that module,
// it's building a different copy of this file.

import type { Product, Location } from '@/lib/types';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

export function useMenuData(): UseMenuDataResult {
  // Return totally safe default values.
  return {
    products: [],
    locations: [],
    isLoading: false,
    isDemo: true, // Defaulting to true to avoid other potential issues
  };
}
