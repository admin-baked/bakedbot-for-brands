
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import MenuPageClient from '@/app/menu-page-client';
import type { Product, Retailer, Review } from '@/types/domain';
import { collectionGroup, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Revalidate the page every 60 seconds to fetch fresh data
export const revalidate = 60;

/**
 * This is the main server component for the default demo menu page.
 * It fetches all necessary demo data and passes it to the client component.
 */
export default async function DemoMenuPage() {
  // For the default demo, we always use the static demo data.
  const isDemo = true;
  const products: Product[] = demoProducts;
  const locations: Retailer[] = demoRetailers;
  const reviews: Review[] = demoCustomer.reviews as Review[];
  const brandId = 'default';
  
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
