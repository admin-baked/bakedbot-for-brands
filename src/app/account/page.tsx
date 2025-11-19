
import { createServerClient } from '@/firebase/server-client';
import { redirect } from 'next/navigation';
import { orderConverter, retailerConverter, type OrderDoc, type Retailer } from '@/firebase/converters';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DocumentData } from 'firebase-admin/firestore';
import CustomerAccountView from './components/customer-account-view';
import BrandAccountView from './components/brand-account-view';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import type { Brand } from '@/types/domain';
import { requireUser } from '@/server/auth/auth';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

async function getAccountData(uid?: string | null, role?: string | null, brandId?: string | null, locationId?: string | null) {
    const { firestore } = await createServerClient();
    
    if (role === 'customer' && uid) {
        const ordersQuery = query(
            (collection as any)(firestore, 'orders'),
            where('userId', '==', uid)
        ).withConverter(orderConverter);

        const [ordersSnap, retailersSnap] = await Promise.all([
            getDocs(ordersQuery),
            firestore.collection('dispensaries').withConverter(retailerConverter as any).get()
        ]);
        
        const orders = ordersSnap.docs.map((doc: DocumentData) => doc.data()) as OrderDoc[];
        const retailers = retailersSnap.docs.map((doc: DocumentData) => doc.data()) as Retailer[];
        
        return { orders, retailers, brand: null }; // Ensure consistent shape
    }
    
    if ((role === 'brand' || role === 'owner') && brandId) {
        const brandRepo = makeBrandRepo(firestore);
        const brand = await brandRepo.getById(brandId);
        return { brand, orders: null, retailers: null }; // Ensure consistent shape
    }

    // Handle demo mode user (no UID)
     if (!uid) {
        const brandRepo = makeBrandRepo(firestore);
        const brand = await brandRepo.getById(DEMO_BRAND_ID);
        return { brand, orders: [], retailers: [] };
    }

    // Default for other roles
    return { brand: null, orders: [], retailers: [] };
}


export default async function AccountPage() {
    let user;
    let isDemoUser = false;
    try {
        user = await requireUser();
    } catch (error) {
        // If user is not authenticated, check if we are in demo mode.
        if (cookies().get('isDemo')?.value === 'true') {
            isDemoUser = true;
            user = null; // explicitly null
        } else {
             // If not demo mode and no user, redirect to login.
            redirect('/customer-login');
        }
    }

    // User is not logged in but is in demo mode.
    if (isDemoUser && !user) {
        const demoAccountData = await getAccountData(null, 'brand', DEMO_BRAND_ID);
         return <BrandAccountView user={{ name: "Demo Brand", email: "demo@bakedbot.ai", role: "brand" }} brand={demoAccountData.brand} />;
    }

    // Authenticated user flow
    if (!user) {
        // This should not be reached due to the redirect above, but it's a safeguard.
        redirect('/customer-login');
    }

    const { uid, role, brandId, locationId, name, email } = user;
    
    if (!role && !isDemoUser) {
        redirect('/onboarding');
    }

    const accountData = await getAccountData(uid, role as string, brandId, locationId);

    if (role === 'customer' && accountData.orders && accountData.retailers) {
        return <CustomerAccountView user={{name, email}} orders={accountData.orders} retailers={accountData.retailers} />;
    }
    
    // For Brand and Dispensary users
    return <BrandAccountView user={{ name, email, role }} brand={accountData.brand} />;
}
