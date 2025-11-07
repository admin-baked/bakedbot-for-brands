'use client';

import { useStore } from '@/hooks/use-store';
import { MenuPageDynamic } from './menu-dynamic';
import { MenuAltPageDynamic } from './menu-alt-dynamic';
import MenuPage from './menu/page';
import { useState, useEffect } from 'react';

/**
 * A client-side component that selects which menu to display based on
 * the user's preference stored in the global state. This prevents
 * server-side rendering issues related to accessing cookies.
 */
export default function RootPage() {
  const { menuStyle, _hasHydrated } = useStore(state => ({ menuStyle: state.menuStyle, _hasHydrated: state._hasHydrated }));
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setIsClient(true);
  }, []);

  // On the server, and on the very first client render, `isClient` will be false.
  // This ensures the server and initial client render are identical, preventing hydration errors.
  // We render the non-dynamic page as a stable base.
  if (!isClient || !_hasHydrated) {
    return <MenuPage />;
  }

  // After the component has mounted on the client, we can safely render the dynamic version
  // based on the hydrated store state.
  if (menuStyle === 'alt') {
    return <MenuAltPageDynamic />;
  }

  return <MenuPageDynamic />;
}
