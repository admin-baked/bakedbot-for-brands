
import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/demo/demo-data';
import type { Product, Retailer, Review } from '@/types/domain';
import { DocumentData } from 'firebase-admin/firestore';
import MenuLayoutClient from './menu-layout-client';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';
import { makeProductRepo } from '@/server/repos/productRepo';
import { reviewConverter } from '@/firebase/converters';

export const revalidate = 60; // Revalidate every 60 seconds

async function getMenuData(brandId: string, isDemo: boolean) {
  let products: Product[] = [];
  let locations: Retailer[] = [];
  let reviews: Review[] = [];
  let featuredProducts: Product[] = [];

  if (isDemo || brandId === DEMO_BRAND_ID) {
    products = demoProducts;
    locations = demoRetailers;
    reviews = demoCustomer.reviews as Review[];
    featuredProducts = demoProducts.slice(0, 4);
  } else {
    try {
      const { firestore } = await createServerClient();
      const productRepo = makeProductRepo(firestore);
      
      products = await productRepo.getAllByBrand(brandId);
      
      const locationsSnap = await firestore.collection('dispensaries').get();
      locations = locationsSnap.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Retailer[];

      const reviewsSnap = await firestore.collectionGroup('reviews').where('brandId', '==', brandId).limit(10).withConverter(reviewConverter).get();
      reviews = reviewsSnap.docs.map(doc => doc.data());
      
      featuredProducts = products.slice(0, 4);

    } catch (error) {
      console.error(`[MenuLayout] Failed to fetch data for brand ${brandId}:`, error);
      // Fallback to demo data on error
      products = demoProducts;
      locations = demoRetailers;
      reviews = demoCustomer.reviews as Review[];
      featuredProducts = demoProducts.slice(0, 4);
    }
  }

  return { brandId, products, locations, reviews, featuredProducts, isDemo };
}

export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brandId: string };
}) {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  const menuData = await getMenuData(params.brandId || 'default', isDemo);

  return (
    <MenuLayoutClient initialData={menuData}>
      {children}
    </MenuLayoutClient>
  );
}
