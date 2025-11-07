
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
function MenuSelector() {
  const { menuStyle, _hasHydrated } = useStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This ensures the component only renders on the client after mounting.
    setIsClient(true);
  }, []);

  // Before hydration or on the server, we can render a fallback or nothing.
  // Once hydrated, we can safely render the correct menu.
  if (!isClient || !_hasHydrated) {
    // You can return a loading skeleton here if you prefer
    return <MenuPage />;
  }

  if (menuStyle === 'alt') {
    return <MenuAltPage />;
  }

  return <MenuPage />;
}


export default function RootPage() {
  return <MenuSelector />;
}
