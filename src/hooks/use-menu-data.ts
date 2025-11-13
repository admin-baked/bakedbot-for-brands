
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter, locationConverter } from '@/firebase/converters';
import type { Product, Location } from '@/lib/types';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoLocations } from '@/lib/data';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useHydrated } from './useHydrated';

export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hydrated = useHydrated();

  const { firestore } = useFirebase();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products').withConverter(productConverter));
  }, [firestore]);

  const locationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(locationConverter));
  }, [firestore]);

  // Use our existing live data hooks
  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoading } = useCollection<Location>(locationsQuery);

  // IMPORTANT: keep SSR and initial CSR consistent to avoid hydration warnings.
  // Until mounted, prefer a stable, conservative initial UI.
  const products = useMemo<Product[]>(
    () => (isDemo ? demoProducts : (hydrated && liveProducts ? liveProducts : [])),
    [isDemo, hydrated, liveProducts]
  );

  const locations = useMemo<Location[]>(
    () => (isDemo ? demoLocations : (hydrated && liveLocations ? liveLocations : [])),
    [isDemo, hydrated, liveLocations]
  );

  const isLoading = isDemo ? false : (!hydrated || areProductsLoading || areLocationsLoading);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
