
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, locationConverter } from '@/firebase/converters';
import type { Product, Location } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoLocations } from '@/lib/data';
import { useHydrated } from '@/hooks/useHydrated';
import { useCollection } from '@/firebase/firestore/use-collection';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

/**
 * A client-side hook to fetch location data and provide product data.
 * The primary product data should be fetched on the server and passed as props.
 * This hook is now mainly for components that run purely on the client
 * and need access to the locations list, like the shopping cart sheet.
 */
export function useMenuData(initialProducts: Product[] = [], initialLocations: Location[] = []): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hydrated = useHydrated();
  const { firestore } = useFirebase();

  // Locations are still needed on the client, so we fetch them here.
  const locationsQuery = useMemo(() => {
    if (isDemo || !firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(locationConverter));
  }, [firestore, isDemo]);

  const { data: liveLocations, isLoading: areLocationsLoadingFirestore } = useCollection<Location>(locationsQuery);

  // The hook now prioritizes server-provided data.
  const products = useMemo<Product[]>(() => {
    if (isDemo) return demoProducts;
    return initialProducts.length > 0 ? initialProducts : demoProducts;
  }, [isDemo, initialProducts]);

  const locations = useMemo<Location[]>(() => {
    if (isDemo) return demoLocations;
    if (hydrated && liveLocations) {
       return liveLocations.length > 0 ? liveLocations : initialLocations.length > 0 ? initialLocations : demoLocations;
    }
    return initialLocations.length > 0 ? initialLocations : demoLocations;
  }, [isDemo, hydrated, liveLocations, initialLocations]);

  // Loading is true only if we are in live mode and locations are being fetched.
  const isLoading = !isDemo && (!hydrated || areLocationsLoadingFirestore);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
