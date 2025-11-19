
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { orderConverter, retailerConverter, type OrderDoc, type Retailer, type Brand } from '@/firebase/converters';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DocumentData } from 'firebase-admin/firestore';
import CustomerAccountView from './components/customer-account-view';
import BrandAccountView from './components/brand-account-view';
import { makeBrandRepo } from '@/server/repos/brandRepo';

async function getAccountData(uid: string, role: string, brandId?: string | null, locationId?: string | null) {
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
    
    if (role === 'brand' && brandId) {
        const brandRepo = makeBrandRepo(firestore);
        const brand = await brandRepo.getById(brandId);
        return { brand };
    }

    if (role === 'dispensary' && locationId) {
        // In the future, we might fetch specific dispensary settings here
        return { brand: null }; // Placeholder
    }
    
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

    const accountData = await getAccountData(uid, role, brandId, locationId);

    if (role === 'customer') {
        return <CustomerAccountView user={{name, email}} {...accountData} />;
    }
    
    // For Brand and Dispensary users
    return <BrandAccountView user={{ name, email, role }} brand={accountData.brand as Brand | null} />;
}
