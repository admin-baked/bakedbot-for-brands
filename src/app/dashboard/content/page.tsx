
// src/app/dashboard/content/page.tsx
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/demo/demo-data';
import PageClient from './page-client';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export default async function ProductContentGeneratorPage() {
    let user;
    try {
        user = await requireUser(['brand', 'owner']);
    } catch {
        redirect('/brand-login');
    }

    const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
    let products = [];
    let areProductsLoading = true;
    
    let brandId: string;
    if (isDemo) {
        brandId = DEMO_BRAND_ID;
        products = demoProducts;
        areProductsLoading = false;
    } else {
        brandId = user.brandId || DEMO_BRAND_ID;
        try {
            const { firestore } = await createServerClient();
            const productRepo = makeProductRepo(firestore);
            products = await productRepo.getAllByBrand(brandId);
        } catch (error) {
            logger.error("Failed to fetch products for content generator:", error);
            products = demoProducts; // Fallback to demo
        } finally {
            areProductsLoading = false;
        }
    }
    
    return <PageClient products={products} areProductsLoading={areProductsLoading} />;
}
