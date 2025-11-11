
import { cookies } from 'next/headers';
import MenuPage from '@/app/menu-page';

export default function Page() {
  const cookieStore = cookies();
  const demoCookie = cookieStore.get('isUsingDemoData');

  // If the cookie is not present, or if it's '1', default to demo mode.
  // Only explicitly setting it to '0' will turn demo mode off initially.
  const initialDemo = demoCookie?.value !== '0';

  return <MenuPage initialDemo={initialDemo} />;
}
