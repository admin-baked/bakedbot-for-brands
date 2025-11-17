
'use server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { collection, getDocs, query } from 'firebase/firestore';
import { demoRetailers } from '@/lib/data';
import type { Retailer } from '@/types/domain';
import CheckoutClientPage from './checkout-client-page';

export const dynamic = 'force-dynamic';

async function getLocations(isDemo: boolean): Promise<Retailer[]> {
  if (isDemo) {
    return demoRetailers;
  }
  try {
    const { firestore } = await createServerClient();
    const locationsSnap = await getDocs(query(collection(firestore, 'dispensaries')));
    if (!locationsSnap.empty) {
      return locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Retailer[];
    }
    return demoRetailers;
  } catch (error) {
    console.error("Failed to fetch locations for checkout, falling back to demo data.", error);
    return demoRetailers;
  }
}

export default async function CheckoutPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  const locations = await getLocations(isDemo);

  return <CheckoutClientPage locations={locations} isDemo={isDemo} />;
}
