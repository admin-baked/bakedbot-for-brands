import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { type Retailer } from '@/firebase/converters';
import { demoRetailers } from '@/lib/data';
import CheckoutClientPage from './checkout-client-page';
import { DocumentData } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let locations: Retailer[] = [];

    if (isDemo) {
        locations = demoRetailers;
    } else {
        try {
            const { firestore } = await createServerClient();
            // Use Admin SDK syntax directly
            const snapshot = await firestore.collection('dispensaries').get();
            
            if (!snapshot.empty) {
                locations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Retailer));
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
        <div className="flex flex-col min-h-screen">
            <CheckoutClientPage locations={locations} />
        </div>
    );
}
