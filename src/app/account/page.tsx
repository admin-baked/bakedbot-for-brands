// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AccountClient from './AccountClient';

export default function AccountPage() {
  return <AccountClient />;
}
