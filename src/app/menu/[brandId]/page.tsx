
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import MenuPageClient from '@/app/menu-page-client';
import type { Product, Retailer, Review } from '@/types/domain';
import { collectionGroup, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { reviewConverter } from '@/firebase/converters';
import { DocumentData } from 'firebase-admin/firestore';

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

  if (brandId === 'default') {
    // Use static demo data for the 'default' brand
    isDemo = true;
    products = demoProducts;
    locations = demoRetailers;
    reviews = demoCustomer.reviews as Review[];
  } else {
    // Fetch live data from Firestore on the server
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
