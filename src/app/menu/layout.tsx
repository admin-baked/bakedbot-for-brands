
// src/app/menu/layout.tsx
import { createServerClient } from '@/firebase/server-client';
import { DEMO_BRAND_ID } from '@/lib/config';
import { demoProducts, demoRetailers } from '@/lib/demo/demo-data';
import { productConverter, retailerConverter, reviewConverter, type Product, type Retailer, type Review } from '@/firebase/converters';
import MenuLayoutClient from './menu-layout-client';
import { cookies } from 'next/headers';
import type { DocumentData } from 'firebase-admin/firestore';
import Chatbot from '@/components/chatbot';

export const revalidate = 60; // Revalidate data every 60 seconds

async function getMenuData(brandId: string) {
    let products: Product[];
    let locations: Retailer[];
    let reviews: Review[];
    let featuredProducts: Product[];

    const isDemo = cookies().get('isUsingDemoData')?.value === 'true' || brandId === 'default' || !brandId;

    if (isDemo) {
        products = demoProducts;
        locations = demoRetailers;
        reviews = [] as Review[]; // Use empty array as demoCustomer is not available here
        featuredProducts = [demoProducts[0], demoProducts[1], demoProducts[2]];
    } else {
        try {
            const { firestore } = await createServerClient();
            
            // Fetch products for the given brandId
            const productsQuery = firestore.collection('products').where('brandId', '==', brandId).withConverter(productConverter as any);
            const productsSnap = await productsQuery.get();
            products = productsSnap.docs.map((doc: DocumentData) => doc.data()) as Product[];
            
            // Fetch all dispensaries/retailers for now
            const locationsSnap = await firestore.collection('dispensaries').withConverter(retailerConverter as any).get();
            locations = locationsSnap.docs.map((doc: DocumentData) => doc.data()) as Retailer[];

            // Fetch recent reviews across all products for this brand
            const reviewsQuery = firestore.collectionGroup('reviews').where('brandId', '==', brandId).orderBy('createdAt', 'desc').limit(10).withConverter(reviewConverter as any);
            const reviewsSnap = await reviewsQuery.get();
            reviews = reviewsSnap.docs.map((doc: DocumentData) => doc.data()) as Review[];

            featuredProducts = products.slice(0, 3); // Simple featured logic
        } catch (error) {
            console.error(`[MenuLayout] Failed to fetch data for brand ${brandId}:`, error);
            // Fallback to demo data on any error
            products = demoProducts;
            locations = demoRetailers;
            reviews = [] as Review[]; // Use empty array as demoCustomer is not available here
            featuredProducts = [demoProducts[0], demoProducts[1], demoProducts[2]];
        }
    }

    return { brandId, products, locations, reviews, featuredProducts, isDemo };
}


export default async function MenuLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { brandId?: string };
}) {
  // Use the brandId from the route segment if available, otherwise default.
  const brandId = params.brandId || DEMO_BRAND_ID;
  const menuData = await getMenuData(brandId);
  
  return (
      <MenuLayoutClient initialData={menuData}>
          {children}
          <Chatbot products={menuData.products} brandId={brandId} />
      </MenuLayoutClient>
  );
}
