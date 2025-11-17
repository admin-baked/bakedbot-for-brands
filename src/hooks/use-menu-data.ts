
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

interface UseMenuDataProps {
  serverProducts?: Product[];
  serverLocations?: Retailer[];
}

/**
 * A client-side hook that now primarily manages the *display* of menu data.
 * It prioritizes client-side demo mode state and can use server-preloaded data.
 */
export function useMenuData({ serverProducts, serverLocations }: UseMenuDataProps = {}): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const { firestore } = useFirebase();
  const isHydrated = useHydrated();
  const params = useParams();
  const brandId = params.brandId as string || 'default';

  // Firestore queries are now only for client-side updates after initial load.
  const productsQuery = useMemo(() => {
    // Don't fetch on the client if we have server data, are in demo mode, or SSR.
    if (serverProducts || !isHydrated || isDemo || !firestore || brandId === 'default') return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', brandId));
  }, [firestore, isDemo, isHydrated, brandId, serverProducts]);
  
  const locationsQuery = useMemo(() => {
    if (serverLocations || !isHydrated || isDemo || !firestore) return null;
    return query(collection(firestore, 'dispensaries').withConverter(retailerConverter));
  }, [firestore, isDemo, isHydrated, serverLocations]);

  const { data: liveProducts, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
  const { data: liveLocations, isLoading: areLocationsLoading } = useCollection<Retailer>(locationsQuery);

  const isLoading = !isHydrated || (!isDemo && (areProductsLoading || areLocationsLoading) && !serverProducts);

  const products = useMemo<Product[]>(() => {
    if (isDemo) return demoProducts;
    if (liveProducts) return liveProducts; // Prioritize fresh client-side data
    if (serverProducts) return serverProducts; // Use server-preloaded data
    return []; // Default to empty array
  }, [isDemo, liveProducts, serverProducts]);

  const locations = useMemo<Retailer[]>(() => {
    if (isDemo) return demoRetailers;
    if (liveLocations) return liveLocations;
    if (serverLocations) return serverLocations;
    return [];
  }, [isDemo, liveLocations, serverLocations]);

  return {
    products,
    locations,
    isLoading,
    isDemo,
  };
}
