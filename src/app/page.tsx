
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import { useStore } from '@/hooks/use-store';
import MenuPageClient from './menu-page-client';
import RootHomepage from './root-homepage';

export default function RootOrMenuPage() {
  const { _hasHydrated } = useStore();

  // This is a simple client-side check to see if a brand experience should be shown.
  // We are not using brandId from the URL on the root page, so it's a simplified check.
  // In a real multi-tenant app, this would be driven by the domain or a URL parameter.
  const isMenu = _hasHydrated;

  if (isMenu) {
    // This component renders the default "BakedBot" brand menu experience.
    return <MenuPageClient brandId="default" />;
  }
  
  return <RootHomepage />;
}
