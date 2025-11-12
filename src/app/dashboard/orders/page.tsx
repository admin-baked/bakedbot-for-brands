
// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import OrdersClient from './OrdersClient';

export default function OrdersPage() {
  return <OrdersClient />;
}
