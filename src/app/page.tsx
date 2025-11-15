
import { makeProductRepo } from '@/server/repos/productRepo';
import { createServerClient } from '@/firebase/server-client';
import { demoProducts, demoLocations } from '@/lib/data';
import { cookies } from 'next/headers';
import type { Product, Location } from '@/lib/types';
import MenuPageClient from './menu-page-client';


async function getMenuData(): Promise<{ products: Product[]; locations: Location[] }> {
    const cookieStore = cookies();
    const isDemo = cookieStore.get('isUsingDemoData')?.value === 'true';

    if (isDemo) {
        return { products: demoProducts, locations: demoLocations };
    }

    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        
        // Fetch all products
        const products = await productRepo.getAll();
        
        // Fetch all locations
        const locationsSnap = await firestore.collection('dispensaries').get();
        const locations = locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
        
        // If live data is empty, fall back to demo data for a better presentation
        return {
            products: products.length > 0 ? products : demoProducts,
            locations: locations.length > 0 ? locations : demoLocations,
        };

    } catch (error) {
        console.error("Failed to fetch menu data on server, falling back to demo data.", error);
        return { products: demoProducts, locations: demoLocations };
    }
}


export default async function Page() {
  const { products, locations } = await getMenuData();
  
  // The MenuPageClient will handle the client-side logic for layout switching
  return <MenuPageClient serverProducts={products} serverLocations={locations} />;
}
