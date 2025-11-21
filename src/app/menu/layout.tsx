
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

// Function to map CannMenus product format to our internal Product type
function mapCannMenusProduct(item: any, brandId: string): Product {
    const prices: Record<string, number> = {};
    if (item.prices) {
        for (const retailerId in item.prices) {
            prices[retailerId] = item.prices[retailerId].price;
        }
    }
  
    return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price ?? 0, // Fallback price
        prices: prices,
        imageUrl: item.image ?? 'https://picsum.photos/seed/default/400/400',
        imageHint: 'cannabis product',
        description: item.description ?? '',
        brandId,
    };
}

async function getMenuData(brandId: string) {
    let products: Product[];
    let locations: Retailer[];
    let reviews: Review[];
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true' || brandId === DEMO_BRAND_ID || !brandId;

    if (isDemo) {
        // For the demo, fetch live 40 Tons data from the API route
        try {
            const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
            const res = await fetch(`${baseUrl}/api/cannmenus/product-search`, { next: { revalidate: 60 }});
            const json = await res.json();
            
            if (!res.ok) {
                throw new Error(json.error || 'Failed to fetch demo products');
            }
            products = (json.data || []).map((item: any) => mapCannMenusProduct(item, DEMO_BRAND_ID));
        } catch (error) {
            console.error(`[MenuLayout] Failed to fetch live demo data:`, error);
            products = demoProducts; // Fallback to stubs on error
        }
        
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
        isDemo,
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

