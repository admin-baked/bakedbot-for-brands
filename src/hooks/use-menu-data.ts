
'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter } from '@/firebase/converters';
import type { Product, Location } from '@/lib/types';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoLocations } from '@/lib/data';
import { useHasMounted } from './use-has-mounted';
import { useCollection } from '@/firebase/firestore/use-collection';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hasMounted = useHasMounted();

  const { firestore } = useFirebase();

  // Use our existing live data hooks
  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(
    firestore ? query(collection(firestore, 'products').withConverter(productConverter)) : null
  );
  
  const { data: liveLocations, isLoading: areLocationsLoading } = useCollection<Location>(
      firestore ? query(collection(firestore, 'dispensaries')) : null
  );

  // IMPORTANT: keep SSR and initial CSR consistent to avoid hydration warnings.
  // Until mounted, prefer a stable, conservative initial UI.
  const products = useMemo<Product[]>(
    () => (isDemo ? demoProducts : (hasMounted && liveProducts ? liveProducts : [])),
    [isDemo, hasMounted, liveProducts]
  );

  const locations = useMemo<Location[]>(
    () => (isDemo ? demoLocations : (hasMounted && liveLocations ? liveLocations : [])),
    [isDemo, hasMounted, liveLocations]
  );

  const isLoading = isDemo ? false : (!hasMounted || areProductsLoading || areLocationsLoading);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
