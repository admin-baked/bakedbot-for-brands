
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, retailerConverter } from '@/firebase/converters';
import type { Product, Retailer } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoRetailers } from '@/lib/data';
import { useCollection } from '@/firebase/firestore/use-collection';


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

  // Set up Firestore queries. They will be null if in demo mode.
  const productsQuery = useMemo(() => {
    if (isDemo || !firestore) return null;
    return query(collection(firestore, 'products').withConverter(productConverter));
  }, [firestore, isDemo]);
  
  const locationsQuery = useMemo(() => {
    if (isDemo || !firestore) return null;
    return query(collection(firestore, 'retailers').withConverter(retailerConverter));
  }, [firestore, isDemo]);

  // Fetch live data from Firestore.
  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoading } = useCollection<Retailer>(locationsQuery);

  // Determine the final data source based on demo mode and data availability.
  const products = useMemo<Product[]>(() => {
    if (isDemo) return demoProducts;
    return liveProducts && liveProducts.length > 0 ? liveProducts : demoProducts;
  }, [isDemo, liveProducts]);

  const locations = useMemo<Retailer[]>(() => {
    if (isDemo) return demoRetailers;
    return liveLocations && liveLocations.length > 0 ? liveLocations : demoRetailers;
  }, [isDemo, liveLocations]);

  // The overall loading state depends on fetching live data.
  const isLoading = !isDemo && (areProductsLoading || areLocationsLoading);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
