
'use client';

import { useStore } from '@/hooks/use-store';
import { useDemoData } from '@/hooks/use-demo-data';
import { useState, useEffect } from 'react';
import type { Product, Location } from '@/lib/types';
import { useFirebase } from '@/firebase/provider';
import { collection, query, onSnapshot } from 'firebase/firestore';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently uses demo data as a fallback and then attempts to load
 * live data from Firestore on the client side when not in demo mode.
 */
export function useMenuData() {
  const { isUsingDemoData, locations: storeLocations, _hasHydrated } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    locations: state.locations,
    _hasHydrated: state._hasHydrated,
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocationsData } = useDemoData();
  
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [locations, setLocations] = useState<Location[]>(storeLocations.length > 0 ? storeLocations : demoLocationsData);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isUsingDemoData) {
      setProducts(demoProducts);
      setLocations(demoLocationsData);
      setIsFirestoreLoading(false);
      return;
    }

    if (!firestore) {
      console.warn("Firestore not available in live mode, falling back to demo data.");
      setProducts(demoProducts);
      setLocations(storeLocations.length > 0 ? storeLocations : demoLocationsData);
      setIsFirestoreLoading(false);
      return;
    }

    setIsFirestoreLoading(true);
    const productsQuery = query(collection(firestore, 'products'));
    const productsUnsub = onSnapshot(productsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(firestoreProducts);
        } else {
            setProducts(demoProducts); // Fallback if live is empty
        }
        setIsFirestoreLoading(false);
    }, (err) => {
        console.error("Error fetching products, falling back to demo:", err);
        setError(err);
        setProducts(demoProducts);
        setIsFirestoreLoading(false);
    });
    
    // For locations, we trust the persisted store in live mode, falling back to demo data if empty
    setLocations(storeLocations.length > 0 ? storeLocations : demoLocationsData);

    return () => {
      productsUnsub();
    };
  }, [isUsingDemoData, firestore, _hasHydrated, demoProducts, demoLocationsData, storeLocations]);
  
  const isLoading = !_hasHydrated || isFirestoreLoading;

  return { 
    products, 
    locations, 
    isLoading, 
    error,
    // This is the true source of demo status, considering hydration
    isUsingDemoData: !_hasHydrated || isUsingDemoData,
  };
}
