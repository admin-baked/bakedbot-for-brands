'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { ProductCard } from './product-card';
import { demoProducts } from '@/lib/data';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  prices?: { [locationId: string]: number };
}

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { firestore } = useFirebase();
  
  useEffect(() => {
    async function loadProducts() {
      if (!firestore) {
        console.log('Firestore not available, using demo data.');
        setProducts(demoProducts);
        setLoading(false);
        return;
      }

      try {
        const productsRef = collection(firestore, 'products');
        const snapshot = await getDocs(productsRef);
        if (snapshot.empty) {
          console.log('No products found in Firestore, using demo data.');
          setProducts(demoProducts);
        } else {
          const prods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          setProducts(prods);
        }
      } catch (error) {
        console.error('Error loading products from Firestore, falling back to demo data:', error);
        setProducts(demoProducts);
      } finally {
        setLoading(false);
      }
    }
    
    loadProducts();
  }, [firestore]);
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
