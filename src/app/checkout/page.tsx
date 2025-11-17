

import CheckoutClientPage from './checkout-client-page';

/**
 * The checkout page is now a simple wrapper that renders the client component.
 * All logic, including handling anonymous vs. logged-in users, is managed
 * by the server action and client-side form state.
 */
export default async function CheckoutPage() {
  return <CheckoutClientPage />;
}
