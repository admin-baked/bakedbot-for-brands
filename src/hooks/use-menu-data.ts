
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { demoProducts, demoLocations } from '@/lib/data';
import type { Product, Location } from '@/lib/types';
import { useStore } from './use-store';
import { useUser } from '@/firebase/auth/use-user';

/**
 * A unified hook to get menu data and demo status.
 * It intelligently uses demo data as a fallback and then attempts to load
 * live data from Firestore on the client side.
 */
export function useMenuData() {
  const { firestore } = useFirebase();
  const { isUserLoading } = useUser();
  const { isUsingDemoData: storeIsUsingDemoData, locations: storeLocations, _hasHydrated } = useStore();

  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [locations, setLocations] = useState<Location[]>(storeLocations.length > 0 ? storeLocations : demoLocations);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // The definitive source of truth for demo mode
  const isUsingDemoData = !_hasHydrated || storeIsUsingDemoData;
  const isLoading = !_hasHydrated || isUserLoading || isFirestoreLoading;

  useEffect(() => {
    // Only proceed once the store is hydrated to know the true isUsingDemoData value
    if (!_hasHydrated) return;

    if (storeIsUsingDemoData) {
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsFirestoreLoading(false);
      return;
    }

    // Live data mode
    if (!firestore) {
      console.warn("Firestore not available in live mode, falling back to demo data.");
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsFirestoreLoading(false);
      return;
    }

    setIsFirestoreLoading(true);
    
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
        setIsFirestoreLoading(false);
      }, 
      (err) => {
        console.error("Error fetching products, falling back to demo:", err);
        setError(err);
        setProducts(demoProducts);
        setIsFirestoreLoading(false);
      }
    );

    // Locations in live mode are driven by the Zustand store, which is persisted.
    // If the store is empty, fall back to demo locations.
    setLocations(storeLocations.length > 0 ? storeLocations : demoLocations);

    return () => {
      productsUnsub();
    };
  }, [storeIsUsingDemoData, firestore, _hasHydrated, storeLocations]);

  return { 
    products, 
    locations, 
    isLoading, 
    error,
    // Provide a consistent flag for demo mode status
    isUsingDemoData,
  };
}
