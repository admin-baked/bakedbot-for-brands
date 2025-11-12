'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { productConverter } from '@/firebase/converters';
import type { Product, Location } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useDemoMode } from '@/context/demo-mode';
import { demoProducts, demoLocations } from '@/lib/data';
import { useHasMounted } from './use-has-mounted';


export type UseMenuDataResult = {
  products: Product[];
  locations: Location[];
  isLoading: boolean;
  isDemo: boolean;
  isUsingDemoData: boolean; // Alias for backward compatibility
};

export function useMenuData(): UseMenuDataResult {
  const { isDemo } = useDemoMode();
  const hasMounted = useHasMounted();

  const { user } = useUser();
  const fb = useFirebase();
  const db = fb?.firestore;

  // Your existing live data retrieval goes here.
  // Example placeholders:
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [liveLocations, setLiveLocations] = useState<Location[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLiveLoading(false);
      return;
    }
  
    setLiveLoading(true);
    const productsUnsub = onSnapshot(collection(db, "products"), (snap) => {
      setLiveProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const locationsUnsub = onSnapshot(collection(db, "locations"), (snap) => {
       setLiveLocations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location)));
       setLiveLoading(false); // Consider loading done when locations are fetched
    });

    return () => {
      productsUnsub();
      locationsUnsub();
    }
  }, [db]);


  // IMPORTANT: keep SSR and initial CSR consistent to avoid hydration warnings.
  // Until mounted, prefer a stable, conservative initial UI.
  const products = useMemo<Product[]>(
    () => (isDemo ? demoProducts : (hasMounted ? liveProducts : [])),
    [isDemo, hasMounted, liveProducts]
  );

  const locations = useMemo<Location[]>(
    () => (isDemo ? demoLocations : (hasMounted ? liveLocations : [])),
    [isDemo, hasMounted, liveLocations]
  );

  const isLoading = isDemo ? false : (!hasMounted || liveLoading);

  return {
    products,
    locations,
    isLoading,
    isDemo,
    isUsingDemoData: isDemo, // Alias for backward compatibility
  };
}
