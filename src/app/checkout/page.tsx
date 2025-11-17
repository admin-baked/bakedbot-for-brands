
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CheckoutClientPage from './checkout-client-page';

/**
 * This is the server component wrapper for the checkout page.
 * It performs a server-side check to ensure the user is authenticated.
 * If not, it redirects them to the login page.
 */
export default async function CheckoutPage() {
  const { auth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;

  if (!sessionCookie) {
    redirect('/customer-login?reason=checkout');
  }

  try {
    // Verify the cookie is valid. This will throw if it's not.
    await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    // If the cookie is invalid (e.g., expired), redirect to login.
    console.warn('Invalid session cookie during checkout, redirecting to login.');
    redirect('/customer-login?reason=checkout');
  }

  // If the user is authenticated, render the client component that handles the form.
  return <CheckoutClientPage />;
}
