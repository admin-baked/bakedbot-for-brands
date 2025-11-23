
import { createServerClient } from '@/firebase/server-client';
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
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';

    // Simplified logic: 'default' is always demo. Live brands use their ID.
    const effectiveBrandId = isDemo ? DEMO_BRAND_ID : brandId;

    try {
        if (effectiveBrandId === DEMO_BRAND_ID) {
            // Force demo data for the 'default' brand ID
            throw new Error('Using demo data for default brand.');
        }

        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001';
        
        const apiPath = `/api/cannmenus/products?brands=${effectiveBrandId}`;
        
        const res = await fetch(`${baseUrl}${apiPath}`, { next: { revalidate: 60 } });
        const json = await res.json();
        
        if (!res.ok) {
            throw new Error(json.error || `Failed to fetch products for brand ${effectiveBrandId}`);
        }

        const productItems = json.data?.items || json.data?.data || [];
        products = productItems.map((item: any) => mapCannMenusProduct(item, effectiveBrandId));

        const { firestore } = await createServerClient();
        const reviewsQuery = query(
            (firestore as any).collectionGroup('reviews').withConverter(reviewConverter as any), 
            orderBy('createdAt', 'desc'), 
            limit(10)
        );

        const [locationsSnap, reviewsSnap] = await Promise.all([
            firestore.collection('dispensaries').get(),
            getDocs(reviewsQuery as any),
        ]);

        locations = locationsSnap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Retailer[];
        reviews = reviewsSnap.docs.map((doc: DocumentData) => doc.data()) as Review[];

    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[MenuLayout] Could not fetch live data, falling back to local demo data. Reason: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        products = demoProducts;
        locations = demoRetailers;
        reviews = demoCustomer.reviews as Review[];
    }
    
    const featuredProducts = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

    return {
        brandId: effectiveBrandId,
        products,
        locations,
        reviews,
        featuredProducts,
        isDemo: effectiveBrandId === DEMO_BRAND_ID,
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
