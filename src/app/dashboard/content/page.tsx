
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/data';
import PageClient from './page-client';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function ProductContentGeneratorPage() {
    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let products = [];
    let areProductsLoading = true;

    // This logic remains the same, but the component it renders (`PageClient`) will
    // now correctly be part of the dashboard layout.
    if (isDemo) {
        products = demoProducts;
        areProductsLoading = false;
    } else {
        try {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            // In a real app, you'd get the brandId from the user's session
            const brandId = DEMO_BRAND_ID; 
            products = await productRepo.getAllByBrand(brandId);
        } catch (error) {
            console.error("Failed to fetch products for content generator:", error);
            // Fallback to demo data on error
            products = demoProducts;
        } finally {
            areProductsLoading = false;
        }
    }
    
    return <PageClient products={products} areProductsLoading={areProductsLoading} />;
}
