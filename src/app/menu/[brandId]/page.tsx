
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import MenuPageClient from '@/app/menu-page-client';
import type { Product, Retailer, Review } from '@/types/domain';
import { collection, collectionGroup, getDocs, query, orderBy, limit, Firestore } from 'firebase/firestore';
import { reviewConverter } from '@/firebase/converters';
import { createServerClient as createAdminServerClient } from '@/firebase/server-client';

// Revalidate the page every 60 seconds to fetch fresh data
export const revalidate = 60;

/**
 * This is the main server component for the menu page.
 * It fetches brand-specific data on the server and passes it to a client component.
 */
export default async function MenuPage({ params }: { params: { brandId: string } }) {
  const { brandId } = params;

  let products: Product[];
  let locations: Retailer[];
  let reviews: Review[];
  let isDemo = false;

  if (brandId === 'default' || process.env.NEXT_PUBLIC_USE_DEMO_DATA === 'true') {
    // Use static demo data
    isDemo = true;
    products = demoProducts;
    locations = demoRetailers;
    reviews = demoCustomer.reviews as Review[];
  } else {
    // Fetch live data from Firestore on the server
    try {
      const { firestore } = await createAdminServerClient();
      const productRepo = makeProductRepo(firestore);
      
      const reviewsQuery = query(
          (firestore as any).collectionGroup('reviews'), 
          orderBy('createdAt', 'desc'), 
          limit(10)
      );

      const [fetchedProducts, locationsSnap, reviewsSnap] = await Promise.all([
        productRepo.getAllByBrand(brandId),
        firestore.collection('dispensaries').get(),
        (reviewsQuery as any).get(),
      ]);

      products = fetchedProducts;
      locations = locationsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Retailer[];
      reviews = reviewsSnap.docs.map((doc: any) => reviewConverter.fromFirestore(doc as any)) as Review[];

    } catch (error) {
      console.error(`[MenuPage] Failed to fetch data for brand ${brandId}:`, error);
      // Fallback to demo data in case of a server-side error to prevent a crash
      isDemo = true;
      products = demoProducts;
      locations = demoRetailers;
      reviews = demoCustomer.reviews as Review[];
    }
  }
  
  // Get a subset of featured products for things like carousels.
  const featuredProducts = [...products].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);

  // The Server Component passes the fetched data as props to the Client Component
  // which handles all the interactivity (state, hooks, etc.).
  return (
    <MenuPageClient
      brandId={brandId}
      initialProducts={products}
      initialLocations={locations}
      initialIsDemo={isDemo}
      initialReviews={reviews}
      featuredProducts={featuredProducts}
    />
  );
}
