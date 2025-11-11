
'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { demoProducts, demoLocations } from '@/lib/data';
import type { Product, Location } from '@/lib/types';
import { useStore } from './use-store';

type UseMenuOpts = { initialDemo?: boolean };

export function useMenuData(opts: UseMenuOpts = {}) {
  const { initialDemo = false } = opts;
  const { firestore } = useFirebase();
  const { locations: storeLocations, isUsingDemoData } = useStore();

  // Initialize state with demo data to prevent hydration mismatch.
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [locations, setLocations] = useState<Location[]>(demoLocations);
  
  // Loading is only true if we are in live mode initially.
  const [isLoading, setIsLoading] = useState(!initialDemo);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This effect runs on the client and syncs with the live store value.
    if (isUsingDemoData) {
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsLoading(false);
      return;
    }

    // Live data mode
    if (!firestore) {
      setIsLoading(false);
      // Fallback to empty arrays if firestore is not available in live mode
      setProducts([]);
      setLocations([]);
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
            // Live mode, but no products in the database. Return empty.
            setProducts([]);
        }
        setIsLoading(false);
      }, 
      (err) => {
        console.error("Error fetching products:", err);
        setError(err);
        setProducts([]); // Fallback to empty on error
        setIsLoading(false);
      }
    );

    // For locations, we continue to use the Zustand store as the source of truth in live mode
    setLocations(storeLocations);

    return () => {
      productsUnsub();
    };
  }, [isUsingDemoData, firestore, storeLocations, demoProducts, demoLocations]);

  return { products, locations, isLoading, error };
}
