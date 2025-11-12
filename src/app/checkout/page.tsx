// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return <CheckoutClient />;
}
