'use client';

import { useStore } from './use-store';
import { useDemoData } from './use-demo-data';
import { useState, useEffect } from 'react';
import type { Product, Location } from '@/lib/types';
import { useFirebase } from '@/firebase/provider';
import { collection, query, onSnapshot } from 'firebase/firestore';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently uses demo data as a fallback and then attempts to load
 * live data from Firestore on the client side.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      // If firestore is not available, we stick with demo data and stop loading.
      setIsFirestoreLoading(false);
      return;
    };
    
    const productsQuery = query(collection(firestore, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(firestoreProducts);
        }
        setIsFirestoreLoading(false);
    }, (error) => {
        console.error("Error fetching products from Firestore:", error);
        setIsFirestoreLoading(false); // Stop loading even on error
    });

    return () => unsubscribe();
  }, [firestore]);

  // Determine the final set of locations and loading state.
  const finalLocations = _hasHydrated && storeLocations.length > 0 ? storeLocations : demoLocations;
  const isLoading = !_hasHydrated || isFirestoreLoading;

  return {
    products,
    locations: finalLocations,
    isLoading,
    isHydrated: _hasHydrated,
  };
}
