import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import type { Product, Retailer, Review } from '@/types/domain';
import { collectionGroup, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { reviewConverter } from '@/firebase/converters';
import { DocumentData } from 'firebase-admin/firestore';
import MenuLayoutClient from './menu-layout-client';

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
    let isDemo = false;

    if (brandId === 'default' || !brandId) {
        isDemo = true;
        products = demoProducts;
        locations = demoRetailers;
        reviews = demoCustomer.reviews as Review[];
    } else {
        try {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            
            const reviewsQuery = query(
                collectionGroup(firestore, 'reviews').withConverter(reviewConverter), 
                orderBy('createdAt', 'desc'), 
                limit(10)
            );

            const [fetchedProducts, locationsSnap, reviewsSnap] = await Promise.all([
                productRepo.getAllByBrand(brandId),
                firestore.collection('dispensaries').get(),
                getDocs(reviewsQuery),
            ]);

            products = fetchedProducts;
            locations = locationsSnap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Retailer[];
            reviews = reviewsSnap.docs.map((doc: DocumentData) => doc.data()) as Review[];

        } catch (error) {
            console.error(`[MenuLayout] Failed to fetch data for brand ${brandId}:`, error);
            isDemo = true;
            products = demoProducts;
            locations = demoRetailers;
            reviews = demoCustomer.reviews as Review[];
        }
    }

    const featuredProducts = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

    return {
        brandId: isDemo ? 'default' : brandId,
        products,
        locations,
        reviews,
        featuredProducts,
        isDemo,
    };
}


export default async function MenuLayout({ children, params }: MenuLayoutProps) {
  // Use a different brandId for tiled layout if needed, or default to main params
  const effectiveBrandId = params.brandId || 'default';
  const menuData = await getMenuData(effectiveBrandId);

  return (
    <MenuLayoutClient initialData={menuData}>
        {children}
    </MenuLayoutClient>
  );
}
