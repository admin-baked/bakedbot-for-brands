import MenuPage from './menu/page';
import MenuAltPage from './menu-alt/page';
import { cookies } from 'next/headers';

// The value of the store is a stringified JSON object.
// e.g. {"state":{"theme":"green","menuStyle":"alt", ...}}
type StoreState = {
  state: {
    menuStyle: 'default' | 'alt';
  };
};

export default function RootPage() {
  const cookieStore = cookies();
  const storeCookie = cookieStore.get('smokey-store');

  let menuStyle = 'default';

  if (storeCookie) {
    try {
      const storeValue: StoreState = JSON.parse(storeCookie.value);
      if (storeValue.state.menuStyle === 'alt') {
        menuStyle = 'alt';
      }
    } catch (e) {
      // Could not parse cookie, fallback to default.
    }
  }

  if (menuStyle === 'alt') {
    return <MenuAltPage />;
  }

  return <MenuPage />;
}
