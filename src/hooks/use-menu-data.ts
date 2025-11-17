
// src/hooks/use-menu-data.ts
import { useState, useEffect } from 'react';
import { useCookieStore } from '@/lib/cookie-storage';
import { demoProducts, demoRetailers } from '@/lib/data';
import { Product, Retailer, Review } from '@/types/domain';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { productConverter, retailerConverter } from '@/firebase/converters';

export type MenuLocation = Retailer;
export type MenuProduct = Product;
export type MenuReview = Review;

type UseMenuDataReturn = {
  locations: MenuLocation[];
  products: MenuProduct[];
  brandId: string;
  isLoading: boolean;
};

// This is a temporary stub implementation.
// In a real app, this would fetch data based on brandId.
export function useMenuData(): UseMenuDataReturn {
  const { isDemo } = useCookieStore();
  const { firestore } = useFirebase();
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

      if (firestore) {
        try {
          const productsQuery = collection(firestore, 'products').withConverter(productConverter);
          const locationsQuery = collection(firestore, 'dispensaries').withConverter(retailerConverter);
          
          const [productsSnapshot, locationsSnapshot] = await Promise.all([
            getDocs(productsQuery),
            getDocs(locationsQuery),
          ]);

          setProducts(productsSnapshot.docs.map(doc => doc.data()));
          setLocations(locationsSnapshot.docs.map(doc => doc.data()));

        } catch (error) {
            console.error("Error fetching menu data, falling back to demo data.", error);
            setProducts(demoProducts);
            setLocations(demoRetailers);
        } finally {
            setIsLoading(false);
        }
      } else {
         // Fallback for when firestore is not available (e.g., during SSR setup)
         setProducts(demoProducts);
         setLocations(demoRetailers);
         setIsLoading(false);
      }
    }

    fetchData();
  }, [isDemo, firestore]);

  return {
    locations,
    products,
    brandId: 'default',
    isLoading,
  };
}
