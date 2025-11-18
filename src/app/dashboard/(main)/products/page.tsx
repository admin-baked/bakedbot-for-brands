
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/lib/data';
import ProductsTab from './components/products-tab';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  
  let products: Product[] = [];
  
  if (isDemo) {
    products = demoProducts;
  } else {
    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        // In a real app, you'd get the brandId from the user's session
        const brandId = 'default'; 
        products = await productRepo.getAllByBrand(brandId);
    } catch (error) {
        console.error("Failed to fetch products for dashboard:", error);
        // Fallback to demo data on error
        products = demoProducts;
    }
  }
  
  return (
    <ProductsTab initialProducts={products} />
  );
}
