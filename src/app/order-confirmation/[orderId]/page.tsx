// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import OrderConfirmationClient from './OrderConfirmationClient';

export default function OrderConfirmationPage() {
  return <OrderConfirmationClient />;
}
