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
 * live data from Firestore on the client side, preventing hydration mismatches.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  // Initialize state with demoProducts to prevent hydration mismatch.
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      // If firestore is not available, we stick with the initial demo data.
      setIsFirestoreLoading(false);
      return;
    };
    
    // Firestore is available, so we start listening for live data.
    const productsQuery = query(collection(firestore, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        if (!snapshot.empty) {
            // If live data exists, update the state.
            const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(firestoreProducts);
        } else {
            // If the collection is empty, the state remains as demoProducts.
            // No need to set it again.
        }
        setIsFirestoreLoading(false);
    }, (error) => {
        console.error("Error fetching products from Firestore, using demo data:", error);
        // On error, the state remains as demoProducts.
        setIsFirestoreLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, demoProducts]); // demoProducts is stable, firestore is key dependency.

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
