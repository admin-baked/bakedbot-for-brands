
import { cookies } from 'next/headers';
import MenuPage from '@/app/menu-page';

export default function Page() {
  const cookieStore = cookies();
  const demoCookie = cookieStore.get('isUsingDemoData');

  // Treat missing cookie as live data mode, only explicit '1' is demo.
  const initialDemo = demoCookie?.value === '1';

  return <MenuPage initialDemo={initialDemo} />;
}
