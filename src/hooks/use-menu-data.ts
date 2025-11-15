
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, locationConverter } from '@/firebase/converters';
import type { Product, Location } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoLocations } from '@/lib/data';
import useHasMounted from '@/hooks/use-has-mounted';
import { useCollection } from '@/firebase/firestore/use-collection';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

/**
 * A centralized hook to fetch product and location data.
 * It intelligently switches between live Firestore data and static demo data
 * based on the state of the `useDemoMode` context.
 */
export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hasMounted = useHasMounted();
  const { firestore } = useFirebase();

  // Step 1: Prepare Firestore queries for live data.
  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products').withConverter(productConverter));
  }, [firestore]);

  const locationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(locationConverter));
  }, [firestore]);

  // Step 2: Fetch the live data from Firestore using our real-time hook.
  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoadingFirestore } = useCollection<Location>(locationsQuery);

  // Step 3: Decide which data source to return.
  const products = useMemo<Product[]>(() => {
    // If demo mode is on, always use demo data.
    if (isDemo) return demoProducts;
    
    // If we are in live mode and live products are available, use them.
    // The `hasMounted` check prevents a flash of demo data on initial client load.
    if (hasMounted && liveProducts && liveProducts.length > 0) {
      return liveProducts;
    }
    
    // Fallback: If in live mode but the collection is empty or still loading,
    // or if the component hasn't mounted yet, default to demo products.
    return demoProducts;
  }, [isDemo, hasMounted, liveProducts]);

  const locations = useMemo<Location[]>(() => {
    // If demo mode is on, always use demo data.
    if (isDemo) return demoLocations;
    
    // If we are in live mode and live locations are available, use them.
    if (hasMounted && liveLocations && liveLocations.length > 0) {
      return liveLocations;
    }

    // Fallback for locations.
    return demoLocations;
  }, [isDemo, hasMounted, liveLocations]);

  // Step 4: Determine the loading state.
  // Loading is true only if we are in live mode and data is still being fetched.
  const isLoading = !isDemo && (!hasMounted || areProductsLoading || areLocationsLoadingFirestore);

  // Step 5: Return the final data package.
  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
