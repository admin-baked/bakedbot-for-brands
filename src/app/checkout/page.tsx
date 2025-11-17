
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { demoRetailers } from '@/lib/data';
import type { Retailer } from '@/types/domain';
import CheckoutClientPage from './checkout-client-page';

export const revalidate = 60; // Revalidate every 60 seconds

/**
 * The checkout page is now a server component that fetches location data
 * and passes it down to the client component, ensuring data consistency.
 */
export default async function CheckoutPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  
  let locations: Retailer[];

  if (isDemo) {
    locations = demoRetailers;
  } else {
    try {
      const { firestore } = await createServerClient();
      const locationsSnap = await firestore.collection('dispensaries').get();
      locations = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Retailer[];
    } catch (error) {
      console.error("Failed to fetch locations for checkout, falling back to demo data.", error);
      locations = demoRetailers;
    }
  }

  return <CheckoutClientPage locations={locations} isDemo={isDemo} />;
}
