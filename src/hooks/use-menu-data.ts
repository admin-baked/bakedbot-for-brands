
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
  const { isUsingDemoData, _hasHydrated } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
  }));
  const { firestore } = useFirebase();
  const { products: demoProducts, locations: demoLocations } = useDemoData();
  
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [locations, setLocations] = useState<Location[]>(demoLocations);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isUsingDemoData) {
      setProducts(demoProducts);
      setLocations(demoLocations);
      setIsFirestoreLoading(false);
      return;
    }

    if (!firestore) {
      console.warn("Firestore not available in live mode, falling back to demo data.");
      setProducts(demoProducts);
      setLocations(demoLocations);
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
    }, (err) => {
        console.error("Error fetching products, falling back to demo:", err);
        setError(err);
        setProducts(demoProducts);
    });

    const locationsQuery = query(collection(firestore, 'locations'));
    const locationsUnsub = onSnapshot(locationsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const firestoreLocations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
            setLocations(firestoreLocations);
        } else {
            setLocations(demoLocations); // Fallback if live is empty
        }
        setIsFirestoreLoading(false);
    }, (err) => {
        console.error("Error fetching locations, falling back to demo:", err);
        setError(err);
        setLocations(demoLocations);
        setIsFirestoreLoading(false);
    });
    
    return () => {
      productsUnsub();
      locationsUnsub();
    };
  }, [isUsingDemoData, firestore, _hasHydrated, demoProducts, demoLocations]);
  
  const isLoading = !_hasHydrated || isFirestoreLoading;

  return { 
    products, 
    locations, 
    isLoading, 
    error,
    isUsingDemoData: !_hasHydrated ? true : isUsingDemoData,
  };
}
