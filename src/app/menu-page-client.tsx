"use client";

// Super loose type so TS doesn't freak out.
// You can replace `any` with a real interface later.
export type MenuData = any;

// Temporary compatibility hook.
// This lets anything calling useMenuData() compile and run,
// even if the data is barebones for now.
export function useMenuData(): MenuData {
  return {
    brandId: 'default',
    locations: [],
    products: [],
    initialIsDemo: true,
    isDemo: true,
    initialReviews: [],
    featuredProducts: [],
    isLoading: false,
    error: null,
  };
}

// Temporary compatibility component.
// Old pages that still render <MenuPageClient /> will now
// just render nothing instead of crashing the build.
export default function MenuPageClient() {
  return null;
}
