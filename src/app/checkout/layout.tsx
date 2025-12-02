
import { createServerClient } from '@/firebase/server-client';
import { demoRetailers } from '@/lib/demo/demo-data';
import type { Retailer } from '@/types/domain';
import { DocumentData } from 'firebase-admin/firestore';
import CheckoutLayoutClient from './checkout-layout-client';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

import { logger } from '@/lib/logger';
export const revalidate = 60; // Revalidate every 60 seconds

interface CheckoutLayoutProps {
    children: React.ReactNode;
}

async function getCheckoutData() {
    let locations: Retailer[];
    const isDemo = (await cookies()).get('isUsingDemoData')?.value === 'true';

    if (isDemo) {
        locations = demoRetailers;
    } else {
        try {
            const { firestore } = await createServerClient();
            const locationsSnap = await firestore.collection('dispensaries').get();
            locations = locationsSnap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Retailer[];
        } catch (error) {
            logger.error(`[CheckoutLayout] Failed to fetch data:`, error instanceof Error ? error : new Error(String(error)));
            locations = demoRetailers;
        }
    }
    return { locations };
}


export default async function CheckoutLayout({ children }: CheckoutLayoutProps) {
    const checkoutData = await getCheckoutData();

    return (
        <CheckoutLayoutClient initialData={checkoutData}>
            <div className="min-h-screen bg-muted/20 flex flex-col">
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </CheckoutLayoutClient>
    );
}
