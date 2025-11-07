'use client';

import { useStore } from '@/hooks/use-store';
import { MenuPageDynamic } from './menu-dynamic';
import { MenuAltPageDynamic } from './menu-alt-dynamic';
import MenuPage from './menu/page';

/**
 * A client-side component that selects which menu to display based on
 * the user's preference stored in the global state. This prevents
 * server-side rendering issues related to accessing cookies.
 */
export default function RootPage() {
  const { menuStyle, _hasHydrated } = useStore(state => ({ menuStyle: state.menuStyle, _hasHydrated: state._hasHydrated }));

  // Before hydration on the client, render the static default menu page
  // to prevent layout shifts and ensure a consistent server/client render.
  if (!_hasHydrated) {
    return <MenuPage />;
  }

  // After hydration, dynamically render the selected menu style.
  if (menuStyle === 'alt') {
    return <MenuAltPageDynamic />;
  }

  return <MenuPageDynamic />;
}
