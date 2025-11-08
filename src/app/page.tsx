'use client';

import { useStore } from '@/hooks/use-store';
import MenuPage from './menu/page';
import MenuAltPage from './menu-alt/page';
import { useState, useEffect } from 'react';

/**
 * A client-side component that selects which menu to display based on
 * the user's preference stored in the global state. This prevents
 * server-side rendering issues related to accessing cookies.
 */
export default function RootPage() {
  const { menuStyle, _hasHydrated } = useStore(state => ({ menuStyle: state.menuStyle, _hasHydrated: state._hasHydrated }));
  
  // On the server, and on the very first client render, `_hasHydrated` will be false.
  // This ensures the server and initial client render are identical, preventing hydration errors.
  // We render the non-dynamic page as a stable base.
  if (!_hasHydrated) {
    return <MenuPage />;
  }

  // After the component has mounted on the client and the store is hydrated,
  // we can safely render the correct version based on the store state.
  if (menuStyle === 'alt') {
    return <MenuAltPage />;
  }

  return <MenuPage />;
}
