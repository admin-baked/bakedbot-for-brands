
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, retailerConverter } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoRetailers } from '@/lib/data';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useHydrated } from './useHydrated';
import type { Product, Retailer } from '@/types/domain';


export type UseMenuDataResult = {
  products: Product[];
  locations: Retailer[];
  isLoading: boolean;
  isDemo: boolean;
};

/**
 * A simplified client-side hook to fetch all necessary menu data.
 * It handles switching between live Firestore data and local demo data.
 */
export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const { firestore } = useFirebase();
  const isHydrated = useHydrated();

  // Set up Firestore queries. They will be null if not hydrated, in demo mode, or if firestore is not available.
  const productsQuery = useMemo(() => {
    if (!isHydrated || isDemo || !firestore) return null;
    return query(collection(firestore, 'products').withConverter(productConverter));
  }, [firestore, isDemo, isHydrated]);
  
  const locationsQuery = useMemo(() => {
    if (!isHydrated || isDemo || !firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(retailerConverter));
  }, [firestore, isDemo, isHydrated]);

  // Fetch live data from Firestore.
  const { data: liveProducts, isLoading: areProductsLoading, error: productsError } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoading, error: locationsError } = useCollection<Retailer>(locationsQuery);

  // Determine the final data source based on demo mode and data availability.
  // Use demo data if in demo mode, if there's an error fetching, or if live data is empty.
  const products = useMemo<Product[]>(() => {
    if (isDemo) return demoProducts;
    if (!isHydrated) return []; // Return empty on server
    if (productsError || (liveProducts && liveProducts.length === 0)) return demoProducts;
    return liveProducts || [];
  }, [isDemo, isHydrated, liveProducts, productsError]);

  const locations = useMemo<Retailer[]>(() => {
    if (isDemo) return demoRetailers;
    if (!isHydrated) return []; // Return empty on server
    if (locationsError || (liveLocations && liveLocations.length === 0)) return demoRetailers;
    return liveLocations || [];
  }, [isDemo, isHydrated, liveLocations, locationsError]);

  // The overall loading state depends on hydration status and fetching live data.
  const isLoading = !isHydrated || (!isDemo && (areProductsLoading || areLocationsLoading));

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}

    