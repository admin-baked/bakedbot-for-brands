
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
 * live data from Firestore on the client side.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations, isUsingDemoData } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
    isUsingDemoData: state.isUsingDemoData
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  // Initialize with demo data to prevent hydration mismatch
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);

  useEffect(() => {
    // Only proceed if the store has hydrated and we are in "live" mode.
    if (!_hasHydrated || isUsingDemoData) {
      if(isUsingDemoData) {
        setProducts(demoProducts); // Ensure demo products are set if mode is toggled
      }
      setIsFirestoreLoading(false);
      return;
    };
    
    if (!firestore) {
      // If firestore is not available in live mode, show no products.
      setProducts([]);
      setIsFirestoreLoading(false);
      return;
    };
    
    setIsFirestoreLoading(true);
    const productsQuery = query(collection(firestore, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(firestoreProducts);
        } else {
            // If live mode is on but the collection is empty, show no products.
            setProducts([]);
        }
        setIsFirestoreLoading(false);
    }, (error) => {
        console.error("Error fetching products from Firestore, showing no products in live mode:", error);
        setProducts([]);
        setIsFirestoreLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, demoProducts, isUsingDemoData, _hasHydrated]);

  const finalProducts = isUsingDemoData ? demoProducts : products;
  const finalLocations = _hasHydrated && !isUsingDemoData ? storeLocations : demoLocations;
  const isLoading = !_hasHydrated || (isFirestoreLoading && !isUsingDemoData);

  return {
    products: finalProducts,
    locations: finalLocations,
    isLoading,
    isHydrated: _hasHydrated,
  };
}
