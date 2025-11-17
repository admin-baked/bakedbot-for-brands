
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts, demoRetailers, demoCustomer } from '@/lib/data';
import MenuPageClient from '@/app/menu-page-client';
import type { Product, Retailer, Review } from '@/types/domain';
import { collectionGroup, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { reviewConverter } from '@/firebase/converters';

// Revalidate the page every 60 seconds to fetch fresh data
export const revalidate = 60;

/**
 * This is the main server component for the homepage, now showing the demo menu.
 * It fetches brand-specific data on the server and passes it to a client component.
 */
export default async function Home() {
  const brandId = 'default';

  let products: Product[];
  let locations: Retailer[];
  let reviews: Review[];
  let isDemo = true; // Always use demo data for this page

  // Use static demo data
  products = demoProducts;
  locations = demoRetailers;
  reviews = demoCustomer.reviews as Review[];
  
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
