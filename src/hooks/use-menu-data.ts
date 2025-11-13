// workspace/src/hooks/use-menu-data.ts

// TEMP DIAGNOSTIC STUB:
// This file intentionally has no imports and no references to useHasMounted
// or ./use-has-mounted. If Firebase still complains about that module,
// it's building a different copy of this file.

export type MenuProduct = {
  id: string;
  name: string;
  price?: number;
  [key: string]: unknown;
};

export type MenuLocation = {
  id: string;
  name: string;
  [key: string]: unknown;
};

export type UseMenuDataResult = {
  products: MenuProduct[];
  locations: MenuLocation[];
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
