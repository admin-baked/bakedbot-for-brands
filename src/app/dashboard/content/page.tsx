import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/data';
import PageClient from './page-client';
import { cookies } from 'next/headers';
import { Product } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function ProductContentGeneratorPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let products: Product[] = [];
    let areProductsLoading = true;

    try {
        if (isDemo) {
            products = demoProducts;
        } else {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            // In a real app, you'd get the brandId from the user's session
            const brandId = 'default'; 
            products = await productRepo.getAllByBrand(brandId);
        }
    } catch (error) {
        console.error("Failed to fetch products for content generator:", error);
        // Fallback to demo data on error to prevent a page crash
        products = demoProducts;
    } finally {
        areProductsLoading = false;
    }
    
    return <PageClient products={products} areProductsLoading={areProductsLoading} />;
}
