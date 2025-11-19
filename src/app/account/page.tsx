
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

async function getAccountData(uid: string, role: string, brandId?: string | null, locationId?: string | null) {
    const { firestore } = await createServerClient();
    
    if (role === 'customer') {
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
    
    if (role === 'brand' && brandId) {
        const brandRepo = makeBrandRepo(firestore);
        const brand = await brandRepo.getById(brandId);
        return { brand, orders: null, retailers: null }; // Ensure consistent shape
    }

    // Default for dispensary or other roles
    return { brand: null, orders: [], retailers: [] };
}


export default async function AccountPage() {
    let user;
    try {
        user = await requireUser();
    } catch (error) {
        redirect('/customer-login');
    }

    const { uid, role, brandId, locationId, name, email } = user;
    
    if (!role) {
        redirect('/onboarding');
    }

    const accountData = await getAccountData(uid, role as string, brandId, locationId);

    if (role === 'customer' && accountData.orders && accountData.retailers) {
        return <CustomerAccountView user={{name, email}} orders={accountData.orders} retailers={accountData.retailers} />;
    }
    
    // For Brand and Dispensary users
    return <BrandAccountView user={{ name, email, role }} brand={accountData.brand} />;
}
