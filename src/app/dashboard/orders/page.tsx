
// This component was incorrectly configured as a route segment.
// The exports for `dynamic` and `revalidate` have been removed to fix a build error.

import OrdersClient from './OrdersClient';

export default function OrdersPage() {
  return <OrdersClient />;
}
