// This component was incorrectly configured as a route segment.
// The exports for `dynamic` and `revalidate` have been removed to fix a build error.

import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return <CheckoutClient />;
}
