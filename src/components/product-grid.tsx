'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { ProductCard } from './product-card';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { firestore } = useFirebase();
  
  useEffect(() => {
    async function loadProducts() {
      if (!firestore) {
        console.log('Firestore not available, using demo data');
        setProducts(getDemoProducts());
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Loading products from Firestore...');
        const productsRef = collection(firestore, 'products');
        const snapshot = await getDocs(productsRef);
        
        if (snapshot.empty) {
          console.log('⚠️ No products in Firestore, using demo data');
          setProducts(getDemoProducts());
        } else {
          const prods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          console.log('✅ Loaded products:', prods.length);
          setProducts(prods);
        }
      } catch (error) {
        console.error('❌ Error loading products:', error);
        console.log('Using demo data as fallback');
        setProducts(getDemoProducts());
      } finally {
        setLoading(false);
      }
    }
    
    loadProducts();
  }, [firestore]);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No products available</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function getDemoProducts(): Product[] {
  return [
    {
      id: '1',
      name: 'Cosmic Caramels',
      description: 'Delicious cannabis-infused caramels with a smooth, buttery flavor',
      price: 25.00,
      category: 'Edibles',
      image: '/products/caramels.jpg',
    },
    {
      id: '2',
      name: 'Giggle Gummies',
      description: '25mg CBD per gummy, perfect for relaxation',
      price: 23.00,
      category: 'Edibles',
      image: '/products/gummies.jpg',
    },
    {
      id: '3',
      name: 'Stardust Suckers',
      description: 'Long-lasting lollipops with a burst of flavor',
      price: 19.00,
      category: 'Edibles',
      image: '/products/suckers.jpg',
    },
    {
      id: '4',
      name: 'Moonlight Mints',
      description: 'Refreshing mints for discreet consumption',
      price: 15.00,
      category: 'Edibles',
      image: '/products/mints.jpg',
    },
    {
      id: '5',
      name: 'Northern Lights',
      description: 'Classic indica strain, perfect for relaxation',
      price: 45.00,
      category: 'Flower',
      image: '/products/flower1.jpg',
    },
    {
      id: '6',
      name: 'Sour Diesel',
      description: 'Energizing sativa for daytime use',
      price: 50.00,
      category: 'Flower',
      image: '/products/flower2.jpg',
    },
    {
      id: '7',
      name: 'Blue Dream',
      description: 'Balanced hybrid, great for any time of day',
      price: 48.00,
      category: 'Flower',
      image: '/products/flower3.jpg',
    },
    {
      id: '8',
      name: 'Pineapple Express Vape',
      description: 'Smooth vaping experience with tropical flavors',
      price: 35.00,
      category: 'Vapes',
      image: '/products/vape1.jpg',
    },
  ];
}
