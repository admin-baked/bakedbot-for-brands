'use client';

// Compatibility shim to prevent build failures during refactoring.
// This file can be removed once all components are migrated to the new menu layout architecture.

// Super loose type so TS doesn't freak out.
export type MenuData = any;

// Temporary compatibility hook.
// This lets anything calling useMenuData() compile and run,
// even if the data is barebones for now.
export function useMenuData(): MenuData {
  return {
    brandId: 'default',
    locations: [],
    products: [],
    reviews: [],
    featuredProducts: [],
    isDemo: true,
    isLoading: true,
    error: null,
  };
}

// Temporary compatibility component.
// Old pages that still render <MenuPageClient /> will now
// just render nothing instead of crashing the build.
export default function MenuPageClient() {
  return null;
}
