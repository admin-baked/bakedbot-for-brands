
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import { useStore } from '@/hooks/use-store';
import RootHomepage from './root-homepage';
import BrandMenuPage from './menu/[brandId]/page';
import { DEMO_BRAND_ID } from '@/lib/config';

export default function RootOrMenuPage() {
  const { isDemo } = useStore();
  const hydrated = useHydrated();

  // If the user has explicitly enabled demo mode, we show the demo brand menu.
  // Otherwise, we show the marketing homepage.
  if (hydrated && isDemo) {
    // We pass the brandId for the demo experience.
    return <BrandMenuPage params={{ brandId: DEMO_BRAND_ID }} />;
  }
  
  return <RootHomepage />;
}
