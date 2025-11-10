'use server';

import { createServerClient } from '@/firebase/server-client';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { demoProducts } from '@/lib/data';
import HomePageClient from '@/app/components/home-page-client';

const getProducts = async (): Promise<Product[]> => {
    try {
        const { firestore } = await createServerClient();
        const productsQuery = query(collection(firestore, 'products'));
        const querySnapshot = await getDocs(productsQuery);
        
        if (querySnapshot.empty) {
            console.log("No products found in Firestore, falling back to demo data.");
            return demoProducts;
        }
        
        const products = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];
        
        return products;
    } catch (error) {
        console.error("Error fetching products from Firestore, falling back to demo data:", error);
        return demoProducts;
    }
};


export default async function HomePage() {
    const initialProducts = await getProducts();

    return <HomePageClient initialProducts={initialProducts} />;
}
