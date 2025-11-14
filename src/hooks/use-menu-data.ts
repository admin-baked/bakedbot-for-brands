
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
import { usePathname } from 'next/navigation';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
};

export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hasMounted = useHasMounted();
  const pathname = usePathname();

  const { firestore } = useFirebase();
  
  const isAuthOrDashboardPage = useMemo(() => {
    return pathname.startsWith('/dashboard') || 
           pathname.startsWith('/account') ||
           pathname.startsWith('/onboarding') ||
           pathname.startsWith('/auth') ||
           pathname.startsWith('/customer-login') ||
           pathname.startsWith('/brand-login') ||
           pathname.startsWith('/dispensary-login') ||
           pathname.startsWith('/ceo');
  }, [pathname]);

  const productsQuery = useMemo(() => {
    if (!firestore || isAuthOrDashboardPage) return null;
    return query(collection(firestore, 'products').withConverter(productConverter));
  }, [firestore, isAuthOrDashboardPage]);

  const locationsQuery = useMemo(() => {
    if (!firestore || isAuthOrDashboardPage) return null;
    return query(collection(firestore, 'dispensaries').withConverter(locationConverter));
  }, [firestore, isAuthOrDashboardPage]);

  // Use our existing live data hooks
  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
  
  const { data: liveLocations, isLoading: areLocationsLoadingFirestore } = useCollection<Location>(locationsQuery);

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

  const isLoading = isDemo ? false : (!hasMounted || areProductsLoading || areLocationsLoadingFirestore);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
