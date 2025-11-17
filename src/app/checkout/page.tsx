
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { retailerConverter, type Retailer } from '@/firebase/converters';
import { demoRetailers } from '@/lib/data';
import CheckoutClientPage from './checkout-client-page';
import { collection, getDocs, query } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let locations: Retailer[] = [];

    if (isDemo) {
        locations = demoRetailers;
    } else {
        try {
            const { firestore } = await createServerClient();
            const locationsQuery = query(collection(firestore, 'dispensaries')).withConverter(retailerConverter);
            const snapshot = await getDocs(locationsQuery);
            if (!snapshot.empty) {
                locations = snapshot.docs.map(doc => doc.data());
            } else {
                // Fallback if no live locations are found
                locations = demoRetailers;
            }
        } catch (error) {
            console.error("Failed to fetch locations for checkout, falling back to demo data.", error);
            locations = demoRetailers;
        }
    }

    return (
        <div className="flex flex-col min-h-screen pt-16">
            <CheckoutClientPage locations={locations} />
        </div>
    );
}
