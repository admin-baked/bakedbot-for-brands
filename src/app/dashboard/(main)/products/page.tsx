import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';
import { demoProducts } from '@/lib/data';
import ProductsTab from './components/products-tab';

export const dynamic = 'force-dynamic';

export default async function DashboardProductsPage() {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  const { firestore, auth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  
  let brandId: string | null = 'default';
  if (sessionCookie) {
    try {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
      brandId = decodedToken.brandId || 'default';
    } catch (error) {
      // Not a valid session, treat as demo user
    }
  }

  let products: Product[] = [];
  
  if (isDemo) {
    products = demoProducts;
  } else {
    const productRepo = makeProductRepo(firestore);
    products = await productRepo.getAllByBrand(brandId);
  }
  
  return (
    <ProductsTab initialProducts={products} />
  );
}
