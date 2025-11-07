'use client';

import { useStore } from '@/hooks/use-store';
import MenuPage from './menu/page';
import MenuAltPage from './menu-alt/page';
import { useEffect, useState } from 'react';

/**
 * A client-side component that selects which menu to display based on
 * the user's preference stored in the global state. This prevents
 * server-side rendering issues related to accessing cookies.
 */
export default function RootPage() {
  const { menuStyle, _hasHydrated } = useStore(state => ({ menuStyle: state.menuStyle, _hasHydrated: state._hasHydrated }));
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures the component only renders on the client after mounting.
    setIsClient(true);
  }, []);

  // Before hydration or on the server, we can render a fallback or nothing.
  // Once hydrated, we can safely render the correct menu.
  if (!isClient || !_hasHydrated) {
    // Render the fallback/skeleton for the default menu page.
    return <MenuPage />;
  }

  if (menuStyle === 'alt') {
    return <MenuAltPage />;
  }

  return <MenuPage />;
}
