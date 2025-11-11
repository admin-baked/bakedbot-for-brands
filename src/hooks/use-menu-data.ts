
'use client';

import { useStore } from '@/hooks/use-store';
import { useDemoData } from '@/hooks/use-demo-data';
import { useState, useEffect } from 'react';
import type { Product, Location } from '@/lib/types';
import { useFirebase } from '@/firebase/provider';
import { collection, query, onSnapshot } from 'firebase/firestore';

/**
 * A unified hook to get menu data (products and locations).
 * It uses a demo/live data mode flag from the global store to determine which data source to use.
 */
export function useMenuData() {
  const { _hasHydrated, locations: storeLocations, isUsingDemoData } = useStore(state => ({
    _hasHydrated: state._hasHydrated,
    locations: state.locations,
    isUsingDemoData: state.isUsingDemoData,
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(!isUsingDemoData);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isUsingDemoData) {
      setProducts(demoProducts);
      setIsFirestoreLoading(false);
      return;
    }
    
    if (!firestore) {
      setProducts([]);
      setIsFirestoreLoading(false);
      return;
    };
    
    setIsFirestoreLoading(true);
    const productsQuery = query(collection(firestore, 'products'));
    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        const firestoreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(firestoreProducts);
        setIsFirestoreLoading(false);
    }, (error) => {
        console.error("Error fetching products from Firestore:", error);
        setProducts([]);
        setIsFirestoreLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, demoProducts, isUsingDemoData, _hasHydrated]);

  const finalProducts = isUsingDemoData ? demoProducts : products;
  const finalLocations = isUsingDemoData ? demoLocations : storeLocations;
  const isLoading = !_hasHydrated || (isFirestoreLoading && !isUsingDemoData);

  return {
    products: finalProducts,
    locations: finalLocations,
    isLoading,
    isHydrated: _hasHydrated,
  };
}
