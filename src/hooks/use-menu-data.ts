
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { demoProducts, demoLocations } from '@/lib/data';
import type { Product, Location } from '@/lib/types';
import { useStore } from './use-store';

type UseMenuOpts = {
  initialDemo?: boolean;
};

export function useMenuData(opts: UseMenuOpts = {}) {
  const { firestore } = useFirebase();
  const { isUsingDemoData, locations: storeLocations, _hasHydrated } = useStore();

  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [locations, setLocations] = useState<Location[]>(storeLocations.length > 0 ? storeLocations : demoLocations);
  const [isLoading, setIsLoading] = useState(!_hasHydrated); // Start loading if not hydrated
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only proceed once the store is hydrated to know the true isUsingDemoData value
    if (!_hasHydrated) return;

    if (isUsingDemoData) {
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsLoading(false);
      return;
    }

    // Live data mode
    if (!firestore) {
      console.warn("Firestore not available in live mode, falling back to demo data.");
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Subscribe to products
    const productsQuery = query(collection(firestore, 'products'));
    const productsUnsub = onSnapshot(productsQuery, 
      (snapshot) => {
        if (!snapshot.empty) {
            const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(firestoreProducts);
        } else {
            setProducts(demoProducts); // Fallback to demo if live is empty
        }
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching products, falling back to demo:", err);
        setError(err);
        setProducts(demoProducts);
        setIsLoading(false);
      }
    );

    // Locations in live mode are driven by the Zustand store, which is persisted.
    setLocations(storeLocations);

    return () => {
      productsUnsub();
    };
  }, [isUsingDemoData, firestore, _hasHydrated, storeLocations]);

  return { products, locations, isLoading, error };
}
