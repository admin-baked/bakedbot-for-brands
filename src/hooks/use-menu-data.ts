
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase/provider';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Product, Retailer } from '@/types/domain';
import { productConverter, retailerConverter } from '@/firebase/converters';
import { useCookieStore } from '@/lib/cookie-storage';
import { demoProducts, demoRetailers } from '@/lib/data';
import { makeProductRepo } from '@/server/repos/productRepo';
import { createServerClient } from '@/firebase/server-client';


// This hook is designed to be used by any client component that needs to display
// menu data, abstracting away the logic of whether to show demo or live data.
export function useMenuData() {
  const { firestore } = useFirebase();
  const { isDemo } = useCookieStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      if (isDemo) {
        setProducts(demoProducts);
        setLocations(demoRetailers);
        setIsLoading(false);
        return;
      }

      if (!firestore) {
        // Fallback to demo if firestore is not available on the client yet
        setProducts(demoProducts);
        setLocations(demoRetailers);
        setIsLoading(false);
        return;
      }
      
      try {
        // In a real app, brandId would come from the user's session or URL
        const brandId = 'default';
        
        const productsQuery = query(collection(firestore, 'products')).where('brandId', '==', brandId).withConverter(productConverter);
        const locationsQuery = query(collection(firestore, 'dispensaries')).withConverter(retailerConverter);

        const [productsSnapshot, locationsSnapshot] = await Promise.all([
            getDocs(productsQuery),
            getDocs(locationsQuery)
        ]);

        const fetchedProducts = productsSnapshot.docs.map(doc => doc.data());
        const fetchedLocations = locationsSnapshot.docs.map(doc => doc.data());

        setProducts(fetchedProducts.length > 0 ? fetchedProducts : demoProducts);
        setLocations(fetchedLocations.length > 0 ? fetchedLocations : demoRetailers);

      } catch (error) {
        console.error("Failed to fetch live menu data, falling back to demo:", error);
        setProducts(demoProducts);
        setLocations(demoRetailers);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [firestore, isDemo]);

  return { products, locations, isLoading };
}
