
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/demo/demo-data';
import type { Product, Retailer, Review } from '@/types/domain';
import { getDocs, query, orderBy, limit } from 'firebase/firestore';
import { reviewConverter } from '@/firebase/converters';
import { DocumentData } from 'firebase-admin/firestore';
import MenuLayoutClient from './menu-layout-client';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

export const revalidate = 60; // Revalidate every 60 seconds

interface MenuLayoutProps {
    children: React.ReactNode;
    params: {
        brandId?: string;
    };
}

async function getMenuData(brandId: string) {
    let products: Product[];
    let locations: Retailer[];
    let reviews: Review[];
    // Centralized decision: A session is "demo" if the cookie is set, or if the brandId is 'default'.
    const isDemoByCookie = cookies().get('isDemo')?.value === 'true';
    const isDemo = isDemoByCookie || brandId === DEMO_BRAND_ID || !brandId;

    if (isDemo) {
        products = demoProducts;
        locations = demoRetailers;
        reviews = demoCustomer.reviews as Review[];
    } else {
        try {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            
            const reviewsQuery = query(
                (firestore as any).collectionGroup('reviews').withConverter(reviewConverter as any), 
                orderBy('createdAt', 'desc'), 
                limit(10)
            );

            const [fetchedProducts, locationsSnap, reviewsSnap] = await Promise.all([
                productRepo.getAllByBrand(brandId),
                firestore.collection('dispensaries').get(),
                getDocs(reviewsQuery as any),
            ]);

            products = fetchedProducts;
            locations = locationsSnap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Retailer[];
            reviews = reviewsSnap.docs.map((doc: DocumentData) => doc.data()) as Review[];

        } catch (error) {
            console.error(`[MenuLayout] Failed to fetch data for brand ${brandId}:`, error);
            products = demoProducts;
            locations = demoRetailers;
            reviews = demoCustomer.reviews as Review[];
        }
    }

    const featuredProducts = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

    return {
        brandId: isDemo ? DEMO_BRAND_ID : brandId,
        products,
        locations,
        reviews,
        featuredProducts,
        isDemo, // Pass the final decision to the client
    };
}


export default async function MenuLayout({ children, params }: MenuLayoutProps) {
  const effectiveBrandId = params.brandId || DEMO_BRAND_ID;
  const menuData = await getMenuData(effectiveBrandId);

  return (
    <MenuLayoutClient initialData={menuData}>
        {children}
    </MenuLayoutClient>
  );
}
