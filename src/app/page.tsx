
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import { useStore } from '@/hooks/use-store';
import MenuPageClient from './menu-page-client';
import RootHomepage from './root-homepage';

export default function RootOrMenuPage() {
  const { _hasHydrated, selectedRetailerId } = useStore();

  const isMenu = _hasHydrated && selectedRetailerId;

  if (isMenu) {
    // This assumes `useMenuData` can be called by `MenuPageClient`.
    // It's important that `MenuPageClient` is a child of `MenuLayout`
    // which seems to be the case based on your structure.
    return <MenuPageClient brandId="default" />;
  }
  
  return <RootHomepage />;
}
