
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { orderConverter, retailerConverter, type OrderDoc, type Retailer } from '@/firebase/converters';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DocumentData } from 'firebase-admin/firestore';
import CustomerAccountView from './components/customer-account-view';
import BrandAccountView from './components/brand-account-view';

async function getAccountData(uid: string, role: string, locationId?: string | null) {
    const { firestore } = await createServerClient();
    
    if (role === 'customer') {
        const ordersQuery = query(
            (collection as any)(firestore, 'orders'),
            where('userId', '==', uid)
        ).withConverter(orderConverter);

        const [ordersSnap, retailersSnap] = await Promise.all([
            getDocs(ordersQuery),
            firestore.collection('dispensaries').withConverter(retailerConverter).get()
        ]);
        
        const orders = ordersSnap.docs.map((doc: DocumentData) => doc.data()) as OrderDoc[];
        const retailers = retailersSnap.docs.map((doc: DocumentData) => doc.data()) as Retailer[];
        
        return { orders, retailers };
    }
    
    // For brand/dispensary users, we might fetch brand/location-specific data here in the future
    return {};
}


export default async function AccountPage() {
    const { auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        redirect('/customer-login');
    }

    let decodedToken;
    try {
        decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    } catch (error) {
        redirect('/customer-login');
    }

    const { uid, role, brandId, locationId, name, email } = decodedToken;
    
    if (!role) {
        redirect('/onboarding');
    }

    const accountData = await getAccountData(uid, role, locationId);

    if (role === 'customer') {
        return <CustomerAccountView user={{name, email}} {...accountData} />;
    }
    
    // For Brand and Dispensary users
    return <BrandAccountView user={{ name, email, role }} />;
}
