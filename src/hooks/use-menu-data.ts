'use client';

import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, retailerConverter } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoRetailers } from '@/lib/data';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useHydrated } from './useHydrated';
import type { Product, Retailer } from '@/types/domain';
import { useParams } from 'next/navigation';


export type UseMenuDataResult = {
  products: Product[];
  locations: Retailer[];
  isLoading: boolean;
  isDemo: boolean;
};

/**
 * A client-side hook to fetch all necessary menu data for a given brand.
 * It handles switching between live Firestore data and local demo data.
 */
export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const { firestore } = useFirebase();
  const isHydrated = useHydrated();
  const params = useParams();
  // Get brandId from URL, fallback to 'default' for demo mode
  const brandId = params.brandId as string || 'default';

  // Set up Firestore queries. They will be null if not hydrated, in demo mode, or if firestore is not available.
  const productsQuery = useMemo(() => {
    if (!isHydrated || isDemo || !firestore || !brandId || brandId === 'default') return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', brandId));
  }, [firestore, isDemo, isHydrated, brandId]);
  
  // Locations are currently global. We fetch all of them.
  const locationsQuery = useMemo(() => {
    if (!isHydrated || isDemo || !firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(retailerConverter));
  }, [firestore, isDemo, isHydrated]);

  // Fetch live data from Firestore.
  const { data: liveProducts, isLoading: areProductsLoading, error: productsError } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoading, error: locationsError } = useCollection<Retailer>(locationsQuery);

  // The overall loading state depends on hydration status and fetching live data.
  const isLoading = !isHydrated || (!isDemo && (areProductsLoading || areLocationsLoading));

  // Determine the final data source.
  const products = useMemo<Product[]>(() => {
    if (isDemo || brandId === 'default') return demoProducts;
    if (!isHydrated) return []; // Return empty on server
    // **No longer falls back to demo data in live mode.**
    // If there's an error or no products, it will correctly return an empty array.
    return liveProducts || [];
  }, [isDemo, isHydrated, liveProducts, brandId]);

  const locations = useMemo<Retailer[]>(() => {
    if (isDemo) return demoRetailers;
    if (!isHydrated) return []; // Return empty on server
    if (locationsError) return demoRetailers; // Fallback for locations is okay for now.
    return liveLocations || [];
  }, [isDemo, isHydrated, liveLocations, locationsError]);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
